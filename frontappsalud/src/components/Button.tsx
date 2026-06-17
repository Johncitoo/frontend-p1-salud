import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, TouchableOpacityProps } from 'react-native';
import { theme } from '../theme';
import { Label } from './Label';

export interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  isLoading?: boolean;
}

interface BaseButtonProps extends ButtonProps {
  textColor: string;
  spinnerColor?: string;
}

// Componente base interno para reutilizar toda la lógica del botón
const BaseButton: React.FC<BaseButtonProps> = ({ 
  children, 
  isLoading = false, 
  disabled, 
  style, 
  textColor,
  spinnerColor = theme.colors.white,
  ...props 
}) => {
  const isButtonDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        style,
        isButtonDisabled ? styles.disabled : null,
      ]}
      disabled={isButtonDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        typeof children === 'string' ? (
          <Label variant="button" color={textColor}>{children}</Label>
        ) : (
          children
        )
      )}
    </TouchableOpacity>
  );
};

// 1. Botón Primario: Color Yale Blue (#284B63) con texto blanco
export const PrimaryButton: React.FC<ButtonProps> = ({ children, style, ...props }) => (
  <BaseButton 
    style={[styles.primary, style]} 
    textColor={theme.colors.white} 
    {...props}
  >
    {children}
  </BaseButton>
);

// 2. Botón Secundario: Color Stormy Teal (#3C6E71) con texto blanco
export const SecondaryButton: React.FC<ButtonProps> = ({ children, style, ...props }) => (
  <BaseButton 
    style={[styles.secondary, style]} 
    textColor={theme.colors.white} 
    {...props}
  >
    {children}
  </BaseButton>
);

// 3. Botón de Borde (Outline): Fondo transparente, texto azul y borde gris
export const OutlineButton: React.FC<ButtonProps> = ({ children, style, ...props }) => (
  <BaseButton 
    style={[styles.outline, style]} 
    textColor={theme.colors.yaleBlue} 
    spinnerColor={theme.colors.yaleBlue}
    {...props}
  >
    {children}
  </BaseButton>
);

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
  },
  primary: {
    backgroundColor: theme.colors.yaleBlue,
  },
  secondary: {
    backgroundColor: theme.colors.stormyTeal,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.alabasterGrey,
  },
  disabled: {
    backgroundColor: theme.colors.alabasterGrey,
    opacity: 0.7,
  },
});

