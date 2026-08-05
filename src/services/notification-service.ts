import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const ALARM_CHANNEL_ID = 'rube_remember_alarms_v2';

export const NotificationService = {
  initialize: () => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldVibrate: true,
      }),
    });

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
        name: 'Recordatorios Rube Remember',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF9500',
        enableVibration: true,
        bypassDnd: true,
      }).catch((e) => console.warn('Failed to set notification channel:', e));
    }
  },

  requestPermissions: async (): Promise<boolean> => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  },

  cancelNotification: async (reminderId: string, dates?: string[]) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(reminderId).catch(() => {});
      if (dates) {
        for (const d of dates) {
          await Notifications.cancelScheduledNotificationAsync(`${reminderId}_${d}`).catch(() => {});
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
        await Notifications.scheduleNotificationAsync({
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
          trigger: { date: alarmDate, type: 'date' as any },
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
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      console.warn('Failed to cancel all notifications:', e);
    }
  },
};
