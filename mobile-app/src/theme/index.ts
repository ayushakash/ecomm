// Central theme configuration
// Change colors here to update the entire app theme

export const THEME = {
  // Primary brand colors
  primary: '#2563EB',      // Blue - Change this to update your brand color
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  
  // Background colors
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceSecondary: '#F1F5F9',
  
  // Text colors
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textLight: '#CBD5E1',
  
  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  // Border colors
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  
  // Utility colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  
  // Shadow colors
  shadowLight: 'rgba(0, 0, 0, 0.05)',
  shadowMedium: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',
};

export const SIZES = {
  // Spacing
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  
  // Font sizes
  fontXs: 12,
  fontSm: 14,
  fontMd: 16,
  fontLg: 18,
  fontXl: 20,
  fontXxl: 24,
  fontTitle: 28,
  fontHeading: 32,
  
  // Border radius
  radiusXs: 4,
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 24,
  radiusRound: 9999,
  
  // Component heights
  buttonHeight: 48,
  inputHeight: 48,
  headerHeight: 60,
  tabBarHeight: 80,
};

export const SHADOWS = {
  small: {
    shadowColor: THEME.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: THEME.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: THEME.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Legacy exports for backward compatibility
export const COLORS = THEME;