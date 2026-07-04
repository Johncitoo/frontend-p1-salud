import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { theme } from '../theme';

interface LayoutProps {
  children: React.ReactNode;
  flex?: number;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?:
    | 'flex-start'
    | 'center'
    | 'flex-end'
    | 'space-between'
    | 'space-around';
  bg?: string;
  style?: StyleProp<ViewStyle>;
}

const gapMap: Record<string, number> = {
  xs: theme.spacing.xs,
  sm: theme.spacing.sm,
  md: theme.spacing.md,
  lg: theme.spacing.lg,
  xl: theme.spacing.xl,
};

export function VStack({
  children,
  flex,
  gap,
  align,
  justify,
  bg,
  style,
}: LayoutProps) {
  return (
    <View
      style={[
        {
          flex,
          flexDirection: 'column',
          gap: gap ? gapMap[gap] : undefined,
          alignItems: align,
          justifyContent: justify,
          backgroundColor: bg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function HStack({
  children,
  flex,
  gap,
  align,
  justify,
  bg,
  style,
}: LayoutProps) {
  return (
    <View
      style={[
        {
          flex,
          flexDirection: 'row',
          gap: gap ? gapMap[gap] : undefined,
          alignItems: align,
          justifyContent: justify,
          backgroundColor: bg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface BoxProps {
  children?: React.ReactNode;
  flex?: number;
  p?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  bg?: string;
  radius?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

const radiusMap: Record<string, number> = {
  sm: theme.radius.sm,
  md: theme.radius.md,
  lg: theme.radius.lg,
};

export function Box({ children, flex, p, bg, radius, style }: BoxProps) {
  return (
    <View
      style={[
        {
          flex,
          padding: p ? gapMap[p] : undefined,
          backgroundColor: bg,
          borderRadius: radius ? radiusMap[radius] : undefined,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
