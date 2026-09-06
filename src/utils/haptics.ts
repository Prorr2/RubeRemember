import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

function safe(fn: () => Promise<any>) {
  if (Platform.OS === 'web') return;
  fn().catch(() => {});
}

/** Light impact: taps, links, selection. */
export const hapticLight = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/** Medium impact: important, confirmable actions. */
export const hapticMedium = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

/** Success / completion feedback. */
export const hapticSuccess = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

/** Warning / rejection feedback. */
export const hapticWarning = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));