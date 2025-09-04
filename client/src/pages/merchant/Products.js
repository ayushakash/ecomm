import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DataTable from "../../components/commonComponents/dataTable";
import { productAPI } from "../../services/api";
import { toast } from "react-hot-toast";

const Products = () => {
  const queryClient = useQueryClient();

  // States
  const [showModal, setShowModal] = useState(false);
  const [stockPopup, setStockPopup] = useState({
    open: false,
    productId: null,
    currentStock: 0,
    currentPrice: 0,
    currentEnabled: true,
  });

  const [newStock, setNewStock] = useState(0);
  const [newPrice, setNewPrice] = useState(0);
  const [newEnabled, setNewEnabled] = useState(true);

  const [form, setForm] = useState({
    category: "",
    productId: "",
    price: "",
    stock: "",
    enabled: true,
  });

  // Fetch merchant products
  const { data: merchantProducts, isLoading } = useQuery({
    queryKey: ["merchant-products"],
    queryFn: () => productAPI.getProducts(),
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

  // Mutation to update stock, price, and enabled
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

  // Create merchant product
  const createMerchantProduct = useMutation({
    mutationFn: (data) => productAPI.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["merchant-products"]);
      setShowModal(false);
      setForm({
        category: "",
        productId: "",
        price: "",
        stock: "",
        enabled: true,
      });
      toast.success("Product added successfully!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Error adding product");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("FORM", form);
    createMerchantProduct.mutate({
      productId: form.productId,
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
      enabled: form.enabled,
    });
  };

  // Table columns
  const columns = [
    {
      header: "Image",
      accessorKey: "images",
      cell: ({ getValue }) => {
        const imgUrl = getValue()?.[0];
        return imgUrl ? (
          <img
            src={imgUrl}
            alt="product"
            className="h-10 w-10 rounded-lg object-cover"
          />
        ) : (
          <span>No Image</span>
        );
      },
    },
    { header: "Product Name", accessorKey: "name" },
    { header: "Category", accessorKey: "category.name" },
    { header: "Price", accessorKey: "price" },
    { header: "Stock", accessorKey: "myStock" },
    {
      header: "Enabled",
      accessorKey: "enabled",
      cell: ({ getValue }) =>
        getValue() ? (
          <span className="text-green-600">Yes</span>
        ) : (
          <span className="text-red-600">No</span>
        ),
    },
    {
      header: "Actions",
      cell: ({ row }) => {
        const product = row.original;
        return (
          <button
            className="bg-yellow-500 text-white px-2 py-1 rounded"
            onClick={() => {
              setStockPopup({
                open: true,
                productId: product._id,
                currentStock: product.myStock,
                currentPrice: product.price,
                currentEnabled: product.enabled,
              });
              setNewStock(product.myStock);
              setNewPrice(product.price);
              setNewEnabled(product.enabled);
            }}
          >
            Edit
          </button>
        );
      },
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">My Products</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Add Product
        </button>
      </div>

      {/* Popup to edit stock, price, and enable */}
      {stockPopup.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-80">
            <h2 className="text-lg font-semibold mb-4">Update Product</h2>

            {/* Stock */}
            <label className="block mb-1">Stock</label>
            <input
              type="number"
              value={newStock}
              onChange={(e) => setNewStock(parseInt(e.target.value))}
              className="w-full border p-2 rounded mb-2"
              min={0}
              placeholder="Stock"
            />

            {/* Price */}
            <label className="block mb-1">Price</label>
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(parseFloat(e.target.value))}
              className="w-full border p-2 rounded mb-2"
              min={0}
              placeholder="Price"
            />

            {/* Enabled */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={newEnabled}
                onChange={(e) => setNewEnabled(e.target.checked)}
              />
              <span>Enabled</span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 border rounded"
                onClick={() =>
                  setStockPopup({
                    open: false,
                    productId: null,
                    currentStock: 0,
                    currentPrice: 0,
                    currentEnabled: true,
                  })
                }
              >
                Cancel
              </button>
            <button
  className="bg-blue-600 text-white px-4 py-2 rounded"
  onClick={() => {
    const payload = {};
    
    // Only include stock if it's a valid number
    if (newStock !== undefined && !isNaN(newStock)) {
      payload.stock = newStock;
    }

    // Only include price if it's a valid number
    if (newPrice !== undefined && !isNaN(newPrice)) {
      payload.price = newPrice;
    }

    // Only include enabled if it's boolean
    if (newEnabled !== undefined) {
      payload.enabled = newEnabled;
    }

    // Send request only if payload has something
    if (Object.keys(payload).length > 0) {
      updateStockMutation.mutate({
        id: stockPopup.productId,
        ...payload,
      });
    } else {
      toast.error("Please enter valid values to update.");
    }

    // Reset popup state
    setStockPopup({
      open: false,
      productId: null,
      currentStock: 0,
      currentPrice: 0,
      currentEnabled: true,
    });
  }}
>
  Update
</button>

            </div>
          </div>
        </div>
      )}

      {/* Data table */}
      <DataTable
        data={merchantProducts?.products || []}
        columns={columns}
        isLoading={isLoading}
      />

      {/* Modal for adding product */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">Add Product</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <label className="block mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      category: e.target.value,
                      productId: "",
                    }))
                  }
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="">Select Category</option>
                  {categories?.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product */}
              <div>
                <label className="block mb-1">Product</label>
                <select
                  value={form.productId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, productId: e.target.value }))
                  }
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="">Select Product</option>
                  {productList?.products?.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block mb-1">Price</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, price: e.target.value }))
                  }
                  className="w-full border p-2 rounded"
                  required
                />
              </div>

              {/* Stock */}
              <div>
                <label className="block mb-1">Stock</label>
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, stock: e.target.value }))
                  }
                  className="w-full border p-2 rounded"
                  required
                />
              </div>

              {/* Enabled */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, enabled: e.target.checked }))
                  }
                />
                <span>Enabled</span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMerchantProduct.isLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  {createMerchantProduct.isLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
