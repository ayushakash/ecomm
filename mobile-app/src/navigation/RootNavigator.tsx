import { DefaultTheme, NavigationContainer, type LinkingOptions, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import React from 'react';
import { RequireAuth } from '../components/RequireAuth';
import AddEditAddressScreen from '../screens/account/AddEditAddressScreen';
import AddressesScreen from '../screens/account/AddressesScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import CalculatorScreen from '../screens/calculator/CalculatorScreen';
import CheckoutScreen from '../screens/cart/CheckoutScreen';
import OrderSuccessScreen from '../screens/cart/OrderSuccessScreen';
import LocationPickerScreen from '../screens/location/LocationPickerScreen';
import MapPickerScreen from '../screens/location/MapPickerScreen';
import OrderDetailScreen from '../screens/orders/OrderDetailScreen';
import ProductDetailScreen from '../screens/products/ProductDetailScreen';
import SearchScreen from '../screens/products/SearchScreen';
import { colors } from '../theme';
import { MainTabs } from './MainTabs';
import type { RootStackParamList, RootStackScreenProps } from './types';
import { getInitialNotificationUrl, subscribeNotificationUrls } from '../services/notifications';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.secondary,
  },
};

/** chardeevari://product/<id>, chardeevari://orders/<id>, chardeevari://cart … */
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'chardeevari://'],
  // Push notifications carry a chardeevari:// deep link in data.url (services/ExpoPushService.js).
  async getInitialURL() {
    return (await Linking.getInitialURL()) ?? (await getInitialNotificationUrl());
  },
  subscribe(listener) {
    const linkSub = Linking.addEventListener('url', ({ url }) => listener(url));
    const unsubscribeNotifications = subscribeNotificationUrls(listener);
    return () => {
      linkSub.remove();
      unsubscribeNotifications();
    };
  },
  config: {
    screens: {
      MainTabs: {
        screens: { HomeTab: '', ProductsTab: 'products', CartTab: 'cart', OrdersTab: 'orders', AccountTab: 'account' },
      },
      ProductDetail: 'product/:productId',
      OrderDetail: 'orders/:orderId',
      Calculator: 'calculator',
      Search: 'search',
    },
  },
};

// Protected stack screens (web ProtectedRoute). Guests get an in-place login prompt.
function ProtectedCheckout(props: RootStackScreenProps<'Checkout'>) {
  return (
    <RequireAuth title="Checkout" redirect={{ name: 'Checkout' }} message="Log in to place your order.">
      <CheckoutScreen {...props} />
    </RequireAuth>
  );
}
function ProtectedOrderDetail(props: RootStackScreenProps<'OrderDetail'>) {
  return (
    <RequireAuth title="Order details" redirect={{ name: 'OrderDetail', params: props.route.params }}>
      <OrderDetailScreen {...props} />
    </RequireAuth>
  );
}
function ProtectedAddresses(props: RootStackScreenProps<'Addresses'>) {
  return (
    <RequireAuth title="Saved addresses" redirect={{ name: 'Addresses', params: props.route.params }}>
      <AddressesScreen {...props} />
    </RequireAuth>
  );
}
function ProtectedAddEditAddress(props: RootStackScreenProps<'AddEditAddress'>) {
  return (
    <RequireAuth title="Address" redirect={{ name: 'Addresses' }}>
      <AddEditAddressScreen {...props} />
    </RequireAuth>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="Checkout" component={ProtectedCheckout} />
        <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="OrderDetail" component={ProtectedOrderDetail} />
        <Stack.Screen name="Addresses" component={ProtectedAddresses} />
        <Stack.Screen name="AddEditAddress" component={ProtectedAddEditAddress} />
        <Stack.Screen name="MapPicker" component={MapPickerScreen} />
        <Stack.Screen name="Calculator" component={CalculatorScreen} />
        <Stack.Group screenOptions={{ presentation: 'modal', animation: 'slide_from_bottom' }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
