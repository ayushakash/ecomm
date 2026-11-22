import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { areaRequestAPI } from '../services/api';
import { spacing } from '../theme';
import type { Coordinates } from '../types/models';
import { toast } from '../utils/toast';
import { BottomSheet, Button, Input } from './ui';

const PHONE_RE = /^[6-9]\d{9}$/;

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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setArea(prefill.area);
  }, [visible, prefill]);

  const submit = async () => {
    const trimmedArea = area.trim();
    if (trimmedArea.length < 2) {
      toast.error(t('areaRequest.areaRequired'));
      return;
    }
    // Pincode/coordinates only describe the prefilled place; drop them if the customer typed a different area.
    const samePlace = trimmedArea === prefill.area.trim();
    const coords = samePlace ? prefill.coordinates : undefined;
    const phone = user?.phone?.replace(/\D/g, '').slice(-10);
    setBusy(true);
    try {
      await areaRequestAPI.create({
        area: trimmedArea,
        city: prefill.city.trim() || undefined,
        pincode: samePlace ? prefill.pincode || undefined : undefined,
        lat: coords?.latitude,
        lng: coords?.longitude,
        name: user?.name?.trim() || undefined,
        phone: phone && PHONE_RE.test(phone) ? phone : undefined,
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
      footer={<Button title={t('areaRequest.submit')} leftIcon="paper-plane-outline" onPress={submit} loading={busy} />}
    >
      <View style={styles.form}>
        <Input
          label={t('areaRequest.areaLabel')}
          value={area}
          onChangeText={setArea}
          placeholder={t('areaRequest.areaPlaceholder')}
          autoCapitalize="words"
          maxLength={100}
          onSubmitEditing={submit}
          returnKeyType="send"
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  form: { paddingBottom: spacing.md },
});
