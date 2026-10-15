import Ionicons from '@expo/vector-icons/Ionicons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform } from 'react-native';
import { RequireAuth } from '../components/RequireAuth';
import { useCart } from '../contexts/CartContext';
import AccountScreen from '../screens/account/AccountScreen';
import CartScreen from '../screens/cart/CartScreen';
import HomeScreen from '../screens/home/HomeScreen';
import OrdersScreen from '../screens/orders/OrdersScreen';
import ProductsScreen from '../screens/products/ProductsScreen';
import { colors, fonts } from '../theme';
import type { MainTabParamList, MainTabScreenProps } from './types';
import { useTranslation } from 'react-i18next';


const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIcon = React.ComponentProps<typeof Ionicons>['name'];
const ICONS: Record<keyof MainTabParamList, [TabIcon, TabIcon]> = {
  HomeTab: ['home', 'home-outline'],
  ProductsTab: ['grid', 'grid-outline'],
  CartTab: ['cart', 'cart-outline'],
  OrdersTab: ['receipt', 'receipt-outline'],
  AccountTab: ['person-circle', 'person-circle-outline'],
};

/** Orders require login (web ProtectedRoute); guests see a login prompt in the tab. */
function ProtectedOrders(props: MainTabScreenProps<'OrdersTab'>) {
  const { t } = useTranslation('common');
  return (
    <RequireAuth title={t('tabs.myOrders')} redirect={{ name: 'MainTabs', params: { screen: 'OrdersTab' } }}>
      <OrdersScreen {...props} />
    </RequireAuth>
  );
}

export function MainTabs() {
  const { cartCount } = useCart();
  const { t } = useTranslation('common');
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: Platform.OS === 'android',
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.surface },
        tabBarBadgeStyle: {
          backgroundColor: colors.secondary,
          color: colors.onSecondary,
          fontFamily: fonts.extrabold,
          fontSize: 10,
        },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={ICONS[route.name][focused ? 0 : 1]} size={size - 2} color={color} />
        ),
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: t('tabs.home') }} />
      <Tab.Screen name="ProductsTab" component={ProductsScreen} options={{ title: t('tabs.categories') }} />
      <Tab.Screen
        name="CartTab"
        component={CartScreen}
        options={{ title: t('tabs.cart'), tabBarBadge: cartCount > 0 ? cartCount : undefined }}
      />
      <Tab.Screen name="OrdersTab" component={ProtectedOrders} options={{ title: t('tabs.orders') }} />
      <Tab.Screen name="AccountTab" component={AccountScreen} options={{ title: t('tabs.account') }} />
    </Tab.Navigator>
  );
}
