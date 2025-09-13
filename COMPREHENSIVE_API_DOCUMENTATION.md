# COMPREHENSIVE API & FRONTEND DOCUMENTATION
# E-commerce Construction Materials Platform

## Table of Contents
1. [Overview](#overview)
2. [Data Models](#data-models)
3. [Authentication System](#authentication-system)
4. [API Endpoints](#api-endpoints)
5. [Frontend Components](#frontend-components)
6. [Business Logic Flow](#business-logic-flow)
7. [React Native Implementation Guide](#react-native-implementation-guide)

---

## 1. OVERVIEW

This is a multi-role e-commerce platform for construction materials with three main user types:
- **Customers**: Browse and order construction materials
- **Merchants**: Manage inventory and fulfill orders
- **Admins**: Manage the entire platform

### Key Features:
- GPS-based smart merchant selection
- Real-time order tracking with lifecycle management
- Multi-channel notifications (SMS, WhatsApp, Push)
- Dynamic pricing system
- Location-based delivery
- Admin approval workflow for merchants

---

## 2. DATA MODELS

### User Model (models/User.js)
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  address: String,
  area: String,
  role: String (enum: ['customer', 'merchant', 'admin']),
  isActive: Boolean,
  refreshToken: String,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Merchant Model (models/Merchant.js)
```javascript
{
  userId: ObjectId (ref: User),
  name: String,
  businessType: String,
  contact: {
    phone: String,
    email: String
  },
  address: String,
  area: String,
  location: {
    type: String (Point),
    coordinates: [Number] (longitude, latitude),
    address: String,
    area: String
  },
  availability: {
    workingHours: {
      start: String,
      end: String
    },
    isActive: Boolean,
    maxDailyOrders: Number,
    currentDayOrders: Number
  },
  activeStatus: String (enum: ['pending', 'approved', 'rejected', 'suspended']),
  rating: Number,
  totalOrders: Number,
  completedOrders: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Product Model (models/Product.js)
```javascript
{
  name: String,
  description: String,
  category: ObjectId (ref: Category),
  sku: String (unique),
  images: [String],
  specifications: Object,
  tags: [String],
  basePrice: Number,
  unit: String,
  weight: Number,
  enabled: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### MerchantProduct Model (models/MerchantProduct.js)
```javascript
{
  merchantId: ObjectId (ref: Merchant),
  productId: ObjectId (ref: Product),
  price: Number,
  stock: Number,
  enabled: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Order Model (models/Order.js)
```javascript
{
  orderNumber: String (unique),
  customerId: ObjectId (ref: User),
  customerName: String,
  customerPhone: String,
  customerAddress: String,
  customerArea: String,
  deliveryLocation: {
    type: String (Point),
    coordinates: [Number],
    address: String,
    isCurrentLocation: Boolean
  },
  items: [{
    productId: ObjectId (ref: Product),
    productName: String,
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number,
    sku: String,
    unit: String,
    weight: Number,
    assignedMerchantId: ObjectId (ref: Merchant),
    itemStatus: String (enum: ['pending', 'assigned', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected'])
  }],
  subtotal: Number,
  tax: Number,
  deliveryCharge: Number,
  platformFee: Number,
  totalAmount: Number,
  orderStatus: String (enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  paymentStatus: String (enum: ['pending', 'paid', 'failed', 'refunded']),
  paymentMethod: String (enum: ['cod', 'online', 'bank-transfer']),
  deliveryInstructions: String,
  expectedDeliveryDate: Date,
  statusHistory: [{
    status: String,
    timestamp: Date,
    updatedBy: ObjectId (ref: User),
    note: String
  }],
  lifecycle: [{
    stage: String,
    timestamp: Date,
    actor: {
      id: ObjectId,
      type: String,
      name: String
    },
    details: Object
  }],
  pricingBreakdown: Object,
  createdAt: Date,
  updatedAt: Date
}
```

### Category Model (models/Category.js)
```javascript
{
  name: String (unique),
  description: String,
  enabled: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### AppSettings Model (models/AppSettings.js)
```javascript
{
  pricing: {
    taxRate: Number,
    platformFeeRate: Number,
    deliveryConfig: {
      type: String (enum: ['fixed', 'weight-based', 'distance-based', 'threshold']),
      baseRate: Number,
      freeDeliveryThreshold: Number,
      weightMultiplier: Number,
      distanceMultiplier: Number
    },
    minimumOrderValue: Number
  },
  business: {
    name: String,
    description: String,
    supportEmail: String,
    supportPhone: String,
    workingHours: {
      start: String,
      end: String
    }
  },
  features: {
    enableSmartAssignment: Boolean,
    enableLocationTracking: Boolean,
    enableNotifications: Boolean
  },
  updatedBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

---

## 3. AUTHENTICATION SYSTEM

### Authentication Flow
The platform uses JWT-based authentication with refresh tokens.

#### Registration Process
**Endpoint**: `POST /api/auth/register`
**Frontend**: `client/src/pages/auth/Register.js`

```javascript
// Frontend Registration Call
const registerUser = async (userData) => {
  const response = await authAPI.register(userData);
  if (response.data.user.role === 'merchant') {
    navigate('/pending-approval'); // Merchants need approval
  } else {
    navigate('/'); // Customers can login immediately
  }
};
```

#### Registration Fields:
- **Common**: name, email, password, phone, address, area, role
- **Merchant Additional**: GPS coordinates (required for smart selection)

#### Login Process
**Endpoint**: `POST /api/auth/login`
**Frontend**: `client/src/pages/auth/Login.js`

```javascript
// Frontend Login Call
const login = async (credentials) => {
  const response = await authAPI.login(credentials);
  // For merchants, backend checks approval status
  if (response.data.merchantStatus !== 'approved') {
    throw new Error('Merchant account pending approval');
  }
  // Store tokens and redirect based on role
};
```

#### Middleware Protection
**File**: `middleware/auth.js`

```javascript
// Available Middleware Functions:
- verifyToken: Basic JWT verification
- requireCustomer: Customer role required
- requireMerchant: Merchant role required
- requireApprovedMerchant: Approved merchant required
- requireAdmin: Admin role required
- requireMerchantOrAdmin: Either merchant or admin
- optionalAuth: Optional authentication
```

---

## 4. API ENDPOINTS

### 4.1 Authentication APIs (`routes/auth.js`)

#### POST /api/auth/register
**Purpose**: Register new users (customers/merchants)
**Frontend Usage**: Register.js component
**Body**:
```javascript
{
  name: String,
  email: String,
  password: String,
  phone: String,
  address: String,
  area: String,
  role: String, // 'customer' or 'merchant'
  coordinates: [Number] // Required for merchants
}
```
**Response**:
```javascript
{
  message: String,
  user: Object,
  accessToken: String,
  refreshToken: String
}
```

#### POST /api/auth/login
**Purpose**: User authentication
**Frontend Usage**: Login.js component
**Body**:
```javascript
{
  email: String,
  password: String
}
```
**Response**:
```javascript
{
  message: String,
  user: Object,
  merchantStatus: String, // For merchants
  accessToken: String,
  refreshToken: String
}
```

#### POST /api/auth/logout
**Purpose**: Logout user and invalidate tokens
**Frontend Usage**: AuthContext
**Headers**: Authorization: Bearer {token}

#### GET /api/auth/me
**Purpose**: Get current user profile
**Frontend Usage**: AuthContext, multiple components
**Headers**: Authorization: Bearer {token}

### 4.2 User Management APIs (`routes/users.js`)

#### GET /api/users
**Purpose**: Get all users (Admin only)
**Frontend Usage**: admin/Users.js
**Headers**: Authorization: Bearer {token}
**Query Params**: page, limit, role, search

#### PUT /api/users/:id/status
**Purpose**: Update user status (Admin only)
**Frontend Usage**: admin/Users.js
**Body**:
```javascript
{
  isActive: Boolean
}
```

#### PUT /api/users/:id/role
**Purpose**: Update user role (Admin only)
**Frontend Usage**: admin/Users.js
**Body**:
```javascript
{
  role: String
}
```

#### GET /api/users/profile
**Purpose**: Get user profile
**Frontend Usage**: profile/Profile.js

#### PUT /api/users/profile
**Purpose**: Update user profile
**Frontend Usage**: profile/Profile.js

### 4.3 Merchant Management APIs (`routes/merchants.js`)

#### GET /api/merchants
**Purpose**: Get all merchants
**Frontend Usage**: admin/Merchants.js, various components
**Query Params**: page, limit, status, area

#### POST /api/merchants/onboard
**Purpose**: Create new merchant (Admin only)
**Frontend Usage**: admin/Merchants.js

#### PUT /api/merchants/:id/status
**Purpose**: Update merchant status (Admin only)
**Frontend Usage**: admin/Merchants.js
**Body**:
```javascript
{
  activeStatus: String, // 'approved', 'rejected', 'suspended'
  note: String
}
```

#### GET /api/merchants/profile/me
**Purpose**: Get current merchant profile
**Frontend Usage**: merchant/Profile.js
**Headers**: Authorization: Bearer {token}

#### PUT /api/merchants/profile
**Purpose**: Update merchant profile
**Frontend Usage**: merchant/Profile.js

### 4.4 Product Management APIs (`routes/products.js`)

#### GET /api/products
**Purpose**: Get products with filtering
**Frontend Usage**: ProductList.js, Home.js
**Query Params**: page, limit, category, search, sortBy, enabled

#### GET /api/products/:id
**Purpose**: Get single product details
**Frontend Usage**: ProductDetail.js

#### POST /api/products
**Purpose**: Create product (Admin) or add to merchant inventory (Merchant)
**Frontend Usage**: admin/Products.js, merchant/Products.js

**Admin Body** (Create master product):
```javascript
{
  name: String,
  description: String,
  category: ObjectId,
  images: [String],
  specifications: Object,
  tags: [String],
  price: Number,
  unit: String
}
```

**Merchant Body** (Add to inventory):
```javascript
{
  productId: ObjectId,
  price: Number,
  stock: Number,
  enabled: Boolean
}
```

#### PUT /api/products/:id
**Purpose**: Update product
**Frontend Usage**: admin/Products.js

#### PUT /api/products/:id/stock
**Purpose**: Update merchant product stock/price
**Frontend Usage**: merchant/Products.js
**Body**:
```javascript
{
  stock: Number,
  price: Number,
  enabled: Boolean
}
```

#### GET /api/products/merchant/my
**Purpose**: Get merchant's products
**Frontend Usage**: merchant/Products.js

#### GET /api/products/categories
**Purpose**: Get product categories
**Frontend Usage**: Multiple components

#### POST /api/products/categories
**Purpose**: Create category (Admin only)
**Frontend Usage**: admin/Products.js

### 4.5 Order Management APIs (`routes/orders.js`)

#### POST /api/orders
**Purpose**: Create new order
**Frontend Usage**: cart/Checkout.js
**Body**:
```javascript
{
  items: [{
    productId: ObjectId,
    productName: String,
    unitPrice: Number,
    quantity: Number,
    unit: String,
    sku: String,
    totalPrice: Number
  }],
  customerPhone: String,
  customerAddress: String,
  customerArea: String,
  deliveryLocation: {
    type: 'Point',
    coordinates: [Number],
    address: String,
    isCurrentLocation: Boolean
  },
  paymentMethod: String,
  deliveryInstructions: String,
  subtotal: Number,
  tax: Number,
  deliveryCharge: Number,
  totalAmount: Number
}
```

#### GET /api/orders
**Purpose**: Get orders (role-based filtering)
**Frontend Usage**: orders/OrderHistory.js, merchant/Orders.js, admin/Orders.js
**Query Params**: page, limit, status, customerId, merchantId

#### GET /api/orders/:id
**Purpose**: Get single order details
**Frontend Usage**: orders/OrderDetail.js

#### PUT /api/orders/:id/status
**Purpose**: Update order status
**Frontend Usage**: merchant/Orders.js, admin/Orders.js

#### PUT /api/orders/:id/items/:itemId/status
**Purpose**: Update order item status
**Frontend Usage**: merchant/Orders.js

#### PUT /api/orders/:id/items/:itemId/assign
**Purpose**: Merchant accepts order item
**Frontend Usage**: merchant/Orders.js

#### POST /api/orders/:orderId/items/:itemId/reject
**Purpose**: Merchant rejects order item
**Frontend Usage**: merchant/Orders.js

#### GET /api/orders/status/unassigned
**Purpose**: Get unassigned orders for merchants
**Frontend Usage**: merchant/Orders.js

#### GET /api/orders/admin/dashboard
**Purpose**: Get admin dashboard data
**Frontend Usage**: admin/Dashboard.js

#### GET /api/orders/merchant/dashboard
**Purpose**: Get merchant dashboard data
**Frontend Usage**: merchant/Dashboard.js

### 4.6 Notification APIs (`routes/notifications.js`)

#### POST /api/notifications/sms/send
**Purpose**: Send SMS notification
**Frontend Usage**: n8n workflow integration
**Body**:
```javascript
{
  phone: String,
  message: String,
  templateId: String,
  templateData: Object
}
```

#### POST /api/notifications/whatsapp/send
**Purpose**: Send WhatsApp notification
**Frontend Usage**: n8n workflow integration
**Body**:
```javascript
{
  phone: String,
  templateId: String,
  templateData: Object
}
```

### 4.7 Settings APIs (`routes/settings.js`)

#### GET /api/settings
**Purpose**: Get app settings
**Frontend Usage**: admin/Settings.js

#### PUT /api/settings
**Purpose**: Update app settings (Admin only)
**Frontend Usage**: admin/Settings.js

#### POST /api/settings/calculate-pricing
**Purpose**: Calculate dynamic pricing
**Frontend Usage**: cart/Checkout.js

---

## 5. FRONTEND COMPONENTS

### 5.1 Authentication Components

#### Login Component (`pages/auth/Login.js`)
**API Calls**: 
- `authAPI.login(credentials)`

**State Management**:
```javascript
const [credentials, setCredentials] = useState({
  email: '',
  password: ''
});
const [showPassword, setShowPassword] = useState(false);
const [isLoading, setIsLoading] = useState(false);
```

**Flow**:
1. User enters email/password
2. Calls `authAPI.login()`
3. Stores tokens in localStorage
4. Redirects based on user role

#### Register Component (`pages/auth/Register.js`)
**API Calls**:
- `authAPI.register(userData)`
- `navigator.geolocation.getCurrentPosition()` (for merchants)

**State Management**:
```javascript
const [selectedRole, setSelectedRole] = useState('customer');
const [locationData, setLocationData] = useState(null);
const [gettingLocation, setGettingLocation] = useState(false);
```

**Flow**:
1. User selects role (customer/merchant)
2. If merchant: collects GPS coordinates
3. Submits registration
4. Redirects to pending approval (merchants) or home (customers)

### 5.2 Product Components

#### ProductList Component (`pages/products/ProductList.js`)
**API Calls**:
- `productAPI.getProducts(filters)`
- `productAPI.getCategories()`

**Features**:
- Search and filtering
- Category-based filtering
- Pagination
- Add to cart functionality

#### ProductDetail Component (`pages/products/ProductDetail.js`)
**API Calls**:
- `productAPI.getProduct(id)`
- `merchantAPI.getMerchantsByProduct(productId)`

**Features**:
- Product specifications
- Image gallery
- Available merchants list
- Add to cart with quantity selection

### 5.3 Cart & Checkout Components

#### Cart Component (`pages/cart/Cart.js`)
**State**: Uses CartContext
**Features**:
- View cart items
- Update quantities
- Remove items
- Calculate totals
- Proceed to checkout

#### Checkout Component (`pages/cart/Checkout.js`)
**API Calls**:
- `settingsAPI.calculatePricing(items)`
- `orderAPI.createOrder(orderData)`

**State Management**:
```javascript
const [formData, setFormData] = useState({
  customerName: user?.name || '',
  customerPhone: user?.phone || '',
  customerAddress: user?.address || '',
  customerArea: user?.area || '',
  deliveryInstructions: '',
  paymentMethod: 'cod'
});
const [deliveryLocation, setDeliveryLocation] = useState(null);
```

**Flow**:
1. Location confirmation (GPS)
2. Customer details form
3. Dynamic pricing calculation
4. Order creation
5. Redirect to order confirmation

#### LocationConfirmation Component (`components/location/LocationConfirmation.js`)
**Features**:
- GPS location capture
- Manual address entry
- Location validation
- Map integration

### 5.4 Order Management Components

#### OrderHistory Component (`pages/orders/OrderHistory.js`)
**API Calls**:
- `orderAPI.getOrders(params)`

**Features**:
- Order listing with filters
- Status-based filtering
- Order details preview

#### OrderDetail Component (`pages/orders/OrderDetail.js`)
**API Calls**:
- `orderAPI.getOrder(id)`
- `orderAPI.getOrderLifecycle(id)`

**Features**:
- Complete order information
- Order lifecycle tracking
- Status updates

### 5.5 Merchant Components

#### Merchant Dashboard (`pages/merchant/Dashboard.js`)
**API Calls**:
- `orderAPI.getMerchantDashboard()`
- `orderAPI.getUnassignedOrders()`
- `orderAPI.getOrders()`

**Features**:
- Key metrics display
- Unassigned orders list
- Recent orders
- Quick actions

#### Merchant Products (`pages/merchant/Products.js`)
**API Calls**:
- `productAPI.getMerchantProducts()`
- `productAPI.getCategories()`
- `productAPI.getMasterProducts()`
- `productAPI.createProduct()`
- `productAPI.updateStock()`

**Features**:
- Product inventory management
- Add new products to inventory
- Update stock and pricing
- Enable/disable products

#### Merchant Orders (`pages/merchant/Orders.js`)
**API Calls**:
- `orderAPI.getOrders()`
- `orderAPI.updateOrderItemStatus()`
- `orderAPI.assignItem()`
- `orderAPI.rejectItem()`

**Features**:
- Order management
- Accept/reject orders
- Update order status
- Order lifecycle tracking

### 5.6 Admin Components

#### Admin Dashboard (`pages/admin/Dashboard.js`)
**API Calls**:
- `orderAPI.getAdminDashboard()`

**Features**:
- Platform overview
- Key metrics
- Recent activities

#### Admin Users (`pages/admin/Users.js`)
**API Calls**:
- `userAPI.getUsers()`
- `userAPI.updateUserStatus()`
- `userAPI.updateUserRole()`

**Features**:
- User management
- Role assignment
- Account activation/deactivation

#### Admin Merchants (`pages/admin/Merchants.js`)
**API Calls**:
- `merchantAPI.getMerchants()`
- `merchantAPI.updateMerchantStatus()`

**Features**:
- Merchant approval workflow
- Merchant status management
- Merchant details view

#### Admin Products (`pages/admin/Products.js`)
**API Calls**:
- `productAPI.getProducts()`
- `productAPI.createProduct()`
- `productAPI.updateProduct()`
- `productAPI.getCategories()`
- `productAPI.addCategories()`

**Features**:
- Master product catalog management
- Category management
- Product creation and editing

#### Admin Settings (`pages/admin/Settings.js`)
**API Calls**:
- `settingsAPI.getSettings()`
- `settingsAPI.updateSettings()`

**Features**:
- Platform configuration
- Pricing settings
- Business settings
- Feature toggles

---

## 6. BUSINESS LOGIC FLOW

### 6.1 Order Creation Flow

1. **Customer adds products to cart** (`Cart.js`)
2. **Customer proceeds to checkout** (`Checkout.js`)
3. **Location confirmation** (`LocationConfirmation.js`)
   - GPS coordinates captured
   - Address validation
4. **Dynamic pricing calculation** (`settingsAPI.calculatePricing`)
5. **Order creation** (`orderAPI.createOrder`)
6. **Smart merchant selection** (Backend: `utils/geoUtils.js`)
   - Find nearby merchants
   - Calculate merchant scores
   - Send notifications via n8n
7. **Order created with 'pending' status**

### 6.2 Smart Merchant Selection Process

**File**: `utils/geoUtils.js`
**Function**: `smartMerchantSelection()`

```javascript
async function smartMerchantSelection({ 
  orderId, 
  productId, 
  customerLocation, 
  maxDistance = 15, 
  maxMerchants = 3 
}) {
  // 1. Validate customer location
  // 2. Find merchants within distance with the product
  // 3. Calculate merchant scores based on:
  //    - Distance from customer
  //    - Merchant rating
  //    - Current availability
  //    - Order completion rate
  // 4. Rank merchants by score
  // 5. Return top merchants for notification
}
```

### 6.3 Merchant Approval Workflow

1. **Merchant registers** with GPS coordinates
2. **Merchant profile created** with `activeStatus: 'pending'`
3. **Admin reviews application** (`admin/Merchants.js`)
4. **Admin approves/rejects** merchant
5. **If approved**: Merchant can access dashboard
6. **If rejected**: Merchant sees rejection message

### 6.4 Order Assignment Flow

1. **Order created** with items in 'pending' status
2. **Smart merchant selection** finds suitable merchants
3. **Notifications sent** to merchants via n8n
4. **Merchant accepts order** (`assignItem` API)
5. **Item status changes** to 'assigned'
6. **Stock deducted** from merchant inventory
7. **Customer notified** of assignment

### 6.5 Notification Flow

**Integration**: n8n workflow (`comprehensive-notification-workflow.json`)

1. **Backend triggers event** (`NotificationService.js`)
2. **Event sent to n8n** webhook
3. **n8n processes event** based on type:
   - `order_created_smart`: SMS to merchants
   - `order_created`: Confirmation to customer  
   - `order_assigned`: Dual notification
   - `order_completed`: Thank you messages
4. **n8n calls backend APIs**:
   - `POST /api/notifications/sms/send`
   - `POST /api/notifications/whatsapp/send`

---

## 7. REACT NATIVE IMPLEMENTATION GUIDE

### 7.1 Required Libraries

```json
{
  "@react-navigation/native": "Navigation",
  "@react-navigation/stack": "Stack navigation",
  "@react-navigation/bottom-tabs": "Tab navigation", 
  "@tanstack/react-query": "Data fetching",
  "react-native-async-storage": "Local storage",
  "react-native-geolocation-service": "GPS location",
  "react-native-maps": "Map integration",
  "axios": "HTTP client",
  "react-native-push-notification": "Push notifications",
  "react-native-image-picker": "Image selection",
  "react-native-vector-icons": "Icons"
}
```

### 7.2 Core Services to Implement

#### Authentication Service
```javascript
// services/authService.js
class AuthService {
  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    await AsyncStorage.setItem('accessToken', response.data.accessToken);
    await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
    return response.data;
  }

  async register(userData) {
    const response = await api.post('/auth/register', userData);
    if (userData.role === 'merchant') {
      // Handle merchant pending approval
    }
    return response.data;
  }

  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      });
    });
  }
}
```

#### API Client
```javascript
// services/apiClient.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000
});

// Request interceptor for auth tokens
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post('/auth/refresh', { refreshToken });
          await AsyncStorage.setItem('accessToken', response.data.accessToken);
          // Retry original request
          return api(error.config);
        } catch (refreshError) {
          // Redirect to login
          await AsyncStorage.clear();
        }
      }
    }
    return Promise.reject(error);
  }
);
```

### 7.3 Navigation Structure

```javascript
// navigation/AppNavigator.js
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Customer Tab Navigator
function CustomerTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Products" component={ProductListScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Orders" component={OrderHistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Merchant Tab Navigator  
function MerchantTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={MerchantDashboardScreen} />
      <Tab.Screen name="Products" component={MerchantProductsScreen} />
      <Tab.Screen name="Orders" component={MerchantOrdersScreen} />
      <Tab.Screen name="Analytics" component={MerchantAnalyticsScreen} />
      <Tab.Screen name="Profile" component={MerchantProfileScreen} />
    </Tab.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { user } = useAuth();
  
  return (
    <Stack.Navigator>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
        </>
      ) : user.role === 'customer' ? (
        <Stack.Screen name="CustomerApp" component={CustomerTabs} />
      ) : user.role === 'merchant' ? (
        <Stack.Screen name="MerchantApp" component={MerchantTabs} />
      ) : (
        <Stack.Screen name="AdminApp" component={AdminNavigator} />
      )}
    </Stack.Navigator>
  );
}
```

### 7.4 Key Screen Components

#### Location Selection Screen
```javascript
// screens/LocationSelectionScreen.js
import MapView, { Marker } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';

