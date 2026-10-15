import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Badge, Icon, SkeletonLines, Text, type IconName } from '../../../components/ui';
import { colors, spacing } from '../../../theme';
import type { OrderLifecycleEvent, OrderStatusHistoryEntry } from '../../../types/models';
import { formatDateTime, getLifecycleMeta, orderStatusLabel } from './orderUtils';

/** Known triggeredBy.userType values; label key orders:timeline.by.<type>. */
const USER_TYPES = new Set(['customer', 'merchant', 'admin', 'system']);

export interface OrderTimelineProps {
  events: OrderLifecycleEvent[] | undefined;
  loading: boolean;
  error: boolean;
  /** Web OrderDetail "Status History" fallback when the lifecycle log is empty. */
  statusHistory?: OrderStatusHistoryEntry[];
  onRetry: () => void;
}

/** Order activity log (port of OrderLifecycleModal.js without the admin-only notification/metadata internals). */
export function OrderTimeline({ events, loading, error, statusHistory, onRetry }: OrderTimelineProps) {
  const { t } = useTranslation('orders');
  if (loading) return <SkeletonLines lines={4} />;
  if (error) {
    return (
      <View style={styles.notice}>
        <Icon name="alert-circle-outline" size={18} color="danger" />
        <Text variant="bodySm" color="textSecondary" style={styles.flex}>
          {t('timeline.error')}
        </Text>
        <Text variant="label" weight="bold" color="primary" onPress={onRetry} accessibilityRole="button">
          {t('retry')}
        </Text>
      </View>
    );
  }

  const sorted = [...(events ?? [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  if (sorted.length === 0) {
    const history = [...(statusHistory ?? [])].reverse();
    if (history.length === 0) {
      return (
        <View style={styles.notice}>
          <Icon name="information-circle-outline" size={18} color="info" />
          <Text variant="bodySm" color="textSecondary">
            {t('timeline.empty')}
          </Text>
        </View>
      );
    }
    return (
      <View>
        {history.map((entry, index) => (
          <Row
            key={`${entry.status}-${index}`}
            icon="ellipse"
            tone={colors.info}
            title={orderStatusLabel(entry.status)}
            time={entry.timestamp}
            description={entry.note}
            last={index === history.length - 1}
          />
        ))}
      </View>
    );
  }

  return (
    <View>
      {sorted.map((event, index) => {
        const meta = getLifecycleMeta(event);
        const by = event.triggeredBy;
        return (
          <Row
            key={`${event.eventType}-${event.timestamp}-${index}`}
            icon={meta.icon}
            tone={TONE_COLOR[meta.tone] ?? colors.textSecondary}
            title={meta.title}
            time={event.timestamp}
            description={event.eventDescription}
            badge={
              by?.userType
                ? by.userType === 'customer'
                  ? t('timeline.by.customer')
                  : by.userName || (USER_TYPES.has(by.userType) ? t(`timeline.by.${by.userType}`) : undefined)
                : undefined
            }
            last={index === sorted.length - 1}
          />
        );
      })}
    </View>
  );
}

const TONE_COLOR: Record<string, string> = {
  info: colors.info,
  success: colors.success,
  danger: colors.danger,
  warning: colors.secondaryDark,
  neutral: colors.textSecondary,
};

function Row({
  icon,
  tone,
  title,
  time,
  description,
  badge,
  last,
}: {
  icon: IconName;
  tone: string;
  title: string;
  time?: string;
  description?: string;
  badge?: string;
  last: boolean;
}) {
  const { t } = useTranslation('orders');
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.icon, { backgroundColor: `${tone}1A` }]}>
          <Icon name={icon} size={icon === 'ellipse' ? 10 : 16} color={tone} />
        </View>
        {!last && <View style={styles.line} />}
      </View>
      <View style={[styles.body, !last && styles.bodyGap]}>
        <View style={styles.titleRow}>
          <Text variant="label" weight="bold" style={[styles.flex, { color: tone }]}>
            {title}
          </Text>
          {time ? (
            <Text variant="caption" color="textMuted">
              {formatDateTime(time)}
            </Text>
          ) : null}
        </View>
        {description ? (
          <Text variant="bodySm" color="textSecondary">
            {description}
          </Text>
        ) : null}
        {badge ? <Badge label={t('timeline.byLabel', { name: badge })} tone="neutral" style={styles.badge} /> : null}
      </View>
    </View>
  );
}

const ICON = 30;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: ICON },
  icon: { width: ICON, height: ICON, borderRadius: ICON / 2, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 2, minHeight: 12, backgroundColor: colors.divider, marginVertical: 2 },
  body: { flex: 1, gap: 2, paddingTop: 5 },
  bodyGap: { paddingBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { marginTop: spacing.xs },
});
