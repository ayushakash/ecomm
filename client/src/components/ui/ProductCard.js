import React from 'react';
import {
  CubeIcon,
  CurrencyRupeeIcon,
  TagIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const ProductCard = ({
  product,
  onEdit,
  onDelete
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Header with Image */}
      <div className="relative">
        <img
          className="w-full h-48 object-cover"
          src={product.images || "https://picsum.photos/200/300"}
          alt={product.name}
        />
        <div className="absolute top-2 right-2">
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              product.enabled
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {product.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Product Name & SKU */}
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{product.name}</h3>
          <p className="text-sm text-gray-500">SKU: {product.sku}</p>
        </div>

        {/* Category */}
        <div className="flex items-center space-x-2">
          <TagIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">{product.category}</span>
        </div>

        {/* Price */}
        <div className="flex items-center space-x-2">
          <CurrencyRupeeIcon className="w-4 h-4 text-gray-400" />
          <div>
            <span className="font-semibold text-gray-900">₹{product.price}</span>
            <span className="text-sm text-gray-500 ml-1">per {product.unit}</span>
          </div>
        </div>

        {/* Stock */}
        <div className="flex items-center space-x-2">
          <CubeIcon className="w-4 h-4 text-gray-400" />
          <div>
            <span className={`font-medium ${
              product.stock > 10 ? 'text-green-600' :
              product.stock > 0 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {product.stock} units
            </span>
            <span className="text-sm text-gray-500 ml-1">in stock</span>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {product.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <button
            onClick={() => window.open(`/products/${product._id}`, '_blank')}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <EyeIcon className="w-4 h-4 mr-1" />
            View
          </button>

          <div className="flex space-x-2">
            <button
              onClick={() => onEdit && onEdit(product)}
              className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <PencilIcon className="w-4 h-4 mr-1" />
              Edit
            </button>

            <button
              onClick={() => onDelete && onDelete(product)}
              className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <TrashIcon className="w-4 h-4 mr-1" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;