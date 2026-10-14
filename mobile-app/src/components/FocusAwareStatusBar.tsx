import { useIsFocused } from '@react-navigation/native';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import React from 'react';

/**
 * Status bar style for the focused screen only (tabs stay mounted, so a plain
 * <StatusBar> in an unfocused tab would win). App default is 'dark'.
 */
export function FocusAwareStatusBar({ style }: { style: StatusBarStyle }) {
  return useIsFocused() ? <StatusBar style={style} /> : null;
}
