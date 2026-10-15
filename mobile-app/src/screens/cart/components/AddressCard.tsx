import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, BottomSheet, Button, Icon, Text, type IconName } from '../../../components/ui';
import { colors, radii, spacing } from '../../../theme';
import type { Address } from '../../../types/models';

const ADDRESS_ICONS: Record<string, IconName> = {
  home: 'home-outline',
  office: 'business-outline',
};

/** Address summary used on Checkout (web Checkout address radio card). */
export function AddressDetails({ address }: { address: Address }) {
  const { t } = useTranslation('checkout');
  return (
    <View style={styles.details}>
      <View style={styles.titleRow}>
        <Text variant="title" numberOfLines={1} style={styles.shrink}>
          {address.title}
        </Text>
        {address.isDefault && <Badge label={t('address.default')} tone="success" size="sm" />}
      </View>
      <Text variant="bodySm" color="textSecondary">
        {address.fullName} · {address.phoneNumber}
      </Text>
      <Text variant="bodySm" color="textSecondary">
        {address.addressLine1}
        {address.addressLine2 ? `, ${address.addressLine2}` : ''}
      </Text>
      <Text variant="bodySm" color="textSecondary">
        {address.area}, {address.city} - {address.pincode}
      </Text>
    </View>
  );
}

export function AddressIcon({ type }: { type?: string }) {
  return (
    <View style={styles.iconWrap}>
      <Icon name={ADDRESS_ICONS[type ?? ''] ?? 'location-outline'} size={20} color="primary" />
    </View>
  );
}

export interface AddressPickerSheetProps {
  visible: boolean;
  addresses: Address[];
  selectedId: string | undefined;
  onSelect(address: Address): void;
  onAddNew(): void;
  onClose(): void;
}

/** Web Checkout "Select Delivery Address" list as a bottom sheet. */
export function AddressPickerSheet({ visible, addresses, selectedId, onSelect, onAddNew, onClose }: AddressPickerSheetProps) {
  const { t } = useTranslation('checkout');
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('address.selectTitle')}
      footer={<Button title={t('address.addNew')} variant="outline" leftIcon="add" fullWidth onPress={onAddNew} />}
    >
      <View style={styles.list}>
        {addresses.map((address) => {
          const selected = address._id === selectedId;
          return (
            <Pressable
              key={address._id}
              onPress={() => onSelect(address)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${address.title}, ${address.area}, ${address.city}`}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioDot} />}
              </View>
              <AddressIcon type={address.addressType} />
              <AddressDetails address={address} />
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1 },
  details: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.secondary, backgroundColor: colors.secondarySoft },
  radio: {
    width: 20,
    height: 20,
    marginTop: spacing.sm,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.secondary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.secondary },
});
