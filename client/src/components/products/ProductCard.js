import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCartIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/solid';
import { EyeIcon as EyeOutline } from '@heroicons/react/24/outline';
import { useCart } from '../../contexts/CartContext';
import { useLocation } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const ProductCard = ({ product }) => {
  const { addToCart, isInCart, getCartItem, cartCity, clearCart } = useCart();
  const { selectedAddress, selectedCity } = useLocation();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const cartItem = getCartItem(product._id);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.totalStock <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    // Get the current city (from logged-in user's address or guest's selected city)
    const currentCity = user && selectedAddress ? selectedAddress.city : (selectedCity ? selectedCity.city : null);

    // Check if cart has items from a different city
    if (cartCity && currentCity && cartCity.toLowerCase() !== currentCity.toLowerCase()) {
      // Show confirmation dialog
      if (window.confirm(`Your cart contains items from ${cartCity}. Adding items from ${currentCity} will clear your current cart. Continue?`)) {
        clearCart(); // Clear the old cart
        addToCart(product, quantity, currentCity); // Add with new city
        toast.success(`Cart cleared. Added ${quantity} ${quantity === 1 ? 'item' : 'items'} to cart from ${currentCity}`);
      }
    } else {
      // Same city or first item - add normally
      addToCart(product, quantity, currentCity);
      toast.success(`Added ${quantity} ${quantity === 1 ? 'item' : 'items'} to cart`);
    }

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


  return (
    <div className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-secondary-400 transform hover:-translate-y-1">
      {/* Quick View */}
      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
        <Link
          to={`/products/${product._id}`}
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 border-2 border-gray-200 hover:border-secondary-500"
          onClick={(e) => e.stopPropagation()}
        >
          <EyeOutline className="w-5 h-5 text-gray-600 hover:text-secondary-600" />
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
        <div className="p-4 sm:p-5">
          {/* Category */}
          <div className="mb-2 sm:mb-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-50 text-stone-700 border border-stone-200 whitespace-nowrap">
              {product.category?.name || 'Construction'}
            </span>
          </div>

          {/* Product Name */}
          <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3 sm:mb-4 line-clamp-2 group-hover:text-secondary-600 transition-colors duration-200 leading-snug min-h-[40px] sm:min-h-[48px]">
            {product.name}
          </h3>

          {/* Price Section */}
          <div className="mb-3 sm:mb-4">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xl sm:text-2xl font-black text-primary-700">
                ₹{product.price.toLocaleString()}
              </span>
              {product.unit && (
                <span className="text-sm text-gray-500 font-medium">/{product.unit}</span>
              )}
            </div>
          </div>

          {/* Stock Info */}
          <div className="mb-4">
            <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${
              product.totalStock > 0
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {product.totalStock > 0 ? (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  {product.totalStock} in stock
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  Out of stock
                </>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Add to Cart Section */}
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="space-y-2.5">
          {/* Show cart status if item is already in cart */}
          {cartItem && (
            <div className="bg-success-50 border border-success-200 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1.5 text-success-700 font-semibold text-xs">
                <ShoppingCartIcon className="h-4 w-4" />
                <span>In Cart: {cartItem.quantity} items</span>
              </div>
            </div>
          )}

          {/* Quantity Controls */}
          {product.totalStock > 0 && (
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
              <span className="text-xs font-semibold text-gray-700 ml-1">Qty</span>
              <div className="flex items-center gap-1.5 flex-1 justify-center">
                <button
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                  className="w-7 h-7 flex items-center justify-center bg-white rounded-md border border-gray-300 hover:border-secondary-500 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <MinusIcon className="h-3.5 w-3.5 text-gray-700" />
                </button>
                <span className="w-8 text-center font-bold text-base text-gray-900">{quantity}</span>
                <button
                  onClick={incrementQuantity}
                  disabled={quantity >= (product.totalStock || 1)}
                  className="w-7 h-7 flex items-center justify-center bg-white rounded-md border border-gray-300 hover:border-secondary-500 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <PlusIcon className="h-3.5 w-3.5 text-gray-700" />
                </button>
              </div>
            </div>
          )}

          {/* Add to Cart Button - Always show */}
          <button
            onClick={handleAddToCart}
            disabled={product.totalStock <= 0}
            className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 transform hover:scale-105 active:scale-95 ${
              product.totalStock <= 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-primary-700 hover:bg-primary-800 text-white shadow-md hover:shadow-lg'
            }`}
          >
            {product.totalStock <= 0 ? (
              'Out of Stock'
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <ShoppingCartIcon className="h-4 w-4" />
                {cartItem ? 'Add More to Cart' : 'Add to Cart'}
              </span>
            )}
          </button>

          {/* View Cart Link */}
          {cartItem && (
            <Link
              to="/cart"
              className="block text-center text-primary-700 hover:text-primary-800 text-xs font-semibold hover:underline transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              View Cart →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
