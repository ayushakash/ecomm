import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { fonts, resolveColor, typography, type ColorValue, type FontWeight, type TypographyVariant } from '../../theme';

export interface TextProps extends RNTextProps {
  /** Typography token (default 'body'). */
  variant?: TypographyVariant;
  /** Theme color key or any color string (default 'text'). */
  color?: ColorValue;
  /** Override the variant's weight with another Plus Jakarta Sans face. */
  weight?: FontWeight;
  align?: TextStyle['textAlign'];
  /** Strike-through (MRP). */
  strike?: boolean;
}

/** Font-aware text. Never set fontWeight directly — custom fonts need fontFamily per weight. */
export function Text({ variant = 'body', color = 'text', weight, align, strike, style, ...rest }: TextProps) {
  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[
        typography[variant],
        { color: resolveColor(color) },
        weight && { fontFamily: fonts[weight] },
        align && { textAlign: align },
        strike && { textDecorationLine: 'line-through' },
        style,
      ]}
    />
  );
}
