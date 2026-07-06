import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { theme } from '../theme';

export type LabelVariant = 'caption' | 'body' | 'subtitle' | 'title' | 'hero' | 'h1' | 'h2';

interface LabelProps {
  children: React.ReactNode;
  variant?: LabelVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
}

const sizeMap: Record<LabelVariant, number> = {
  caption: theme.fontSize.caption,
  body: theme.fontSize.body,
  subtitle: theme.fontSize.subtitle,
  title: theme.fontSize.title,
  hero: theme.fontSize.hero,
  h1: theme.fontSize.title,
  h2: theme.fontSize.subtitle,
};

// h1/h2 son títulos de sección: además de un tamaño mayor, van en negrita por defecto.
const boldByDefault: Partial<Record<LabelVariant, boolean>> = { h1: true, h2: true };

export function Label({
  children,
  variant = 'body',
  color = theme.colors.graphite,
  style,
  bold,
  align,
  numberOfLines,
}: LabelProps) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: sizeMap[variant],
          color,
          fontWeight: (bold ?? boldByDefault[variant]) ? 'bold' : 'normal',
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
