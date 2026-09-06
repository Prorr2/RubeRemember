import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export const ALARM_CHANNEL_ID = 'rube_remember_alarms_v2';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type NotificationsModule = typeof import('expo-notifications');

let cachedModule: NotificationsModule | null = null;
let loadError: unknown = null;

export async function getNotifications(): Promise<NotificationsModule | null> {
  if (cachedModule) return cachedModule;
  if (loadError) return null;
  if (isExpoGo) {
    console.warn('[notifications] expo-notifications no está disponible en Expo Go. Notificaciones desactivadas.');
    loadError = new Error('expo-notifications unavailable in Expo Go');
    return null;
  }
  try {
    cachedModule = await import('expo-notifications');
    return cachedModule;
  } catch (e) {
    loadError = e;
    console.warn('[notifications] expo-notifications no disponible:', e);
    return null;
  }
}

export const NotificationService = {
  initialize: async () => {
    try {
      const N = await getNotifications();
      if (!N) return;
      N.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      if (Platform.OS === 'android') {
        N.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
          name: 'Recordatorios Rube Remember',
          importance: N.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#FF9500',
          enableVibrate: true,
          bypassDnd: true,
        }).catch((e) => console.warn('Failed to set notification channel:', e));
      }
    } catch (e) {
      console.warn('[notifications] initialize error:', e);
    }
  },

  requestPermissions: async (): Promise<boolean> => {
    const N = await getNotifications();
    if (!N) return false;
    let granted = (await N.getPermissionsAsync()).granted;
    if (!granted) {
      granted = (await N.requestPermissionsAsync()).granted;
    }
    return granted;
  },

  cancelNotification: async (reminderId: string, dates?: string[]) => {
    try {
      const N = await getNotifications();
      if (!N) return;
      await N.cancelScheduledNotificationAsync(reminderId).catch(() => {});
      if (dates) {
        for (const d of dates) {
          await N.cancelScheduledNotificationAsync(`${reminderId}_${d}`).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Failed to cancel notifications:', e);
    }
  },

  scheduleNotification: async (
    reminderId: string,
    body: string,
    dates: string[],
    time: string
  ): Promise<boolean> => {
    const N = await getNotifications();
    if (!N) return false;
    let hasScheduledAtLeastOne = false;
    for (const dStr of dates) {
      const [year, month, day] = dStr.split('-').map(Number);
      const [hour, minute] = time.split(':').map(Number);
      const alarmDate = new Date(year, month - 1, day, hour, minute, 0);

      if (alarmDate.getTime() <= Date.now()) {
        continue;
      }

      const notifId = dates.length === 1 ? reminderId : `${reminderId}_${dStr}`;
      try {
        await N.scheduleNotificationAsync({
          identifier: notifId,
          content: {
            title: '🔔 Rube Remember: Recordatorio',
            body: body,
            sound: Platform.OS === 'android' ? 'alarm' : 'alarm.mp3',
            vibrate: [0, 500, 250, 500],
            ...Platform.select({
              android: { channelId: ALARM_CHANNEL_ID },
              default: {},
            }),
          },
          trigger: {
            type: N.SchedulableTriggerInputTypes.DATE,
            date: alarmDate,
          },
        });
        hasScheduledAtLeastOne = true;
      } catch (e) {
        console.warn(`Local Notification scheduling failed for date ${dStr}:`, e);
      }
    }
    return hasScheduledAtLeastOne;
  },

  cancelAll: async () => {
    try {
      const N = await getNotifications();
      if (!N) return;
      await N.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      console.warn('Failed to cancel all notifications:', e);
    }
  },
};