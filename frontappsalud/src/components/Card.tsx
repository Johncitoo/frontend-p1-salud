import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { theme } from '../theme';

export const Card: React.FC<ViewProps> = ({ children, style, ...props }) => (
  <View style={[styles.card, style]} {...props}>{children}</View>
);

export const CardHeader: React.FC<ViewProps> = ({ children, style, ...props }) => (
  <View style={[styles.header, style]} {...props}>{children}</View>
);

export const CardTitle: React.FC<ViewProps> = ({ children, style, ...props }) => (
  <View style={[styles.titleContainer, style]} {...props}>{children}</View>
);

export const CardDescription: React.FC<ViewProps> = ({ children, style, ...props }) => (
  <View style={[styles.descriptionContainer, style]} {...props}>{children}</View>
);

export const CardContent: React.FC<ViewProps> = ({ children, style, ...props }) => (
  <View style={[styles.content, style]} {...props}>{children}</View>
);

export const CardFooter: React.FC<ViewProps> = ({ children, style, ...props }) => (
  <View style={[styles.footer, style]} {...props}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
    shadowColor: theme.colors.graphite,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4, // Sombra para Android
    borderWidth: 1,
    borderColor: '#F1F1F1',
  },
  header: {
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  titleContainer: {
    marginBottom: theme.spacing.xs,
  },
  descriptionContainer: {
    marginBottom: theme.spacing.xs,
  },
  content: {
    marginBottom: theme.spacing.md,
  },
  footer: {
    marginTop: theme.spacing.sm,
  },
});
