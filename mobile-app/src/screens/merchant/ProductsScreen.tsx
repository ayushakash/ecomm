import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { THEME, SIZES } from '../../theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import CustomLoader from '../../components/ui/CustomLoader';
import apiService from '../../services/api';
import Toast from 'react-native-toast-message';
// import { Picker } from '@react-native-picker/picker';

interface ProductsScreenProps {
  navigation: any;
}

const ProductsScreen: React.FC<ProductsScreenProps> = ({ navigation }) => {
  const queryClient = useQueryClient();

  // States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  // Add product form state
  const [addForm, setAddForm] = useState({
    category: '',
    productId: '',
    price: '',
    stock: '',
    enabled: true,
  });

  // Edit product state
  const [editForm, setEditForm] = useState({
    stock: 0,
    price: 0,
    enabled: true,
  });

  // Fetch merchant products
  const { data: merchantProducts, isLoading, error, refetch } = useQuery({
    queryKey: ['merchant-products'],
    queryFn: () => apiService.product.getMerchantProducts().then(res => res.data),
  });


  // Fetch categories
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiService.product.getCategories().then(res => {
      console.log('Categories API Response:', res);
      console.log('Categories data:', res.data);
      return res.data;
    }),
  });

  // Fetch products for selected category
  const { data: masterProducts } = useQuery({
    queryKey: ['products', addForm.category],
    queryFn: () => apiService.product.getMasterProducts({ category: addForm.category }).then(res => res.data),
    enabled: !!addForm.category,
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiService.product.updateStock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-products'] });
      setShowEditModal(false);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Product updated successfully!',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.response?.data?.message || 'Error updating product',
      });
    },
  });

  // Create merchant product mutation
  const createProductMutation = useMutation({
    mutationFn: (data: any) => apiService.product.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-products'] });
      setShowAddModal(false);
      setAddForm({
        category: '',
        productId: '',
        price: '',
        stock: '',
        enabled: true,
      });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Product added successfully!',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.response?.data?.message || 'Error adding product',
      });
    },
  });

  const handleAddProduct = () => {
    if (!addForm.category || !addForm.productId || !addForm.price || !addForm.stock) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    createProductMutation.mutate({
      productId: addForm.productId,
      price: parseFloat(addForm.price),
      stock: parseInt(addForm.stock),
      enabled: addForm.enabled,
    });
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setEditForm({
      stock: product.myStock,
      price: product.price,
      enabled: product.enabled,
    });
    setShowEditModal(true);
  };

  const handleUpdateProduct = () => {
    if (!selectedProduct) return;

    const payload: any = {};

    if (editForm.stock !== undefined && !isNaN(editForm.stock)) {
      payload.stock = editForm.stock;
    }
    if (editForm.price !== undefined && !isNaN(editForm.price)) {
      payload.price = editForm.price;
    }
    if (editForm.enabled !== undefined) {
      payload.enabled = editForm.enabled;
    }

    if (Object.keys(payload).length > 0) {
      updateProductMutation.mutate({
        id: selectedProduct._id,
        ...payload,
      });
    } else {
      Alert.alert('Error', 'Please enter valid values to update.');
    }
  };

  const renderProductCard = (product: any) => {
    return (
      <Card key={product._id} style={styles.productCard}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: product.images?.[0] || 'https://via.placeholder.com/200x200?text=No+Image'
            }}
            style={styles.productImage}
            resizeMode="cover"
          />
          <View style={styles.enabledBadge}>
            <View style={[
              styles.enabledIndicator,
              { backgroundColor: product.enabled ? THEME.success : THEME.error }
            ]}>
              <Text style={styles.enabledText}>
                {product.enabled ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.categoryText}>
            {product.category?.name || 'No Category'}
          </Text>

          {/* Price and Stock */}
          <View style={styles.priceStockContainer}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Price</Text>
              <Text style={styles.priceValue}>₹{product.price}</Text>
            </View>
            <View style={styles.stockContainer}>
              <Text style={styles.stockLabel}>Stock</Text>
              <Text style={[
                styles.stockValue,
                {
                  color: product.myStock > 10 ? THEME.success :
                         product.myStock > 0 ? THEME.warning : THEME.error
                }
              ]}>
                {product.myStock} units
              </Text>
            </View>
          </View>

          {/* Edit Button */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditProduct(product)}
          >
            <Ionicons name="pencil" size={16} color="#fff" />
            <Text style={styles.editButtonText}>Edit Product</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  if (isLoading) {
    return <CustomLoader visible={true} message="Loading products..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Products</Text>
          <Text style={styles.headerSubtitle}>Manage your product inventory and pricing</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={[THEME.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Error loading products</Text>
            <Button
              title="Retry"
              onPress={() => refetch()}
              variant="outline"
              style={styles.retryButton}
            />
          </View>
        ) : !merchantProducts?.products || merchantProducts?.products?.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="cube-outline" size={48} color={THEME.textMuted} />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubText}>Add your first product to get started</Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {merchantProducts?.products?.map((product: any) => renderProductCard(product))}
          </View>
        )}
      </ScrollView>

      {/* Add Product Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={THEME.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowCategoryPicker(true)}
                >
                  <Text style={[styles.pickerButtonText, !addForm.category && styles.placeholderText]}>
                    {addForm.category ?
                      categories?.find((cat: any) => cat._id === addForm.category)?.name || 'Select Category'
                      : 'Select Category'
                    }
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={THEME.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Product */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Product</Text>
                <TouchableOpacity
                  style={[styles.pickerButton, !addForm.category && styles.disabledButton]}
                  onPress={() => addForm.category && setShowProductPicker(true)}
                  disabled={!addForm.category}
                >
                  <Text style={[styles.pickerButtonText, !addForm.productId && styles.placeholderText]}>
                    {addForm.productId ?
                      masterProducts?.products?.find((prod: any) => prod._id === addForm.productId)?.name || 'Select Product'
                      : 'Select Product'
                    }
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={THEME.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Price */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Price</Text>
                <TextInput
                  style={styles.textInput}
                  value={addForm.price}
                  onChangeText={(text) => setAddForm(prev => ({ ...prev, price: text }))}
                  placeholder="Enter price"
                  keyboardType="numeric"
                />
              </View>

              {/* Stock */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Stock</Text>
                <TextInput
                  style={styles.textInput}
                  value={addForm.stock}
                  onChangeText={(text) => setAddForm(prev => ({ ...prev, stock: text }))}
                  placeholder="Enter stock quantity"
                  keyboardType="numeric"
                />
              </View>

              {/* Enabled */}
              <View style={styles.checkboxGroup}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setAddForm(prev => ({ ...prev, enabled: !prev.enabled }))}
                >
                  <Ionicons
                    name={addForm.enabled ? "checkbox" : "square-outline"}
                    size={24}
                    color={THEME.primary}
                  />
                  <Text style={styles.checkboxLabel}>Product is active</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { opacity: createProductMutation.isLoading ? 0.7 : 1 }]}
                onPress={handleAddProduct}
                disabled={createProductMutation.isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {createProductMutation.isLoading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Product</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={THEME.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {selectedProduct && (
                <View style={styles.editProductInfo}>
                  <Text style={styles.editProductName}>{selectedProduct.name}</Text>
                  <Text style={styles.editProductCategory}>{selectedProduct.category?.name}</Text>
                </View>
              )}

              {/* Stock */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Stock</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.stock.toString()}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, stock: parseInt(text) || 0 }))}
                  placeholder="Enter stock quantity"
                  keyboardType="numeric"
                />
              </View>

              {/* Price */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Price</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.price.toString()}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, price: parseFloat(text) || 0 }))}
                  placeholder="Enter price"
                  keyboardType="numeric"
                />
              </View>

              {/* Enabled */}
              <View style={styles.checkboxGroup}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setEditForm(prev => ({ ...prev, enabled: !prev.enabled }))}
                >
                  <Ionicons
                    name={editForm.enabled ? "checkbox" : "square-outline"}
                    size={24}
                    color={THEME.primary}
                  />
                  <Text style={styles.checkboxLabel}>Product is active</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { opacity: updateProductMutation.isLoading ? 0.7 : 1 }]}
                onPress={handleUpdateProduct}
                disabled={updateProductMutation.isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {updateProductMutation.isLoading ? 'Updating...' : 'Update'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <Ionicons name="close" size={24} color={THEME.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerModalBody}>
              {categoriesLoading ? (
                <View style={styles.centerContainer}>
                  <Text style={styles.loadingText}>Loading categories...</Text>
                </View>
              ) : categoriesError ? (
                <View style={styles.centerContainer}>
                  <Text style={styles.errorText}>Error loading categories</Text>
                </View>
              ) : !categories || categories.length === 0 ? (
                <View style={styles.centerContainer}>
                  <Text style={styles.emptyText}>No categories available</Text>
                </View>
              ) : (
                categories?.map((category: any) => (
                  <TouchableOpacity
                    key={category._id}
                    style={styles.pickerItem}
                    onPress={() => {
                      setAddForm(prev => ({ ...prev, category: category._id, productId: '' }));
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{category.name}</Text>
                    {addForm.category === category._id && (
                      <Ionicons name="checkmark" size={20} color={THEME.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Product Picker Modal */}
      <Modal
        visible={showProductPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProductPicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Product</Text>
              <TouchableOpacity onPress={() => setShowProductPicker(false)}>
                <Ionicons name="close" size={24} color={THEME.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerModalBody}>
              {masterProducts?.products?.map((product: any) => (
                <TouchableOpacity
                  key={product._id}
                  style={styles.pickerItem}
                  onPress={() => {
                    setAddForm(prev => ({ ...prev, productId: product._id }));
                    setShowProductPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{product.name}</Text>
                  {addForm.productId === product._id && (
                    <Ionicons name="checkmark" size={20} color={THEME.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    backgroundColor: THEME.background,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: THEME.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.sm,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.lg,
    paddingBottom: SIZES.xl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.xl * 2,
  },
  errorText: {
    fontSize: 16,
    color: THEME.error,
    marginBottom: SIZES.lg,
  },
  emptyText: {
    fontSize: 18,
    color: THEME.textMuted,
    marginTop: SIZES.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 14,
    color: THEME.textMuted,
    marginTop: SIZES.xs,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SIZES.md,
  },
  productsGrid: {
    gap: SIZES.lg,
  },
  productCard: {
    marginBottom: SIZES.md,
    padding: 0,
    borderRadius: SIZES.md,
    backgroundColor: THEME.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: SIZES.md,
    borderTopRightRadius: SIZES.md,
  },
  enabledBadge: {
    position: 'absolute',
    top: SIZES.sm,
    right: SIZES.sm,
  },
  enabledIndicator: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.sm,
  },
  enabledText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  productInfo: {
    padding: SIZES.lg,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: SIZES.md,
  },
  priceStockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.md,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
  },
  stockContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  stockLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginBottom: 2,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.warning,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.sm,
    gap: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: THEME.background,
    borderRadius: SIZES.lg,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
  },
  closeButton: {
    padding: SIZES.xs,
  },
  modalBody: {
    padding: SIZES.lg,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: SIZES.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: SIZES.sm,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    fontSize: 16,
    color: THEME.text,
    backgroundColor: THEME.backgroundSecondary,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: SIZES.sm,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: THEME.backgroundSecondary,
    height: 50,
  },
  pickerButtonText: {
    fontSize: 16,
    color: THEME.text,
  },
  placeholderText: {
    color: THEME.textMuted,
  },
  disabledButton: {
    opacity: 0.5,
  },
  checkboxGroup: {
    marginBottom: SIZES.md,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  checkboxLabel: {
    fontSize: 16,
    color: THEME.text,
  },
  editProductInfo: {
    backgroundColor: THEME.backgroundSecondary,
    padding: SIZES.md,
    borderRadius: SIZES.sm,
    marginBottom: SIZES.md,
  },
  editProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 2,
  },
  editProductCategory: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    padding: SIZES.lg,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    gap: SIZES.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.sm,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: THEME.text,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.sm,
    backgroundColor: THEME.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },

  // Picker Modal Styles
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: THEME.background,
    borderTopLeftRadius: SIZES.lg,
    borderTopRightRadius: SIZES.lg,
    maxHeight: '70%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
  },
  pickerModalBody: {
    maxHeight: 300,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border + '20',
  },
  pickerItemText: {
    fontSize: 16,
    color: THEME.text,
  },
  loadingText: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: 'center',
    paddingVertical: SIZES.xl,
  },
});

export default ProductsScreen;