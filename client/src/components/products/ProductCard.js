import React from 'react';
import { Link } from 'react-router-dom';
import { StarIcon, ShoppingCartIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../contexts/CartContext';
import { toast } from 'react-hot-toast';

const ProductCard = ({ product }) => {
  const { addToCart, isInCart } = useCart();

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (product.stock <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    addToCart(product, 1);
    toast.success('Added to cart');
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <StarIcon key={i} className="h-4 w-4 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <StarIcon key="half" className="h-4 w-4 text-yellow-400" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <StarOutlineIcon key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
      );
    }

    return stars;
  };

  return (
    <Link
      to={`/products/${product._id}`}
      className="group card hover:shadow-medium transition-all duration-300 overflow-hidden"
    >
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-200">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <span className="text-gray-400 text-sm">No Image</span>
          </div>
        )}
        
        {/* Stock Badge */}
        {product.stock <= 0 && (
          <div className="absolute top-2 left-2">
            <span className="badge-danger">Out of Stock</span>
          </div>
        )}
        
        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={product.stock <= 0 || isInCart(product._id)}
          className={`absolute bottom-2 right-2 p-2 rounded-full shadow-lg transition-all duration-200 ${
            product.stock <= 0 || isInCart(product._id)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          <ShoppingCartIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Category */}
        <div className="mb-2">
          <span className="text-xs font-medium text-primary-600 uppercase tracking-wide">
            {product.category}
          </span>
        </div>

        {/* Product Name */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors duration-200">
          {product.name}
        </h3>

        {/* Rating */}
        {product.rating && product.rating.average > 0 && (
          <div className="flex items-center mb-2">
            <div className="flex items-center">
              {renderStars(product.rating.average)}
            </div>
            <span className="text-sm text-gray-600 ml-1">
              ({product.rating.count})
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">
              ₹{product.price.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500 ml-1">
              /{product.unit}
            </span>
          </div>
        </div>

        {/* Stock Info */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {product.stock > 0 ? (
              <>
                <span className="text-success-600 font-medium">
                  In Stock: {product.stock}
                </span>
                {product.minOrderQuantity > 1 && (
                  <span className="text-gray-500 ml-1">
                    (Min: {product.minOrderQuantity})
                  </span>
                )}
              </>
            ) : (
              <span className="text-danger-600 font-medium">Out of Stock</span>
            )}
          </span>
          
          {/* Merchant Info */}
          {product.merchantId && (
            <span className="text-xs text-gray-500">
              by {product.merchantId.name}
            </span>
          )}
        </div>

        {/* Delivery Info */}
        {product.deliveryTime && (
          <div className="mt-2 text-xs text-gray-500">
            Delivery: {product.deliveryTime} day{product.deliveryTime > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;
