import React from 'react';
import { View, ViewStyle, StyleProp, DimensionValue } from 'react-native';
import { theme } from '../theme';

type SpacingKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type RadiusKey = 'sm' | 'md' | 'lg' | 'round';

const gapMap: Record<SpacingKey, number> = {
  xs: theme.spacing.xs,
  sm: theme.spacing.sm,
  md: theme.spacing.md,
  lg: theme.spacing.lg,
  xl: theme.spacing.xl,
};

const radiusMap: Record<RadiusKey, number> = {
  sm: theme.radius.sm,
  md: theme.radius.md,
  lg: theme.radius.lg,
  round: theme.radius.round,
};

// padding/margin se usan en la app tanto con las claves del theme ("md") como con
// números sueltos (padding={4}); se resuelven ambos a un número de píxeles.
function resolveSpacing(value?: SpacingKey | number): number | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? value : gapMap[value];
}

interface LayoutProps {
  children: React.ReactNode;
  flex?: number;
  gap?: SpacingKey;
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?:
    | 'flex-start'
    | 'center'
    | 'flex-end'
    | 'space-between'
    | 'space-around';
  bg?: string;
  radius?: RadiusKey;
  padding?: SpacingKey | number;
  margin?: SpacingKey | number;
  width?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}

function stackStyle(direction: 'column' | 'row', props: Omit<LayoutProps, 'children'>): ViewStyle {
  return {
    flex: props.flex,
    flexDirection: direction,
    gap: props.gap ? gapMap[props.gap] : undefined,
    alignItems: props.align,
    justifyContent: props.justify,
    backgroundColor: props.bg,
    borderRadius: props.radius ? radiusMap[props.radius] : undefined,
    padding: resolveSpacing(props.padding),
    margin: resolveSpacing(props.margin),
    width: props.width,
  };
}

export function VStack({ children, style, ...props }: LayoutProps) {
  return <View style={[stackStyle('column', props), style]}>{children}</View>;
}

export function HStack({ children, style, ...props }: LayoutProps) {
  return <View style={[stackStyle('row', props), style]}>{children}</View>;
}

interface BoxProps {
  children?: React.ReactNode;
  flex?: number;
  padding?: SpacingKey | number;
  margin?: SpacingKey | number;
  bg?: string;
  radius?: RadiusKey;
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?:
    | 'flex-start'
    | 'center'
    | 'flex-end'
    | 'space-between'
    | 'space-around';
  width?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}

export function Box({ children, flex, padding, margin, bg, radius, align, justify, width, style }: BoxProps) {
  return (
    <View
      style={[
        {
          flex,
          padding: resolveSpacing(padding),
          margin: resolveSpacing(margin),
          backgroundColor: bg,
          borderRadius: radius ? radiusMap[radius] : undefined,
          alignItems: align,
          justifyContent: justify,
          width,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
