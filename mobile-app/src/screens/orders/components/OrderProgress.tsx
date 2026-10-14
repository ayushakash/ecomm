import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Icon, Text } from '../../../components/ui';
import { colors, radii, spacing } from '../../../theme';
import type { Order } from '../../../types/models';
import { formatDateTime, getStepIndex, getStepTime, ORDER_STEPS } from './orderUtils';

/** Vertical Placed → Delivered tracker driven by orderStatus + statusHistory timestamps. */
export function OrderProgress({ order }: { order: Order }) {
  if (order.orderStatus === 'cancelled') {
    const cancelledAt = [...(order.statusHistory ?? [])].reverse().find((h) => h.status === 'cancelled')?.timestamp;
    return (
      <View style={styles.cancelled}>
        <View style={[styles.dot, styles.dotCancelled]}>
          <Icon name="close" size={16} color="textInverse" />
        </View>
        <View style={styles.flex}>
          <Text variant="title" weight="bold" color="dangerDark">
            Order cancelled
          </Text>
          <Text variant="caption" color="textSecondary">
            {cancelledAt ? `Cancelled on ${formatDateTime(cancelledAt)}` : 'This order was cancelled.'}
          </Text>
        </View>
      </View>
    );
  }

  const current = getStepIndex(order.orderStatus);
  return (
    <View>
      {ORDER_STEPS.map((step, index) => {
        const done = index <= current;
        const active = index === current;
        const time = done ? getStepTime(order, index) : undefined;
        const last = index === ORDER_STEPS.length - 1;
        return (
          <Animated.View key={step.label} entering={FadeIn.delay(index * 60)} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
                <Icon name={done && !active ? 'checkmark' : step.icon} size={14} color={done ? 'textInverse' : 'textMuted'} />
              </View>
              {!last && <View style={[styles.line, index < current && styles.lineDone]} />}
            </View>
            <View style={[styles.stepText, !last && styles.stepGap]}>
              <Text variant="label" weight={active ? 'bold' : 'semibold'} color={done ? 'text' : 'textMuted'}>
                {step.label}
              </Text>
              {time ? (
                <Text variant="caption" color="textSecondary">
                  {formatDateTime(time)}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const DOT = 28;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: DOT },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dotDone: { backgroundColor: colors.success, borderColor: colors.success },
  dotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotCancelled: { backgroundColor: colors.danger, borderColor: colors.danger },
  line: { flex: 1, width: 2, minHeight: 18, backgroundColor: colors.border, marginVertical: 2 },
  lineDone: { backgroundColor: colors.success },
  stepText: { flex: 1, paddingTop: 4 },
  stepGap: { paddingBottom: spacing.md },
  cancelled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
});
