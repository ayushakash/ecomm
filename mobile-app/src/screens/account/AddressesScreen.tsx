import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, Card, EmptyState, Icon, Screen, ScreenHeader, Skeleton, Text, type IconName } from '../../components/ui';
import { useLocation } from '../../contexts/LocationContext';
import type { RootStackScreenProps } from '../../navigation/types';
import { addressAPI } from '../../services/api';
import { colors, radii, spacing, SCREEN_PADDING } from '../../theme';
import type { Address } from '../../types/models';
import { toast } from '../../utils/toast';

const TYPE_ICON: Record<string, IconName> = { home: 'home-outline', office: 'business-outline', other: 'location-outline' };

export default function AddressesScreen({ navigation, route }: RootStackScreenProps<'Addresses'>) {
  const { t } = useTranslation('account');
  const selectMode = route.params?.selectMode ?? false;
  const insets = useSafeAreaInsets();
  const { addresses, selectedAddress, setSelectedAddress, fetchAddresses } = useLocation();
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(addresses.length > 0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAddresses();
    setRefreshing(false);
    setLoaded(true);
  }, [fetchAddresses]);

  React.useEffect(() => {
    void fetchAddresses().finally(() => setLoaded(true));
  }, [fetchAddresses]);

  const handleSetDefault = async (address: Address) => {
    setBusyId(address._id);
    try {
      await addressAPI.setDefault(address._id);
      toast.success(t('addresses.defaultUpdated'));
      await fetchAddresses();
    } catch {
      // api interceptor toasts
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (address: Address) =>
    Alert.alert(t('addresses.deleteTitle'), t('addresses.deleteMessage'), [
      { text: t('logout.cancel'), style: 'cancel' },
      {
        text: t('addresses.delete'),
        style: 'destructive',
        onPress: async () => {
          setBusyId(address._id);
          try {
            await addressAPI.remove(address._id);
            toast.success(t('addresses.deleted'));
            await fetchAddresses();
          } catch {
            // api interceptor toasts
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);

  const handleSelect = async (address: Address) => {
    await setSelectedAddress(address);
    navigation.goBack();
  };

  const addNew = () => navigation.navigate('AddEditAddress', {});

  const renderItem = ({ item }: { item: Address }) => {
    const isSelected = selectMode && selectedAddress?._id === item._id;
    const busy = busyId === item._id;
    return (
      <Card
        onPress={selectMode ? () => handleSelect(item) : undefined}
        style={[styles.card, isSelected && styles.cardSelected]}
        elevated
      >
        <View style={styles.cardTop}>
          <View style={styles.typeIcon}>
            <Icon name={TYPE_ICON[item.addressType ?? 'other'] ?? 'location-outline'} size={20} color="primary" />
          </View>
          <View style={styles.flex}>
            <View style={styles.titleRow}>
              <Text variant="title" weight="bold" numberOfLines={1} style={styles.shrink}>
                {item.title}
              </Text>
              {item.isDefault && <Badge label={t('addresses.default')} tone="success" size="sm" />}
            </View>
            <Text variant="bodySm" weight="semibold">
              {item.fullName} · {item.phoneNumber}
            </Text>
            <Text variant="bodySm" color="textSecondary">
              {[item.addressLine1, item.addressLine2].filter(Boolean).join(', ')}
            </Text>
            {item.landmark ? (
              <Text variant="caption" color="textMuted">
                {t('addresses.near', { landmark: item.landmark })}
              </Text>
            ) : null}
            <Text variant="bodySm" color="textSecondary">
              {item.area}, {item.city}, {item.state} - {item.pincode}
            </Text>
          </View>
          {isSelected && <Icon name="checkmark-circle" size={22} color="success" />}
        </View>
        <View style={styles.actions}>
          {!item.isDefault && (
            <Button title={t('addresses.setDefault')} variant="ghost" size="sm" loading={busy} onPress={() => handleSetDefault(item)} />
          )}
          <View style={styles.flex} />
          <Pressable
            onPress={() => navigation.navigate('AddEditAddress', { addressId: item._id, address: item })}
            accessibilityRole="button"
            accessibilityLabel={t('addresses.editA11y', { title: item.title })}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Icon name="create-outline" size={20} color="primary" />
          </Pressable>
          <Pressable
            onPress={() => handleDelete(item)}
            accessibilityRole="button"
            accessibilityLabel={t('addresses.deleteA11y', { title: item.title })}
            hitSlop={8}
            style={styles.iconBtn}
            disabled={busy}
          >
            <Icon name="trash-outline" size={20} color="danger" />
          </Pressable>
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <ScreenHeader
        title={selectMode ? t('addresses.selectTitle') : t('addresses.title')}
        icon="location-outline"
        actions={[{ icon: 'add', onPress: addNew, accessibilityLabel: t('addresses.add') }]}
      />
      {!loaded && addresses.length === 0 ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={120} radius={radii.lg} />
          ))}
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(a) => a._id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 96 }, addresses.length === 0 && styles.flexGrow]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              icon="location-outline"
              title={t('addresses.emptyTitle')}
              message={t('addresses.emptyMessage')}
              actionLabel={t('addresses.add')}
              onAction={addNew}
            />
          }
        />
      )}
      {addresses.length > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button title={t('addresses.addNew')} leftIcon="add" variant="secondary" fullWidth onPress={addNew} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexGrow: { flexGrow: 1 },
  shrink: { flexShrink: 1 },
  list: { padding: SCREEN_PADDING, gap: spacing.md },
  card: { gap: spacing.sm, borderWidth: 1.5, borderColor: 'transparent' },
  cardSelected: { borderColor: colors.secondary },
  cardTop: { flexDirection: 'row', gap: spacing.md },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider, paddingTop: spacing.xs },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
