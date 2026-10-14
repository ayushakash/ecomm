/**
 * Order display helpers shared by OrdersScreen and OrderDetailScreen.
 * Ports the inline logic of client/src/pages/orders/OrderHistory.js, OrderDetail.js
 * and components/modals/GSTInvoicePreview.js.
 */
import type { BadgeTone, IconName } from '../../../components/ui';
import type {
  Order,
  OrderDeliveryAddress,
  OrderItem,
  OrderLifecycleEvent,
  OrderStatus,
  PaymentStatus,
} from '../../../types/models';

/** ₹ with en-IN grouping and paise, as the web order pages render amounts: 1250 → "₹1,250.00". */
export const formatAmount = (value: number | null | undefined): string =>
  `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "14 Oct 2026" */
export const formatOrderDate = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/** "14 Oct, 10:30 am" */
export const formatDateTime = (iso?: string | null): string =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '';

/** Web canCancelOrder (and PUT /orders/:id/cancel): anything not delivered or already cancelled. */
export const canCancelOrder = (status: OrderStatus): boolean => status !== 'delivered' && status !== 'cancelled';

/** Status filter chips. Values are backend item statuses (GET /orders?status filters items.itemStatus). */
export const ORDER_FILTERS: { label: string; value?: OrderStatus }[] = [
  { label: 'All' },
  { label: 'Placed', value: 'pending' },
  { label: 'Confirmed', value: 'assigned' },
  { label: 'Packing', value: 'processing' },
  { label: 'Out for delivery', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

export const getDeliveryAddress = (order: Order): OrderDeliveryAddress | null =>
  order.deliveryAddressId && typeof order.deliveryAddressId === 'object' ? order.deliveryAddressId : null;

/** Populated product ref on an order item ({ _id, name, images }) or just the id. */
export const getItemProduct = (item: OrderItem): { id: string | null; image: string | null } => {
  const ref = item.productId;
  if (ref && typeof ref === 'object') return { id: ref._id ?? null, image: ref.images?.[0] ?? null };
  return { id: typeof ref === 'string' ? ref : null, image: null };
};

export const getItemLineTotal = (item: OrderItem): number => (item.unitPrice || 0) * (item.quantity || 0);

export const paymentMethodLabel = (method: Order['paymentMethod'] | undefined): string =>
  method === 'cod' || !method ? 'Cash on Delivery' : method === 'online' ? 'Online Payment' : 'Bank transfer';

/** Web OrderDetail payment-status pill. */
export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  paid: { label: 'Paid', tone: 'success' },
  refunded: { label: 'Refunded', tone: 'info' },
  failed: { label: 'Failed', tone: 'danger' },
  pending: { label: 'Pending (COD)', tone: 'warning' },
};

export type DeliveryEta = { label: string; tone: 'success' | 'info' | 'primary'; caption?: string };

const minutesUntil = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 60000);

/** Web OrderHistory card chip: only while processing/shipped; ≤2 h "Arriving", ≤24 h "Expected", past "Delayed". */
export const getListEta = (order: Order): DeliveryEta | null => {
  if (!order.expectedDeliveryDate || (order.orderStatus !== 'processing' && order.orderStatus !== 'shipped')) return null;
  const mins = minutesUntil(order.expectedDeliveryDate);
  if (mins > 0 && mins <= 120) return { label: `Arriving in ${mins} mins`, tone: 'success' };
  if (mins > 0 && mins <= 1440) {
    const hours = Math.floor(mins / 60);
    const rest = mins % 60;
    return { label: `Expected: ${hours > 0 ? `${hours}h ${rest}m` : `${rest} mins`}`, tone: 'info' };
  }
  if (mins < 0) return { label: 'Delayed', tone: 'primary' };
  return null;
};

/** Web OrderDetail banner: any open order; ≤2 h "Arriving in N minutes", later → the expected date/time. */
export const getDetailEta = (order: Order): DeliveryEta | null => {
  if (!order.expectedDeliveryDate || !canCancelOrder(order.orderStatus)) return null;
  const mins = minutesUntil(order.expectedDeliveryDate);
  if (mins > 0 && mins <= 120) return { label: `Arriving in ${mins} minutes`, tone: 'success', caption: 'Expected delivery' };
  if (mins > 0) return { label: formatDateTime(order.expectedDeliveryDate), tone: 'info', caption: 'Expected delivery' };
  return null;
};

/** Customer progress steps; index = how far the order has moved. */
export const ORDER_STEPS: { label: string; statuses: OrderStatus[]; icon: IconName }[] = [
  { label: 'Placed', statuses: ['pending'], icon: 'receipt-outline' },
  { label: 'Confirmed', statuses: ['approved', 'assigned'], icon: 'checkmark-done-outline' },
  { label: 'Packing', statuses: ['processing'], icon: 'cube-outline' },
  { label: 'Out for delivery', statuses: ['shipped'], icon: 'bicycle-outline' },
  { label: 'Delivered', statuses: ['delivered'], icon: 'home-outline' },
];

export const getStepIndex = (status: OrderStatus): number =>
  ORDER_STEPS.findIndex((step) => step.statuses.includes(status));

/** Timestamp of the step from statusHistory (latest entry matching the step's statuses). */
export const getStepTime = (order: Order, stepIndex: number): string | undefined => {
  const statuses: string[] = ORDER_STEPS[stepIndex].statuses;
  const hit = [...(order.statusHistory ?? [])].reverse().find((h) => statuses.includes(h.status));
  if (hit?.timestamp) return hit.timestamp;
  return stepIndex === 0 ? order.createdAt : undefined;
};

export interface BillLine {
  label: string;
  value: number;
  emphasis?: boolean;
  /** Show "FREE" for 0. */
  free?: boolean;
}

/**
 * Exclusive GST mode stores a pre-GST subtotal (total = subtotal + tax + delivery + fee, utils/pricingUtils.js);
 * inclusive / no-gst store a GST-inclusive subtotal (the web's assumption). Orders don't persist the mode.
 */
export const isGstExclusive = (order: Order): boolean =>
  (order.tax || 0) > 0 &&
  Math.abs((order.subtotal || 0) + (order.tax || 0) + (order.deliveryCharge || 0) + (order.platformFee || 0) - (order.totalAmount || 0)) < 1;

/** Price breakdown from stored order totals (server applied GST; never recomputed). CGST/SGST = tax / 2 each, as GSTInvoicePreview does. */
export const getBillBreakdown = (order: Order): { lines: BillLine[]; total: number } => {
  const subtotal = order.subtotal || 0;
  const tax = order.tax || 0;
  const delivery = order.deliveryCharge || 0;
  const fee = order.platformFee || 0;
  const total = order.totalAmount || 0;
  const exclusive = isGstExclusive(order);
  const lines: BillLine[] = [];
  if (exclusive) {
    lines.push({ label: 'Item total', value: subtotal });
  } else {
    lines.push({ label: 'Taxable amount', value: order.subtotalBeforeGST ?? subtotal - tax });
  }
  if (tax > 0) {
    lines.push({ label: 'CGST', value: tax / 2 }, { label: 'SGST', value: tax / 2 });
  }
  if (!exclusive) lines.push({ label: 'Subtotal (incl. GST)', value: subtotal, emphasis: true });
  lines.push({ label: 'Delivery charge', value: delivery, free: true });
  if (fee > 0) lines.push({ label: 'Platform fee', value: fee });
  return { lines, total };
};

const LIFECYCLE_META: Record<string, { icon: IconName; tone: BadgeTone; title: string }> = {
  order_created: { icon: 'receipt-outline', tone: 'info', title: 'Order placed' },
  order_assigned: { icon: 'person-outline', tone: 'info', title: 'Seller assigned' },
  order_accepted: { icon: 'checkmark-circle-outline', tone: 'success', title: 'Order accepted' },
  order_rejected: { icon: 'close-circle-outline', tone: 'danger', title: 'Seller declined' },
  order_shipped: { icon: 'bicycle-outline', tone: 'warning', title: 'Out for delivery' },
  order_delivered: { icon: 'home-outline', tone: 'success', title: 'Delivered' },
  order_cancelled: { icon: 'ban-outline', tone: 'danger', title: 'Order cancelled' },
  payment_confirmed: { icon: 'card-outline', tone: 'success', title: 'Payment confirmed' },
  payment_failed: { icon: 'alert-circle-outline', tone: 'danger', title: 'Payment failed' },
  stock_updated: { icon: 'stats-chart-outline', tone: 'neutral', title: 'Stock updated' },
  refund_initiated: { icon: 'cash-outline', tone: 'warning', title: 'Refund initiated' },
  refund_completed: { icon: 'sparkles-outline', tone: 'success', title: 'Refund completed' },
};

/** Unknown event types fall back to web formatEventType: "order_status_updated" → "Order Status Updated". */
export const getLifecycleMeta = (event: OrderLifecycleEvent) =>
  LIFECYCLE_META[event.eventType] ?? {
    icon: 'document-text-outline' as IconName,
    tone: 'neutral' as BadgeTone,
    title: event.eventType
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
  };

/** Indian-system number to words (GSTInvoicePreview numberToWords). */
export const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  if (num === 0) return 'Zero';
  const belowThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ` ${ones[n % 10]}` : '');
    return `${ones[Math.floor(n / 100)]} Hundred${n % 100 !== 0 ? ` ${belowThousand(n % 100)}` : ''}`;
  };
  if (num < 1000) return belowThousand(num);
  if (num < 100000) {
    return `${belowThousand(Math.floor(num / 1000))} Thousand${num % 1000 !== 0 ? ` ${belowThousand(num % 1000)}` : ''}`;
  }
  if (num < 10000000) {
    return `${belowThousand(Math.floor(num / 100000))} Lakh${num % 100000 !== 0 ? ` ${numberToWords(num % 100000)}` : ''}`;
  }
  return `${belowThousand(Math.floor(num / 10000000))} Crore${num % 10000000 !== 0 ? ` ${numberToWords(num % 10000000)}` : ''}`;
};
