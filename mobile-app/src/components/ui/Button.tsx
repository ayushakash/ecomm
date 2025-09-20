import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { THEME, SIZES } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const getButtonStyle = () => {
    const baseStyle = styles.button;
    const variantStyle = styles[variant];
    const sizeStyle = styles[`${size}Button`];
    
    return [baseStyle, variantStyle, sizeStyle, disabled && styles.disabled, style];
  };

  const getTextStyle = () => {
    const baseTextStyle = styles.text;
    const variantTextStyle = styles[`${variant}Text`];
    const sizeTextStyle = styles[`${size}Text`];
    
    return [baseTextStyle, variantTextStyle, sizeTextStyle, disabled && styles.disabledText, textStyle];
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' ? THEME.background : THEME.primary} 
        />
      ) : (
        <>
          {icon}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.sm,
    minHeight: 48,
  },
  
  // Variants
  primary: {
    backgroundColor: THEME.primary,
  },
  secondary: {
    backgroundColor: THEME.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },

  // Sizes
  smallButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    minHeight: 36,
  },
  mediumButton: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    minHeight: 48,
  },
  largeButton: {
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.lg,
    minHeight: 56,
  },

  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryText: {
    color: THEME.background,
  },
  secondaryText: {
    color: THEME.background,
  },
  outlineText: {
    color: THEME.primary,
  },
  ghostText: {
    color: THEME.primary,
  },

  // Text sizes
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },

  // Disabled styles
  disabled: {
    backgroundColor: THEME.borderLight,
    borderColor: THEME.borderLight,
  },
  disabledText: {
    color: THEME.textMuted,
  },
});

export default Button;