import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../../services/notificationService';
import { THEME, SIZES } from '../../theme';
import { Address } from '../../types';
import api from '../../services/api';
import CustomHeader from '../../components/navigation/CustomHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import CustomLoader from '../../components/ui/CustomLoader';

interface AddressListScreenProps {
  navigation: any;
  route?: {
    params?: {
      selectMode?: boolean;
      onAddressSelect?: (address: Address) => void;
      returnTo?: string;
    };
  };
}

const AddressListScreen: React.FC<AddressListScreenProps> = ({ navigation, route }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const queryClient = useQueryClient();

  const selectMode = route?.params?.selectMode || false;
  const onAddressSelect = route?.params?.onAddressSelect;
  const returnTo = route?.params?.returnTo;

  // Fetch addresses
  const { data: addressesData, isLoading, error, refetch } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.addresses.getAllAddresses(),
  });

  const addresses = addressesData?.data || [];
  console.log(addresses);

  // Delete address mutation
  const deleteAddressMutation = useMutation({
    mutationFn: (addressId: string) => api.addresses.deleteAddress(addressId),
    onSuccess: () => {
      notificationService.success('Address Deleted', 'Address has been removed successfully');
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (error: any) => {
      notificationService.error('Delete Failed', error?.response?.data?.message || 'Failed to delete address');
    },
  });

  // Set default address mutation
  const setDefaultMutation = useMutation({
    mutationFn: (addressId: string) => api.addresses.setDefaultAddress(addressId),
    onSuccess: () => {
      notificationService.success('Default Address Updated', 'Default address has been changed successfully');
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (error: any) => {
      notificationService.error('Update Failed', error?.response?.data?.message || 'Failed to set default address');
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleBackPress = () => {
    if (returnTo === 'Profile') {
      // Navigate back to Profile tab
      navigation.navigate('CustomerMain', { screen: 'Profile' });
    } else {
      navigation.goBack();
    }
  };

  const handleAddAddress = useCallback(() => {
    if (navigating) return;
    setNavigating(true);
    navigation.navigate('AddEditAddress', {
      mode: 'add',
      returnTo: returnTo
    });
    setTimeout(() => setNavigating(false), 1000);
  }, [navigation, navigating]);

  const handleEditAddress = useCallback((address: Address) => {
    if (navigating) return;
    setNavigating(true);
    navigation.navigate('AddEditAddress', {
      mode: 'edit',
      address,
      returnTo: returnTo
    });
    setTimeout(() => setNavigating(false), 1000);
  }, [navigation, navigating, returnTo]);

  const handleDeleteAddress = (address: Address) => {
    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete "${address.title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteAddressMutation.mutate(address._id),
        },
      ]
    );
  };

  const handleSetDefault = (address: Address) => {
    if (address.isDefault) return;
    setDefaultMutation.mutate(address._id);
  };

  const handleAddressSelect = (address: Address) => {
    if (selectMode && onAddressSelect) {
      onAddressSelect(address);
      navigation.goBack();
    } else {
      handleEditAddress(address);
    }
  };

  const renderAddressItem = ({ item: address }: { item: Address }) => (
    <Card style={styles.addressCard}>
      <TouchableOpacity
        onPress={() => handleAddressSelect(address)}
        style={styles.addressContent}
        activeOpacity={0.7}
      >
        <View style={styles.addressHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.addressTitle}>{address.title}</Text>
            {address.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>DEFAULT</Text>
              </View>
            )}
          </View>
          <View style={styles.typeIndicator}>
            <Ionicons 
              name={
                address.addressType === 'home' ? 'home' :
                address.addressType === 'office' ? 'business' : 'location'
              } 
              size={16} 
              color={THEME.primary} 
            />
          </View>
        </View>

        <Text style={styles.fullName}>{address.fullName}</Text>
        <Text style={styles.phoneNumber}>{address.phoneNumber}</Text>
        <Text style={styles.fullAddress} numberOfLines={2}>
          {address.fullAddress}
        </Text>

        {address.deliveryInstructions && (
          <View style={styles.instructionsContainer}>
            <Ionicons name="information-circle-outline" size={14} color={THEME.info} />
            <Text style={styles.instructions}>{address.deliveryInstructions}</Text>
          </View>
        )}
      </TouchableOpacity>

      {!selectMode && (
        <View style={styles.actionButtons}>
          {!address.isDefault && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSetDefault(address)}
              disabled={setDefaultMutation.isLoading}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={THEME.success} />
              <Text style={[styles.actionButtonText, { color: THEME.success }]}>
                Set Default
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditAddress(address)}
          >
            <Ionicons name="create-outline" size={20} color={THEME.primary} />
            <Text style={[styles.actionButtonText, { color: THEME.primary }]}>
              Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteAddress(address)}
            disabled={deleteAddressMutation.isLoading}
          >
            <Ionicons name="trash-outline" size={20} color={THEME.error} />
            <Text style={[styles.actionButtonText, { color: THEME.error }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="location-outline" size={80} color={THEME.textMuted} />
      <Text style={styles.emptyTitle}>No Addresses Added</Text>
      <Text style={styles.emptySubtitle}>
        Add your delivery addresses to make checkout faster and easier
      </Text>
      <Button
        title="Add Address"
        onPress={handleAddAddress}
        style={styles.emptyButton}
        disabled={navigating}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <CustomHeader
          title="My Addresses"
          showBack={true}
          showCart={false}
          showProfile={false}
          onBackPress={handleBackPress}
        />
        <CustomLoader visible={true} message="Loading addresses..." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load addresses</Text>
        <Button title="Retry" onPress={() => refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader
        title={selectMode ? "Select Address" : "My Addresses"}
        subtitle={addresses.length > 0 ? `${addresses.length} saved ${addresses.length === 1 ? 'address' : 'addresses'}` : undefined}
        showBack={true}
        showCart={false}
        showProfile={false}
        onBackPress={() => navigation.goBack()}
      />

      {addresses.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <FlatList
            data={addresses}
            keyExtractor={(item) => item._id}
            renderItem={renderAddressItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[THEME.primary]}
              />
            }
          />

          {!selectMode && (
            <View style={styles.addButtonContainer}>
              <Button
                title="Add New Address"
                onPress={handleAddAddress}
                style={styles.addButton}
                leftIcon="add"
                disabled={navigating}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  listContainer: {
    padding: SIZES.lg,
    paddingBottom: SIZES.xl * 2,
  },
  addressCard: {
    marginBottom: SIZES.lg,
    padding: 0,
  },
  addressContent: {
    padding: SIZES.lg,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    marginRight: SIZES.sm,
  },
  defaultBadge: {
    backgroundColor: THEME.success,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.xs,
  },
  defaultText: {
    color: THEME.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
  typeIndicator: {
    padding: SIZES.sm,
    borderRadius: SIZES.sm,
    backgroundColor: THEME.primary + '20',
  },
  fullName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.xs,
  },
  phoneNumber: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: SIZES.sm,
  },
  fullAddress: {
    fontSize: 14,
    color: THEME.textSecondary,
    lineHeight: 20,
    marginBottom: SIZES.sm,
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.info + '10',
    padding: SIZES.sm,
    borderRadius: SIZES.sm,
    marginTop: SIZES.sm,
  },
  instructions: {
    fontSize: 12,
    color: THEME.info,
    marginLeft: SIZES.xs,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.sm,
    paddingHorizontal: SIZES.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: SIZES.xs,
  },
  addButtonContainer: {
    padding: SIZES.lg,
    paddingBottom: SIZES.xl,
  },
  addButton: {
    minHeight: 50,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.text,
    marginTop: SIZES.lg,
    marginBottom: SIZES.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.xl,
    lineHeight: 24,
  },
  emptyButton: {
    paddingHorizontal: SIZES.xl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.xl,
  },
  errorText: {
    fontSize: 18,
    color: THEME.error,
    marginBottom: SIZES.lg,
    textAlign: 'center',
  },
});

export default AddressListScreen;