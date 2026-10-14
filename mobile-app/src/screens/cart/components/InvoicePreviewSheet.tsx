import React, { useMemo } from 'react';
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
      title="Tax invoice"
      subtitle="Sample invoice — for preview only"
      maxHeightRatio={0.92}
      footer={<Button title="Close" variant="outline" fullWidth onPress={onClose} />}
    >
      <View style={styles.wrap}>
        <View style={styles.parties}>
          <View style={styles.party}>
            <Text variant="caption" color="textMuted" weight="semibold">FROM</Text>
            <Text variant="bodySm" weight="semibold">Chardeevari</Text>
            <Text variant="caption" color="textSecondary">Seller details appear on the final invoice</Text>
          </View>
          <View style={styles.party}>
            <Text variant="caption" color="textMuted" weight="semibold">BILL TO</Text>
            <Text variant="bodySm" weight="semibold">{address?.fullName || fallbackName || 'Customer Name'}</Text>
            <Text variant="caption" color="textSecondary">{address?.addressLine1 || 'Address Line 1'}</Text>
            {!!address?.addressLine2 && <Text variant="caption" color="textSecondary">{address.addressLine2}</Text>}
            <Text variant="caption" color="textSecondary">
              {address?.area || 'Area'}, {address?.city || 'City'} - {address?.pincode || '000000'}
            </Text>
            <Text variant="caption" color="textSecondary">Phone: {address?.phoneNumber || fallbackPhone || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.meta}>
          {[
            ['Invoice no.', meta.number],
            ['Date', meta.date],
            ['Payment', 'COD'],
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
                <Text variant="micro" color="textMuted">SKU: {item.sku || 'N/A'} · HSN/SAC: -</Text>
                <Text variant="caption" color="textSecondary">
                  {item.quantity} {item.unit} × {rupees(item.price)} (base {rupees(basePrice)}) · GST {gstRate}% {rupees(gstAmount)}
                </Text>
              </View>
            );
          })}
        </View>

        {totals && (
          <View style={styles.summary}>
            {!!totals.subtotalBeforeGST && (
              <SummaryRow label="Taxable amount (base)" value={rupees(Math.round(totals.subtotalBeforeGST))} />
            )}
            {totals.tax > 0 && <SummaryRow label="GST amount" value={rupees(Math.round(totals.tax))} />}
            <SummaryRow label="Subtotal (inc. GST)" value={rupees(totals.subtotal)} />
            {totals.deliveryCharges > 0 && (
              <SummaryRow label="Delivery charges" value={rupees(Math.round(totals.deliveryCharges))} />
            )}
            {totals.platformFee > 0 && <SummaryRow label="Platform fee" value={rupees(Math.round(totals.platformFee))} />}
            <View style={styles.divider} />
            <SummaryRow strong label="Total amount" value={rupees(Math.round(totals.totalAmount))} />
          </View>
        )}

        <View style={styles.note}>
          <Text variant="caption" color="info">
            Note: This is a sample invoice for preview purposes only. The actual invoice will be generated after order
            confirmation and will include additional details like invoice number, authorized signature, and official seal.
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
