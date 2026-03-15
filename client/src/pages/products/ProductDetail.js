import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCartIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/solid';
import { productAPI } from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { toast } from 'react-hot-toast';
import analytics from '../../services/analytics';
import SEO from '../../components/SEO/SEO';
import { PageSpinner } from '../../components/ui/Spinner';

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart, getCartItem } = useCart();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productAPI.getById(id)
  });

  const hasVariants = product?.variants && product.variants.length > 0;

  // cart item depends on whether we have a variant selected
  const cartItem = hasVariants
    ? getCartItem(id, selectedVariant?.label)
    : getCartItem(id);

  // Active price and stock — from variant if selected, else product
  const activePrice = selectedVariant ? selectedVariant.price : product?.price;
  const activeStock = selectedVariant
    ? selectedVariant.stock
    : (product?.totalStock || product?.stock || 0);

  // Track product view when product loads
  useEffect(() => {
    if (product) {
      analytics.trackProductView(product);
    }
  }, [product]);

  const handleAddToCart = () => {
    if (hasVariants && !selectedVariant) {
      toast.error('Please select a size first');
      return;
    }
    if (!product || activeStock <= 0) {
      toast.error('Product is out of stock');
      return;
    }
    addToCart(product, quantity, null, selectedVariant);
    analytics.trackAddToCart(product, quantity);
    toast.success(`Added ${quantity} ${quantity === 1 ? 'item' : 'items'} to cart`);
  };

  const handleBuyNow = () => {
    if (hasVariants && !selectedVariant) {
      toast.error('Please select a size first');
      return;
    }
    if (!product || activeStock <= 0) {
      toast.error('Product is out of stock');
      return;
    }
    addToCart(product, quantity, null, selectedVariant);
    navigate('/cart');
  };

  const incrementQuantity = () => {
    if (quantity < activeStock) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleQuantityInput = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!val || val < 1) return setQuantity(1);
    setQuantity(Math.min(val, activeStock));
  };


  if (isLoading) {
    return <PageSpinner />;
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
          <div className="lg:sticky lg:top-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Main Image */}
              <div className="relative aspect-square overflow-hidden bg-gray-50 group">
                <img
                  src={product.images?.[selectedImageIndex] || product.images?.[0] || '/placeholder-product.jpg'}
                  alt={`${product.name} - Image ${selectedImageIndex + 1}`}
                  loading="lazy"
                  decoding="async"
                  onClick={() => setIsFullscreen(true)}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-700 cursor-zoom-in"
                />
                {(product.totalStock || product.stock) <= 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-6 py-3 rounded-full text-lg font-bold">
                      Out of Stock
                    </span>
                  </div>
                )}

                {/* Left / Right arrows — inside the relative container, on the edges */}
                {product.images && product.images.length > 1 && (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedImageIndex(prev => (prev === 0 ? product.images.length - 1 : prev - 1)); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedImageIndex(prev => (prev === product.images.length - 1 ? 0 : prev + 1)); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Image Counter */}
                {product.images && product.images.length > 1 && (
                  <div className="absolute bottom-3 right-3 bg-black/60 text-white px-2.5 py-1 rounded-full text-xs">
                    {selectedImageIndex + 1} / {product.images.length}
                  </div>
                )}
              </div>

              {/* Image Thumbnails */}
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${
                        selectedImageIndex === index
                          ? 'border-primary-500'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} thumbnail ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Fullscreen Lightbox */}
              {isFullscreen && (
                <div
                  className="fixed inset-0 z-50 bg-black/95 flex flex-col"
                  onClick={() => setIsFullscreen(false)}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <span className="text-white text-sm font-medium">{product.name}</span>
                    <div className="flex items-center gap-3">
                      {product.images.length > 1 && (
                        <span className="text-gray-400 text-sm">{selectedImageIndex + 1} / {product.images.length}</span>
                      )}
                      <button onClick={() => setIsFullscreen(false)} className="text-white hover:text-gray-300 p-1">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Scrollable image area */}
                  <div className="flex-1 overflow-y-auto flex items-start justify-center px-4 pb-4" onClick={e => e.stopPropagation()}>
                    <img
                      src={product.images[selectedImageIndex]}
                      alt={`${product.name} - Image ${selectedImageIndex + 1}`}
                      className="max-w-full rounded-lg object-contain"
                    />
                  </div>

                  {/* Left / Right arrows on edges */}
                  {product.images.length > 1 && (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedImageIndex(prev => (prev === 0 ? product.images.length - 1 : prev - 1)); }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full shadow-xl transition-all"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedImageIndex(prev => (prev === product.images.length - 1 ? 0 : prev + 1)); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full shadow-xl transition-all"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* Thumbnail strip at bottom */}
                  {product.images.length > 1 && (
                    <div className="flex gap-2 p-3 overflow-x-auto flex-shrink-0 justify-center" onClick={e => e.stopPropagation()}>
                      {product.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`flex-shrink-0 w-14 h-14 rounded-lg border-2 overflow-hidden transition-all ${
                            selectedImageIndex === index ? 'border-white' : 'border-white/30 hover:border-white/60'
                          }`}
                        >
                          <img src={image} alt={`thumb ${index + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">

            {/* Category tag */}
            {product.category?.name && (
              <span className="inline-block px-3 py-1 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full uppercase tracking-wide">
                {product.category.name}
              </span>
            )}

            {/* Name */}
            <h1 className="text-2xl font-bold text-gray-900 leading-snug">{product.name}</h1>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              {hasVariants && !selectedVariant ? (
                <>
                  <span className="text-sm text-gray-400 font-medium">From</span>
                  <span className="text-2xl font-bold text-gray-900">
                    ₹{Math.min(...product.variants.map(v => v.price)).toLocaleString()}
                  </span>
                  {product.unit && <span className="text-sm text-gray-500">/ {product.unit}</span>}
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-gray-900">₹{activePrice?.toLocaleString()}</span>
                  {product.unit && <span className="text-sm text-gray-500">/ {product.unit}</span>}
                </>
              )}
            </div>

            {/* Variant Size Picker */}
            {hasVariants && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Select Size
                  {!selectedVariant && <span className="ml-1 text-red-500 text-xs">(required)</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.label}
                      onClick={() => {
                        setSelectedVariant(variant);
                        setQuantity(1);
                      }}
                      disabled={variant.stock <= 0}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                        selectedVariant?.label === variant.label
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : variant.stock <= 0
                            ? 'border-gray-200 text-gray-300 cursor-not-allowed line-through'
                            : 'border-gray-300 text-gray-700 hover:border-primary-400 hover:bg-primary-50'
                      }`}
                    >
                      {variant.label}
                      {variant.stock <= 0 && <span className="block text-xs font-normal">Out of stock</span>}
                    </button>
                  ))}
                </div>
                {selectedVariant && (
                  <p className="text-xs text-gray-500 mt-2">
                    Stock: {selectedVariant.stock} {product.unit} available
                  </p>
                )}
              </div>
            )}

            {/* Out of stock badge */}
            {activeStock <= 0 && (!hasVariants || selectedVariant) && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                Out of Stock
              </span>
            )}

            {/* Description */}
            {product.description && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Specifications */}
            {product.specifications && Object.values(product.specifications).some(Boolean) && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Specifications</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {Object.entries(product.specifications).map(([key, value]) =>
                    value ? (
                      <div key={key} className="flex gap-1 text-sm">
                        <span className="text-gray-500 capitalize">{key}:</span>
                        <span className="text-gray-800 font-medium">{value}</span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* Quantity + Actions */}
            {/* For variant products: show actions only after a size is selected (or always show disabled state) */}
            <div className="space-y-4 pt-2 border-t border-gray-100">
              {activeStock > 0 && (!hasVariants || selectedVariant) && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Qty</span>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                      className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={activeStock}
                      value={quantity}
                      onChange={handleQuantityInput}
                      className="w-12 text-center text-sm font-semibold border-x border-gray-300 py-2 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={incrementQuantity}
                      disabled={quantity >= activeStock}
                      className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={hasVariants && !selectedVariant}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-primary-600 text-primary-700 rounded-xl text-sm font-semibold hover:bg-primary-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingCartIcon className="h-4 w-4" />
                  {cartItem ? 'Add More' : 'Add to Cart'}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={hasVariants && !selectedVariant}
                  className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Buy Now
                </button>
              </div>

              {hasVariants && !selectedVariant && (
                <p className="text-xs text-center text-amber-600 font-medium">
                  ↑ Select a size above to continue
                </p>
              )}

              {cartItem && (
                <Link
                  to="/cart"
                  className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View Cart ({cartItem.quantity} in cart) →
                </Link>
              )}
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
