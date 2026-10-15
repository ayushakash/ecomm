import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { isAxiosError } from 'axios';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, Button, Card, Chip, Icon, Input, Screen, ScreenHeader, Text } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import i18n from '../../i18n';
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

/** Label key: account:form.type.<value>. */
const ADDRESS_TYPES: { value: AddressType; icon: 'home-outline' | 'business-outline' | 'location-outline' }[] = [
  { value: 'home', icon: 'home-outline' },
  { value: 'office', icon: 'business-outline' },
  { value: 'other', icon: 'location-outline' },
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

/** Values are account-namespace translation keys. */
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
  const { t } = useTranslation('account');
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
    toast.success(i18n.t('account:form.locationSelected'), i18n.t('account:form.verifyFields'));
    navigation.setParams({ pickedLocation: undefined });
  }, [picked, navigation]);

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.error(t('form.locationDenied'), t('form.enableLocation'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coordinates = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      const place = await reverseGeocode(coordinates);
      applyPlace(place ?? { coordinates });
      toast.success(t('form.locationCaptured'), place ? t('form.verifyFields') : undefined);
    } catch {
      toast.error(t('form.locationError'));
    } finally {
      setLocating(false);
    }
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!/^[6-9]\d{9}$/.test(form.phoneNumber)) e.phoneNumber = 'form.errors.phone';
    if (!form.addressLine1.trim()) e.addressLine1 = 'form.errors.line1';
    if (!form.area.trim()) e.area = 'form.errors.area';
    if (!form.city.trim()) e.city = 'form.errors.city';
    if (!form.state.trim()) e.state = 'form.errors.state';
    if (!/^\d{6}$/.test(form.pincode)) e.pincode = 'form.errors.pincode';
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
        toast.success(t('form.updated'));
      } else {
        await addressAPI.create(payload);
        toast.success(t('form.added'));
      }
      await fetchAddresses();
      navigation.goBack();
    } catch (err) {
      // 422 validation errors are not auto-toasted.
      const status = isAxiosError(err) ? err.response?.status : undefined;
      if (status === 422 || status === 404) toast.error(getErrorMessage(err, t('form.saveError')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title={isEdit ? t('form.editTitle') : t('form.addTitle')} icon="home-outline" />
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
                  {form.coordinates ? t('form.pinned') : t('form.pin')}
                </Text>
                <Text variant="caption" color="textMuted">
                  {form.coordinates
                    ? `${form.coordinates.latitude.toFixed(5)}, ${form.coordinates.longitude.toFixed(5)}`
                    : t('form.pinHint')}
                </Text>
              </View>
            </View>
            <View style={styles.locActions}>
              <Button
                title={t('form.useCurrent')}
                variant="outline"
                size="sm"
                leftIcon="locate"
                loading={locating}
                onPress={useCurrentLocation}
                style={styles.flex}
              />
              <Button
                title={t('form.pickOnMap')}
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
            {t('form.saveAs')}
          </Text>
          <View style={styles.chips}>
            {ADDRESS_TYPES.map((type) => (
              <Chip
                key={type.value}
                label={t(`form.type.${type.value}`)}
                icon={type.icon}
                selected={form.addressType === type.value}
                onPress={() => set('addressType', type.value)}
              />
            ))}
          </View>

          <Input
            label={`${t('form.phone')} *`}
            prefix="+91"
            value={form.phoneNumber}
            onChangeText={(text) => set('phoneNumber', text.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            maxLength={10}
            error={errors.phoneNumber && t(errors.phoneNumber)}
          />
          <Input
            label={`${t('form.line1')} *`}
            value={form.addressLine1}
            onChangeText={(text) => set('addressLine1', text)}
            placeholder={t('form.line1Placeholder')}
            error={errors.addressLine1 && t(errors.addressLine1)}
          />
          <Input
            label={t('form.line2')}
            value={form.addressLine2}
            onChangeText={(text) => set('addressLine2', text)}
            placeholder={t('form.line2Placeholder')}
          />
          <View style={styles.row}>
            <Input
              label={`${t('form.area')} *`}
              value={form.area}
              onChangeText={(text) => set('area', text)}
              error={errors.area && t(errors.area)}
              containerStyle={styles.flex}
            />
            <Input
              label={`${t('form.city')} *`}
              value={form.city}
              onChangeText={(text) => set('city', text)}
              error={errors.city && t(errors.city)}
              containerStyle={styles.flex}
            />
          </View>
          <View style={styles.row}>
            <Input
              label={`${t('form.pincode')} *`}
              value={form.pincode}
              onChangeText={(text) => set('pincode', text.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              error={errors.pincode && t(errors.pincode)}
              containerStyle={styles.flex}
            />
            <View style={styles.flex}>
              <Text variant="label" weight="semibold" color="textSecondary" style={styles.fieldLabel}>
                {t('form.state')} *
              </Text>
              <Pressable
                onPress={() => setStateSheet(true)}
                accessibilityRole="button"
                accessibilityLabel={t('form.selectState')}
                style={[styles.select, errors.state ? styles.selectError : null]}
              >
                <Text variant="body" color={form.state ? 'text' : 'textMuted'} numberOfLines={1} style={styles.flex}>
                  {form.state || t('form.selectState')}
                </Text>
                <Icon name="chevron-down" size={16} color="textMuted" />
              </Pressable>
              {errors.state ? (
                <Text variant="caption" color="danger" style={styles.fieldError}>
                  {t(errors.state)}
                </Text>
              ) : null}
            </View>
          </View>
          <Input
            label={t('form.landmark')}
            value={form.landmark}
            onChangeText={(text) => set('landmark', text)}
            placeholder={t('form.landmarkPlaceholder')}
          />
          <Input
            label={t('form.instructions')}
            value={form.deliveryInstructions}
            onChangeText={(text) => set('deliveryInstructions', text)}
            placeholder={t('form.instructionsPlaceholder')}
            textAreaHeight={80}
          />
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text variant="title" weight="semibold">
                {t('form.makeDefault')}
              </Text>
              <Text variant="caption" color="textMuted">
                {t('form.makeDefaultHint')}
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
          <Button title={isEdit ? t('form.update') : t('form.save')} variant="secondary" size="lg" fullWidth loading={saving} onPress={save} />
        </View>
      </KeyboardAvoidingView>

      <BottomSheet visible={stateSheet} onClose={() => setStateSheet(false)} title={t('form.selectState')}>
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
