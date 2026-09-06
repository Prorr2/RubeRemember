/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    /** Main accent (primary actions, links, progress, selection). */
    accent: '#007AFF',
    /** Accent pressed / slightly darker state. */
    accentPressed: '#0066CC',
    /** Translucent accent tint used as a subtle background highlight. */
    accentSoft: 'rgba(0, 122, 255, 0.12)',
    /** Success (complete, saved, online). */
    success: '#34C759',
    /** Danger (delete, destructive). */
    danger: '#FF3B30',
    /** Warning / highlight (attention, most-recent). */
    warning: '#FF9500',
    /** Modal overlay backdrop. */
    overlay: 'rgba(0, 0, 0, 0.55)',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    accent: '#0A84FF',
    accentPressed: '#0066CC',
    accentSoft: 'rgba(10, 132, 255, 0.18)',
    success: '#30D158',
    danger: '#FF453A',
    warning: '#FF9300',
    overlay: 'rgba(0, 0, 0, 0.65)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Full palette object for either scheme, used when passing `colors` around. */
export type ThemeColors = typeof Colors.light | typeof Colors.dark;

/** Brand accent used for primary actions, links and highlights (single source). */
export const Accent = '#007AFF';

/** Border radius scale buckets used by the shared UI components. */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
} as const;

/** Standard card shadow (works across light/dark). */
export const CardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 10,
  elevation: 4,
} as const;

/**
 * Identity colors per item type. These define the "personality" of each
 * category (Tarea, Recordatorio, Ocio, Plan) and are kept separate from the
 * app accent, which is reserved for primary actions.
 */
export const ItemTypeColors = {
  TASK: '#FF9500',
  REMINDER: '#00C7BE',
  ACTIVITY: '#5856D6',
  PLAN: '#BF5AF2',
  MEMO: '#5856D6',
  DEFAULT: '#5856D6',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
