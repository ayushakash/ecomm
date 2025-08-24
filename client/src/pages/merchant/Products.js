import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { productAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ConfirmDeleteButton from '../../components/products/ConfirmDeleteButton';

const Products = () => {
  const { data: productlist, isLoading, error } = useQuery({
    queryKey: ['merchant-products'],
  queryFn: () => productAPI.getMerchantProducts()
  });

  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'cement',
    price: '',
    unit: 'kg',
    stock: '',
    minOrderQuantity: '',
    deliveryTime: '',
    images: [''],
    specifications: { brand: '', grade: '', weight: '' },
    tags: [''],
    enabled: true
  });
  const [errorMsg, setErrorMsg] = useState('');

  const createProductMutation = useMutation({
    mutationFn: (data) => productAPI.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['merchant-products']);
      setShowModal(false);
      setForm({
        name: '', description: '', category: 'cement', price: '', unit: 'kg', stock: '', minOrderQuantity: '', deliveryTime: '', images: [], specifications: {}, tags: []
      });
      setErrorMsg('');
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || 'Error adding product');
    }
  });

  const deleteProductMutation = useMutation({
  mutationFn: (id) => productAPI.deleteProduct(id),
  onSuccess: () => {
    queryClient.invalidateQueries(['merchant-products']);
    toast.success('Product deleted successfully');
  },
  onError: (err) => {
    toast.error(err?.response?.data?.message || 'Error deleting product');
  }
});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('specifications.')) {
      const specKey = name.split('.')[1];
      setForm((prev) => ({
        ...prev,
        specifications: { ...prev.specifications, [specKey]: value }
      }));
    } else if (name === 'enabled') {
      setForm((prev) => ({ ...prev, enabled: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleArrayChange = (e, field, idx) => {
    const { value } = e.target;
    setForm((prev) => {
      const arr = [...prev[field]];
      arr[idx] = value;
      return { ...prev, [field]: arr };
    });
  };

  const addArrayItem = (field) => {
    setForm((prev) => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const removeArrayItem = (field, idx) => {
    setForm((prev) => {
      const arr = [...prev[field]];
      arr.splice(idx, 1);
      return { ...prev, [field]: arr };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createProductMutation.mutate({
      ...form,
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
      minOrderQuantity: form.minOrderQuantity ? parseInt(form.minOrderQuantity) : undefined,
      deliveryTime: form.deliveryTime ? parseInt(form.deliveryTime) : undefined,
      images: form.images.filter((img) => img),
      tags: form.tags.filter((tag) => tag),
      specifications: {
        brand: form.specifications.brand,
        grade: form.specifications.grade,
        weight: form.specifications.weight ? parseFloat(form.specifications.weight) : undefined
      }
    });
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading products: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Products</h1>
          <p className="text-gray-600">Manage your product catalog</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700" onClick={() => setShowModal(true)}>
          Add Product
        </button>
      </div>

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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Product Name"
            className="w-full border rounded px-3 py-2"
          />
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            placeholder="Description"
            className="w-full border rounded px-3 py-2"
          />
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
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
            onChange={handleChange}
            required
            placeholder="Price"
            className="w-full border rounded px-3 py-2"
          />
          <select
            name="unit"
            value={form.unit}
            onChange={handleChange}
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
            onChange={handleChange}
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
            onChange={handleChange}
            placeholder="Min Order Quantity"
            className="w-full border rounded px-3 py-2"
          />
          <input
            name="deliveryTime"
            type="number"
            min="1"
            value={form.deliveryTime}
            onChange={handleChange}
            placeholder="Delivery Time (days)"
            className="w-full border rounded px-3 py-2"
          />

          {/* Images array */}
          <div>
            <label className="block font-medium">Images (URLs)</label>
            {form.images.map((img, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  value={img}
                  onChange={(e) => handleArrayChange(e, "images", idx)}
                  placeholder="Image URL"
                  className="w-full border rounded px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem("images", idx)}
                  className="text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem("images")}
              className="text-blue-600"
            >
              Add Image
            </button>
          </div>

          {/* Tags array */}
          <div>
            <label className="block font-medium">Tags</label>
            {form.tags.map((tag, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  value={tag}
                  onChange={(e) => handleArrayChange(e, "tags", idx)}
                  placeholder="Tag"
                  className="w-full border rounded px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem("tags", idx)}
                  className="text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem("tags")}
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
              onChange={handleChange}
              placeholder="Brand"
              className="w-full border rounded px-3 py-2 mb-2"
            />
            <input
              name="specifications.grade"
              value={form.specifications.grade}
              onChange={handleChange}
              placeholder="Grade"
              className="w-full border rounded px-3 py-2 mb-2"
            />
            <input
              name="specifications.weight"
              type="number"
              min="0"
              value={form.specifications.weight}
              onChange={handleChange}
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
              onChange={handleChange}
              className="mr-2"
            />
            Enabled
          </label>
        </div>

        {/* Submit button (full width) */}
        <div className="col-span-1 md:col-span-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full"
            disabled={createProductMutation.isLoading}
          >
            {createProductMutation.isLoading ? "Adding..." : "Add Product"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

    

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Product List</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productlist.products?.map((product) => (
                <tr key={product._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <img
                          className="h-10 w-10 rounded-lg object-cover"
                          src={product.images?.[0] || '/placeholder-product.jpg'}
                          alt={product.name}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{product.price} per {product.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.stock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      product.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {product.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                    <ConfirmDeleteButton
                    title="Delete Product?"
                    message="This will permanently remove the product from your store."
                    loading={deleteProductMutation.isLoading}
                    onConfirm={() => deleteProductMutation.mutate(product._id)}
                    />
                    
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Products;
