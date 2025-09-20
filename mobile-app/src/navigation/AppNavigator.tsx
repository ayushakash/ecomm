import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { THEME, SIZES } from '../theme';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import PendingApprovalScreen from '../screens/auth/PendingApprovalScreen';

// Customer Screens
import CustomerHomeScreen from '../screens/customer/HomeScreen';
import ProductListScreen from '../screens/customer/ProductListScreen';
import ProductDetailScreen from '../screens/customer/ProductDetailScreen';
import CartScreen from '../screens/customer/CartScreen';
import CheckoutScreen from '../screens/customer/CheckoutScreen';
import OrdersScreen from '../screens/customer/OrdersScreen';
import OrderDetailScreen from '../screens/customer/OrderDetailScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import AddressListScreen from '../screens/customer/AddressListScreen';
import AddEditAddressScreen from '../screens/customer/AddEditAddressScreen';
import OrderSuccessScreen from '../screens/customer/OrderSuccessScreen';

// Merchant Screens
import MerchantDashboardScreen from '../screens/merchant/DashboardScreen';
import MerchantProductsScreen from '../screens/merchant/ProductsScreen';
import MerchantOrdersScreen from '../screens/merchant/OrdersScreen';
import MerchantProfileScreen from '../screens/merchant/ProfileScreen';
import MerchantAnalyticsScreen from '../screens/merchant/AnalyticsScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/DashboardScreen';
import AdminUsersScreen from '../screens/admin/UsersScreen';
import AdminMerchantsScreen from '../screens/admin/MerchantsScreen';
import AdminOrdersScreen from '../screens/admin/OrdersScreen';
import AdminProductsScreen from '../screens/admin/ProductsScreen';
import AdminAnalyticsScreen from '../screens/admin/AnalyticsScreen';
import AdminSettingsScreen from '../screens/admin/SettingsScreen';

// Common Screens
import LoadingScreen from '../screens/common/LoadingScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Auth Stack
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: THEME.primary,
      },
      headerTintColor: THEME.background,
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen 
      name="Login" 
      component={LoginScreen} 
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="Register" 
      component={RegisterScreen}
      options={{ title: 'Sign Up' }}
    />
    <Stack.Screen 
      name="ForgotPassword" 
      component={ForgotPasswordScreen}
      options={{ title: 'Reset Password' }}
    />
    <Stack.Screen 
      name="PendingApproval" 
      component={PendingApprovalScreen}
      options={{ title: 'Pending Approval', headerLeft: () => null }}
    />
  </Stack.Navigator>
);

// Guest Tab Navigator (for non-logged in users)
const GuestTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Products':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Cart':
              iconName = focused ? 'cart' : 'cart-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: THEME.primary,
        tabBarInactiveTintColor: THEME.textMuted,
        tabBarStyle: {
          backgroundColor: THEME.background,
          borderTopColor: THEME.border,
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, SIZES.sm),
          paddingTop: SIZES.sm,
          height: SIZES.tabBarHeight + Math.max(insets.bottom - SIZES.sm, 0),
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen name="Home" component={CustomerHomeScreen} />
      <Tab.Screen name="Products" component={ProductListScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
    </Tab.Navigator>
  );
};

// Customer Tab Navigator (for logged in users)
const CustomerTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, // Remove all navigation headers
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Products':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Cart':
              iconName = focused ? 'cart' : 'cart-outline';
              break;
            case 'Orders':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: THEME.primary,
        tabBarInactiveTintColor: THEME.textMuted,
        tabBarStyle: {
          backgroundColor: THEME.background,
          borderTopColor: THEME.border,
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, SIZES.sm),
          paddingTop: SIZES.sm,
          height: SIZES.tabBarHeight + Math.max(insets.bottom - SIZES.sm, 0),
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen name="Home" component={CustomerHomeScreen} />
      <Tab.Screen name="Products" component={ProductListScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Merchant Drawer Navigator
const MerchantDrawer = () => (
  <Drawer.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: THEME.primary,
      },
      headerTintColor: THEME.background,
      headerTitleStyle: {
        fontWeight: 'bold',
      },
      drawerActiveTintColor: THEME.primary,
      drawerInactiveTintColor: THEME.text,
    }}
  >
    <Drawer.Screen 
      name="Dashboard" 
      component={MerchantDashboardScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <MaterialIcons name="dashboard" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Products" 
      component={MerchantProductsScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <Ionicons name="cube-outline" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Orders" 
      component={MerchantOrdersScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <Ionicons name="receipt-outline" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Analytics" 
      component={MerchantAnalyticsScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <Ionicons name="analytics-outline" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Profile" 
      component={MerchantProfileScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <Ionicons name="person-outline" size={size} color={color} />
        ),
      }}
    />
  </Drawer.Navigator>
);

// Admin Drawer Navigator
const AdminDrawer = () => (
  <Drawer.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: THEME.primary,
      },
      headerTintColor: THEME.background,
      headerTitleStyle: {
        fontWeight: 'bold',
      },
      drawerActiveTintColor: THEME.primary,
      drawerInactiveTintColor: THEME.text,
    }}
  >
    <Drawer.Screen 
      name="Dashboard" 
      component={AdminDashboardScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <MaterialIcons name="dashboard" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Users" 
      component={AdminUsersScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <Ionicons name="people-outline" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Merchants" 
      component={AdminMerchantsScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <Ionicons name="storefront-outline" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Orders" 
      component={AdminOrdersScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <Ionicons name="receipt-outline" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Products" 
      component={AdminProductsScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <Ionicons name="cube-outline" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Analytics" 
      component={AdminAnalyticsScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <Ionicons name="analytics-outline" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Settings" 
      component={AdminSettingsScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <Ionicons name="settings-outline" size={size} color={color} />
        ),
      }}
    />
  </Drawer.Navigator>
);

// Main App Stack
const AppStack = () => {
  const { user, isCustomer, isMerchant, isAdmin } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Guest/Customer screens - accessible without login */}
      <Stack.Screen
        name="GuestMain"
        component={user && isCustomer ? CustomerTabs : GuestTabs}
      />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ headerShown: false }} />

      {/* Authenticated user screens */}
      {user && isCustomer && (
        <>
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          <Stack.Screen name="AddressManagement" component={AddressListScreen} />
          <Stack.Screen name="AddEditAddress" component={AddEditAddressScreen} />
        </>
      )}

      {user && isMerchant && (
        <Stack.Screen name="MerchantMain" component={MerchantDrawer} />
      )}

      {user && isAdmin && (
        <Stack.Screen name="AdminMain" component={AdminDrawer} />
      )}

      {/* Auth screens accessible from guest mode */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

// Main Navigator
const AppNavigator: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <AppStack />
    </NavigationContainer>
  );
};

export default AppNavigator;