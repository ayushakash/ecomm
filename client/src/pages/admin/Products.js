import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import DataTable from "../../components/commonComponents/dataTable";
import { productAPI } from "../../services/api";
import ConfirmDeleteButton from "../../components/products/ConfirmDeleteButton";

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
    images: "",
    sku: "",
    price: 0,
    stock: 0,
    enabled: true,
    gstRate: 18, // Default 18% GST
    gstType: "exclusive", // Default exclusive GST
  });
  const [newCategory, setNewCategory] = useState("");

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
      setIsAddModalOpen(false);
      toast.success("Product added!");
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Error adding product"),
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, ...data }) => productAPI.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      setEditModal({ open: false, product: null });
      toast.success("Product updated!");
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

  // Submit product
  const handleSubmit = (e) => {
    e.preventDefault();
    createProductMutation.mutate(formData);
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
  const handleEditSubmit = (e) => {
    e.preventDefault();
    console.log(formData);
    updateProductMutation.mutate({ id: editModal.product._id, ...formData });
  };

  // Prepare edit modal
  const openEditModal = (product) => {
    setFormData({
      category: product.category?._id || product.category || "",
      name: product.name || "",
      description: product.description || "",
      unit: product.unit || "",
      specification: product.specification || "",
      images: product.images?.[0] || "",
      sku: product.sku || "",
      price: product.price || 0,
      stock: product.stock || 0,
      enabled: product.enabled || false,
      gstRate: product.gstRate || 18,
      gstType: product.gstType || "exclusive",
    });
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
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">₹{info.getValue()}</div>
            <div className="text-xs text-gray-500">
              {row.gstType === 'no-gst' ? 'No GST' : `${row.gstRate}% GST (${row.gstType})`}
            </div>
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
      images: "",
      sku: "",
      price: 0,
      stock: 0,
      enabled: true,
      gstRate: 18,
      gstType: "exclusive",
    });
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
                    {product.gstType === 'no-gst' ? 'No GST' : `${product.gstRate}% GST (${product.gstType})`}
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
          onClose={() => setIsAddModalOpen(false)}
          onAddCategory={() => {
            setIsAddModalOpen(false);
            setIsCategoryModalOpen(true);
          }}
        />
      )}

      {/* Edit Product Modal */}
      {editModal.open && (
        <ProductModal
          formData={formData}
          setFormData={setFormData}
          categories={categories}
          onSubmit={handleEditSubmit}
          onClose={() => setEditModal({ open: false, product: null })}
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
const ProductModal = ({ formData, setFormData, categories, onSubmit, onClose, onAddCategory }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
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
        <div>
          <label className="block text-sm font-medium text-gray-700">Image URL</label>
          <input
            type="text"
            name="images"
            value={formData.images}
            onChange={(e) => setFormData({ ...formData, images: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          />
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
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">GST Configuration</label>

          {/* GST Type */}
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">GST Type</label>
            <select
              name="gstType"
              value={formData.gstType}
              onChange={(e) => setFormData({ ...formData, gstType: e.target.value })}
              className="block w-full border border-gray-300 rounded-md p-2"
            >
              <option value="exclusive">Exclusive (GST added to price)</option>
              <option value="inclusive">Inclusive (GST included in price)</option>
              <option value="no-gst">No GST (Tax exempted)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.gstType === 'exclusive' && 'GST will be added on top of the base price'}
              {formData.gstType === 'inclusive' && 'Price already includes GST'}
              {formData.gstType === 'no-gst' && 'No GST will be applied'}
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
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
        </div>
      </form>
    </div>
  </div>
);

export default Products;
