/**
 * Domain types mirroring the Express/Mongoose models (models/*.js).
 * Only fields the customer app reads are typed; servers may send more.
 */

export type GstType = 'inclusive' | 'exclusive' | 'no-gst';
export type ProductUnit = 'kg' | 'ton' | 'bag' | 'piece' | 'cubic-meter' | 'sq-ft';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'customer' | 'merchant' | 'admin';
  isActive?: boolean;
  isPhoneVerified?: boolean;
  authProvider?: 'local' | 'google' | string;
  googleId?: string;
  createdAt?: string;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  image?: string;
}

export interface ProductVariant {
  _id?: string;
  label: string;
  price: number;
  stock: number;
  sku?: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  /** Populated `{ _id, name }` on list/detail endpoints; raw id otherwise. */
  category: Category | string;
  images: string[];
  specifications?: {
    brand?: string;
    grade?: string;
    weight?: number;
    dimensions?: { length?: number; width?: number; height?: number; unit?: string };
    [key: string]: unknown;
  };
  tags?: string[];
  enabled?: boolean;
  sku?: string;
  /** Customer display price (server-computed for the city). */
  price: number;
  /** Printed MRP for strikethrough; 0 = hidden. */
  mrp?: number;
  unit: ProductUnit | string;
  weight?: number;
  /** Qty threshold to surface bulk WhatsApp CTA (0 = hidden). */
  bulkMinQty?: number;
  gstRate?: number;
  gstType?: GstType;
  variants?: ProductVariant[];
  /** Sum across serving merchants (server-computed). */
  totalStock?: number;
  stock?: number;
  rating?: number;
  reviewCount?: number;
  createdAt?: string;
}

export interface ProductListResponse {
  products: Product[];
  totalProducts: number;
  totalPages: number;
  currentPage: number;
}

export interface ProductQuery {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  /** Merchants serving the user (LocationContext.activeMerchantIds); sent comma-joined. */
  merchantIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  /** Server sort. Web sorts price-low/price-high client-side on the fetched page. */
  sortBy?: 'name' | 'price' | 'latest';
  cityId?: string;
}

export type AddressType = 'home' | 'office' | 'other';

export interface Address {
  _id: string;
  user?: string;
  title: string;
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  coordinates?: Partial<Coordinates>;
  isDefault?: boolean;
  addressType?: AddressType;
  deliveryInstructions?: string;
  createdAt?: string;
}

export type AddressInput = Omit<Address, '_id' | 'user' | 'createdAt'>;

export interface Merchant {
  _id: string;
  name: string;
  businessName?: string;
  city?: string;
  state?: string;
  area?: string;
  distance?: number;
  isNearby?: boolean;
  [key: string]: unknown;
}

export interface AvailableCity {
  city: string;
  state: string;
  merchantCount: number;
}

export interface NearbyMerchantsRequest {
  addressId?: string;
  coordinates?: Partial<Coordinates>;
  city?: string;
  state?: string;
  area?: string;
  pincode?: string;
}

export interface NearbyMerchantsResponse {
  merchants: Merchant[];
  count: number;
  searchRadius: number | string;
  fallbackApplied: boolean;
  searchType?: 'radius-based' | 'city-wide';
  nearbyCount?: number;
  cityWideCount?: number;
}

export interface CityMaster {
  _id: string;
  cityName: string;
  state?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

export interface CartItem {
  /** `${productId}` or `${productId}_${variantLabel}` */
  cartKey: string;
  _id: string;
  name: string;
  variantLabel: string | null;
  price: number;
  unit: string;
  quantity: number;
  images: string[];
  stock: number;
  sku?: string;
  weight: number;
  gstRate?: number;
  gstType?: GstType;
  /** Present on items carried over from older carts; checkout validates against merchantIds. */
  merchantId?: string;
}

export interface CartTotalsItemInput {
  productId: string;
  quantity: number;
  variantLabel?: string | null;
}

export interface GstBreakdown {
  mode: GstType;
  merchantGST: number;
  platformGST: number;
  totalGST: number;
  isDummyGST?: boolean;
  cgst?: number;
  sgst?: number;
  [key: string]: unknown;
}

export interface CartTotals {
  success?: boolean;
  items?: { productId: string; productName: string; quantity: number; unitPrice: number; totalPrice: number }[];
  subtotalBeforeGST: number;
  subtotal: number;
  tax: number;
  deliveryCharges: number;
  platformFee: number;
  totalAmount: number;
  gstBreakdown?: GstBreakdown;
  deliverySplit?: Record<string, unknown>;
  platformFeeBreakdown?: Record<string, unknown>;
  breakdown?: Record<string, unknown>;
}

export type OrderStatus = 'pending' | 'approved' | 'assigned' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  _id: string;
  productId: string | Product;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit?: string;
  sku?: string;
  variantLabel?: string | null;
  gstRate?: number;
  gstType?: GstType;
  itemStatus: OrderStatus;
  assignedMerchantName?: string;
}