export default function LocationSelectionScreen({ onLocationSelect }) {
  const [region, setRegion] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
        setSelectedLocation({ latitude, longitude });
      },
      (error) => console.error(error),
      { enableHighAccuracy: true }
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        region={region}
        onPress={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
      >
        {selectedLocation && <Marker coordinate={selectedLocation} />}
      </MapView>
      <Button title="Confirm Location" onPress={() => onLocationSelect(selectedLocation)} />
    </View>
  );
}
```

#### Product List Screen
```javascript
// screens/ProductListScreen.js
export default function ProductListScreen() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productAPI.getProducts()
  });

  const { addToCart } = useCart();

  const renderProduct = ({ item }) => (
    <ProductCard 
      product={item} 
      onAddToCart={() => addToCart(item)}
      onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
    />
  );

  return (
    <FlatList
      data={products?.products || []}
      renderItem={renderProduct}
      keyExtractor={(item) => item._id}
      refreshing={isLoading}
    />
  );
}
```

#### Checkout Screen
```javascript
// screens/CheckoutScreen.js
export default function CheckoutScreen() {
  const { cart, clearCart } = useCart();
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [customerDetails, setCustomerDetails] = useState({});

  const createOrderMutation = useMutation({
    mutationFn: orderAPI.createOrder,
    onSuccess: () => {
      clearCart();
      navigation.navigate('OrderConfirmation');
    }
  });

  const handlePlaceOrder = () => {
    const orderData = {
      ...customerDetails,
      deliveryLocation,
      items: cart.map(item => ({
        productId: item._id,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity
      }))
    };
    createOrderMutation.mutate(orderData);
  };

  return (
    <ScrollView>
      <LocationSelector onLocationSelect={setDeliveryLocation} />
      <CustomerDetailsForm onDetailsChange={setCustomerDetails} />
      <OrderSummary items={cart} />
      <Button title="Place Order" onPress={handlePlaceOrder} />
    </ScrollView>
  );
}
```

### 7.5 Push Notification Integration

```javascript
// services/notificationService.js
import PushNotification from 'react-native-push-notification';

