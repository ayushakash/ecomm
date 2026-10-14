import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import React from 'react';
import { resolveColor, type ColorValue } from '../../theme';

/** Ionicons glyph name (https://icons.expo.fyi, family "Ionicons"). */
export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface IconProps {
  name: IconName;
  size?: number;
  /** Theme color key or raw color. */
  color?: ColorValue;
}

export function Icon({ name, size = 20, color = 'text' }: IconProps) {
  return <Ionicons name={name} size={size} color={resolveColor(color)} />;
}
