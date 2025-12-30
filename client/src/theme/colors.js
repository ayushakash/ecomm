/**
 * Centralized Theme Configuration
 * Modern Slate & Amber Color Scheme
 * Primary: Slate Gray (#334155 - #475569) for professionalism
 * Secondary: Amber (#F59E0B) for accents and calls-to-action
 *
 * To change the entire color scheme, update the colors in:
 * 1. This file (for JavaScript usage)
 * 2. tailwind.config.js (for Tailwind classes)
 */

// Color constants for direct JavaScript usage
export const colors = {
  primary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',  // Main primary
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  secondary: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',  // Main secondary
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#10b981',  // Main success
    700: '#059669',
    800: '#047857',
    900: '#065f46',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',  // Main warning
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',  // Main danger
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
};

export const themeColors = {
  // Solid background colors (no gradients)
  bg: {
    primary: 'bg-primary-700',           // Main slate
    primaryLight: 'bg-primary-50',       // Very light slate
    primaryDark: 'bg-primary-800',       // Darker slate
    secondary: 'bg-secondary-500',       // Amber
    secondaryLight: 'bg-secondary-50',   // Light amber
    white: 'bg-white',
    gray: 'bg-gray-50',
  },

  // Text colors
  text: {
    primary: 'text-primary-700',         // Slate text
    primaryDark: 'text-primary-900',     // Darker slate
    primaryLight: 'text-primary-600',    // Lighter slate
    secondary: 'text-secondary-600',     // Amber text
    onPrimary: 'text-white',             // Text on primary background
    onSecondary: 'text-white',           // Text on secondary background
    body: 'text-gray-900',               // Regular body text
    muted: 'text-gray-600',              // Muted text
  },

  // Border colors
  border: {
    primary: 'border-primary-300',       // Slate border
    secondary: 'border-secondary-400',   // Amber border
    default: 'border-gray-200',          // Default border
    light: 'border-gray-100',            // Light border
  },

  // Badge/Status colors
  badge: {
    pending: 'bg-warning-100 text-warning-800 border border-warning-200',
    processing: 'bg-secondary-100 text-secondary-800 border border-secondary-200',
    shipped: 'bg-blue-100 text-blue-800 border border-blue-200',
    delivered: 'bg-success-100 text-success-800 border border-success-200',
    cancelled: 'bg-danger-100 text-danger-800 border border-danger-200',
    approved: 'bg-success-100 text-success-800 border border-success-200',
  },

  // Button colors (solid, no gradients)
  button: {
    primary: 'bg-primary-700 hover:bg-primary-800 text-white',
    secondary: 'bg-secondary-500 hover:bg-secondary-600 text-white',
    success: 'bg-success-600 hover:bg-success-700 text-white',
    danger: 'bg-danger-600 hover:bg-danger-700 text-white',
    outline: 'bg-white hover:bg-gray-50 text-primary-700 border-2 border-primary-300',
  },

  // Hover states
  hover: {
    bg: 'hover:bg-primary-50',
    border: 'hover:border-secondary-400',
    text: 'hover:text-primary-800',
    shadow: 'hover:shadow-lg',
  },
};

/**
 * Get badge color classes based on status
 * @param {string} status - Status name
 * @returns {string} Badge color classes
 */
export const getBadgeColor = (status) => {
  return themeColors.badge[status] || themeColors.badge.pending;
};

/**
 * Get button color classes based on variant
 * @param {string} variant - Button variant (primary, secondary, success, danger, outline)
 * @returns {string} Button color classes
 */
export const getButtonColor = (variant = 'primary') => {
  return themeColors.button[variant] || themeColors.button.primary;
};

/**
 * Pre-defined component classes for consistency
 */
export const componentClasses = {
  // Headers
  pageHeader: `bg-primary-700 rounded-lg shadow-lg p-6 sm:p-8 text-white`,
  sectionHeader: 'text-2xl sm:text-3xl font-bold mb-1 text-gray-900',
  sectionSubheader: 'text-base text-gray-600',

  // Cards
  card: `bg-white rounded-lg shadow-md border border-gray-200 ${themeColors.hover.border} ${themeColors.hover.shadow} transition-all duration-300`,
  cardHeader: 'p-4 sm:p-6 border-b border-gray-200 bg-gray-50',
  cardBody: 'p-4 sm:p-6',
  cardFooter: 'p-4 sm:p-6 border-t border-gray-200 bg-gray-50',

  // Product card specific
  productCard: `bg-white rounded-lg shadow-md border border-gray-200 ${themeColors.hover.border} hover:shadow-xl transition-all duration-300`,
  productCardImage: 'w-full h-48 object-cover rounded-t-lg',
  productCardBadge: 'absolute top-2 right-2',

  // Forms
  input: 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 sm:text-sm',
  label: 'block text-sm font-medium text-gray-700 mb-1',
  select: 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 sm:text-sm',
  textarea: 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 sm:text-sm',
  checkbox: 'h-4 w-4 text-secondary-600 focus:ring-secondary-500 border-gray-300 rounded',

  // Badges
  badge: 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',

  // Buttons
  button: 'inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200',
  buttonPrimary: `${themeColors.button.primary} focus:ring-primary-500`,
  buttonSecondary: `${themeColors.button.secondary} focus:ring-secondary-500`,
  buttonSuccess: `${themeColors.button.success} focus:ring-success-500`,
  buttonDanger: `${themeColors.button.danger} focus:ring-danger-500`,
  buttonOutline: `${themeColors.button.outline} focus:ring-primary-500`,

  // Common layouts
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8',
  gridProducts: 'grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  gridCards: 'grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3',

  // Navigation
  navLink: 'text-gray-700 hover:text-primary-700 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors',
  navLinkActive: 'text-primary-700 bg-primary-50 px-3 py-2 rounded-md text-sm font-medium',

  // Tables
  table: 'min-w-full divide-y divide-gray-200',
  tableHeader: 'bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
  tableRow: 'hover:bg-gray-50 transition-colors',
  tableCell: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
};

export default themeColors;