class NotificationService {
  configure() {
    PushNotification.configure({
      onNotification: function(notification) {
        if (notification.userInteraction) {
          // Handle notification tap
          this.handleNotificationTap(notification);
        }
      },
      requestPermissions: Platform.OS === 'ios'
    });
  }

  handleNotificationTap(notification) {
    const { type, orderId } = notification.data;
    
    switch (type) {
      case 'smart_order_alert':
        // Navigate to order assignment screen
        break;
      case 'order_assigned':
        // Navigate to order details
        break;
      case 'order_completed':
        // Navigate to order history
        break;
    }
  }

  showLocalNotification(title, message, data) {
    PushNotification.localNotification({
      title,
      message,
      userInfo: data
    });
  }
}

export default new NotificationService();
```

### 7.6 Context Providers

#### Auth Context
```javascript
// contexts/AuthContext.js
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        const response = await authAPI.me();
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    setUser(response.user);
    return response;
  };

  const logout = async () => {
    await AsyncStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### Cart Context
```javascript
// contexts/CartContext.js
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const savedCart = await AsyncStorage.getItem('cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const saveCart = async (newCart) => {
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(newCart));
      setCart(newCart);
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addToCart = (product, quantity = 1) => {
    const existingItem = cart.find(item => item._id === product._id);
    
    if (existingItem) {
      const updatedCart = cart.map(item =>
        item._id === product._id 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
      saveCart(updatedCart);
    } else {
      saveCart([...cart, { ...product, quantity }]);
    }
  };

  const removeFromCart = (productId) => {
    const updatedCart = cart.filter(item => item._id !== productId);
    saveCart(updatedCart);
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    const updatedCart = cart.map(item =>
      item._id === productId ? { ...item, quantity } : item
    );
    saveCart(updatedCart);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal
    }}>
      {children}
    </CartContext.Provider>
  );
};
```

---

## 8. ADDITIONAL CRITICAL DETAILS

### 8.1 Complete Order Flow Analysis

#### Order Creation Process (`routes/orders.js`)
```javascript
router.post('/', [verifyToken, requireCustomer], async (req, res) => {
  // 1. Validate request body
  // 2. Get pricing calculator with current settings
  // 3. Validate items and calculate prices
  // 4. Check stock availability across all merchants
  // 5. Calculate totals using centralized pricing
  // 6. Generate unique order number
  // 7. Create order with 'pending' status
  // 8. Log order creation event
  // 9. Trigger smart merchant selection
  // 10. Send notifications via NotificationService
  // 11. Return order confirmation
});
```

#### Smart Merchant Selection Process (`utils/geoUtils.js`)
```javascript
async function smartMerchantSelection({ 
  orderId, productId, customerLocation, maxDistance = 15, maxMerchants = 3 
}) {
  // 1. Validate customer coordinates
  // 2. Find merchants within maxDistance using MongoDB $near
  // 3. Filter merchants with active availability
  // 4. Calculate merchant scores based on:
  //    - Distance from customer (closer = higher score)
  //    - Merchant rating
  //    - Current day order count vs max capacity
  //    - Historical completion rate
  // 5. Sort by score (highest first)
  // 6. Return top merchants for notification
  // 7. Each merchant gets priority level: high (80+), medium (60-79), low (<60)
}
```

#### Order Assignment Flow
1. **Merchant receives notification** with order details
2. **Merchant clicks "ACCEPT"** → calls `assignItem` API
3. **Backend updates order**:
   - Item status: `pending` → `assigned`
   - Assigns `assignedMerchantId`
   - Deducts stock from MerchantProduct
   - Logs assignment event
4. **Customer gets notified** of assignment
5. **Order lifecycle updated** with merchant details

### 8.2 Notification System Architecture

#### NotificationService Integration (`services/NotificationService.js`)
```javascript
class NotificationService {
  // Sends events to n8n webhook which handles:
  // 1. Event routing by type
  // 2. Template generation
  // 3. Multi-channel delivery (SMS/WhatsApp)
  // 4. Error handling and retries

  async processOrderEvent(eventType, eventData) {
    // Smart order creation → merchant notifications
    if (eventType === 'order_created') {
      await this.processSmartOrderCreated(eventData);
    }
    
    // Order assignment → dual notifications
    if (eventType === 'order_assigned') {
      await this.processOrderAssigned(eventData);
    }
  }
}
```

#### n8n Workflow Integration
- **Webhook Endpoint**: Receives all order events
- **Event Routing**: Routes to appropriate processors
- **Template Engine**: Generates SMS/WhatsApp messages
- **API Calls**: Uses backend `/api/notifications/sms/send` and `/api/notifications/whatsapp/send`

### 8.3 Frontend-Backend API Mapping

#### Complete API Service Structure (`client/src/services/api.js`)
```javascript
// Base Configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Automatic token attachment + refresh logic
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token refresh on 401 errors
api.interceptors.response.use(response => response, async error => {
  if (error.response?.status === 401 && !error.config._retry) {
    // Attempt token refresh
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      const response = await axios.post('/api/auth/refresh', { refreshToken });
      // Update tokens and retry request
    }
  }
});
```

### 8.4 State Management Patterns

#### AuthContext Pattern (`client/src/contexts/AuthContext.js`)
```javascript
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('accessToken'));

  // Auto-login check on app start
  useEffect(() => {
    if (token) {
      api.get('/api/auth/me').then(response => {
        setUser(response.data.user);
      }).catch(() => logout());
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    const { user: userData, accessToken, refreshToken } = response.data;
    
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    
    // Role-based navigation
    if (userData.role === 'admin') navigate('/admin');
    else if (userData.role === 'merchant') navigate('/merchant');
    else navigate('/');
  };
};
```

#### CartContext Pattern (`client/src/contexts/CartContext.js`)
```javascript
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  
  // Persistent cart in localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item._id === product._id);
      if (existing) {
        return prevCart.map(item =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { ...product, quantity }];
    });
  };
};
```

### 8.5 Critical Business Rules

#### Stock Management
- **Centralized Stock Calculation**: Aggregates stock across all merchants for a product
- **Stock Deduction**: Happens only on order assignment, not creation
- **Stock Validation**: Checked during order creation against total available stock

#### Pricing System (`utils/pricingUtils.js`)
- **Dynamic Pricing**: Calculated based on app settings
- **Tax Calculation**: Configurable tax rate applied to subtotal
- **Delivery Charges**: Multiple models (fixed, weight-based, distance-based, threshold)
- **Platform Fee**: Percentage-based fee on order value

#### Location Services
- **GPS Integration**: Required for merchant registration
- **Geospatial Queries**: MongoDB $near queries for merchant selection
- **Distance Calculation**: Haversine formula for accurate distance
- **Location Validation**: Coordinates must be valid longitude/latitude

### 8.6 Security & Validation

#### Authentication Security
- **JWT Tokens**: Access tokens (15min) + Refresh tokens (7 days)
- **Password Hashing**: bcrypt with salt rounds
- **Role-based Access**: Middleware enforces permissions
- **Token Refresh**: Automatic refresh on 401 errors

#### Input Validation (`express-validator`)
```javascript
// Order creation validation
body('items').isArray({ min: 1 }).withMessage('At least one item required'),
body('items.*.productId').isMongoId().withMessage('Valid product ID required'),
body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
body('customerPhone').trim().notEmpty().withMessage('Phone number required'),
body('customerAddress').trim().notEmpty().withMessage('Address required')
```

### 8.7 Error Handling Patterns

#### Backend Error Handling
```javascript
try {
  // Operation logic
} catch (error) {
  console.error('Operation failed:', error);
  res.status(500).json({ 
    message: 'Server error', 
    error: process.env.NODE_ENV === 'development' ? error.message : undefined 
  });
}
```

#### Frontend Error Handling
```javascript
// React Query error handling
const { data, isLoading, error } = useQuery({
  queryKey: ['products'],
  queryFn: productAPI.getProducts,
  onError: (error) => {
    toast.error(error.response?.data?.message || 'Failed to load products');
  }
});

// Mutation error handling  
const createOrderMutation = useMutation({
  mutationFn: orderAPI.createOrder,
  onSuccess: () => {
    toast.success('Order placed successfully!');
    navigate('/orders');
  },
  onError: (error) => {
    console.error('Order creation failed:', error);
    toast.error(error.response?.data?.message || 'Failed to place order');
  }
});
```

### 8.8 Performance Optimizations

#### Backend Optimizations
- **Database Indexing**: Indexes on frequently queried fields
- **Aggregation Pipelines**: Efficient data aggregation for dashboards
- **Caching**: Query result caching where appropriate
- **Pagination**: All list APIs support pagination

#### Frontend Optimizations
- **React Query**: Caching, background updates, optimistic updates
- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Multiple image sizes, lazy loading
- **Bundle Splitting**: Code splitting for better performance

---

## 9. REACT NATIVE IMPLEMENTATION CHECKLIST

### 9.1 Essential Packages
```json
{
  "dependencies": {
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/stack": "^6.3.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "@tanstack/react-query": "^4.0.0",
    "react-native-async-storage": "^1.19.0",
    "react-native-geolocation-service": "^5.3.0",
    "react-native-maps": "^1.7.0",
    "axios": "^1.4.0",
    "react-native-push-notification": "^8.1.0",
    "react-native-image-picker": "^5.6.0",
    "react-native-vector-icons": "^10.0.0",
    "react-native-toast-message": "^2.1.0",
    "react-native-permissions": "^3.8.0",
    "react-native-device-info": "^10.8.0"
  }
}
```

### 9.2 Core Implementation Structure
```
src/
├── components/
│   ├── common/
│   ├── forms/
│   └── navigation/
├── contexts/
│   ├── AuthContext.js
│   ├── CartContext.js
│   └── ThemeContext.js
├── screens/
│   ├── auth/
│   ├── customer/
│   ├── merchant/
│   └── admin/
├── services/
│   ├── apiClient.js
│   ├── authService.js
│   ├── locationService.js
│   └── notificationService.js
├── utils/
│   ├── constants.js
│   ├── helpers.js
│   └── validators.js
└── navigation/
    ├── AppNavigator.js
    ├── AuthNavigator.js
    └── TabNavigator.js
```

### 9.3 Key Differences from Web Implementation

#### Storage Management
- **Web**: `localStorage`
- **Mobile**: `AsyncStorage`

#### Navigation
- **Web**: React Router
- **Mobile**: React Navigation

#### Location Services
- **Web**: `navigator.geolocation`  
- **Mobile**: `react-native-geolocation-service`

#### Push Notifications
- **Web**: Web Push API
- **Mobile**: `react-native-push-notification` + FCM

#### Image Handling
- **Web**: File input + upload
- **Mobile**: `react-native-image-picker` + camera/gallery

### 9.4 Platform-Specific Features to Add

#### iOS Specific
- **Apple Maps Integration**: Alternative to Google Maps
- **iOS Push Certificates**: APNs configuration
- **App Store Guidelines**: Compliance requirements

#### Android Specific
- **Google Play Services**: Location services dependency
- **FCM Configuration**: Firebase Cloud Messaging
- **Permissions**: Runtime permission handling

---

## 10. TESTING STRATEGY

### 10.1 API Testing
- **Unit Tests**: Individual API endpoint testing
- **Integration Tests**: Full workflow testing
- **Load Testing**: Performance under stress
- **Security Testing**: Authentication and authorization

### 10.2 Frontend Testing
- **Component Tests**: Individual component functionality
- **Integration Tests**: Component interaction
- **E2E Tests**: Complete user journeys
- **Device Testing**: Multiple devices and OS versions

---

This comprehensive documentation now covers every aspect of the platform's API and frontend implementation, including all critical business logic, security patterns, and performance optimizations. Use this as your complete reference for building the React Native application with identical functionality and business logic.