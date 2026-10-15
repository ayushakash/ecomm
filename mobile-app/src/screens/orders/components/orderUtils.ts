/**
 * Order display helpers shared by OrdersScreen and OrderDetailScreen.
 * Ports the inline logic of client/src/pages/orders/OrderHistory.js, OrderDetail.js
 * and components/modals/GSTInvoicePreview.js.
 */
import type { BadgeTone, IconName } from '../../../components/ui';
import i18n from '../../../i18n';
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
export const ORDER_FILTERS: { key: string; value?: OrderStatus }[] = [
  { key: 'all' },
  { key: 'pending', value: 'pending' },
  { key: 'assigned', value: 'assigned' },
  { key: 'processing', value: 'processing' },
  { key: 'shipped', value: 'shipped' },
  { key: 'delivered', value: 'delivered' },
  { key: 'cancelled', value: 'cancelled' },
];

/** Customer-facing order/item status label (translated at call time). */
export const orderStatusLabel = (status: string): string =>
  i18n.t(`orders:status.${status}`, { defaultValue: status });

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
  i18n.t(method === 'cod' || !method ? 'orders:payment.cod' : method === 'online' ? 'orders:payment.online' : 'orders:payment.bank');

/** Web OrderDetail payment-status pill. */
/** Label key: orders:paymentStatus.<status>. Unpaid COD is the normal state — never show "Pending" to customers. */
export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, { tone: BadgeTone }> = {
  paid: { tone: 'success' },
  refunded: { tone: 'info' },
  failed: { tone: 'danger' },
  pending: { tone: 'info' },
};

export type DeliveryEta = { label: string; tone: 'success' | 'info' | 'primary'; caption?: string };

const minutesUntil = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 60000);

/** Web OrderHistory card chip: only while processing/shipped; ≤2 h "Arriving", ≤24 h "Expected", past "Delayed". */
export const getListEta = (order: Order): DeliveryEta | null => {
  if (!order.expectedDeliveryDate || (order.orderStatus !== 'processing' && order.orderStatus !== 'shipped')) return null;
  const mins = minutesUntil(order.expectedDeliveryDate);
  if (mins > 0 && mins <= 120) return { label: i18n.t('orders:eta.arrivingMins', { count: mins }), tone: 'success' };
  if (mins > 0 && mins <= 1440) {
    const hours = Math.floor(mins / 60);
    const rest = mins % 60;
    return {
      label: i18n.t('orders:eta.expected', {
        time: hours > 0 ? i18n.t('orders:eta.hoursMins', { hours, mins: rest }) : i18n.t('orders:eta.mins', { count: rest }),
      }),
      tone: 'info',
    };
  }
  if (mins < 0) return { label: i18n.t('orders:eta.delayed'), tone: 'primary' };
  return null;
};

/** Web OrderDetail banner: any open order; ≤2 h "Arriving in N minutes", later → the expected date/time. */
export const getDetailEta = (order: Order): DeliveryEta | null => {
  if (!order.expectedDeliveryDate || !canCancelOrder(order.orderStatus)) return null;
  const mins = minutesUntil(order.expectedDeliveryDate);
  if (mins > 0 && mins <= 120) return { label: i18n.t('orders:eta.arrivingMinutes', { count: mins }), tone: 'success', caption: i18n.t('orders:eta.expectedDelivery') };
  if (mins > 0) return { label: formatDateTime(order.expectedDeliveryDate), tone: 'info', caption: i18n.t('orders:eta.expectedDelivery') };
  return null;
};

/** Customer progress steps; index = how far the order has moved. */
/** `status` is the orders:status.<key> label key. */
export const ORDER_STEPS: { status: OrderStatus; statuses: OrderStatus[]; icon: IconName }[] = [
  { status: 'pending', statuses: ['pending'], icon: 'receipt-outline' },
  { status: 'assigned', statuses: ['approved', 'assigned'], icon: 'checkmark-done-outline' },
  { status: 'processing', statuses: ['processing'], icon: 'cube-outline' },
  { status: 'shipped', statuses: ['shipped'], icon: 'bicycle-outline' },
  { status: 'delivered', statuses: ['delivered'], icon: 'home-outline' },
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
    lines.push({ label: i18n.t('orders:bill.itemTotal'), value: subtotal });
  } else {
    lines.push({ label: i18n.t('orders:bill.taxable'), value: order.subtotalBeforeGST ?? subtotal - tax });
  }
  if (tax > 0) {
    lines.push({ label: 'CGST', value: tax / 2 }, { label: 'SGST', value: tax / 2 });
  }
  if (!exclusive) lines.push({ label: i18n.t('orders:bill.subtotalInclGst'), value: subtotal, emphasis: true });
  lines.push({ label: i18n.t('orders:bill.delivery'), value: delivery, free: true });
  if (fee > 0) lines.push({ label: i18n.t('orders:bill.platformFee'), value: fee });
  return { lines, total };
};

/** Title key: orders:lifecycle.<eventType>. */
const LIFECYCLE_META: Record<string, { icon: IconName; tone: BadgeTone }> = {
  order_created: { icon: 'receipt-outline', tone: 'info' },
  order_assigned: { icon: 'person-outline', tone: 'info' },
  order_accepted: { icon: 'checkmark-circle-outline', tone: 'success' },
  order_rejected: { icon: 'close-circle-outline', tone: 'danger' },
  order_shipped: { icon: 'bicycle-outline', tone: 'warning' },
  order_delivered: { icon: 'home-outline', tone: 'success' },
  order_cancelled: { icon: 'ban-outline', tone: 'danger' },
  payment_confirmed: { icon: 'card-outline', tone: 'success' },
  payment_failed: { icon: 'alert-circle-outline', tone: 'danger' },
  stock_updated: { icon: 'stats-chart-outline', tone: 'neutral' },
  refund_initiated: { icon: 'cash-outline', tone: 'warning' },
  refund_completed: { icon: 'sparkles-outline', tone: 'success' },
};

/** Unknown event types fall back to web formatEventType: "order_status_updated" → "Order Status Updated". */
export const getLifecycleMeta = (event: OrderLifecycleEvent): { icon: IconName; tone: BadgeTone; title: string } => {
  const known = LIFECYCLE_META[event.eventType];
  if (known) return { ...known, title: i18n.t(`orders:lifecycle.${event.eventType}`) };
  return {
    icon: 'document-text-outline' as IconName,
    tone: 'neutral' as BadgeTone,
    title: event.eventType
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
  };
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
