import React from 'react';

/**
 * Shared spinner component.
 * To change the loading style for the whole app, edit here only.
 */

const sizeClasses = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-4xl',
};

const Spinner = ({ size = 'lg', className = '' }) => (
  <span
    className={`inline-block animate-bounce ${sizeClasses[size]} ${className}`}
    role="status"
    aria-label="Loading"
  >
    🏗️
  </span>
);

export const PageSpinner = () => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <span className="text-4xl animate-bounce">🏗️</span>
    <p className="text-sm text-gray-400 font-medium">Loading...</p>
  </div>
);

export default Spinner;
