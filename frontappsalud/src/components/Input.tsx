import React from 'react';
import { TextInput, View, TextInputProps } from 'react-native';
import { theme } from '../theme';
import { Label } from './Label';

interface InputProps extends TextInputProps {
  error?: string;
  label?: string;
  isPassword?: boolean;
}

export function Input({ error, label, isPassword, style, ...props }: InputProps) {
  return (
    <View>
      {label ? (
        <Label variant="caption" style={{ fontWeight: '600', marginBottom: 4 }}>
          {label}
        </Label>
      ) : null}
      <TextInput
        placeholderTextColor={theme.colors.grayText}
        secureTextEntry={isPassword}
        style={[
          {
            backgroundColor: theme.colors.white,
            borderWidth: 1,
            borderColor: error ? theme.colors.danger : theme.colors.alabasterGrey,
            borderRadius: theme.radius.sm,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm + 4,
            fontSize: theme.fontSize.body,
            color: theme.colors.graphite,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Label variant="caption" color={theme.colors.danger} style={{ marginTop: 4 }}>
          {error}
        </Label>
      ) : null}
    </View>
  );
}

// Para compatibilidad con la nomenclatura del walkthrough
export { Input as FormInput };
