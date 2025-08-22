import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const CategoryCard = ({ category }) => {
  return (
    <Link
      to={`/products?category=${category.id}`}
      className="group card overflow-hidden hover:shadow-medium transition-all duration-300"
    >
      {/* Category Image */}
      <div className="relative aspect-video overflow-hidden bg-gray-200">
        <img
          src={category.image}
          alt={category.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all duration-300"></div>
        
        {/* Overlay Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h3 className="text-xl font-bold mb-2">{category.name}</h3>
            <p className="text-sm opacity-90 mb-3">{category.description}</p>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-sm bg-white bg-opacity-20 px-2 py-1 rounded">
                {category.productCount} products
              </span>
              <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;
