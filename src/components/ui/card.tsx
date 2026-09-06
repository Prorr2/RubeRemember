import React from 'react';
import { StyleSheet, useColorScheme, View, type ViewProps } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

export interface CardProps extends ViewProps {
  /** false = transparent surface (background), true = elevated (backgroundElement). */
  elevated?: boolean;
  /** Removes all internal padding. */
  padded?: boolean;
}

/**
 * Themed surface card used for grouped content across screens. Provides a
 * consistent colour, radius and border so cards look the same everywhere.
 */
export function Card({ elevated = true, padded = true, style, children, ...props }: CardProps) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: elevated ? colors.backgroundElement : colors.background },
        padded && styles.padded,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128, 128, 128, 0.25)',
  },
  padded: {
    padding: 16,
  },
});