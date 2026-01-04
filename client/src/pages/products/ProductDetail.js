import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { StarIcon, ShoppingCartIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/solid';
import { productAPI } from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { toast } from 'react-hot-toast';
import analytics from '../../services/analytics';
import SEO from '../../components/SEO/SEO';

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart, getCartItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productAPI.getById(id)
  });

  const cartItem = getCartItem(id);

  // Track product view when product loads
  useEffect(() => {
    if (product) {
      analytics.trackProductView(product);
    }
  }, [product]);

  const handleAddToCart = () => {
    if (!product || product.totalStock <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    addToCart(product, quantity);

    // Track add to cart event
    analytics.trackAddToCart(product, quantity);

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

  // Generate dynamic SEO data
  const productTitle = `Buy ${product.name} Online in Ranchi | ${product.category || 'Construction Material'} | Chardeevari`;
  const productDescription = `${product.description?.substring(0, 150) || `Buy ${product.name} online in Ranchi, Jharkhand`}. Best price Rs ${product.price}. Premium quality ${product.category || 'construction material'} with doorstep delivery. ${product.totalStock > 0 ? 'In Stock' : 'Limited Stock'} - Order now at Chardeevari!`;
  const productKeywords = `buy ${product.name} Ranchi, ${product.name} price Ranchi, ${product.category} suppliers Ranchi, ${product.name} online Jharkhand, ${product.category} dealers Ranchi, construction materials Ranchi, ${product.name} home delivery, buy ${product.category} online, Chardeevari ${product.category}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={productTitle}
        description={productDescription}
        keywords={productKeywords}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Products', path: '/products' },
          { name: product.category || 'Product', path: `/products?category=${product.category}` },
          { name: product.name, path: `/products/${product._id}` }
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image Gallery */}
          <div className="sticky top-8">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 overflow-hidden">
              {/* Main Image */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                <img
                  src={product.images?.[selectedImageIndex] || product.images?.[0] || '/placeholder-product.jpg'}
                  alt={`${product.name} - Image ${selectedImageIndex + 1}`}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                />
                {(product.totalStock || product.stock) <= 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-6 py-3 rounded-full text-lg font-bold">
                      Out of Stock
                    </span>
                  </div>
                )}

                {/* Image Counter */}
                {product.images && product.images.length > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                    {selectedImageIndex + 1} / {product.images.length}
                  </div>
                )}
              </div>

              {/* Image Thumbnails */}
              {product.images && product.images.length > 1 && (
                <div className="flex gap-3 mt-6 overflow-x-auto pb-2">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-xl border-2 overflow-hidden transition-all ${
                        selectedImageIndex === index
                          ? 'border-primary-500 ring-2 ring-primary-200 scale-105'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Navigation Arrows for Multiple Images */}
              {product.images && product.images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImageIndex(prev => (prev === 0 ? product.images.length - 1 : prev - 1))}
                    className="absolute left-12 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setSelectedImageIndex(prev => (prev === product.images.length - 1 ? 0 : prev + 1))}
                    className="absolute right-12 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
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

              {/* Category & Quality Badge */}
              <div className="flex items-center gap-6 mb-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                  <span className="text-sm font-medium text-gray-700">
                    {product.category?.name || 'Product'}
                  </span>
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
                    <div className="text-sm text-gray-600">60-90 minutes</div>
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
                    <span className="text-orange-600 text-xl">📞</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">24/7 Support</div>
                    <div className="text-sm text-gray-600">Expert assistance</div>
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

                {/* Cart Status - Show if already in cart */}
                {cartItem && (
                  <div className="mb-4 bg-green-50 border-2 border-green-200 rounded-xl p-4">
                    <div className="flex items-center justify-center gap-2 text-green-700 font-semibold">
                      <ShoppingCartIcon className="h-5 w-5" />
                      <span>Currently in Cart: {cartItem.quantity} items</span>
                    </div>
                  </div>
                )}

                {/* Quantity Selector - Always show if stock available */}
                {(product.totalStock || product.stock) > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {cartItem ? 'Add More Quantity' : 'Select Quantity'}
                    </label>
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

                {/* Add to Cart Button - Always show */}
                <button
                  onClick={handleAddToCart}
                  disabled={(product.totalStock || product.stock) === 0}
                  className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
                >
                  <ShoppingCartIcon className="h-5 w-5 mr-2" />
                  {(product.totalStock || product.stock) === 0
                    ? 'Out of Stock'
                    : cartItem
                      ? `Add ${quantity} More to Cart`
                      : `Add ${quantity} to Cart`
                  }
                </button>

                {/* View Cart Link - Show if already in cart */}
                {cartItem && (
                  <Link
                    to="/cart"
                    className="block mt-3 text-center text-primary-700 hover:text-primary-800 font-semibold hover:underline transition-colors"
                  >
                    View Cart →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews - Rating Display (Hidden for now) */}
        {/* Uncomment this section when you want to enable reviews */}
        {/*
        <div className="mt-16">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Customer Reviews</h2>
            <div className="text-center py-12">
              <div className="flex items-center justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="h-8 w-8 text-gray-300" />
                ))}
              </div>
              <p className="text-gray-600 text-lg">No reviews yet</p>
              <p className="text-gray-500 text-sm mt-2">Be the first customer to review this product</p>
            </div>
          </div>
        </div>
        */}
      </div>
    </div>
  );
};

export default ProductDetail;
