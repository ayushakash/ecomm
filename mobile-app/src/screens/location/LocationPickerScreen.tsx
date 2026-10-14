import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, Icon, Screen, ScreenHeader, Text, type IconName } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { usePublicSettings } from '../../hooks/queries';
import type { RootStackScreenProps } from '../../navigation/types';
import { reverseGeocode } from '../../services/geocoding';
import { colors, radii, SCREEN_PADDING, spacing } from '../../theme';
import type { Address } from '../../types/models';
import { normalizeCityName } from '../../utils/cityName';
import { toast } from '../../utils/toast';
import { CityPicker } from './components/CityPicker';
import { useDetectLocation } from './components/useDetectLocation';

interface ActionRowProps {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}

function ActionRow({ icon, title, subtitle, onPress, busy, disabled }: ActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ busy, disabled }}
      style={({ pressed }) => [styles.actionRow, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <View style={styles.actionIcon}>
        <Icon name={icon} size={20} color="secondaryDark" />
      </View>
      <View style={styles.flex}>
        <Text variant="title" weight="bold" color="secondaryDark">
          {title}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {busy ? <ActivityIndicator size="small" color={colors.secondaryDark} /> : <Icon name="chevron-forward" size={18} color="textMuted" />}
    </Pressable>
  );
}

