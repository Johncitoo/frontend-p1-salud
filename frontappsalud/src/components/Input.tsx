import React from 'react';
import { TextInput, View, TextInputProps } from 'react-native';
import { theme } from '../theme';

interface InputProps extends TextInputProps {
  error?: string;
}

export function Input({ error, style, ...props }: InputProps) {
  return (
    <View>
      <TextInput
        placeholderTextColor={theme.colors.grayText}
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
        <View style={{ marginTop: 4 }}>
          <TextInput
            editable={false}
            style={{
              color: theme.colors.danger,
              fontSize: theme.fontSize.caption,
            }}
            value={error}
          />
        </View>
      ) : null}
    </View>
  );
}

// Para compatibilidad con la nomenclatura del walkthrough
export { Input as FormInput };
