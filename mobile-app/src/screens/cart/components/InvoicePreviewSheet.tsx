import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Text } from '../../../components/ui';
import { colors, radii, spacing } from '../../../theme';
import type { Address, CartItem, CartTotals } from '../../../types/models';

export interface InvoicePreviewSheetProps {
  visible: boolean;
  onClose(): void;
  cart: CartItem[];
  totals: CartTotals | undefined;
  address: Address | null;
  fallbackName?: string;
  fallbackPhone?: string;
}

const rupees = (n: number) => `₹${n.toFixed(2)}`;

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text variant={strong ? 'title' : 'bodySm'} color={strong ? 'text' : 'textSecondary'}>
        {label}
      </Text>
      <Text variant={strong ? 'title' : 'bodySm'} weight={strong ? 'bold' : 'semibold'}>
        {value}
      </Text>
    </View>
  );
}

/** Web Checkout "Sample Invoice" modal (preview only; the real invoice is generated after confirmation). */
export function InvoicePreviewSheet({ visible, onClose, cart, totals, address, fallbackName, fallbackPhone }: InvoicePreviewSheetProps) {
  const { t } = useTranslation('checkout');
  // Stable per opening so the number doesn't flicker on re-render.
  const meta = useMemo(
    () => ({ number: `INV-${Date.now().toString().slice(-8)}`, date: new Date().toLocaleDateString('en-IN') }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible],
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('invoice.title')}
      subtitle={t('invoice.subtitle')}
      maxHeightRatio={0.92}
      footer={<Button title={t('invoice.close')} variant="outline" fullWidth onPress={onClose} />}
    >
      <View style={styles.wrap}>
        <View style={styles.parties}>
          <View style={styles.party}>
            <Text variant="caption" color="textMuted" weight="semibold">{t('invoice.from')}</Text>
            <Text variant="bodySm" weight="semibold">Chardeevari</Text>
            <Text variant="caption" color="textSecondary">{t('invoice.sellerNote')}</Text>
          </View>
          <View style={styles.party}>
            <Text variant="caption" color="textMuted" weight="semibold">{t('invoice.billTo')}</Text>
            <Text variant="bodySm" weight="semibold">{address?.fullName || fallbackName || t('invoice.placeholderName')}</Text>
            <Text variant="caption" color="textSecondary">{address?.addressLine1 || t('invoice.placeholderAddress')}</Text>
            {!!address?.addressLine2 && <Text variant="caption" color="textSecondary">{address.addressLine2}</Text>}
            <Text variant="caption" color="textSecondary">
              {address?.area || t('invoice.placeholderArea')}, {address?.city || t('invoice.placeholderCity')} - {address?.pincode || '000000'}
            </Text>
            <Text variant="caption" color="textSecondary">
              {t('invoice.phone', { phone: address?.phoneNumber || fallbackPhone || t('invoice.na') })}
            </Text>
          </View>
        </View>

        <View style={styles.meta}>
          {[
            [t('invoice.number'), meta.number],
            [t('invoice.date'), meta.date],
            [t('invoice.payment'), t('invoice.cod')],
          ].map(([label, value]) => (
            <View key={label} style={styles.metaCell}>
              <Text variant="micro" color="textMuted">{label}</Text>
              <Text variant="caption" weight="semibold">{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.items}>
          {cart.map((item, index) => {
            const gstRate = item.gstRate || 18;
            // Price is treated as GST-inclusive (web sample invoice).
            const basePrice = item.price / (1 + gstRate / 100);
            const gstAmount = item.price - basePrice;
            return (
              <View key={item.cartKey} style={[styles.item, index > 0 && styles.itemBorder]}>
                <View style={styles.itemTop}>
                  <Text variant="bodySm" weight="semibold" style={styles.flex}>
                    {index + 1}. {item.name}
                    {item.variantLabel ? ` (${item.variantLabel})` : ''}
                  </Text>
                  <Text variant="bodySm" weight="semibold">{rupees(item.price * item.quantity)}</Text>
                </View>
                <Text variant="micro" color="textMuted">SKU: {item.sku || t('invoice.na')} · HSN/SAC: -</Text>
                <Text variant="caption" color="textSecondary">
                  {t('invoice.itemLine', {
                    quantity: item.quantity,
                    unit: item.unit,
                    price: rupees(item.price),
                    base: rupees(basePrice),
                    rate: gstRate,
                    gst: rupees(gstAmount),
                  })}
                </Text>
              </View>
            );
          })}
        </View>

        {totals && (
          <View style={styles.summary}>
            {!!totals.subtotalBeforeGST && (
              <SummaryRow label={t('invoice.taxable')} value={rupees(Math.round(totals.subtotalBeforeGST))} />
            )}
            {totals.tax > 0 && <SummaryRow label={t('invoice.gstAmount')} value={rupees(Math.round(totals.tax))} />}
            <SummaryRow label={t('invoice.subtotalIncGst')} value={rupees(totals.subtotal)} />
            {totals.deliveryCharges > 0 && (
              <SummaryRow label={t('invoice.deliveryCharges')} value={rupees(Math.round(totals.deliveryCharges))} />
            )}
            {totals.platformFee > 0 && <SummaryRow label={t('invoice.platformFee')} value={rupees(Math.round(totals.platformFee))} />}
            <View style={styles.divider} />
            <SummaryRow strong label={t('invoice.totalAmount')} value={rupees(Math.round(totals.totalAmount))} />
          </View>
        )}

        <View style={styles.note}>
          <Text variant="caption" color="info">
            {t('invoice.note')}
          </Text>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: spacing.lg },
  parties: { flexDirection: 'row', gap: spacing.md },
  party: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: spacing.md },
  metaCell: { flex: 1, gap: 2 },
  items: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radii.md },
  item: { padding: spacing.md, gap: 2 },
  itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  itemTop: { flexDirection: 'row', gap: spacing.sm },
  summary: { gap: spacing.xs },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong, marginVertical: spacing.xs },
  note: { backgroundColor: colors.infoSoft, borderRadius: radii.md, padding: spacing.md },
});