function AddressRow({ address, selected, onPress }: { address: Address; selected: boolean; onPress: () => void }) {
  const icon: IconName = address.addressType === 'office' ? 'briefcase-outline' : address.addressType === 'other' ? 'location-outline' : 'home-outline';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${address.title}, ${address.area}, ${address.city}`}
      style={({ pressed }) => [styles.addressRow, selected && styles.addressSelected, pressed && styles.pressed]}
    >
      <View style={[styles.addressIcon, selected && styles.addressIconSelected]}>
        <Icon name={icon} size={18} color={selected ? 'onPrimary' : 'primary'} />
      </View>
      <View style={styles.flex}>
        <View style={styles.addressTitleRow}>
          <Text variant="title" weight="bold" numberOfLines={1} style={styles.shrink}>
            {address.title}
          </Text>
          {address.isDefault && <Badge label="Default" tone="success" />}
        </View>
        <Text variant="bodySm" color="textSecondary" numberOfLines={2}>
          {[address.addressLine1, address.addressLine2, address.area, address.city].filter(Boolean).join(', ')}
          {address.pincode ? ` - ${address.pincode}` : ''}
        </Text>
      </View>
      <Icon name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? 'primary' : 'borderStrong'} />
    </Pressable>
  );
}

/**
 * Delivery-location chooser (web Header location dropdown + ProductList city picker + LocationEducationModal copy).
 * Logged-in users with saved addresses pick an address; everyone else picks a city, GPS or a map pin.
 */
export default function LocationPickerScreen({ navigation, route }: RootStackScreenProps<'LocationPicker'>) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { addresses, selectedAddress, setSelectedAddress, fetchMerchantsByCoordinates, isLoadingMerchants } = useLocation();
  const { data: settings } = usePublicSettings();
  const { detecting, detect } = useDetectLocation();
  const [locatingForAddress, setLocatingForAddress] = useState(false);
  const [applyingPin, setApplyingPin] = useState(false);
  const handledPin = useRef<unknown>(null);

  const showAddresses = isAuthenticated && addresses.length > 0;
  const pickedLocation = route.params?.pickedLocation;

  // Modal may be the only route (deep link / web reload): fall back to the tabs.
  const close = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('MainTabs');
  }, [navigation]);

  // Map pin returned by MapPicker (returnTo: 'LocationPicker') → match merchants by exact coordinates.
  useEffect(() => {
    if (!pickedLocation || handledPin.current === pickedLocation) return;
    handledPin.current = pickedLocation;
    navigation.setParams({ pickedLocation: undefined });
    if (!pickedLocation.city) {
      toast.error('Could not determine the city for that spot', 'Try another point or pick a city.');
      return;
    }
    setApplyingPin(true);
    fetchMerchantsByCoordinates({
      city: normalizeCityName(pickedLocation.city),
      state: pickedLocation.state,
      area: pickedLocation.area,
      pincode: pickedLocation.pincode,
      formattedAddress: pickedLocation.formattedAddress,
      coordinates: pickedLocation.coordinates,
    })
      .then((count) => {
        if (count > 0) close();
      })
      .finally(() => setApplyingPin(false));
  }, [pickedLocation, fetchMerchantsByCoordinates, navigation, close]);

  const handleCurrentLocation = async () => {
    if (showAddresses) {
      // Saved-address users: start a new address prefilled from GPS.
      setLocatingForAddress(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          toast.error('Location permission denied', 'You can enable it in Settings.');
          return;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        const place = await reverseGeocode(coordinates);
        navigation.replace('AddEditAddress', { pickedLocation: place ?? { coordinates } });
      } catch {
        toast.error('Unable to get location', 'Make sure location services are on.');
      } finally {
        setLocatingForAddress(false);
      }
      return;
    }
    const place = await detect();
    if (place) close();
  };

  const pinCoords = selectedAddress?.coordinates;
  const pickOnMap = () =>
    showAddresses
      ? navigation.navigate('MapPicker', {
          returnTo: 'AddEditAddress',
          initial:
            pinCoords?.latitude && pinCoords.longitude
              ? { latitude: pinCoords.latitude, longitude: pinCoords.longitude }
              : undefined,
        })
      : navigation.navigate('MapPicker', { returnTo: 'LocationPicker' });

  const chooseAddress = (address: Address) => {
    setSelectedAddress(address);
    close();
  };

  return (
    <Screen background={colors.background}>
      <ScreenHeader
        title="Select delivery location"
        icon="navigate-outline"
        subtitle={settings?.serviceAreasNote ? `Delivering in: ${settings.serviceAreasNote}` : undefined}
        backIcon="close"
        back={close}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      >
        <Animated.View entering={FadeInDown.duration(220)} style={styles.card}>
          <ActionRow
            icon="locate"
            title="Use my current location"
            subtitle={showAddresses ? 'Add a new address using GPS' : 'Find stores that deliver to you'}
            onPress={handleCurrentLocation}
            busy={detecting || locatingForAddress}
          />
          <View style={styles.cardDivider} />
          <ActionRow
            icon="map-outline"
            title="Pick on map"
            subtitle={showAddresses ? 'Drop a pin for a new address' : 'Drop a pin at your site'}
            onPress={pickOnMap}
            busy={applyingPin}
          />
        </Animated.View>

        {showAddresses ? (
          <Animated.View entering={FadeInDown.delay(60).duration(220)} style={styles.section}>
            <View style={styles.sectionHead}>
              <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
                SAVED ADDRESSES
              </Text>
              {isLoadingMerchants && <ActivityIndicator size="small" color={colors.textMuted} />}
            </View>
            <View style={styles.addressList}>
              {addresses.map((address) => (
                <AddressRow
                  key={address._id}
                  address={address}
                  selected={selectedAddress?._id === address._id}
                  onPress={() => chooseAddress(address)}
                />
              ))}
            </View>
            <View style={styles.addressActions}>
              <Button
                title="Add new address"
                variant="outline"
                leftIcon="add"
                style={styles.flex}
                onPress={() => navigation.navigate('AddEditAddress')}
              />
              <Button
                title="Manage"
                variant="ghost"
                rightIcon="chevron-forward"
                onPress={() => navigation.navigate('Addresses')}
              />
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(60).duration(220)} style={styles.section}>
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text variant="caption" color="textMuted">
                or select your city
              </Text>
              <View style={styles.orLine} />
            </View>
            <CityPicker
              onPicked={(count) => {
                if (count > 0) close();
              }}
            />
            {isAuthenticated && (
              <Button
                title="Add a delivery address"
                variant="outline"
                leftIcon="add"
                onPress={() => navigation.navigate('AddEditAddress')}
              />
            )}
          </Animated.View>
        )}

        {!isAuthenticated && (
          <Pressable
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
            accessibilityLabel="Login for saved addresses"
            style={({ pressed }) => [styles.loginCard, pressed && styles.pressed]}
          >
            <Icon name="person-circle-outline" size={28} color="primary" />
            <View style={styles.flex}>
              <Text variant="title" weight="bold">
                Login for precise delivery
              </Text>
              <Text variant="caption" color="textSecondary">
                Save addresses and check out faster
              </Text>
            </View>
            <Icon name="chevron-forward" size={18} color="textMuted" />
          </Pressable>
        )}

        <View style={styles.privacy}>
          <Icon name="lock-closed-outline" size={14} color="textMuted" />
          <Text variant="caption" color="textMuted" style={styles.flex}>
            Your location is only used to show nearby merchants. We never share your data.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  content: { padding: SCREEN_PADDING, gap: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 68 },
  actionRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.secondarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
  section: { gap: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { letterSpacing: 0.6 },
  addressList: { gap: spacing.sm },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  addressSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressIconSelected: { backgroundColor: colors.primary },
  addressTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  addressActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
  loginCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs + 2, paddingHorizontal: spacing.xs },
});
