import React from 'react';
import {
  TouchableOpacity,
  Text,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { theme } from '../theme';

interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
}

export function PrimaryButton({
  children,
  fullWidth,
  style,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        {
          backgroundColor: theme.colors.yaleBlue,
          paddingVertical: theme.spacing.sm + 6,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          width: fullWidth ? '100%' : undefined,
        },
        style,
      ]}
      {...props}
    >
      <Text
        style={{
          color: theme.colors.white,
          fontSize: theme.fontSize.subtitle,
          fontWeight: '600',
        }}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}

export function SecondaryButton({
  children,
  fullWidth,
  style,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
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
        },
        style,
      ]}
      {...props}
    >
      <Text
        style={{
          color: theme.colors.stormyTeal,
          fontSize: theme.fontSize.subtitle,
          fontWeight: '600',
        }}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}

export function OutlineButton({
  children,
  fullWidth,
  style,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
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
        },
        style,
      ]}
      {...props}
    >
      <Text
        style={{
          color: theme.colors.stormyTeal,
          fontSize: theme.fontSize.body,
        }}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}
