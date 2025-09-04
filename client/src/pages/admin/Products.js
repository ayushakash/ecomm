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
    { accessorKey: "price", header: "Price" },
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
    <div className="space-y-6">
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
