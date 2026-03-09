import React from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MinusIcon } from '@heroicons/react/24/solid';
import { CubeIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../contexts/CartContext';
import { useLocation } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBulkWhatsApp } from '../../hooks/useBulkWhatsApp';

const ProductCard = ({ product, priority = false }) => {
  const { addToCart, removeFromCart, updateQuantity, getCartItem, cartCity, clearCart } = useCart();
  const { selectedAddress, selectedCity } = useLocation();
  const { user } = useAuth();
  const { getSimpleWhatsAppLink } = useBulkWhatsApp();

  const hasVariants = product.variants && product.variants.length > 0;
  const cartItem = getCartItem(product._id); // for non-variant products only
  const minVariantPrice = hasVariants
    ? Math.min(...product.variants.map(v => v.price))
    : null;

  const getCurrentCity = () =>
    user && selectedAddress ? selectedAddress.city : (selectedCity ? selectedCity.city : null);

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.totalStock <= 0) return;

    const currentCity = getCurrentCity();
    if (cartCity && currentCity && cartCity.toLowerCase() !== currentCity.toLowerCase()) {
      if (window.confirm(`Your cart contains items from ${cartCity}. Adding items from ${currentCity} will clear your current cart. Continue?`)) {
        clearCart();
        addToCart(product, 1, currentCity);
      }
    } else {
      addToCart(product, 1, currentCity);
    }
  };

  const handleIncrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartItem && cartItem.quantity < product.totalStock) {
      updateQuantity(product._id, cartItem.quantity + 1);
    }
  };

  const handleDecrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cartItem) return;
    if (cartItem.quantity <= 1) {
      removeFromCart(product._id);
    } else {
      updateQuantity(product._id, cartItem.quantity - 1);
    }
  };

  return (
    <div className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100">
      <Link to={`/products/${product._id}`} className="block">
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              loading={priority ? 'eager' : 'lazy'}
              decoding={priority ? 'sync' : 'async'}
              fetchpriority={priority ? 'high' : 'auto'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <CubeIcon className="h-12 w-12 text-gray-300" />
            </div>
          )}

          {/* Low stock badge */}
          {product.totalStock > 0 && product.totalStock <= 10 && (
            <div className="absolute top-2 left-2 z-10">
              <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                Only {product.totalStock} left!
              </span>
            </div>
          )}

          {/* Out of Stock overlay */}
          {product.totalStock <= 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-white text-gray-800 px-3 py-1 rounded-full text-xs font-semibold">
                Out of Stock
              </span>
            </div>
          )}

          {/* ADD / Counter button — overlaid on image */}
          {product.totalStock > 0 && (
            <div
              className="absolute bottom-2 right-2 z-10"
              onClick={(e) => e.preventDefault()}
            >
              {hasVariants ? (
                // Variant product — always link to detail page to pick size
                <Link
                  to={`/products/${product._id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white text-primary-700 border border-primary-300 px-3 py-1.5 rounded-lg text-xs font-bold shadow-md hover:bg-primary-50 transition-colors active:scale-95"
                >
                  Options
                </Link>
              ) : cartItem ? (
                <div className="flex items-center bg-white rounded-lg shadow-md border border-primary-200 overflow-hidden">
                  <button
                    onClick={handleDecrement}
                    className="w-8 h-8 flex items-center justify-center text-primary-700 hover:bg-primary-50 transition-colors"
                  >
                    <MinusIcon className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold text-gray-900 select-none">
                    {cartItem.quantity}
                  </span>
                  <button
                    onClick={handleIncrement}
                    disabled={cartItem.quantity >= product.totalStock}
                    className="w-8 h-8 flex items-center justify-center text-primary-700 hover:bg-primary-50 disabled:opacity-40 transition-colors"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAdd}
                  className="bg-white text-primary-700 border border-primary-300 px-4 py-1.5 rounded-lg text-sm font-bold shadow-md hover:bg-primary-50 transition-colors active:scale-95"
                >
                  ADD
                </button>
              )}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-3">
          {/* Price */}
          <div className="flex items-baseline gap-1 mb-1">
            {hasVariants ? (
              <>
                <span className="text-xs text-gray-400 font-medium">From</span>
                <span className="text-base font-bold text-gray-900">
                  ₹{minVariantPrice.toLocaleString()}
                </span>
                {product.unit && (
                  <span className="text-xs text-gray-500">/{product.unit}</span>
                )}
              </>
            ) : (
              <>
                <span className="text-base font-bold text-gray-900">
                  ₹{product.price.toLocaleString()}
                </span>
                {product.unit && (
                  <span className="text-xs text-gray-500">/{product.unit}</span>
                )}
              </>
            )}
          </div>
          {hasVariants && (
            <p className="text-xs text-primary-600 font-medium mb-1">
              {product.variants.length} size{product.variants.length > 1 ? 's' : ''} available
            </p>
          )}

          {/* Product Name */}
          <p className="text-sm text-gray-600 line-clamp-2 leading-snug mb-2">
            {product.name}
          </p>

          {/* Bulk Order Link */}
          {product.bulkMinQty > 0 && getSimpleWhatsAppLink(product) && (
            <a
              href={getSimpleWhatsAppLink(product)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-800 font-medium"
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Bulk order? {product.bulkMinQty}+ {product.unit}
            </a>
          )}
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;
