import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import DataTable from "../../components/commonComponents/dataTable";
import { productAPI } from "../../services/api";
import ConfirmDeleteButton from "../../components/products/ConfirmDeleteButton";
import axios from "axios";

const Products = () => {
  const queryClient = useQueryClient();

  // Fetch products
  const { data: productList, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: () => productAPI.getProducts(),
  });
  console.log(productList);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productAPI.getCategories(),
  });

  // State
  const [globalFilter, setGlobalFilter] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, product: null });
  const [formData, setFormData] = useState({
    category: "",
    name: "",
    description: "",
    unit: "",
    specification: "",
    images: [],
    sku: "",
    price: 0,
    stock: 0,
    enabled: true,
    gstRate: 18,
    gstType: "exclusive",
    bulkMinQty: 10,
    variants: [], // [{label, price, stock}]
  });
  const [newCategory, setNewCategory] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Mutations
  const addCategoryMutation = useMutation({
    mutationFn: (newCat) => productAPI.addCategories(newCat),
    onSuccess: () => {
      queryClient.invalidateQueries(["categories"]);
      toast.success("Category added!");
    },
  });

  const createProductMutation = useMutation({
    mutationFn: (data) => productAPI.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      toast.success("Product added!");
      // Reset form and close modal
      setFormData({
        category: "",
        name: "",
        description: "",
        unit: "",
        specification: "",
        images: [],
        sku: "",
        price: 0,
        stock: 0,
        enabled: true,
        gstRate: 18,
        gstType: "exclusive",
        variants: [],
      });
      setSelectedFiles([]);
      setIsAddModalOpen(false);
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Error adding product"),
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, ...data }) => productAPI.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      toast.success("Product updated!");
      setSelectedFiles([]);
      setEditModal({ open: false, product: null });
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Error updating product"),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => productAPI.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      toast.success("Product deleted!");
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Error deleting product"),
  });

  // Handle input change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const newFiles = Array.from(e.target.files);

    // Combine existing and new files
    const combinedFiles = [...selectedFiles, ...newFiles];

    if (combinedFiles.length > 10) {
      toast.error(`Maximum 10 images allowed. You selected ${combinedFiles.length} images.`);
      return;
    }

    setSelectedFiles(combinedFiles);
    toast.success(`${newFiles.length} image(s) selected. Total: ${combinedFiles.length}`);

    // Reset input to allow selecting same file again if needed
    e.target.value = '';
  };

  // Remove selected file
  const removeSelectedFile = (index) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    toast.success('Image removed from selection');
  };

  // Upload images to MinIO
  const uploadImages = async (files) => {
    if (!files || files.length === 0) return [];

    setUploadingImages(true);
    const formDataImages = new FormData();
    files.forEach(file => {
      formDataImages.append('images', file);
    });

    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post('/api/upload/product-images', formDataImages, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      setUploadingImages(false);
      console.log('📤 Upload response:', response.data);
      const urls = response.data.urls;
      console.log('🔗 Image URLs received:', urls);
      console.log('🔢 Number of URLs:', urls.length);

      return urls;
    } catch (error) {
      setUploadingImages(false);
      toast.error(error.response?.data?.message || 'Failed to upload images');
      throw error;
    }
  };

  // Submit product
  const handleSubmit = async (e) => {
    e.preventDefault();

    let imageUrls = formData.images || [];

    // Upload new images if selected
    if (selectedFiles.length > 0) {
      try {
        imageUrls = await uploadImages(selectedFiles);
        console.log('📸 Uploaded images:', imageUrls);
      } catch (error) {
        return; // Stop if upload fails
      }
    }

    const productData = {
      ...formData,
      images: imageUrls
    };

    console.log('📦 Submitting product data:', productData);
    console.log('🖼️ Images array:', productData.images);

    createProductMutation.mutate(productData);
  };

  // Submit category
  const handleCategorySubmit = (e) => {
    e.preventDefault();
    if (newCategory.trim()) {
      addCategoryMutation.mutate({ name: newCategory });
      setNewCategory("");
      setIsCategoryModalOpen(false);
    }
  };

  // Submit edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    let imageUrls = formData.images || [];

    // Upload new images if selected
    if (selectedFiles.length > 0) {
      try {
        const newUrls = await uploadImages(selectedFiles);
        imageUrls = [...(Array.isArray(imageUrls) ? imageUrls : [imageUrls].filter(Boolean)), ...newUrls];
      } catch (error) {
        return; // Stop if upload fails
      }
    }

    console.log(formData);
    updateProductMutation.mutate({
      id: editModal.product._id,
      ...formData,
      images: imageUrls
    });

    setSelectedFiles([]);
  };

  // Prepare edit modal
  const openEditModal = (product) => {
    setFormData({
      category: product.category?._id || product.category || "",
      name: product.name || "",
      description: product.description || "",
      unit: product.unit || "",
      specification: product.specification || "",
      images: product.images || [],
      sku: product.sku || "",
      price: product.price || 0,
      stock: product.stock || 0,
      enabled: product.enabled || false,
      gstRate: product.gstRate || 18,
      gstType: product.gstType || "exclusive",
      bulkMinQty: product.bulkMinQty || 10,
      variants: product.variants || [],
    });
    setSelectedFiles([]);
    setEditModal({ open: true, product });
  };

  // Table columns
  const columns = [
    {
      accessorKey: "name",
      header: "Product",
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex items-center">
            <img
              className="h-10 w-10 rounded-lg object-cover"
              src={row.images?.[0] || "/placeholder-product.jpg"}
              alt={row.name}
            />
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">{row.name}</div>
              <div className="text-xs text-gray-500">SKU: {row.sku}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: (info) => {
        const val = info.getValue();
        return typeof val === "object" ? val?.name : val || "N/A";
      },
    },
    {
      accessorKey: "price",
      header: "Base Price",
      cell: (info) => {
        const row = info.row.original;
        const hasVariants = row.variants && row.variants.length > 0;
        const gstLabel = row.gstType === 'no-gst' ? 'No GST' : row.gstType === 'inclusive' ? `${row.gstRate}% GST (final price)` : `${row.gstRate}% GST (base price)`;
        if (hasVariants) {
          return (
            <div className="space-y-0.5">
              {row.variants.map(v => (
                <div key={v.label} className="text-xs text-gray-700">
                  <span className="font-medium">{v.label}</span> — ₹{v.price}
                </div>
              ))}
              <div className="text-xs text-gray-400">{gstLabel}</div>
            </div>
          );
        }
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">₹{info.getValue()}</div>
            <div className="text-xs text-gray-500">{gstLabel}</div>
          </div>
        );
      }
    },
    { accessorKey: "totalStock", header: "Stock" },
    {
      accessorKey: "enabled",
      header: "Status",
      cell: (info) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            info.getValue() ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {info.getValue() ? "Enabled" : "Disabled"}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <button
            className="text-blue-600 hover:underline"
            onClick={() => openEditModal(row.original)}
          >
            Edit
          </button>
           <ConfirmDeleteButton
          title="Delete Product?"
          message="This action cannot be undone."
          onConfirm={() => deleteProductMutation.mutate(row.original._id)}
          loading={deleteProductMutation.isLoading}
        />
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center py-10">Error loading products</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 pl-8">
      <div className="max-w-7xl mx-auto px-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products Management</h1>
            <p className="text-gray-600">Manage all products in the system</p>
          </div>
        <button
  onClick={() => {
    setFormData({
      category: "",
      name: "",
      description: "",
      unit: "",
      specification: "",
      images: [],
      sku: "",
      price: 0,
      stock: 0,
      enabled: true,
      gstRate: 18,
      gstType: "exclusive",
      bulkMinQty: 10,
      variants: [],
    });
    setSelectedFiles([]);
    setIsAddModalOpen(true);
  }}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
>
  + Add Product
</button>
      </div>

      <DataTable
        title="All Products"
        columns={columns}
        data={productList?.products || []}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        renderCard={(product) => (
          <div key={product._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
            {/* Header with Image */}
            <div className="relative">
              <img
                className="w-full h-48 object-cover"
                src={product.images?.[0] || "https://picsum.photos/200/300"}
                alt={product.name}
              />
              <div className="absolute top-2 right-2">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    product.enabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {product.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Product Name & SKU */}
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{product.name}</h3>
                <p className="text-sm text-gray-500">SKU: {product.sku}</p>
              </div>

              {/* Category */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {typeof product.category === "object" ? product.category?.name : product.category || "N/A"}
                </span>
              </div>

              {/* Price */}
              <div className="flex items-center space-x-2">
                <div>
                  <span className="font-semibold text-gray-900">₹{product.price}</span>
                  <span className="text-sm text-gray-500 ml-1">per {product.unit}</span>
                  <div className="text-xs text-gray-500">
                    {product.gstType === 'no-gst' ? 'No GST' : product.gstType === 'inclusive' ? `${product.gstRate}% GST (final price)` : `${product.gstRate}% GST (base price)`}
                  </div>
                </div>
              </div>

              {/* Stock */}
              <div className="flex items-center space-x-2">
                <div>
                  <span className={`font-medium ${
                    product.totalStock > 10 ? 'text-green-600' :
                    product.totalStock > 0 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {product.totalStock} units
                  </span>
                  <span className="text-sm text-gray-500 ml-1">in stock</span>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {product.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <div className="flex space-x-2">
                <button
                  onClick={() => openEditModal(product)}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Edit
                </button>
                <div className="flex-1">
                  <ConfirmDeleteButton
                    title="Delete Product?"
                    message="This action cannot be undone."
                    onConfirm={() => deleteProductMutation.mutate(product._id)}
                    loading={deleteProductMutation.isLoading}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      />

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <ProductModal
          formData={formData}
          setFormData={setFormData}
          categories={categories}
          onSubmit={handleSubmit}
          onClose={() => {
            setIsAddModalOpen(false);
            setSelectedFiles([]);
          }}
          onAddCategory={() => {
            setIsAddModalOpen(false);
            setIsCategoryModalOpen(true);
          }}
          selectedFiles={selectedFiles}
          handleFileSelect={handleFileSelect}
          removeSelectedFile={removeSelectedFile}
          uploadingImages={uploadingImages}
        />
      )}

      {/* Edit Product Modal */}
      {editModal.open && (
        <ProductModal
          formData={formData}
          setFormData={setFormData}
          categories={categories}
          onSubmit={handleEditSubmit}
          onClose={() => {
            setEditModal({ open: false, product: null });
            setSelectedFiles([]);
          }}
          selectedFiles={selectedFiles}
          handleFileSelect={handleFileSelect}
          removeSelectedFile={removeSelectedFile}
          uploadingImages={uploadingImages}
        />
      )}

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Add New Category</h2>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

// Product Modal Component
const ProductModal = ({ formData, setFormData, categories, onSubmit, onClose, onAddCategory, selectedFiles, handleFileSelect, removeSelectedFile, uploadingImages }) => {
  const removeImage = (index) => {
    const updatedImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: updatedImages });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Product Details</h2>
        <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={(e) => {
              if (e.target.value === "add") {
                onAddCategory && onAddCategory();
              } else {
                setFormData({ ...formData, category: e.target.value });
              }
            }}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            required
          >
            <option value="">-- Select Category --</option>
            <option value="add">➕ Add New Category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Product Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            rows="3"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
  <label className="block text-sm font-medium text-gray-700">Unit</label>
  <select
    name="unit"
    value={formData.unit}
    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
     required
  >
    <option value="">-- Select Unit --</option>
    <option value="kg">kg</option>
    <option value="ton">ton</option>
    <option value="bag">bag</option>
    <option value="piece">piece</option>
    <option value="cubic-meter">cubic-meter</option>
    <option value="sq-ft">sq-ft</option>
  </select>
</div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Specification</label>
            <input
              type="text"
              name="specification"
              value={formData.specification}
              onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>
        </div>
        {/* Product Images Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>

          {/* Existing Images */}
          {formData.images && formData.images.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-600 mb-2">Current Images:</p>
              <div className="grid grid-cols-4 gap-2">
                {formData.images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img}
                      alt={`Product ${index + 1}`}
                      className="w-full h-24 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="product-images"
              disabled={uploadingImages}
            />
            <label
              htmlFor="product-images"
              className={`cursor-pointer ${uploadingImages ? 'opacity-50' : ''}`}
            >
              <div className="text-gray-600">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="mt-1 text-sm font-medium">
                  {uploadingImages ? 'Uploading...' : 'Click to add more images'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Select multiple files or add one at a time
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG up to 5MB each (Max 10 total)
                </p>
              </div>
            </label>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-600 mb-2">
                  Selected: {selectedFiles.length} file(s) - Click × to remove
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        title="Remove this image"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-1 truncate">
                        {file.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">SKU</label>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>
          {formData.variants.length > 0 ? (
            <div className="col-span-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-sm text-blue-700">
              <span>💡</span>
              <span>Price &amp; Stock are set per variant below — no base price needed.</span>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Stock</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Bulk Order Min Qty
              <span className="ml-1 text-xs text-gray-400 font-normal">(WhatsApp shown above this qty)</span>
            </label>
            <input
              type="number"
              min={1}
              value={formData.bulkMinQty}
              onChange={(e) => setFormData({ ...formData, bulkMinQty: parseInt(e.target.value) || 10 })}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>
        </div>
        {/* ── Variants Section ── */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-semibold text-gray-800">
                Size / Variants
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                Add sizes with individual prices (e.g. TMT 8mm, 10mm). Leave empty if product has no variants.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  variants: [...formData.variants, { label: "", price: 0, stock: 0 }],
                })
              }
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
            >
              + Add Size
            </button>
          </div>

          {formData.variants.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-2">No variants — product has a single price above.</p>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                <span className="col-span-4">Label (size/grade)</span>
                <span className="col-span-3">Price (₹)</span>
                <span className="col-span-3">Stock</span>
                <span className="col-span-2"></span>
              </div>
              {formData.variants.map((variant, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    placeholder="e.g. 8mm"
                    value={variant.label}
                    onChange={(e) => {
                      const updated = [...formData.variants];
                      updated[idx] = { ...updated[idx], label: e.target.value };
                      setFormData({ ...formData, variants: updated });
                    }}
                    className="col-span-4 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={variant.price}
                    onChange={(e) => {
                      const updated = [...formData.variants];
                      updated[idx] = { ...updated[idx], price: parseFloat(e.target.value) || 0 };
                      setFormData({ ...formData, variants: updated });
                    }}
                    className="col-span-3 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={variant.stock}
                    onChange={(e) => {
                      const updated = [...formData.variants];
                      updated[idx] = { ...updated[idx], stock: parseInt(e.target.value) || 0 };
                      setFormData({ ...formData, variants: updated });
                    }}
                    className="col-span-3 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = formData.variants.filter((_, i) => i !== idx);
                      setFormData({ ...formData, variants: updated });
                    }}
                    className="col-span-2 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-1.5 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">GST Configuration</label>

          {/* GST Type */}
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">How did you enter the price?</label>
            <select
              name="gstType"
              value={formData.gstType}
              onChange={(e) => setFormData({ ...formData, gstType: e.target.value })}
              className="block w-full border border-gray-300 rounded-md p-2"
            >
              <option value="exclusive">Base price — GST not included (system will add GST on top)</option>
              <option value="inclusive">Final price — GST already included in the amount</option>
              <option value="no-gst">No GST — customer pays exactly what you entered</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.gstType === 'exclusive' && '💡 e.g. You entered ₹55. Customer will pay ₹55 + GST.'}
              {formData.gstType === 'inclusive' && '💡 e.g. You entered ₹65 (GST already baked in). Customer pays ₹65.'}
              {formData.gstType === 'no-gst' && '💡 e.g. You entered ₹65. Customer pays exactly ₹65. No GST charged.'}
            </p>
          </div>

          {/* GST Rate - only show if not no-gst */}
          {formData.gstType !== 'no-gst' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">GST Rate (%)</label>
              <select
                name="gstRate"
                value={formData.gstRate}
                onChange={(e) => setFormData({ ...formData, gstRate: parseInt(e.target.value) })}
                className="block w-full border border-gray-300 rounded-md p-2"
              >
                <option value={0}>0% (Exempted)</option>
                <option value={5}>5% (Essential goods - Sand, Bricks)</option>
                <option value={12}>12% (Standard goods)</option>
                <option value={18}>18% (Most goods - Steel, Electrical)</option>
                <option value={28}>28% (Luxury goods - Cement, Tiles, Paints)</option>
              </select>
            </div>
          )}
        </div>
        <div>
          <label className="inline-flex items-center mt-2">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="form-checkbox"
            />
            <span className="ml-2 text-gray-700">Enabled</span>
          </label>
        </div>
        <div className="flex justify-end space-x-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={uploadingImages}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={uploadingImages}
          >
            {uploadingImages ? 'Uploading...' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
    </div>
  );
};

export default Products;
