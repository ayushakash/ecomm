import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/ui';
import { colors, radii, spacing } from '../../../theme';
import { formatNumber, formatRupees, type MaterialLine } from '../calculatorMath';

export interface MaterialRow {
  name: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  line: MaterialLine;
  /** Quantity unit as shown, e.g. "bags (50kg)". */
  unitLabel: string;
  /** Price unit, e.g. "bag" → "₹350/bag". */
  priceUnit: string;
}

interface Props {
  title: string;
  tone: 'structure' | 'foundation';
  rows: MaterialRow[];
  subtotalLabel: string;
  subtotal: number;
}

const TONES = {
  structure: { bg: colors.primarySoft, accent: colors.primary, iconBg: colors.surface },
  foundation: { bg: colors.brandSoft, accent: colors.brand, iconBg: colors.surface },
} as const;

/** Materials card (structure / foundation) with per-line qty, rate and cost, plus subtotal. */
export function MaterialSection({ title, tone, rows, subtotalLabel, subtotal }: Props) {
  const t = TONES[tone];
  return (
    <View style={[styles.card, { backgroundColor: t.bg }]}>
      <View style={styles.titleRow}>
        <MaterialCommunityIcons
          name={tone === 'structure' ? 'office-building-outline' : 'home-floor-0'}
          size={18}
          color={t.accent}
        />
        <Text variant="h3" color={t.accent}>
          {title}
        </Text>
      </View>
      {rows.map((row, idx) => (
        <View key={row.name} style={[styles.row, idx < rows.length - 1 && styles.rowDivider]}>
          <View style={[styles.icon, { backgroundColor: t.iconBg }]}>
            <MaterialCommunityIcons name={row.icon} size={18} color={t.accent} />
          </View>
          <View style={styles.flex}>
            <Text variant="title">{row.name}</Text>
            <Text variant="caption" color="textSecondary">
              {formatNumber(row.line.quantity)} {row.unitLabel}
            </Text>
          </View>
          <View style={styles.right}>
            <Text variant="price" color={t.accent}>
              {formatRupees(row.line.cost)}
            </Text>
            <Text variant="micro" color="textMuted">
              {formatRupees(row.line.pricePerUnit)}/{row.priceUnit}
            </Text>
          </View>
        </View>
      ))}
      <View style={[styles.subtotal, { borderTopColor: t.accent }]}>
        <Text variant="title" color={t.accent}>
          {subtotalLabel}
        </Text>
        <Text variant="h3" color={t.accent}>
          {formatRupees(subtotal)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, padding: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  icon: { width: 36, height: 36, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end' },
  subtotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
});
