import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { theme } from '../theme';

type LabelVariant = 'caption' | 'body' | 'subtitle' | 'title' | 'hero';

interface LabelProps {
  children: React.ReactNode;
  variant?: LabelVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
}

const sizeMap: Record<LabelVariant, number> = {
  caption: theme.fontSize.caption,
  body: theme.fontSize.body,
  subtitle: theme.fontSize.subtitle,
  title: theme.fontSize.title,
  hero: theme.fontSize.hero,
};

export function Label({
  children,
  variant = 'body',
  color = theme.colors.graphite,
  style,
  bold,
  align,
}: LabelProps) {
  return (
    <Text
      style={[
        {
          fontSize: sizeMap[variant],
          color,
          fontWeight: bold ? 'bold' : 'normal',
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
