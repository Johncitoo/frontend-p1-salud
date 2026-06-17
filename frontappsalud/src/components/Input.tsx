import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, TextInputProps } from 'react-native';
import { theme } from '../theme';
import { Eye, EyeOff } from 'lucide-react-native';
import { Label } from './Label';
import { VStack } from './Layout';

export interface InputProps extends TextInputProps {
  isPassword?: boolean;
}

// 1. Componente Base Input
export const Input: React.FC<InputProps> = ({ 
  isPassword = false, 
  style, 
  ...props 
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      <TextInput
        style={[
          styles.input, 
          isPassword ? styles.passwordInput : null, 
          style
        ]}
        placeholderTextColor={theme.colors.grayText}
        secureTextEntry={isPassword && !showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
      {isPassword && (
        <TouchableOpacity 
          onPress={() => setShowPassword(!showPassword)} 
          style={styles.eyeButton}
          activeOpacity={0.7}
        >
          {showPassword ? (
            <EyeOff size={20} color={theme.colors.grayText} />
          ) : (
            <Eye size={20} color={theme.colors.grayText} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

interface FormInputProps extends InputProps {
  label: string;
}

// 2. Componente FormInput: Combina la etiqueta (Label) y el Input en una sola línea
export const FormInput: React.FC<FormInputProps> = ({ label, style, ...props }) => {
  return (
    <VStack gap="xs" style={styles.formGroup}>
      <Label variant="caption" style={styles.inputLabel}>
        {label}
      </Label>
      <Input style={style} {...props} />
    </VStack>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.alabasterGrey,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.graphite,
    backgroundColor: theme.colors.white,
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: theme.spacing.xs,
  },
  formGroup: {
    width: '100%',
  },
  inputLabel: {
    fontWeight: '600',
    color: theme.colors.graphite,
  },
});

