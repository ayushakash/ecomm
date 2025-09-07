import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { StarIcon, ShoppingCartIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/solid';
import { productAPI } from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { toast } from 'react-hot-toast';

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart, getCartItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productAPI.getById(id)
  });

  const cartItem = getCartItem(id);

  const handleAddToCart = () => {
    if (!product || product.totalStock <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    addToCart(product, quantity);
    toast.success(`Added ${quantity} ${quantity === 1 ? 'item' : 'items'} to cart`);
  };

  const incrementQuantity = () => {
    if (quantity < (product?.totalStock || product?.stock || 1)) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
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
        <p className="text-red-600">Error loading product: {error.message}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Product not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="sticky top-8">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 overflow-hidden">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                <img
                  src={product.images?.[0] || '/placeholder-product.jpg'}
                  alt={product.name}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                />
                {(product.totalStock || product.stock) <= 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-6 py-3 rounded-full text-lg font-bold">
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>
              
              {/* Additional Images Placeholder */}
              <div className="flex gap-4 mt-6 overflow-x-auto">
                {[1,2,3,4].map((thumb) => (
                  <div key={thumb} className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-xl border-2 border-gray-200 hover:border-primary-300 transition-colors cursor-pointer"></div>
                ))}
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-8">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
              {/* Breadcrumb */}
              <div className="flex items-center text-sm text-gray-600 mb-6">
                <Link to="/" className="hover:text-primary-600">Home</Link>
                <span className="mx-2">›</span>
                <Link to="/products" className="hover:text-primary-600">Products</Link>
                <span className="mx-2">›</span>
                <span className="text-gray-900 font-semibold">{product.category?.name}</span>
              </div>

              <h1 className="text-4xl font-black text-gray-900 mb-6 leading-tight">{product.name}</h1>
              
              {/* Rating & Reviews */}
              <div className="flex items-center gap-6 mb-8">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`h-6 w-6 ${
                          i < Math.floor(4.5)
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-bold text-gray-900">4.5</span>
                  <span className="text-gray-600">(127 reviews)</span>
                </div>
                <div className="text-green-600 font-semibold flex items-center gap-1">
                  ✅ Verified Quality
                </div>
              </div>

              {/* Price Section */}
              <div className="mb-8 p-6 bg-gradient-to-r from-primary-50 to-primary-100 rounded-2xl border border-primary-200">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-4xl font-black text-gray-900">
                    ₹{product.price?.toLocaleString()}
                  </span>
                  <span className="text-xl text-gray-400 line-through">
                    ₹{(product.price * 1.2)?.toLocaleString()}
                  </span>
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    17% OFF
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">per {product.unit}</span>
                  <span className="text-green-600 font-bold">
                    You save ₹{((product.price * 0.2) || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Product Features */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Product Highlights</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xl">✓</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Premium Quality</div>
                    <div className="text-sm text-gray-600">ISI certified materials</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xl">🚚</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Fast Delivery</div>
                    <div className="text-sm text-gray-600">24-48 hours</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-xl">🔒</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Secure Payment</div>
                    <div className="text-sm text-gray-600">100% safe checkout</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 text-xl">🔄</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Easy Returns</div>
                    <div className="text-sm text-gray-600">7-day return policy</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Purchase Section */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
              <div className="space-y-6">
                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600">{product.description}</p>
                </div>

                {/* Specifications */}
                {product.specifications && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Specifications</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(product.specifications).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium text-gray-700">{key}:</span>
                          <span className="ml-2 text-gray-600">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stock Status */}
                <div className="mb-6">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    (product.totalStock || product.stock) > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {(product.totalStock || product.stock) > 0 
                      ? `In Stock (${product.totalStock || product.stock} available)` 
                      : 'Out of Stock'}
                  </span>
                </div>

                {/* Quantity Selector */}
                {(product.totalStock || product.stock) > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={decrementQuantity}
                        disabled={quantity <= 1}
                        className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MinusIcon className="h-5 w-5" />
                      </button>
                      <span className="w-16 text-center text-xl font-semibold">{quantity}</span>
                      <button
                        onClick={incrementQuantity}
                        disabled={quantity >= (product.totalStock || product.stock)}
                        className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <PlusIcon className="h-5 w-5" />
                      </button>
                      <div className="ml-4 text-gray-600">
                        Available: {product.totalStock || product.stock}
                      </div>
                    </div>
                  </div>
                )}

                {/* Add to Cart */}
                {!cartItem ? (
                  <button
                    onClick={handleAddToCart}
                    disabled={(product.totalStock || product.stock) === 0}
                    className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
                  >
                    <ShoppingCartIcon className="h-5 w-5 mr-2" />
                    Add {quantity} to Cart
                  </button>
                ) : (
                  <div className="w-full bg-green-100 text-green-800 py-3 px-6 rounded-lg font-medium flex items-center justify-center">
                    <ShoppingCartIcon className="h-5 w-5 mr-2" />
                    In Cart ({cartItem.quantity} items)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
