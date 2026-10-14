import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { isAxiosError } from 'axios';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, Button, Card, Chip, Icon, Input, Screen, ScreenHeader, Text } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import type { RootStackScreenProps } from '../../navigation/types';
import { addressAPI, getErrorMessage } from '../../services/api';
import { reverseGeocode } from '../../services/geocoding';
import { colors, radii, spacing, SCREEN_PADDING } from '../../theme';
import type { Address, AddressInput, AddressType, Coordinates, GeocodedPlace } from '../../types/models';
import { toast } from '../../utils/toast';

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
  'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const ADDRESS_TYPES: { value: AddressType; label: string; icon: 'home-outline' | 'business-outline' | 'location-outline' }[] = [
  { value: 'home', label: 'Home', icon: 'home-outline' },
  { value: 'office', label: 'Office', icon: 'business-outline' },
  { value: 'other', label: 'Other', icon: 'location-outline' },
];

interface FormState {
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  addressType: AddressType;
  isDefault: boolean;
  deliveryInstructions: string;
  coordinates: Coordinates | null;
}

type Errors = Partial<Record<keyof FormState, string>>;

const fromAddress = (a: Address | undefined, phone: string): FormState => ({
  phoneNumber: a?.phoneNumber || phone,
  addressLine1: a?.addressLine1 ?? '',
  addressLine2: a?.addressLine2 ?? '',
  landmark: a?.landmark ?? '',
  area: a?.area ?? '',
  city: a?.city ?? '',
  state: a?.state ?? '',
  pincode: a?.pincode ?? '',
  addressType: a?.addressType ?? 'home',
  isDefault: a?.isDefault ?? false,
  deliveryInstructions: a?.deliveryInstructions ?? '',
  coordinates:
    a?.coordinates?.latitude != null && a.coordinates.longitude != null
      ? { latitude: a.coordinates.latitude, longitude: a.coordinates.longitude }
      : null,
});

