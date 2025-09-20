import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import { THEME, SIZES } from '../../theme';
import { Address } from '../../types';
import api from '../../services/api';
import CustomHeader from '../../components/navigation/CustomHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

interface AddEditAddressScreenProps {
  navigation: any;
  route: {
    params: {
      mode: 'add' | 'edit';
      address?: Address;
    };
  };
}

const AddEditAddressScreen: React.FC<AddEditAddressScreenProps> = ({ navigation, route }) => {
  const { mode, address: existingAddress } = route.params;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: existingAddress?.title || '',
    fullName: existingAddress?.fullName || '',
    phoneNumber: existingAddress?.phoneNumber || '',
    addressLine1: existingAddress?.addressLine1 || '',
    addressLine2: existingAddress?.addressLine2 || '',
    landmark: existingAddress?.landmark || '',
    area: existingAddress?.area || '',
    city: existingAddress?.city || '',
    state: existingAddress?.state || '',
    pincode: existingAddress?.pincode || '',
    addressType: existingAddress?.addressType || 'home',
    deliveryInstructions: existingAddress?.deliveryInstructions || '',
    isDefault: existingAddress?.isDefault || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Create address mutation
  const createAddressMutation = useMutation({
    mutationFn: (addressData: any) => api.addresses.createAddress(addressData),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Address Added',
        text2: 'New address has been saved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      navigation.goBack();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.response?.data?.message || 'Failed to save address',
      });
    },
  });

  // Update address mutation
  const updateAddressMutation = useMutation({
    mutationFn: (data: { id: string; addressData: any }) => 
      api.addresses.updateAddress(data.id, data.addressData),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Address Updated',
        text2: 'Address has been updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      navigation.goBack();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.response?.data?.message || 'Failed to update address',
      });
    },
  });

  const updateFormData = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    setErrors(prev => {
      if (prev[field]) {
        return { ...prev, [field]: '' };
      }
      return prev;
    });
  }, []); // Removed errors dependency to prevent re-creation

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Address title is required';
    }
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }
    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Address is required';
    }
    if (!formData.area.trim()) {
      newErrors.area = 'Area is required';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }
    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Please enter a valid 6-digit pincode';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    const addressData = {
      title: formData.title,
      fullName: formData.fullName,
      phoneNumber: formData.phoneNumber,
      addressLine1: formData.addressLine1,
      addressLine2: formData.addressLine2,
      landmark: formData.landmark,
      area: formData.area,
      city: formData.city,
      state: formData.state,
      pincode: formData.pincode,
      addressType: formData.addressType,
      deliveryInstructions: formData.deliveryInstructions,
      isDefault: formData.isDefault,
    };

    if (mode === 'add') {
      createAddressMutation.mutate(addressData);
    } else if (existingAddress) {
      updateAddressMutation.mutate({
        id: existingAddress._id,
        addressData,
      });
    }
  };

  const isLoading = createAddressMutation.isLoading || updateAddressMutation.isLoading;

  // Memoize address type options to prevent re-creation
  const addressTypeOptions = useMemo(() => [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'office', label: 'Office', icon: 'business' },
    { key: 'other', label: 'Other', icon: 'location' },
  ], []);

  // Memoize navigation handler
  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Memoize input handlers to prevent re-creation
  const handleTitleChange = useCallback((text: string) => updateFormData('title', text), [updateFormData]);
  const handleFullNameChange = useCallback((text: string) => updateFormData('fullName', text), [updateFormData]);
  const handlePhoneChange = useCallback((text: string) => updateFormData('phoneNumber', text), [updateFormData]);
  const handleAddressLine1Change = useCallback((text: string) => updateFormData('addressLine1', text), [updateFormData]);
  const handleAddressLine2Change = useCallback((text: string) => updateFormData('addressLine2', text), [updateFormData]);
  const handleLandmarkChange = useCallback((text: string) => updateFormData('landmark', text), [updateFormData]);
  const handleAreaChange = useCallback((text: string) => updateFormData('area', text), [updateFormData]);
  const handleCityChange = useCallback((text: string) => updateFormData('city', text), [updateFormData]);
  const handleStateChange = useCallback((text: string) => updateFormData('state', text), [updateFormData]);
  const handlePincodeChange = useCallback((text: string) => updateFormData('pincode', text), [updateFormData]);
  const handleDeliveryInstructionsChange = useCallback((text: string) => updateFormData('deliveryInstructions', text), [updateFormData]);
  
  // Memoize address type selection
  const handleAddressTypeChange = useCallback((addressType: string) => {
    updateFormData('addressType', addressType);
  }, [updateFormData]);
  
  // Memoize default checkbox toggle
  const handleDefaultToggle = useCallback(() => {
    setFormData(prev => ({ ...prev, isDefault: !prev.isDefault }));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        title={mode === 'add' ? 'Add Address' : 'Edit Address'}
        showBack={true}
        showCart={false}
        showProfile={false}
        onBackPress={handleBackPress}
      />

      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          overScrollMode="never"
          removeClippedSubviews={false}
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
        >
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Address Details</Text>

          <Input
            label="Address Title *"
            placeholder="e.g., Home, Office"
            value={formData.title}
            onChangeText={handleTitleChange}
            error={errors.title}
            leftIcon="bookmark-outline"
          />

          <Input
            label="Full Name *"
            placeholder="Enter recipient's full name"
            value={formData.fullName}
            onChangeText={handleFullNameChange}
            error={errors.fullName}
            leftIcon="person-outline"
          />

          <Input
            label="Phone Number *"
            placeholder="9876543210"
            value={formData.phoneNumber}
            onChangeText={handlePhoneChange}
            error={errors.phoneNumber}
            keyboardType="phone-pad"
            leftIcon="call-outline"
          />

          <Input
            label="Address Line 1 *"
            placeholder="House/Flat no, Building name"
            value={formData.addressLine1}
            onChangeText={handleAddressLine1Change}
            error={errors.addressLine1}
            multiline
            numberOfLines={2}
          />

          <Input
            label="Address Line 2 (Optional)"
            placeholder="Street, Colony"
            value={formData.addressLine2}
            onChangeText={handleAddressLine2Change}
            multiline
            numberOfLines={2}
          />

          <Input
            label="Landmark (Optional)"
            placeholder="Near hospital, mall, etc."
            value={formData.landmark}
            onChangeText={handleLandmarkChange}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="Area *"
                placeholder="Area/Locality"
                value={formData.area}
                onChangeText={handleAreaChange}
                error={errors.area}
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label="City *"
                placeholder="City"
                value={formData.city}
                onChangeText={handleCityChange}
                error={errors.city}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="State *"
                placeholder="State"
                value={formData.state}
                onChangeText={handleStateChange}
                error={errors.state}
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label="Pincode *"
                placeholder="123456"
                value={formData.pincode}
                onChangeText={handlePincodeChange}
                error={errors.pincode}
                keyboardType="numeric"
              />
            </View>
          </View>
        </Card>

        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Address Type</Text>
          <View style={styles.addressTypeContainer}>
            {addressTypeOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.addressTypeOption,
                  formData.addressType === option.key && styles.addressTypeSelected,
                ]}
                onPress={() => handleAddressTypeChange(option.key)}
              >
                <Ionicons
                  name={option.icon as any}
                  size={24}
                  color={
                    formData.addressType === option.key ? THEME.background : THEME.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.addressTypeText,
                    formData.addressType === option.key && styles.addressTypeTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Additional Options</Text>
          
          <Input
            label="Delivery Instructions (Optional)"
            placeholder="e.g., Ring the bell twice, Leave at door"
            value={formData.deliveryInstructions}
            onChangeText={handleDeliveryInstructionsChange}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={handleDefaultToggle}
          >
            <View style={[styles.checkbox, formData.isDefault && styles.checkboxSelected]}>
              {formData.isDefault && (
                <Ionicons name="checkmark" size={16} color={THEME.background} />
              )}
            </View>
            <Text style={styles.checkboxLabel}>Set as default address</Text>
          </TouchableOpacity>
        </Card>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <Button
            title={mode === 'add' ? 'Save Address' : 'Update Address'}
            onPress={handleSave}
            loading={isLoading}
            style={styles.saveButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 100,
  },
  formCard: {
    margin: SIZES.lg,
    marginBottom: SIZES.md,
    padding: SIZES.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.lg,
  },
  row: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  halfWidth: {
    flex: 1,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  addressTypeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.lg,
    paddingHorizontal: SIZES.md,
    borderRadius: SIZES.md,
    borderWidth: 2,
    borderColor: THEME.border,
    backgroundColor: THEME.surface,
  },
  addressTypeSelected: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primary,
  },
  addressTypeText: {
    marginTop: SIZES.sm,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  addressTypeTextSelected: {
    color: THEME.background,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: THEME.border,
    marginRight: SIZES.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  checkboxLabel: {
    fontSize: 16,
    color: THEME.text,
  },
  buttonContainer: {
    padding: SIZES.lg,
    paddingBottom: SIZES.xl,
  },
  saveButton: {
    minHeight: 50,
  },
});

export default AddEditAddressScreen;