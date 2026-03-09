import React from 'react';

const ProductCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
    {/* Image area */}
    <div className="aspect-square bg-gray-200" />

    {/* Content */}
    <div className="p-3">
      {/* Product name */}
      <div className="h-3.5 bg-gray-200 rounded-full w-4/5 mb-2" />
      <div className="h-3 bg-gray-200 rounded-full w-3/5 mb-3" />

      {/* Price + unit */}
      <div className="flex items-center justify-between">
        <div className="h-4 bg-gray-200 rounded-full w-1/3" />
        <div className="h-4 bg-gray-200 rounded-full w-1/4" />
      </div>

      {/* Add button */}
      <div className="h-8 bg-gray-200 rounded-lg w-full mt-3" />
    </div>
  </div>
);

export default ProductCardSkeleton;