export default function AddEditAddressScreen({ navigation, route }: RootStackScreenProps<'AddEditAddress'>) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { fetchAddresses } = useLocation();
  const addressId = route.params?.addressId ?? route.params?.address?._id;
  const isEdit = Boolean(addressId);

  const [form, setForm] = useState<FormState>(() => fromAddress(route.params?.address, user?.phone ?? ''));
  const [errors, setErrors] = useState<Errors>({});
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stateSheet, setStateSheet] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Edit by id without a snapshot: load from server.
  useEffect(() => {
    if (!addressId || route.params?.address) return;
    addressAPI
      .get(addressId)
      .then((a) => setForm(fromAddress(a, user?.phone ?? '')))
      .catch(() => undefined);
  }, [addressId, route.params?.address, user?.phone]);

  const applyPlace = (place: GeocodedPlace) =>
    setForm((f) => ({
      ...f,
      coordinates: place.coordinates,
      area: place.area || f.area,
      city: place.city || f.city,
      state: place.state || f.state,
      pincode: place.pincode || f.pincode,
    }));

  // Result from MapPicker (contract §9).
  const picked = route.params?.pickedLocation;
  useEffect(() => {
    if (!picked) return;
    applyPlace(picked);
    toast.success('Location selected!', 'Please verify the prefilled fields.');
    navigation.setParams({ pickedLocation: undefined });
  }, [picked, navigation]);

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Location access denied', 'Please enable location permissions.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coordinates = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      const place = await reverseGeocode(coordinates);
      applyPlace(place ?? { coordinates });
      toast.success('Location captured', place ? 'Please verify the prefilled fields.' : undefined);
    } catch {
      toast.error('Unable to get your location');
    } finally {
      setLocating(false);
    }
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!/^[6-9]\d{9}$/.test(form.phoneNumber)) e.phoneNumber = 'Enter a valid 10-digit mobile number';
    if (!form.addressLine1.trim()) e.addressLine1 = 'Address line 1 is required';
    if (!form.area.trim()) e.area = 'Area is required';
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.state.trim()) e.state = 'State is required';
    if (!/^\d{6}$/.test(form.pincode)) e.pincode = 'Enter a valid 6-digit pincode';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    const typeLabel = form.addressType.charAt(0).toUpperCase() + form.addressType.slice(1);
    const payload: AddressInput = {
      title: `${typeLabel} - ${form.area.trim()}`,
      fullName: user?.name || '',
      phoneNumber: form.phoneNumber,
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim(),
      landmark: form.landmark.trim(),
      area: form.area.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode,
      addressType: form.addressType,
      isDefault: form.isDefault,
      deliveryInstructions: form.deliveryInstructions.trim(),
      ...(form.coordinates ? { coordinates: form.coordinates } : {}),
    };
    setSaving(true);
    try {
      if (addressId) {
        await addressAPI.update(addressId, payload);
        toast.success('Address updated successfully!');
      } else {
        await addressAPI.create(payload);
        toast.success('Address added successfully!');
      }
      await fetchAddresses();
      navigation.goBack();
    } catch (err) {
      // 422 validation errors are not auto-toasted.
      const status = isAxiosError(err) ? err.response?.status : undefined;
      if (status === 422 || status === 404) toast.error(getErrorMessage(err, 'Failed to save address'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title={isEdit ? 'Edit address' : 'Add new address'} icon="home-outline" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={styles.locCard} elevated>
            <View style={styles.locRow}>
              <Icon
                name={form.coordinates ? 'checkmark-circle' : 'navigate-circle-outline'}
                size={22}
                color={form.coordinates ? 'success' : 'primary'}
              />
              <View style={styles.flex}>
                <Text variant="title" weight="semibold">
                  {form.coordinates ? 'Location pinned' : 'Pin your exact location'}
                </Text>
                <Text variant="caption" color="textMuted">
                  {form.coordinates
                    ? `${form.coordinates.latitude.toFixed(5)}, ${form.coordinates.longitude.toFixed(5)}`
                    : 'Helps us find nearby suppliers and deliver faster'}
                </Text>
              </View>
            </View>
            <View style={styles.locActions}>
              <Button
                title="Use current location"
                variant="outline"
                size="sm"
                leftIcon="locate"
                loading={locating}
                onPress={useCurrentLocation}
                style={styles.flex}
              />
              <Button
                title="Pick on map"
                variant="outline"
                size="sm"
                leftIcon="map-outline"
                onPress={() =>
                  navigation.navigate('MapPicker', { returnTo: 'AddEditAddress', initial: form.coordinates ?? undefined })
                }
                style={styles.flex}
              />
            </View>
          </Card>

          <Text variant="label" weight="semibold" color="textSecondary">
            Save address as
          </Text>
          <View style={styles.chips}>
            {ADDRESS_TYPES.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                icon={t.icon}
                selected={form.addressType === t.value}
                onPress={() => set('addressType', t.value)}
              />
            ))}
          </View>

          <Input
            label="Phone number *"
            prefix="+91"
            value={form.phoneNumber}
            onChangeText={(t) => set('phoneNumber', t.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            maxLength={10}
            error={errors.phoneNumber}
          />
          <Input
            label="House / flat / building *"
            value={form.addressLine1}
            onChangeText={(t) => set('addressLine1', t)}
            placeholder="House no., building, street"
            error={errors.addressLine1}
          />
          <Input
            label="Address line 2"
            value={form.addressLine2}
            onChangeText={(t) => set('addressLine2', t)}
            placeholder="Apartment, suite, etc. (optional)"
          />
          <View style={styles.row}>
            <Input
              label="Area / locality *"
              value={form.area}
              onChangeText={(t) => set('area', t)}
              error={errors.area}
              containerStyle={styles.flex}
            />
            <Input
              label="City *"
              value={form.city}
              onChangeText={(t) => set('city', t)}
              error={errors.city}
              containerStyle={styles.flex}
            />
          </View>
          <View style={styles.row}>
            <Input
              label="Pincode *"
              value={form.pincode}
              onChangeText={(t) => set('pincode', t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              error={errors.pincode}
              containerStyle={styles.flex}
            />
            <View style={styles.flex}>
              <Text variant="label" weight="semibold" color="textSecondary" style={styles.fieldLabel}>
                State *
              </Text>
              <Pressable
                onPress={() => setStateSheet(true)}
                accessibilityRole="button"
                accessibilityLabel="Select state"
                style={[styles.select, errors.state ? styles.selectError : null]}
              >
                <Text variant="body" color={form.state ? 'text' : 'textMuted'} numberOfLines={1} style={styles.flex}>
                  {form.state || 'Select state'}
                </Text>
                <Icon name="chevron-down" size={16} color="textMuted" />
              </Pressable>
              {errors.state ? (
                <Text variant="caption" color="danger" style={styles.fieldError}>
                  {errors.state}
                </Text>
              ) : null}
            </View>
          </View>
          <Input
            label="Landmark"
            value={form.landmark}
            onChangeText={(t) => set('landmark', t)}
            placeholder="Nearby landmark (optional)"
          />
          <Input
            label="Delivery instructions"
            value={form.deliveryInstructions}
            onChangeText={(t) => set('deliveryInstructions', t)}
            placeholder="e.g. Unload at the back gate"
            textAreaHeight={80}
          />
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text variant="title" weight="semibold">
                Make this my default address
              </Text>
              <Text variant="caption" color="textMuted">
                Used automatically at checkout
              </Text>
            </View>
            <Switch
              value={form.isDefault}
              onValueChange={(v) => set('isDefault', v)}
              trackColor={{ true: colors.secondary, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button title={isEdit ? 'Update address' : 'Save address'} variant="secondary" size="lg" fullWidth loading={saving} onPress={save} />
        </View>
      </KeyboardAvoidingView>

      <BottomSheet visible={stateSheet} onClose={() => setStateSheet(false)} title="Select state">
        {INDIAN_STATES.map((s) => (
          <Pressable
            key={s}
            onPress={() => {
              set('state', s);
              setStateSheet(false);
            }}
            accessibilityRole="button"
            style={styles.stateRow}
          >
            <Text variant="body" weight={form.state === s ? 'semibold' : undefined} style={styles.flex}>
              {s}
            </Text>
            {form.state === s && <Icon name="checkmark" size={18} color="secondaryDark" />}
          </Pressable>
        ))}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: SCREEN_PADDING, gap: spacing.md, paddingBottom: spacing.xxxl },
  locCard: { gap: spacing.md },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  locActions: { flexDirection: 'row', gap: spacing.sm },
  chips: { flexDirection: 'row', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  fieldLabel: { marginBottom: spacing.xs },
  fieldError: { marginTop: spacing.xs },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectError: { borderColor: colors.danger },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  footer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
