import React from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  /** Optional action node (e.g. a Button). */
  action?: React.ReactNode;
}

/**
 * Consistent empty state for lists and sections: an icon, a title, an optional
 * description and an optional action. Replaces ad-hoc "no data" texts.
 */
export function EmptyState({ icon = 'cloud-offline-outline', title, description, action }: EmptyStateProps) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: colors.backgroundElement }]}>
        <Ionicons name={icon} size={26} color={colors.textSecondary} />
      </View>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.85,
  },
  action: {
    marginTop: 6,
  },
});