export interface OrderStatusHistoryEntry {
  status: OrderStatus | string;
  timestamp?: string;
  note?: string;
  updatedBy?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customerId?: string | Pick<User, '_id' | 'name' | 'email' | 'phone'>;
  customerName?: string;
  customerPhone: string;
  customerAddress: string;
  customerArea?: string;
  /** Populated by GET /orders and GET /orders/:id (utils/orderCleanup.js); bare id otherwise. */
  deliveryAddressId?: string | OrderDeliveryAddress;
  items: OrderItem[];
  subtotal: number;
  subtotalBeforeGST?: number;
  tax: number;
  deliveryCharge: number;
  platformFee?: number;
  totalAmount: number;
  gstBreakdown?: GstBreakdown;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'cod' | 'online' | 'bank-transfer';
  requireGSTBill?: boolean;
  deliveryInstructions?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  statusHistory?: OrderStatusHistoryEntry[];
  createdAt: string;
  updatedAt?: string;
}

export interface OrderListResponse {
  orders: Order[];
  totalPages: number;
  currentPage: number;
  total: number;
}

export interface CreateOrderItemInput {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  sku?: string;
  variantLabel: string | null;
  totalPrice: number;
}

/** Body for POST /orders — exactly what web Checkout.js sends. */
export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerArea: string;
  paymentMethod: 'cod';
  deliveryInstructions?: string;
  deliveryLocation?: { coordinates: [number, number]; address?: unknown; isCurrentLocation?: boolean } | null;
  addressId: string;
  requireGSTBill?: boolean;
  items: CreateOrderItemInput[];
  subtotal: number;
  tax: number;
  deliveryCharge: number;
  totalAmount: number;
}

export interface CreateOrderResponse {
  message: string;
  order: Order;
  pricingBreakdown?: CartTotals;
}

/** Populated delivery address on an order (subset of Address). */
export type OrderDeliveryAddress = Pick<
  Address,
  '_id' | 'fullName' | 'phoneNumber' | 'addressLine1' | 'addressLine2' | 'landmark' | 'area' | 'city' | 'state' | 'pincode' | 'addressType' | 'title'
>;

export type OrderLifecycleEventType =
  | 'order_created'
  | 'order_assigned'
  | 'order_accepted'
  | 'order_rejected'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'payment_confirmed'
  | 'payment_failed'
  | 'stock_updated'
  | 'refund_initiated'
  | 'refund_completed';

/** models/Order.js lifecycle[] entry. */
export interface OrderLifecycleEvent {
  eventType: OrderLifecycleEventType | string;
  timestamp: string;
  eventDescription?: string;
  triggeredBy?: {
    userId?: string;
    userType?: 'customer' | 'merchant' | 'admin' | 'system';
    userName?: string;
    userPhone?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface PublicSettings {
  bulkOrderPhone: string;
  serviceAreasNote: string;
  minimumOrderValue: number;
  callOrderPhone: string;
}

export type BannerCtaType = 'none' | 'products' | 'category' | 'product' | 'url' | 'whatsapp' | 'calculator';

/** Admin-managed home carousel offer (routes/banners.js). */
export interface Banner {
  _id: string;
  badge?: string;
  title: string;
  highlight?: string;
  body?: string;
  imageUrl?: string;
  gradientFrom: string;
  gradientTo: string;
  ctaType: BannerCtaType;
  ctaValue?: string;
  ctaLabel?: string;
  sortOrder: number;
}

export interface PricingItemInput {
  price: number;
  quantity: number;
  gstRate?: number;
  gstType?: GstType;
  weight?: number;
}

export interface DeliveryPreview {
  deliveryConfig: Record<string, unknown>;
  taxRate: number;
  preview: { orderValue: number; deliveryCharges: number; tax: number; total: number }[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  message?: string;
  user: User;
}

export interface SendOtpResponse {
  message: string;
  userExists: boolean;
  userRole: User['role'] | null;
  phone: string;
  channel: string;
  /** Only returned when the backend runs in dev / OTP provider disabled. */
  otp?: string;
}

export interface GoogleAuthResponse extends AuthResponse {
  phoneRequired: boolean;
}

export interface Review {
  _id: string;
  product: string;
  user?: Pick<User, '_id' | 'name'>;
  rating: number;
  title?: string;
  comment?: string;
  helpfulCount?: number;
  createdAt: string;
}

export interface CalculatorLeadInput {
  name: string;
  phone: string;
  city?: string;
  area?: number;
  floors?: number;
  totalCost?: number;
  priceMode?: string;
  materials?: unknown;
}

/** Result of reverse geocoding (backend /geo — Ola, OSM fallback — or on-device OSM). */
export interface GeocodedPlace {
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  /** Display locality, e.g. "Kadru, Ashok Nagar" (neighborhood + sublocality). */
  area?: string;
  formattedAddress?: string;
  coordinates: Coordinates;
}

/** Search-as-you-type suggestion (GET /geo/search). */
export interface PlaceSuggestion {
  title: string;
  subtitle?: string;
  formattedAddress?: string;
  pincode?: string;
  coordinates: Coordinates;
}

/** One material's market price for a city (routes/analytics.js GET /analytics/city-prices/:city). */
export interface CityPriceStat {
  avg: number;
  min: number;
  max: number;
  count: number;
  /** true = averaged from live merchant products; false = standard fallback rate. */
  isLive: boolean;
  /** Up to 5 matching product names (live only). */
  brands?: string[];
}

export type CityPriceMaterial = 'cement' | 'steel' | 'sand' | 'aggregate' | 'bricks';

export interface CityPricesResponse {
  success: boolean;
  city: string;
  merchantCount: number;
  /** null when the city has no approved merchants. */
  prices: Record<CityPriceMaterial, CityPriceStat> | null;
  lastUpdated?: string;
  message?: string;
}
