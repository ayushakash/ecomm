import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productAPI } from "../../services/api";
import { toast } from "react-hot-toast";
import ConfirmDeleteButton from "../../components/products/ConfirmDeleteButton";
import DataTable from "../../components/commonComponents/dataTable";

const Products = () => {
  const { data: productlist, isLoading, error } = useQuery({
    queryKey: ["merchant-products"],
    queryFn: () => productAPI.getMerchantProducts(),
  });

  const queryClient = useQueryClient();
  const [globalFilter, setGlobalFilter] = useState(""); // 🔍 search state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "cement",
    price: "",
    unit: "kg",
    stock: "",
    minOrderQuantity: "",
    deliveryTime: "",
    images: [""],
    specifications: { brand: "", grade: "", weight: "" },
    tags: [""],
    enabled: true,
  });
  const [errorMsg, setErrorMsg] = useState("");

  const createProductMutation = useMutation({
    mutationFn: (data) => productAPI.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["merchant-products"]);
      setShowModal(false);
      setForm({
        name: "",
        description: "",
        category: "cement",
        price: "",
        unit: "kg",
        stock: "",
        minOrderQuantity: "",
        deliveryTime: "",
        images: [""],
        specifications: { brand: "", grade: "", weight: "" },
        tags: [""],
        enabled: true,
      });
      setErrorMsg("");
      toast.success("Product added successfully");
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || "Error adding product");
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => productAPI.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["merchant-products"]);
      toast.success("Product deleted successfully");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Error deleting product");
    },
  });

  // ✅ Columns for DataTable
  const columns = useMemo(
    () => [
      {
        header: "Product",
        accessorKey: "name",
        cell: (info) => {
          const product = info.row.original;
          return (
            <div className="flex items-center">
              <div className="h-10 w-10 flex-shrink-0">
                <img
                  className="h-10 w-10 rounded-lg object-cover"
                  src={product.images?.[0] || "/placeholder-product.jpg"}
                  alt={product.name}
                />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">
                  {product.name}
                </div>
                <div className="text-sm text-gray-500">
                  {product.description}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        header: "Category",
        accessorKey: "category",
      },
      {
        header: "Price",
        accessorFn: (row) => `₹${row.price} per ${row.unit}`,
        cell: (info) => <span>{info.getValue()}</span>,
      },
      {
        header: "Stock",
        accessorKey: "stock",
      },
      {
        header: "Status",
        id: "status",
        accessorFn: (row) => (row.enabled ? "Enabled" : "Disabled"),
        cell: (info) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              info.getValue() === "Enabled"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {info.getValue()}
          </span>
        ),
      },
      {
        header: "Actions",
        id: "actions",
        cell: (info) => {
          const product = info.row.original;
          return (
            <div className="flex gap-3">
              <button className="text-blue-600 hover:text-blue-900">
                Edit
              </button>
              <ConfirmDeleteButton
                title="Delete Product?"
                message="This will permanently remove the product from your store."
                loading={deleteProductMutation.isLoading}
                onConfirm={() => deleteProductMutation.mutate(product._id)}
              />
            </div>
          );
        },
      },
    ],
    [deleteProductMutation]
  );

  // 🌀 Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // ❌ Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading products: {error.message}</p>
      </div>
    );
  }

  // ✅ UI
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Products</h1>
          <p className="text-gray-600">Manage your product catalog</p>
        </div>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          onClick={() => setShowModal(true)}
        >
          Add Product
        </button>
      </div>

      {/* ✅ Reusable DataTable */}
      <DataTable
        title="Product List"
        columns={columns}
        data={productlist?.products ?? []}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
      />

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl relative p-6 max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
              onClick={() => setShowModal(false)}
            >
              &times;
            </button>

            <h2 className="text-2xl font-bold mb-4">Add Product</h2>
            {errorMsg && <p className="text-red-600 mb-2">{errorMsg}</p>}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createProductMutation.mutate({
                  ...form,
                  price: parseFloat(form.price),
                  stock: parseInt(form.stock),
                  minOrderQuantity: form.minOrderQuantity
                    ? parseInt(form.minOrderQuantity)
                    : undefined,
                  deliveryTime: form.deliveryTime
                    ? parseInt(form.deliveryTime)
                    : undefined,
                  images: form.images.filter((img) => img),
                  tags: form.tags.filter((tag) => tag),
                  specifications: {
                    brand: form.specifications.brand,
                    grade: form.specifications.grade,
                    weight: form.specifications.weight
                      ? parseFloat(form.specifications.weight)
                      : undefined,
                  },
                });
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {/* Left Column */}
              <div className="space-y-4">
                <input
                  name="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  required
                  placeholder="Product Name"
                  className="w-full border rounded px-3 py-2"
                />
                <textarea
                  name="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  required
                  placeholder="Description"
                  className="w-full border rounded px-3 py-2"
                />
                <select
                  name="category"
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value }))
                  }
                  required
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="cement">Cement</option>
                  <option value="sand">Sand</option>
                  <option value="tmt-bars">TMT Bars</option>
                  <option value="bricks">Bricks</option>
                  <option value="aggregates">Aggregates</option>
                  <option value="steel">Steel</option>
                  <option value="tools">Tools</option>
                  <option value="other">Other</option>
                </select>
                <input
                  name="price"
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, price: e.target.value }))
                  }
                  required
                  placeholder="Price"
                  className="w-full border rounded px-3 py-2"
                />
                <select
                  name="unit"
                  value={form.unit}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, unit: e.target.value }))
                  }
                  required
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="kg">kg</option>
                  <option value="ton">ton</option>
                  <option value="bag">bag</option>
                  <option value="piece">piece</option>
                  <option value="cubic-meter">cubic-meter</option>
                  <option value="sq-ft">sq-ft</option>
                </select>
                <input
                  name="stock"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, stock: e.target.value }))
                  }
                  required
                  placeholder="Stock"
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <input
                  name="minOrderQuantity"
                  type="number"
                  min="1"
                  value={form.minOrderQuantity}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, minOrderQuantity: e.target.value }))
                  }
                  placeholder="Min Order Quantity"
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  name="deliveryTime"
                  type="number"
                  min="1"
                  value={form.deliveryTime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, deliveryTime: e.target.value }))
                  }
                  placeholder="Delivery Time (days)"
                  className="w-full border rounded px-3 py-2"
                />

                {/* Images */}
                <div>
                  <label className="block font-medium">Images (URLs)</label>
                  {form.images.map((img, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        value={img}
                        onChange={(e) => {
                          const arr = [...form.images];
                          arr[idx] = e.target.value;
                          setForm((p) => ({ ...p, images: arr }));
                        }}
                        placeholder="Image URL"
                        className="w-full border rounded px-3 py-2"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            images: p.images.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({ ...p, images: [...p.images, ""] }))
                    }
                    className="text-blue-600"
                  >
                    Add Image
                  </button>
                </div>

                {/* Tags */}
                <div>
                  <label className="block font-medium">Tags</label>
                  {form.tags.map((tag, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        value={tag}
                        onChange={(e) => {
                          const arr = [...form.tags];
                          arr[idx] = e.target.value;
                          setForm((p) => ({ ...p, tags: arr }));
                        }}
                        placeholder="Tag"
                        className="w-full border rounded px-3 py-2"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            tags: p.tags.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({ ...p, tags: [...p.tags, ""] }))
                    }
                    className="text-blue-600"
                  >
                    Add Tag
                  </button>
                </div>

                {/* Specifications */}
                <div>
                  <label className="block font-medium">Specifications</label>
                  <input
                    name="specifications.brand"
                    value={form.specifications.brand}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        specifications: {
                          ...p.specifications,
                          brand: e.target.value,
                        },
                      }))
                    }
                    placeholder="Brand"
                    className="w-full border rounded px-3 py-2 mb-2"
                  />
                  <input
                    name="specifications.grade"
                    value={form.specifications.grade}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        specifications: {
                          ...p.specifications,
                          grade: e.target.value,
                        },
                      }))
                    }
                    placeholder="Grade"
                    className="w-full border rounded px-3 py-2 mb-2"
                  />
                  <input
                    name="specifications.weight"
                    type="number"
                    min="0"
                    value={form.specifications.weight}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        specifications: {
                          ...p.specifications,
                          weight: e.target.value,
                        },
                      }))
                    }
                    placeholder="Weight"
                    className="w-full border rounded px-3 py-2 mb-2"
                  />
                </div>

                {/* Enabled toggle */}
                <label className="flex items-center">
                  <input
                    name="enabled"
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, enabled: e.target.checked }))
                    }
                    className="mr-2"
                  />
                  Enabled
                </label>
              </div>

              {/* Submit */}
              <div className="col-span-1 md:col-span-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full"
                  disabled={createProductMutation.isLoading}
                >
                  {createProductMutation.isLoading
                    ? "Adding..."
                    : "Add Product"}
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
