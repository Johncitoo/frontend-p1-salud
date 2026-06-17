import React from 'react';
import { Text, StyleSheet, TextProps } from 'react-native';
import { theme } from '../theme';

interface LabelProps extends TextProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'body' | 'caption' | 'button';
  color?: string;
}

export const Label: React.FC<LabelProps> = ({ 
  children, 
  variant = 'body', 
  color, 
  style, 
  ...props 
}) => {
  return (
    <Text 
      style={[
        styles.text, 
        styles[variant], 
        color ? { color } : null, 
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    color: theme.colors.graphite,
  },
  h1: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight,
  },
  h2: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
  },
  body: {
    fontSize: theme.typography.body.fontSize,
  },
  caption: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.grayText,
  },
  button: {
    fontSize: theme.typography.button.fontSize,
    fontWeight: theme.typography.button.fontWeight,
    color: theme.colors.white,
  },
});
