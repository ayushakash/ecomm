import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, radii } from '../../theme';
import { Icon } from './Icon';
import { useTranslation } from 'react-i18next';


export interface QuantityStepperProps {
  value: number;
  /** Next quantity. 0 means "remove" (decrement from 1). */
  onChange: (next: number) => void;
  /** Upper bound (stock). Increment disables at max; typed values clamp. */
  max?: number;
  /** Lower bound. Default 0 = decrementing from 1 removes (trash icon); 1+ disables minus at min. */
  min?: number;
  /** sm = product card (34px), md = cart/detail (42px). */
  size?: 'sm' | 'md';
  /** Allow typing a quantity in the middle (web ProductCard parity). Default true. */
  editable?: boolean;
  /** 'filled' = amber CTA look (cards), 'outline' = neutral (cart rows). */
  tone?: 'filled' | 'outline';
  style?: StyleProp<ViewStyle>;
}

export function QuantityStepper({
  value,
  onChange,
  max = Number.POSITIVE_INFINITY,
  min = 0,
  size = 'md',
  editable = true,
  tone = 'filled',
  style,
}: QuantityStepperProps) {
  const { t } = useTranslation('common');
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const height = size === 'sm' ? 34 : 42;
  const filled = tone === 'filled';
  const fg = filled ? colors.onSecondary : colors.text;
  const atMax = value >= max;
  const atMin = min > 0 && value <= min;

  const step = (next: number) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(next);
  };

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!n || n < 1) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, n);
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <View
      style={[
        styles.wrap,
        { height, borderRadius: size === 'sm' ? radii.sm + 2 : radii.md },
        filled ? styles.filled : styles.outline,
        style,
      ]}
    >
      <Pressable
        accessibilityLabel={min === 0 && value <= 1 ? t('actions.remove') : t('quantity.decrease')}
        hitSlop={6}
        disabled={atMin}
        onPress={() => step(value - 1)}
        style={[styles.btn, { width: height }, atMin && styles.disabled]}
      >
        <Icon name={min === 0 && value <= 1 ? 'trash-outline' : 'remove'} size={size === 'sm' ? 16 : 18} color={fg} />
      </Pressable>
      <TextInput
        value={draft}
        onChangeText={(text) => setDraft(text.replace(/[^0-9]/g, ''))}
        onEndEditing={commit}
        onSubmitEditing={commit}
        editable={editable}
        keyboardType="number-pad"
        returnKeyType="done"
        selectTextOnFocus
        maxLength={5}
        accessibilityLabel={t('quantity.label')}
        style={[styles.input, { color: fg, fontSize: size === 'sm' ? 14 : 16 }]}
      />
      <Pressable
        accessibilityLabel={t('quantity.increase')}
        hitSlop={6}
        disabled={atMax}
        onPress={() => step(value + 1)}
        style={[styles.btn, { width: height }, atMax && styles.disabled]}
      >
        <Icon name="add" size={size === 'sm' ? 16 : 18} color={fg} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  filled: { backgroundColor: colors.secondary },
  outline: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  btn: { height: '100%', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minWidth: 24, textAlign: 'center', fontFamily: fonts.extrabold, paddingVertical: 0 },
  disabled: { opacity: 0.35 },
});
