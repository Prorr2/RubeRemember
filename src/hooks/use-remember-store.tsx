import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

export interface Comment {
  id: string;
  text: string;
  createdAt: string; // "HH:MM"
}

export interface Reminder {
  id: string;
  text: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  completed: boolean;
  alarmScheduled: boolean;
  createdAt: string;
  comments?: Comment[];
  pinned?: boolean;
  timeSlotId?: string;
}

export interface TimeSlot {
  id: string;
  name: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

interface RememberStore {
  reminders: Reminder[];
  loading: boolean;
  addReminder: (text: string, dateStr: string, timeStr: string, timeSlotId?: string) => Promise<void>;
  updateReminder: (id: string, text: string, dateStr: string, timeStr: string, timeSlotId?: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  deleteCompleted: () => Promise<void>;
  toggleReminderCompleted: (id: string) => Promise<void>;
  scheduleSystemAlarm: (reminder: Reminder) => Promise<void>;
  scheduleAllAlarms: () => Promise<void>;
  clearAll: () => Promise<void>;
  addComment: (reminderId: string, text: string) => Promise<void>;
  updateComment: (reminderId: string, commentId: string, text: string) => Promise<void>;
  deleteComment: (reminderId: string, commentId: string) => Promise<void>;
  exportBackupData: () => Promise<string>;
  importBackupData: (jsonString: string) => Promise<boolean>;
  toggleReminderPinned: (id: string) => Promise<void>;
  proximityDays: number;
  setProximityDays: (days: number) => Promise<void>;
  timeSlots: TimeSlot[];
  slotSeparationMinutes: number;
  addTimeSlot: (name: string, startTime: string, endTime: string) => Promise<void>;
  updateTimeSlot: (id: string, name: string, startTime: string, endTime: string) => Promise<void>;
  deleteTimeSlot: (id: string) => Promise<void>;
  setSlotSeparationMinutes: (minutes: number) => Promise<void>;
}

const STORAGE_KEY = 'rube_remember_reminders_v1';
const PROXIMITY_DAYS_KEY = 'rube_remember_proximity_days_v1';
const STORAGE_KEY_SLOTS = 'rube_remember_time_slots_v1';
const STORAGE_KEY_SEPARATION = 'rube_remember_slot_separation_v1';
const ALARM_CHANNEL_ID = 'rube-remember-alarms';

function recalculateSlotTimes(
  items: Reminder[],
  slots: TimeSlot[],
  separation: number
): Reminder[] {
  const groupedByDate: Record<string, Reminder[]> = {};
  items.forEach((item) => {
    if (!groupedByDate[item.date]) {
      groupedByDate[item.date] = [];
    }
    groupedByDate[item.date].push(item);
  });

  return items.map((item) => {
    if (!item.timeSlotId) return item;

    const slot = slots.find((s) => s.id === item.timeSlotId);
    if (!slot) {
      return { ...item, timeSlotId: undefined };
    }

    const dayReminders = (groupedByDate[item.date] || [])
      .filter((r) => r.timeSlotId === item.timeSlotId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const index = dayReminders.findIndex((r) => r.id === item.id);
    if (index === -1) return item;

    const [startH, startM] = slot.startTime.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const computedTotal = startTotal + index * separation;
    const computedH = Math.floor(computedTotal / 60) % 24;
    const computedM = computedTotal % 60;

    const formattedTime = `${String(computedH).padStart(2, '0')}:${String(computedM).padStart(2, '0')}`;
    return { ...item, time: formattedTime };
  });
}

const RememberStoreContext = createContext<RememberStore | undefined>(undefined);

export function RememberStoreProvider({ children }: { children: React.ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [proximityDays, setProximityDaysState] = useState<number>(20);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { id: 'slot-morning', name: 'Mañana', startTime: '09:00', endTime: '12:00' },
    { id: 'slot-afternoon', name: 'Tarde', startTime: '16:00', endTime: '18:00' },
    { id: 'slot-night', name: 'Noche', startTime: '20:00', endTime: '23:00' },
  ]);
  const [slotSeparationMinutes, setSlotSeparationMinutesState] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize notifications handler
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldVibrate: true,
      }),
    });

    async function setupChannel() {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
          name: 'Recordatorios Rube Remember',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#FF9500',
          enableVibration: true,
          bypassDnd: true,
        });
      }
    }
    setupChannel();
  }, []);

  // Load reminders and settings on mount
  useEffect(() => {
    async function loadData() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setReminders(JSON.parse(stored));
        }
        const storedDays = await AsyncStorage.getItem(PROXIMITY_DAYS_KEY);
        if (storedDays) {
          setProximityDaysState(parseInt(storedDays, 10));
        }
        const storedSlots = await AsyncStorage.getItem(STORAGE_KEY_SLOTS);
        if (storedSlots) {
          setTimeSlots(JSON.parse(storedSlots));
        }
        const storedSep = await AsyncStorage.getItem(STORAGE_KEY_SEPARATION);
        if (storedSep) {
          setSlotSeparationMinutesState(parseInt(storedSep, 10));
        }
      } catch (e) {
        console.error('Error loading reminders/settings:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const saveReminders = useCallback(async (
    newReminders: Reminder[],
    currentSlots = timeSlots,
    currentSeparation = slotSeparationMinutes
  ) => {
    try {
      const adjusted = recalculateSlotTimes(newReminders, currentSlots, currentSeparation);
      setReminders(adjusted);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(adjusted));
    } catch (e) {
      console.error('Error saving reminders:', e);
    }
  }, [timeSlots, slotSeparationMinutes]);

  const addReminder = useCallback(async (
    text: string,
    dateStr: string,
    timeStr: string,
    timeSlotId?: string
  ) => {
    const newReminder: Reminder = {
      id: Math.random().toString(36).substring(7),
      text: text.trim(),
      date: dateStr,
      time: timeStr,
      completed: false,
      alarmScheduled: false,
      createdAt: new Date().toISOString(),
      timeSlotId,
    };
    await saveReminders([...reminders, newReminder]);
  }, [reminders, saveReminders]);

  const updateReminder = useCallback(async (
    id: string,
    text: string,
    dateStr: string,
    timeStr: string,
    timeSlotId?: string
  ) => {
    const updated = reminders.map((r) => {
      if (r.id === id) {
        return { ...r, text: text.trim(), date: dateStr, time: timeStr, timeSlotId, alarmScheduled: false };
      }
      return r;
    });
    await saveReminders(updated);
  }, [reminders, saveReminders]);

  const deleteReminder = useCallback(async (id: string) => {
    // Cancel associated notification if scheduled
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      // Ignored
    }
    const updated = reminders.filter((r) => r.id !== id);
    await saveReminders(updated);
  }, [reminders]);

  const toggleReminderCompleted = useCallback(async (id: string) => {
    const updated = reminders.map((r) => {
      if (r.id === id) {
        return { ...r, completed: !r.completed };
      }
      return r;
    });
    await saveReminders(updated);
  }, [reminders]);

  const toggleReminderPinned = useCallback(async (id: string) => {
    const updated = reminders.map((r) => {
      if (r.id === id) {
        return { ...r, pinned: !r.pinned };
      }
      return r;
    });
    await saveReminders(updated);
  }, [reminders, saveReminders]);

  const setProximityDays = useCallback(async (days: number) => {
    try {
      setProximityDaysState(days);
      await AsyncStorage.setItem(PROXIMITY_DAYS_KEY, days.toString());
    } catch (e) {
      console.error('Error saving proximity days:', e);
    }
  }, []);

  const scheduleSystemAlarm = useCallback(async (reminder: Reminder) => {
    try {
      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permiso Denegado', 'Por favor habilita los permisos de notificación en los ajustes de tu dispositivo.');
        return;
      }

      // Parse date and time
      const [year, month, day] = reminder.date.split('-').map(Number);
      const [hour, minute] = reminder.time.split(':').map(Number);
      const alarmDate = new Date(year, month - 1, day, hour, minute, 0);

      if (alarmDate.getTime() <= Date.now()) {
        Alert.alert('Fecha Invalida', 'No se puede programar una alarma para una hora o fecha en el pasado.');
        return;
      }

      // 1. Set local app notification (Cross-platform)
      await Notifications.cancelScheduledNotificationAsync(reminder.id).catch(() => {});
      await Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: {
          title: '🔔 Rube Remember: Recordatorio',
          body: reminder.text,
          sound: Platform.OS === 'android' ? 'alarm' : 'alarm.mp3',
          vibrate: [0, 500, 250, 500],
          ...Platform.select({
            android: { channelId: ALARM_CHANNEL_ID },
            default: {},
          }),
        },
        trigger: alarmDate,
      });

      // 2. Set native Android alarm (if on Android)
      if (Platform.OS === 'android') {
        try {
          const IntentLauncher = require('expo-intent-launcher');
          await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
            extra: {
              'android.intent.extra.alarm.HOUR': hour,
              'android.intent.extra.alarm.MINUTES': minute,
              'android.intent.extra.alarm.MESSAGE': `Rube Remember: ${reminder.text}`,
              'android.intent.extra.alarm.SKIP_UI': false,
              'android.intent.extra.alarm.VIBRATE': true,
            },
          });
        } catch (e: any) {
          console.warn('Native Alarm Intent Error:', e);
          const msg = e?.message || '';
          if (msg.includes('requires com.android.alarm.permission.SET_ALARM')) {
            Alert.alert(
              'Limitación de Expo Go',
              'Expo Go no tiene permisos del sistema para programar alarmas. Las alarmas del sistema funcionarán perfectamente cuando compiles y pruebes la aplicación como APK instalada en tu dispositivo (ya que tiene configurado el permiso en app.json).'
            );
          } else {
            Alert.alert('Error de Reloj', `No se pudo configurar la alarma en el reloj del sistema: ${e?.message || e}`);
          }
        }
      }

      // Update state
      const updated = reminders.map((r) => {
        if (r.id === reminder.id) {
          return { ...r, alarmScheduled: true };
        }
        return r;
      });
      await saveReminders(updated);
      Alert.alert('Alarma Programada', `Se ha establecido una alarma para el día ${day}/${month}/${year} a las ${reminder.time}.`);
    } catch (e) {
      console.error('Error scheduling alarm:', e);
      Alert.alert('Error', 'No se pudo programar la alarma del sistema.');
    }
  }, [reminders]);

  const scheduleAllAlarms = useCallback(async () => {
    try {
      if (reminders.length === 0) {
        Alert.alert('Sin Recordatorios', 'No tienes recordatorios en la lista para programar.');
        return;
      }

      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permiso Denegado', 'Por favor habilita los permisos de notificación en los ajustes de tu dispositivo.');
        return;
      }

      let scheduledCount = 0;
      let pastCount = 0;
      const updated: Reminder[] = [];

      // Run sequentially to prevent Android intent overlaps and ensure clock synchronization
      for (const reminder of reminders) {
        const [year, month, day] = reminder.date.split('-').map(Number);
        const [hour, minute] = reminder.time.split(':').map(Number);
        const alarmDate = new Date(year, month - 1, day, hour, minute, 0);

        if (alarmDate.getTime() <= Date.now()) {
          pastCount++;
          updated.push(reminder);
          continue;
        }

        // 1. Set local app notification (Cross-platform)
        await Notifications.cancelScheduledNotificationAsync(reminder.id).catch(() => {});
        await Notifications.scheduleNotificationAsync({
          identifier: reminder.id,
          content: {
            title: '🔔 Rube Remember: Recordatorio',
            body: reminder.text,
            sound: Platform.OS === 'android' ? 'alarm' : 'alarm.mp3',
            vibrate: [0, 500, 250, 500],
            ...Platform.select({
              android: { channelId: ALARM_CHANNEL_ID },
              default: {},
            }),
          },
          trigger: alarmDate,
        });

        // 2. Set native Android alarm in the system clock app
        if (Platform.OS === 'android') {
          try {
            const IntentLauncher = require('expo-intent-launcher');
            await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
              extra: {
                'android.intent.extra.alarm.HOUR': hour,
                'android.intent.extra.alarm.MINUTES': minute,
                'android.intent.extra.alarm.MESSAGE': `Rube Remember: ${reminder.text}`,
                'android.intent.extra.alarm.SKIP_UI': false,
                'android.intent.extra.alarm.VIBRATE': true,
              },
            });
          } catch (e: any) {
            console.warn('Native Alarm Intent Error:', e);
            const msg = e?.message || '';
            if (msg.includes('requires com.android.alarm.permission.SET_ALARM')) {
              Alert.alert(
                'Limitación de Expo Go',
                'Expo Go no tiene permisos para programar alarmas. Esta función requiere compilar la app a un APK nativo independiente para ejecutarse.'
              );
            } else {
              Alert.alert('Error de Reloj', `Error al enviar alarma: ${e?.message || e}`);
            }
          }
          // Pause 300ms to allow OS to register each clock intent consecutively
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        scheduledCount++;
        updated.push({ ...reminder, alarmScheduled: true });
      }

      await saveReminders(updated);

      let msg = `Se han programado ${scheduledCount} alarmas en el Reloj del Sistema.`;
      if (pastCount > 0) {
        msg += ` (${pastCount} recordatorios pasados fueron ignorados).`;
      }
      Alert.alert('Proceso Completado', msg);
    } catch (e) {
      console.error('Error scheduling all alarms:', e);
      Alert.alert('Error', 'No se pudieron programar todas las alarmas del sistema.');
    }
  }, [reminders]);

  const addComment = useCallback(async (reminderId: string, text: string) => {
    if (!text.trim()) return;
    const newComment: Comment = {
      id: Math.random().toString(36).substring(7),
      text: text.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = reminders.map((r) => {
      if (r.id === reminderId) {
        return { ...r, comments: [...(r.comments || []), newComment] };
      }
      return r;
    });
    await saveReminders(updated);
  }, [reminders]);

  const updateComment = useCallback(async (reminderId: string, commentId: string, text: string) => {
    if (!text.trim()) return;
    const updated = reminders.map((r) => {
      if (r.id === reminderId) {
        const updatedComments = (r.comments || []).map((c) => {
          if (c.id === commentId) {
            return { ...c, text: text.trim() };
          }
          return c;
        });
        return { ...r, comments: updatedComments };
      }
      return r;
    });
    await saveReminders(updated);
  }, [reminders]);

  const deleteComment = useCallback(async (reminderId: string, commentId: string) => {
    const updated = reminders.map((r) => {
      if (r.id === reminderId) {
        return { ...r, comments: (r.comments || []).filter((c) => c.id !== commentId) };
      }
      return r;
    });
    await saveReminders(updated);
  }, [reminders]);

  const exportBackupData = useCallback(async (): Promise<string> => {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    const storedDays = await AsyncStorage.getItem(PROXIMITY_DAYS_KEY);
    const storedSlots = await AsyncStorage.getItem(STORAGE_KEY_SLOTS);
    const storedSep = await AsyncStorage.getItem(STORAGE_KEY_SEPARATION);
    const data = {
      [STORAGE_KEY]: val ? JSON.parse(val) : [],
      [PROXIMITY_DAYS_KEY]: storedDays ? parseInt(storedDays, 10) : 20,
      [STORAGE_KEY_SLOTS]: storedSlots ? JSON.parse(storedSlots) : [],
      [STORAGE_KEY_SEPARATION]: storedSep ? parseInt(storedSep, 10) : 30,
    };
    return JSON.stringify(data, null, 2);
  }, []);

  const importBackupData = useCallback(async (jsonString: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed !== 'object' || parsed === null) {
        return false;
      }
      let success = false;

      let importedSlots = timeSlots;
      let importedSep = slotSeparationMinutes;

      if (STORAGE_KEY_SLOTS in parsed) {
        const slotsData = parsed[STORAGE_KEY_SLOTS];
        if (Array.isArray(slotsData)) {
          importedSlots = slotsData;
          setTimeSlots(slotsData);
          await AsyncStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(slotsData));
        }
      }

      if (STORAGE_KEY_SEPARATION in parsed) {
        const sepData = parsed[STORAGE_KEY_SEPARATION];
        if (typeof sepData === 'number') {
          importedSep = sepData;
          setSlotSeparationMinutesState(sepData);
          await AsyncStorage.setItem(STORAGE_KEY_SEPARATION, String(sepData));
        }
      }

      if (STORAGE_KEY in parsed) {
        const remindersData = parsed[STORAGE_KEY];
        if (Array.isArray(remindersData)) {
          await saveReminders(remindersData, importedSlots, importedSep);
          success = true;
        }
      }

      const backupDays = parsed[PROXIMITY_DAYS_KEY] ?? parsed['proximity_days'];
      if (typeof backupDays === 'number') {
        await setProximityDays(backupDays);
      }
      return success;
    } catch (e) {
      console.error('Error importing backup:', e);
      return false;
    }
  }, [saveReminders, setProximityDays, timeSlots, slotSeparationMinutes]);

  const deleteCompleted = useCallback(async () => {
    const completedList = reminders.filter((r) => r.completed);
    for (const item of completedList) {
      try {
        await Notifications.cancelScheduledNotificationAsync(item.id);
      } catch (e) {
        // Ignored
      }
    }
    const updated = reminders.filter((r) => !r.completed);
    await saveReminders(updated);
  }, [reminders, saveReminders]);

  const clearAll = useCallback(async () => {
    await saveReminders([]);
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  }, []);

  // ── Time Slot CRUD ──────────────────────────────────────────────────────────

  const saveSlots = useCallback(async (newSlots: TimeSlot[]) => {
    setTimeSlots(newSlots);
    await AsyncStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(newSlots));
    // Recalculate reminder times with new slot definitions
    const adjusted = recalculateSlotTimes(reminders, newSlots, slotSeparationMinutes);
    setReminders(adjusted);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(adjusted));
  }, [reminders, slotSeparationMinutes]);

  const addTimeSlot = useCallback(async (name: string, startTime: string, endTime: string) => {
    const newSlot: TimeSlot = {
      id: `slot-${Math.random().toString(36).substring(7)}`,
      name,
      startTime,
      endTime,
    };
    await saveSlots([...timeSlots, newSlot]);
  }, [timeSlots, saveSlots]);

  const updateTimeSlot = useCallback(async (id: string, name: string, startTime: string, endTime: string) => {
    const updated = timeSlots.map((s) => s.id === id ? { ...s, name, startTime, endTime } : s);
    await saveSlots(updated);
  }, [timeSlots, saveSlots]);

  const deleteTimeSlot = useCallback(async (id: string) => {
    // Strip slot references from reminders that used this slot
    const updatedReminders = reminders.map((r) =>
      r.timeSlotId === id ? { ...r, timeSlotId: undefined } : r
    );
    const updatedSlots = timeSlots.filter((s) => s.id !== id);
    setTimeSlots(updatedSlots);
    await AsyncStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(updatedSlots));
    await saveReminders(updatedReminders, updatedSlots, slotSeparationMinutes);
  }, [timeSlots, reminders, slotSeparationMinutes, saveReminders]);

  const setSlotSeparationMinutes = useCallback(async (minutes: number) => {
    setSlotSeparationMinutesState(minutes);
    await AsyncStorage.setItem(STORAGE_KEY_SEPARATION, String(minutes));
    // Recalculate with new separation
    const adjusted = recalculateSlotTimes(reminders, timeSlots, minutes);
    setReminders(adjusted);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(adjusted));
  }, [reminders, timeSlots]);

  return (
    <RememberStoreContext.Provider
      value={{
        reminders,
        loading,
        addReminder,
        updateReminder,
        deleteReminder,
        deleteCompleted,
        toggleReminderCompleted,
        scheduleSystemAlarm,
        scheduleAllAlarms,
        clearAll,
        addComment,
        updateComment,
        deleteComment,
        exportBackupData,
        importBackupData,
        toggleReminderPinned,
        proximityDays,
        setProximityDays,
        timeSlots,
        slotSeparationMinutes,
        addTimeSlot,
        updateTimeSlot,
        deleteTimeSlot,
        setSlotSeparationMinutes,
      }}
    >
      {children}
    </RememberStoreContext.Provider>
  );
}

export function useRememberStore() {
  const context = useContext(RememberStoreContext);
  if (context === undefined) {
    throw new Error('useRememberStore must be used within a RememberStoreProvider');
  }
  return context;
}
