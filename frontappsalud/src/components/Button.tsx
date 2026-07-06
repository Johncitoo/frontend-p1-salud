import React from 'react';
import {
  TouchableOpacity,
  Text,
  TouchableOpacityProps,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../theme';

interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export function PrimaryButton({
  children,
  fullWidth,
  isLoading,
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || isLoading}
      style={[
        {
          backgroundColor: theme.colors.yaleBlue,
          paddingVertical: theme.spacing.sm + 6,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          width: fullWidth ? '100%' : undefined,
          opacity: disabled || isLoading ? 0.7 : 1,
        },
        style,
      ]}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={theme.colors.white} />
      ) : (
        <Text
          style={{
            color: theme.colors.white,
            fontSize: theme.fontSize.subtitle,
            fontWeight: '600',
          }}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function SecondaryButton({
  children,
  fullWidth,
  isLoading,
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || isLoading}
      style={[
        {
          backgroundColor: theme.colors.white,
          paddingVertical: theme.spacing.sm + 6,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: theme.colors.stormyTeal,
          width: fullWidth ? '100%' : undefined,
          opacity: disabled || isLoading ? 0.7 : 1,
        },
        style,
      ]}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={theme.colors.stormyTeal} />
      ) : (
        <Text
          style={{
            color: theme.colors.stormyTeal,
            fontSize: theme.fontSize.subtitle,
            fontWeight: '600',
          }}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function OutlineButton({
  children,
  fullWidth,
  isLoading,
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || isLoading}
      style={[
        {
          backgroundColor: 'transparent',
          paddingVertical: theme.spacing.sm + 4,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: theme.colors.alabasterGrey,
          width: fullWidth ? '100%' : undefined,
          opacity: disabled || isLoading ? 0.7 : 1,
        },
        style,
      ]}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={theme.colors.stormyTeal} />
      ) : (
        <Text
          style={{
            color: theme.colors.stormyTeal,
            fontSize: theme.fontSize.body,
          }}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}
