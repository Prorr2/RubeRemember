import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radius } from '@/constants/theme';
import { PressableScale } from '@/components/ui/pressable-scale';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: object;
}

/**
 * Themed button with variants, icon support and a loading state. The "primary"
 * variant uses the app accent; semantic variants map to success/danger.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const colors = dark ? Colors.dark : Colors.light;

  const fg = variant === 'primary' || variant === 'danger' || variant === 'success'
    ? '#FFFFFF'
    : colors.text;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      scaleTo={0.97}
      style={[
        styles.base,
        variant === 'primary' && { backgroundColor: colors.accent },
        variant === 'secondary' && { backgroundColor: colors.backgroundElement },
        variant === 'danger' && { backgroundColor: colors.danger },
        variant === 'success' && { backgroundColor: colors.success },
        variant === 'ghost' && {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.backgroundSelected,
        },
        size === 'sm' && styles.sm,
        size === 'lg' && styles.lg,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : icon ? (
          <Ionicons name={icon} size={16} color={fg} />
        ) : null}
        <Text style={[styles.label, { color: fg }]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  sm: {
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  lg: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  disabled: {
    opacity: 0.5,
  },
});