import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Address, Coordinates, GeocodedPlace, Order, Product } from '../types/models';

/** Where MapPicker sends its result back to (merged into that route's params as `pickedLocation`). */
export type MapPickerReturnRoute = 'AddEditAddress' | 'Checkout' | 'LocationPicker';

/** Result handed back by MapPicker. */
export type PickedLocation = GeocodedPlace;

/** Screen to open after a successful login (Login → replace with this). */
export type LoginRedirect =
  | { name: 'Checkout'; params?: undefined }
  | { name: 'Addresses'; params?: RootStackParamList['Addresses'] }
  | { name: 'OrderDetail'; params: RootStackParamList['OrderDetail'] }
  | { name: 'MainTabs'; params?: NavigatorScreenParams<MainTabParamList> };

export type MainTabParamList = {
  HomeTab: undefined;
  /** Categories/Products browser. */
  ProductsTab: { categoryId?: string } | undefined;
  CartTab: undefined;
  OrdersTab: undefined;
  AccountTab: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  /** `product` is an optional list-row snapshot for instant first paint; always refetch by id. */
  ProductDetail: { productId: string; product?: Product };
  Search: { query?: string; categoryId?: string } | undefined;
  Checkout: { pickedLocation?: PickedLocation } | undefined;
  OrderSuccess: { order: Order };
  OrderDetail: { orderId: string };
  /** `selectMode` = picking a delivery address (e.g. from Checkout): tap selects + goes back. */
  Addresses: { selectMode?: boolean } | undefined;
  /** Edit when `addressId` given (pass `address` snapshot to avoid a fetch). */
  AddEditAddress: { addressId?: string; address?: Address; pickedLocation?: PickedLocation } | undefined;
  MapPicker: { returnTo: MapPickerReturnRoute; initial?: Coordinates };
  Login: { redirect?: LoginRedirect } | undefined;
  Calculator: undefined;
  LocationPicker: { pickedLocation?: PickedLocation } | undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

declare global {
  namespace ReactNavigation {
    // Makes untyped useNavigation() / <Link> aware of the root routes.
    interface RootParamList extends RootStackParamList {}
  }
}
