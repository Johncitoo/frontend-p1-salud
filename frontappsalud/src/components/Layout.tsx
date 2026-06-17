import React from 'react';
import { View, ViewStyle, FlexStyle, StyleProp, DimensionValue } from 'react-native';
import { theme } from '../theme';

interface LayoutProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  flex?: number;
  padding?: keyof typeof theme.spacing | number;
  margin?: keyof typeof theme.spacing | number;
  gap?: keyof typeof theme.spacing | number;
  align?: FlexStyle['alignItems'];
  justify?: FlexStyle['justifyContent'];
  width?: DimensionValue;
  bg?: string;
  radius?: keyof typeof theme.borderRadius | number;
}

const getSpacingVal = (val: any) => {
  if (typeof val === 'string' && val in theme.spacing) {
    return theme.spacing[val as keyof typeof theme.spacing];
  }
  return val;
};

const getRadiusVal = (val: any) => {
  if (typeof val === 'string' && val in theme.borderRadius) {
    return theme.borderRadius[val as keyof typeof theme.borderRadius];
  }
  return val;
};

// 1. Box: Contenedor genérico que traduce propiedades CSS básicas
export const Box: React.FC<LayoutProps> = ({
  children,
  style,
  flex,
  padding,
  margin,
  align,
  justify,
  width,
  bg,
  radius,
}) => {
  const dynamicStyles: ViewStyle = {
    flex,
    padding: getSpacingVal(padding),
    margin: getSpacingVal(margin),
    alignItems: align,
    justifyContent: justify,
    width,
    backgroundColor: bg,
    borderRadius: getRadiusVal(radius),
  };

  return <View style={[dynamicStyles, style]}>{children}</View>;
};

// 2. VStack: Pila vertical con espaciado uniforme automático
export const VStack: React.FC<LayoutProps> = ({
  children,
  style,
  gap,
  ...props
}) => {
  return (
    <Box
      style={[
        { flexDirection: 'column' },
        gap ? { gap: getSpacingVal(gap) } : undefined,
        style
      ]}
      {...props}
    >
      {children}
    </Box>
  );
};

// 3. HStack: Pila horizontal (Fila) con espaciado uniforme automático
export const HStack: React.FC<LayoutProps> = ({
  children,
  style,
  gap,
  ...props
}) => {
  return (
    <Box
      style={[
        { flexDirection: 'row' },
        gap ? { gap: getSpacingVal(gap) } : undefined,
        style
      ]}
      {...props}
    >
      {children}
    </Box>
  );
};
