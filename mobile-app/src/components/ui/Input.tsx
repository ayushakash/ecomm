import React, { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { colors, fonts, radii, spacing } from '../../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  /** Error text; also turns the border red. */
  error?: string | null;
  hint?: string;
  leftIcon?: IconName;
  /** Static prefix inside the field, e.g. "+91". */
  prefix?: string;
  /** Trailing element (icon button, "Change" link, spinner). */
  right?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  /** Multi-line text area height (enables multiline). */
  textAreaHeight?: number;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, leftIcon, prefix, right, containerStyle, textAreaHeight, onFocus, onBlur, editable = true, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;
  return (
    <View style={containerStyle}>
      {label && (
        <Text variant="label" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.field,
          { borderColor, backgroundColor: editable ? colors.surface : colors.surfaceMuted },
          focused && styles.focused,
          textAreaHeight ? { height: textAreaHeight, alignItems: 'flex-start', paddingVertical: spacing.md } : null,
        ]}
      >
        {leftIcon && <Icon name={leftIcon} size={18} color={focused ? 'primary' : 'textMuted'} />}
        {prefix && (
          <Text variant="title" color="textSecondary">
            {prefix}
          </Text>
        )}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          editable={editable}
          multiline={!!textAreaHeight}
          textAlignVertical={textAreaHeight ? 'top' : 'center'}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, textAreaHeight ? { height: '100%' } : null]}
          {...rest}
        />
        {right}
      </View>
      {error ? (
        <Text variant="caption" color="danger" style={styles.helper}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textMuted" style={styles.helper}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: { marginBottom: spacing.xs + 2 },
  field: {
    minHeight: 50,
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  focused: { borderColor: colors.primary },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  helper: { marginTop: spacing.xs },
});
