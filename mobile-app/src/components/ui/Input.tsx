import React from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME, SIZES } from '../../theme';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  error?: string;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  leftIcon?: string;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
  editable?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  leftIcon,
  style,
  inputStyle,
  autoCapitalize = 'none',
  autoCorrect = false,
  returnKeyType = 'done',
  onSubmitEditing,
  blurOnSubmit = true,
  editable = true,
}) => {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[
        styles.inputContainer,
        error && styles.error,
        disabled && styles.disabled,
      ]}>
        {leftIcon && (
          <Ionicons 
            name={leftIcon as any} 
            size={20} 
            color={THEME.textMuted} 
            style={styles.leftIcon} 
          />
        )}
        
        <TextInput
          style={[
            styles.input, 
            leftIcon && styles.inputWithLeftIcon, 
            multiline && styles.multilineInput,
            inputStyle
          ]}
          placeholder={placeholder}
          placeholderTextColor={THEME.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          editable={!disabled && editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.md,
  },
  label: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: SIZES.sm,
    minHeight: SIZES.inputHeight,
  },
  error: {
    borderColor: THEME.error,
  },
  disabled: {
    backgroundColor: THEME.borderLight,
    borderColor: THEME.borderLight,
  },
  input: {
    flex: 1,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    fontSize: SIZES.fontMd,
    color: THEME.text,
    textAlignVertical: 'center',
  },
  multilineInput: {
    textAlignVertical: 'top',
    paddingTop: SIZES.md,
  },
  inputWithLeftIcon: {
    paddingLeft: SIZES.sm,
  },
  leftIcon: {
    marginLeft: SIZES.md,
  },
  errorText: {
    fontSize: SIZES.fontXs,
    color: THEME.error,
    marginTop: SIZES.xs,
  },
});

export default React.memo(Input);