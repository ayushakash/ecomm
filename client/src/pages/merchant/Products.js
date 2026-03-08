import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DataTable from "../../components/commonComponents/dataTable";
import { productAPI } from "../../services/api";
import { toast } from "react-hot-toast";

const Products = () => {
  const queryClient = useQueryClient();

  // Add modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    category: "",
    productId: "",
    price: "",
    stock: "",
    enabled: true,
    variantPricing: [], // [{label, price, stock}]
  });

  // Edit popup state
  const [stockPopup, setStockPopup] = useState({
    open: false,
    productId: null,
    currentStock: 0,
    currentPrice: 0,
    currentEnabled: true,
    variants: [],        // master variants
    variantPricing: [],  // merchant's current variant pricing
  });
  const [newStock, setNewStock] = useState(0);
  const [newPrice, setNewPrice] = useState(0);
  const [newEnabled, setNewEnabled] = useState(true);
  const [editVariantPricing, setEditVariantPricing] = useState([]);

  // Fetch merchant products
  const { data: merchantProducts, isLoading } = useQuery({
    queryKey: ["merchant-products"],
    queryFn: () => productAPI.getMerchantProducts(),
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productAPI.getCategories(),
  });

  // Fetch products for selected category
  const { data: productList } = useQuery({
    queryKey: ["products", form.category],
    queryFn: () => productAPI.getMasterProducts({ category: form.category }),
    enabled: !!form.category,
  });

  // When a product is selected in the add modal, pre-fill variantPricing
  // Use merchant's existing prices if already added, else fall back to master variant prices
  const handleProductSelect = (productId) => {
    const selected = productList?.products?.find(p => p._id === productId);
    const variants = selected?.variants || [];

    // Check if merchant already has this product in their inventory
    const existing = merchantProducts?.products?.find(p => p._id === productId);

    let prefill;
    if (existing?.variantPricing?.length) {
      // Use merchant's own saved prices
      prefill = existing.variantPricing.map(v => ({ label: v.label, price: v.price, stock: v.stock }));
    } else {
      // New product — use master variant labels, price 0, stock 0
      prefill = variants.map(v => ({ label: v.label, price: 0, stock: 0 }));
    }

    setForm(prev => ({
      ...prev,
      productId,
      variantPricing: prefill,
    }));
  };

  const hasVariants = (form.variantPricing.length > 0);

  // Update a variant field in add form
  const updateAddVariant = (idx, field, value) => {
    const updated = [...form.variantPricing];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm(prev => ({ ...prev, variantPricing: updated }));
  };

  // Update a variant field in edit popup
  const updateEditVariant = (idx, field, value) => {
    const updated = [...editVariantPricing];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditVariantPricing(updated);
  };

  // Create merchant product mutation
  const createMerchantProduct = useMutation({
    mutationFn: (data) => productAPI.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["merchant-products"]);
      setShowModal(false);
      setForm({ category: "", productId: "", price: "", stock: "", enabled: true, variantPricing: [] });
      toast.success("Product added successfully!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Error adding product");
    },
  });

  // Update stock/price mutation
  const updateStockMutation = useMutation({
    mutationFn: ({ id, ...data }) => productAPI.updateStock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["merchant-products"]);
      toast.success("Product updated successfully!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Error updating product");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (hasVariants) {
      createMerchantProduct.mutate({
        productId: form.productId,
        variantPricing: form.variantPricing,
        enabled: form.enabled,
      });
    } else {
      createMerchantProduct.mutate({
        productId: form.productId,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        enabled: form.enabled,
      });
    }
  };

  const handleEditSave = () => {
    const isVariant = stockPopup.variants.length > 0;
    const payload = { enabled: newEnabled };

    if (isVariant) {
      payload.variantPricing = editVariantPricing;
    } else {
      if (!isNaN(newStock)) payload.stock = newStock;
      if (!isNaN(newPrice)) payload.price = newPrice;
    }

    updateStockMutation.mutate({ id: stockPopup.productId, ...payload });
    setStockPopup({ open: false, productId: null, currentStock: 0, currentPrice: 0, currentEnabled: true, variants: [], variantPricing: [] });
  };

  const openEditPopup = (product) => {
    const variants = product.variants || [];
    const variantPricing = product.variantPricing?.length
      ? product.variantPricing
      : variants.map(v => ({ label: v.label, price: 0, stock: 0 }));

    setStockPopup({
      open: true,
      productId: product._id,
      currentStock: product.myStock,
      currentPrice: product.price,
      currentEnabled: product.enabled,
      variants,
      variantPricing,
    });
    setNewStock(product.myStock);
    setNewPrice(product.price);
    setNewEnabled(product.enabled);
    setEditVariantPricing(variantPricing);
  };

  // Table columns
  const columns = [
    {
      header: "Image",
      accessorKey: "images",
      cell: ({ getValue }) => {
        const imgUrl = getValue()?.[0];
        return imgUrl ? (
          <img src={imgUrl} alt="product" className="h-10 w-10 rounded-lg object-cover" />
        ) : <span className="text-gray-400 text-xs">No image</span>;
      },
    },
    { header: "Product Name", accessorKey: "name" },
    { header: "Category", accessorKey: "category.name" },
    {
      header: "Price / Stock",
      cell: ({ row }) => {
        const p = row.original;
        if (p.variants?.length > 0) {
          return (
            <div className="text-xs space-y-0.5">
              {(p.variantPricing?.length ? p.variantPricing : p.variants).map(v => (
                <div key={v.label} className="text-gray-700">
                  <span className="font-medium">{v.label}</span> — ₹{v.price} · {v.stock} units
                </div>
              ))}
            </div>
          );
        }
        return <span className="text-sm">₹{p.price} · {p.myStock} units</span>;
      }
    },
    {
      header: "Status",
      accessorKey: "enabled",
      cell: ({ getValue }) =>
        getValue()
          ? <span className="text-green-600 text-sm font-medium">Active</span>
          : <span className="text-red-500 text-sm font-medium">Disabled</span>,
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <button
          className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"
          onClick={() => openEditPopup(row.original)}
        >
          Edit
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Products</h1>
            <p className="text-gray-600">Manage your product inventory and pricing</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Add Product
          </button>
        </div>

        {/* Edit Popup */}
        {stockPopup.open && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">Update Product</h2>

              {stockPopup.variants.length > 0 ? (
                // Variant product edit
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 mb-2">Set your price and stock for each size:</p>
                  <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-500 mb-1">
                    <span>Size</span><span>Price (₹)</span><span>Stock</span>
                  </div>
                  {editVariantPricing.map((v, idx) => (
                    <div key={v.label} className="grid grid-cols-3 gap-2 items-center">
                      <span className="text-sm font-semibold text-gray-800 bg-gray-100 rounded px-2 py-1.5 text-center">{v.label}</span>
                      <input
                        type="number"
                        min="0"
                        value={v.price}
                        onChange={(e) => updateEditVariant(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="border p-1.5 rounded text-sm"
                        placeholder="Price"
                      />
                      <input
                        type="number"
                        min="0"
                        value={v.stock}
                        onChange={(e) => updateEditVariant(idx, 'stock', parseInt(e.target.value) || 0)}
                        className="border p-1.5 rounded text-sm"
                        placeholder="Stock"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                // Non-variant product edit
                <>
                  <label className="block mb-1 text-sm">Stock</label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(parseInt(e.target.value))}
                    className="w-full border p-2 rounded mb-3"
                    min={0}
                  />
                  <label className="block mb-1 text-sm">Price (₹)</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(parseFloat(e.target.value))}
                    className="w-full border p-2 rounded mb-3"
                    min={0}
                  />
                </>
              )}

              <div className="flex items-center gap-2 mt-4 mb-4">
                <input
                  type="checkbox"
                  checked={newEnabled}
                  onChange={(e) => setNewEnabled(e.target.checked)}
                  id="edit-enabled"
                />
                <label htmlFor="edit-enabled" className="text-sm">Enabled</label>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 border rounded text-sm"
                  onClick={() => setStockPopup({ open: false, productId: null, currentStock: 0, currentPrice: 0, currentEnabled: true, variants: [], variantPricing: [] })}
                >
                  Cancel
                </button>
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
                  onClick={handleEditSave}
                  disabled={updateStockMutation.isLoading}
                >
                  {updateStockMutation.isLoading ? "Saving..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        <DataTable
          data={merchantProducts?.products || []}
          columns={columns}
          isLoading={isLoading}
          renderCard={(product) => (
            <div key={product._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="relative">
                <img
                  className="w-full h-48 object-cover"
                  src={product.images?.[0] || "https://picsum.photos/200/300"}
                  alt={product.name}
                />
                <div className="absolute top-2 right-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {product.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                <p className="text-xs text-gray-500">{product.category?.name}</p>
                {product.variants?.length > 0 ? (
                  <div className="space-y-1">
                    {(product.variantPricing?.length ? product.variantPricing : product.variants).map(v => (
                      <div key={v.label} className="flex justify-between text-xs text-gray-700">
                        <span className="font-medium">{v.label}</span>
                        <span>₹{v.price} · {v.stock} units</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-700">₹{product.price} · {product.myStock} units</div>
                )}
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <button
                  className="w-full inline-flex items-center justify-center px-3 py-2 border border-yellow-300 text-sm font-medium rounded-lg text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                  onClick={() => openEditPopup(product)}
                >
                  Edit Product
                </button>
              </div>
            </div>
          )}
        />

        {/* Add Product Modal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-[480px] max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">Add Product to Inventory</h2>
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm(p => ({ ...p, category: e.target.value, productId: "", variantPricing: [] }))}
                    className="w-full border p-2 rounded"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories?.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Product */}
                <div>
                  <label className="block text-sm font-medium mb-1">Product</label>
                  <select
                    value={form.productId}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full border p-2 rounded"
                    required
                  >
                    <option value="">Select Product</option>
                    {productList?.products?.map((p) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Variant or single price */}
                {form.productId && (
                  hasVariants ? (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-800 mb-1">Set Price &amp; Stock per Size</p>
                      <p className="text-xs text-gray-500 mb-3">Enter your selling price and available stock for each size.</p>
                      <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-500 mb-2">
                        <span>Size</span><span>Your Price (₹)</span><span>Stock</span>
                      </div>
                      {form.variantPricing.map((v, idx) => (
                        <div key={v.label} className="grid grid-cols-3 gap-2 items-center mb-2">
                          <span className="text-sm font-semibold bg-gray-100 rounded px-2 py-1.5 text-center">{v.label}</span>
                          <input
                            type="number"
                            min="0"
                            value={v.price}
                            onChange={(e) => updateAddVariant(idx, 'price', parseFloat(e.target.value) || 0)}
                            className="border p-1.5 rounded text-sm"
                            placeholder="₹ Price"
                            required
                          />
                          <input
                            type="number"
                            min="0"
                            value={v.stock}
                            onChange={(e) => updateAddVariant(idx, 'stock', parseInt(e.target.value) || 0)}
                            className="border p-1.5 rounded text-sm"
                            placeholder="Stock"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Your Price (₹)</label>
                        <input
                          type="number"
                          value={form.price}
                          onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))}
                          className="w-full border p-2 rounded"
                          min="0"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Stock</label>
                        <input
                          type="number"
                          value={form.stock}
                          onChange={(e) => setForm(p => ({ ...p, stock: e.target.value }))}
                          className="w-full border p-2 rounded"
                          min="0"
                          required
                        />
                      </div>
                    </div>
                  )
                )}

                {/* Enabled */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="add-enabled"
                    checked={form.enabled}
                    onChange={(e) => setForm(p => ({ ...p, enabled: e.target.checked }))}
                  />
                  <label htmlFor="add-enabled" className="text-sm">List this product as active</label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded text-sm">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMerchantProduct.isLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
                  >
                    {createMerchantProduct.isLoading ? "Saving..." : "Save"}
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

export default Products;
