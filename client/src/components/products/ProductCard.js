import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCartIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/solid';
import { EyeIcon as EyeOutline } from '@heroicons/react/24/outline';
import { useCart } from '../../contexts/CartContext';
import { toast } from 'react-hot-toast';

const ProductCard = ({ product }) => {
  const { addToCart, isInCart, getCartItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const cartItem = getCartItem(product._id);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (product.totalStock <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    addToCart(product, quantity);
    toast.success(`Added ${quantity} ${quantity === 1 ? 'item' : 'items'} to cart`);
    setQuantity(1); // Reset quantity after adding
  };

  const incrementQuantity = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity < (product.totalStock || 1)) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };


  // Calculate discount percentage (dummy for demo)
  const originalPrice = product.price * 1.2;
  const discountPercent = Math.round(((originalPrice - product.price) / originalPrice) * 100);

  return (
    <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 hover:border-primary-200 transform hover:-translate-y-2">
      {/* Discount Badge */}
      {discountPercent > 0 && (
        <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
          {discountPercent}% OFF
        </div>
      )}

      {/* Quick View */}
      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
        <Link
          to={`/products/${product._id}`}
          className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
          onClick={(e) => e.stopPropagation()}
        >
          <EyeOutline className="w-5 h-5 text-gray-600 hover:text-primary-600" />
        </Link>
      </div>

      <Link to={`/products/${product._id}`} className="block">
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-gray-400 text-2xl">📦</span>
                </div>
                <span className="text-gray-400 text-sm">No Image</span>
              </div>
            </div>
          )}

          {/* Stock Badge */}
          {product.totalStock <= 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                Out of Stock
              </span>
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </div>

        {/* Product Info */}
        <div className="p-6">
          {/* Category */}
          <div className="mb-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
              {product.category?.name || 'Construction'}
            </span>
          </div>

          {/* Product Name */}
          <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary-600 transition-colors duration-200 leading-tight">
            {product.name}
          </h3>

          {/* Price Section */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-black text-gray-900">
                ₹{product.price.toLocaleString()}
              </span>
              {discountPercent > 0 && (
                <span className="text-lg text-gray-400 line-through">
                  ₹{originalPrice.toLocaleString()}
                </span>
              )}
              {product.unit && (
                <span className="text-sm text-gray-500 font-medium">/{product.unit}</span>
              )}
            </div>
            {discountPercent > 0 && (
              <span className="text-sm text-green-600 font-semibold">
                You save ₹{(originalPrice - product.price).toLocaleString()}
              </span>
            )}
          </div>

          {/* Stock & Delivery Info */}
          <div className="flex items-center justify-between text-sm mb-4">
            <span className={`font-semibold ${product.totalStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {product.totalStock > 0 ? (
                <>✅ {product.totalStock} in stock</>
              ) : (
                <>❌ Out of stock</>
              )}
            </span>
            <span className="text-gray-500 flex items-center gap-1">
              🚚 <span className="text-xs">Fast delivery</span>
            </span>
          </div>
        </div>
      </Link>

      {/* Add to Cart Section */}
      <div className="px-6 pb-6">
        {!cartItem ? (
          <div className="space-y-3">
            {/* Quantity Controls */}
            {product.totalStock > 0 && (
              <div className="flex items-center justify-center gap-4 p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-semibold text-gray-700">Qty:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center font-bold text-lg">{quantity}</span>
                  <button
                    onClick={incrementQuantity}
                    disabled={quantity >= (product.totalStock || 1)}
                    className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            
            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={product.totalStock <= 0}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                product.totalStock <= 0
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {product.totalStock <= 0 ? (
                'Out of Stock'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ShoppingCartIcon className="h-5 w-5" />
                  Add {quantity} to Cart
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-green-700 font-bold">
              <ShoppingCartIcon className="h-5 w-5" />
              <span>In Cart ({cartItem.quantity})</span>
            </div>
            <Link 
              to="/cart" 
              className="text-green-600 hover:text-green-700 text-sm font-semibold mt-1 block hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View Cart →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
