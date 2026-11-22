import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { areaRequestAPI } from '../services/api';
import { spacing } from '../theme';
import type { AreaRequestItem, Coordinates } from '../types/models';
import { toast } from '../utils/toast';
import { BottomSheet, Button, Chip, Input, Text } from './ui';

const ITEMS: AreaRequestItem[] = ['cement', 'sariya', 'balu', 'eent', 'gitti', 'other'];
const PHONE_RE = /^[6-9]\d{9}$/;
const NOTE_MAX = 300;

export interface AreaRequestSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface Prefill {
  area: string;
  city: string;
  pincode: string;
  coordinates?: Coordinates;
}

/** "Request Chardeevari in my area" form for places with no serving merchant. */
export function AreaRequestSheet({ visible, onClose }: AreaRequestSheetProps) {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { selectedAddress, selectedCity } = useLocation();

  const prefill = useMemo<Prefill>(() => {
    if (user && selectedAddress) {
      const { latitude, longitude } = selectedAddress.coordinates ?? {};
      return {
        area: selectedAddress.area ?? '',
        city: selectedAddress.city ?? '',
        pincode: selectedAddress.pincode ?? '',
        coordinates: latitude && longitude ? { latitude, longitude } : undefined,
      };
    }
    return {
      area: selectedCity?.area ?? '',
      city: selectedCity?.city ?? '',
      pincode: selectedCity?.pincode ?? '',
      coordinates: selectedCity?.coordinates,
    };
  }, [user, selectedAddress, selectedCity]);

  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [items, setItems] = useState<AreaRequestItem[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const askPhone = !user?.phone;

  useEffect(() => {
    if (!visible) return;
    setArea(prefill.area);
    setCity(prefill.city);
    setPincode(prefill.pincode);
    setName(user?.name ?? '');
    setPhone(user?.phone ? user.phone.replace(/\D/g, '').slice(-10) : '');
    setItems([]);
    setNote('');
  }, [visible, prefill, user]);

  const submit = async () => {
    const trimmedArea = area.trim();
    const trimmedCity = city.trim();
    if (!trimmedCity) {
      toast.error(t('areaRequest.cityRequired'));
      return;
    }
    if (!trimmedArea && !pincode) {
      toast.error(t('areaRequest.areaRequired'));
      return;
    }
    if (askPhone && (phone || !user) && !PHONE_RE.test(phone)) {
      toast.error(t('areaRequest.invalidPhone'));
      return;
    }
    // Coordinates only describe the prefilled place; drop them if the customer typed a different one.
    const samePlace = trimmedArea === prefill.area.trim() && trimmedCity === prefill.city.trim();
    const coords = samePlace ? prefill.coordinates : undefined;
    setBusy(true);
    try {
      await areaRequestAPI.create({
        area: trimmedArea || undefined,
        city: trimmedCity,
        pincode: pincode || undefined,
        lat: coords?.latitude,
        lng: coords?.longitude,
        name: name.trim() || undefined,
        phone: phone || undefined,
        items: items.length ? items : undefined,
        note: note.trim() || undefined,
        source: 'app',
      });
      onClose();
      toast.success(t('areaRequest.success'));
    } catch {
      toast.error(t('areaRequest.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('areaRequest.title')}
      subtitle={t('areaRequest.subtitle')}
      footer={
        <View style={styles.footer}>
          <Button title={t('actions.cancel')} variant="outline" onPress={onClose} style={styles.flex} disabled={busy} />
          <Button title={t('areaRequest.submit')} leftIcon="paper-plane-outline" onPress={submit} loading={busy} style={styles.flex} />
        </View>
      }
    >
      <View style={styles.form}>
        <Input
          label={t('areaRequest.areaLabel')}
          value={area}
          onChangeText={setArea}
          placeholder={t('areaRequest.areaPlaceholder')}
          autoCapitalize="words"
        />
        <View style={styles.row}>
          <Input
            label={t('areaRequest.cityLabel')}
            value={city}
            onChangeText={setCity}
            placeholder={t('areaRequest.cityPlaceholder')}
            autoCapitalize="words"
            containerStyle={styles.flex}
          />
          <Input
            label={t('areaRequest.pincodeLabel')}
            value={pincode}
            onChangeText={(text) => setPincode(text.replace(/\D/g, '').slice(0, 6))}
            placeholder={t('areaRequest.pincodePlaceholder')}
            keyboardType="number-pad"
            maxLength={6}
            containerStyle={styles.flex}
          />
        </View>
        <Input
          label={t('areaRequest.nameLabel')}
          value={name}
          onChangeText={setName}
          placeholder={t('areaRequest.namePlaceholder')}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
        />
        {askPhone && (
          <Input
            label={t('areaRequest.phoneLabel')}
            prefix="+91"
            value={phone}
            onChangeText={(text) => setPhone(text.replace(/\D/g, '').slice(0, 10))}
            placeholder={t('areaRequest.phonePlaceholder')}
            keyboardType="number-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={10}
          />
        )}
        <View>
          <Text variant="label" color="textSecondary" style={styles.label}>
            {t('areaRequest.itemsLabel')}
          </Text>
          <View style={styles.items}>
            {ITEMS.map((item) => {
              const selected = items.includes(item);
              return (
                <Chip
                  key={item}
                  label={t(`areaRequest.items.${item}`)}
                  icon={selected ? 'checkmark' : undefined}
                  selected={selected}
                  onPress={() => setItems((current) => (selected ? current.filter((i) => i !== item) : [...current, item]))}
                />
              );
            })}
          </View>
        </View>
        <Input
          label={t('areaRequest.noteLabel')}
          value={note}
          onChangeText={setNote}
          placeholder={t('areaRequest.notePlaceholder')}
          maxLength={NOTE_MAX}
          textAreaHeight={88}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg, paddingBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  footer: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  label: { marginBottom: spacing.xs + 2 },
  items: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
