import React from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';
import { PressableScale } from '@/components/ui/pressable-scale';

export interface ScreenHeaderProps {
  title: string;
  /** If false, no back button is rendered. */
  showBack?: boolean;
  onBack?: () => void;
  /** Right side actions (eg. "Añadir" button). */
  right?: React.ReactNode;
  /** Whether the header should have the elevated background (default false = transparent). */
  elevated?: boolean;
  /** Adds the safe-area top inset to the header. Set false when the screen wraps its root in SafeAreaView (default false). */
  includeTopInset?: boolean;
}

/**
 * Consistent screen header: back button + title + right actions.
 * Replaces the hand-rolled headers duplicated across every screen.
 */
export function ScreenHeader({ title, showBack = true, onBack, right, elevated = false, includeTopInset = false }: ScreenHeaderProps) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={[
        styles.container,
        includeTopInset && { paddingTop: insets.top + 8 },
        elevated && { backgroundColor: colors.backgroundElement },
      ]}
    >
      <View style={styles.row}>
        {showBack ? (
          <PressableScale
            onPress={onBack ?? (() => router.back())}
            style={[styles.backButton, { backgroundColor: colors.backgroundElement }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </PressableScale>
        ) : (
          <View style={styles.backButton} />
        )}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.right}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    minWidth: 36,
    alignItems: 'flex-end',
  },
});