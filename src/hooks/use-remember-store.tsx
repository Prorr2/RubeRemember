import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform, Alert, Linking } from 'react-native';
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
  goalId?: string;
  phaseId?: string;
}

export interface TimeSlot {
  id: string;
  name: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

export interface Phase {
  id: string;
  name: string;
  description: string;
  order: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  phases: Phase[];
  createdAt: string;
  completed?: boolean;
}

interface RememberStore {
  reminders: Reminder[];
  loading: boolean;
  addReminder: (text: string, dateStr: string, timeStr: string, timeSlotId?: string, goalId?: string, phaseId?: string) => Promise<void>;
  updateReminder: (id: string, text: string, dateStr: string, timeStr: string, timeSlotId?: string, goalId?: string, phaseId?: string) => Promise<void>;
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
  importBackupData: (jsonString: string) => Promise<{
    success: boolean;
    errors: string[];
    importedKeys: string[];
  }>;
  toggleReminderPinned: (id: string) => Promise<void>;
  proximityDays: number;
  setProximityDays: (days: number) => Promise<void>;
  timeSlots: TimeSlot[];
  slotSeparationMinutes: number;
  addTimeSlot: (name: string, startTime: string, endTime: string) => Promise<void>;
  updateTimeSlot: (id: string, name: string, startTime: string, endTime: string) => Promise<void>;
  deleteTimeSlot: (id: string) => Promise<void>;
  setSlotSeparationMinutes: (minutes: number) => Promise<void>;
  // Goals logic
  goals: Goal[];
  addGoal: (title: string, description: string, startDate: string, endDate: string) => Promise<void>;
  updateGoal: (id: string, title: string, description: string, startDate: string, endDate: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  toggleGoalCompleted: (id: string) => Promise<void>;
  addPhase: (goalId: string, name: string, description: string) => Promise<void>;
  updatePhase: (goalId: string, phaseId: string, name: string, description: string) => Promise<void>;
  deletePhase: (goalId: string, phaseId: string) => Promise<void>;
  reorderPhases: (goalId: string, phases: Phase[]) => Promise<void>;
}

const STORAGE_KEY = 'rube_remember_reminders_v1';
const PROXIMITY_DAYS_KEY = 'rube_remember_proximity_days_v1';
const STORAGE_KEY_SLOTS = 'rube_remember_time_slots_v1';
const STORAGE_KEY_SEPARATION = 'rube_remember_slot_separation_v1';
const STORAGE_KEY_GOALS = 'rube_remember_goals_v1';
const ALARM_CHANNEL_ID = 'rube-remember-alarms';

function generateICSString(reminders: Reminder[]): string {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rube Remember//Calendar Event//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  const pad = (n: number) => n.toString().padStart(2, '0');

  const toICSTimestamp = (dateStr: string, timeStr: string): string => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [h, min] = timeStr.split(':').map(Number);
    return `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`;
  };

  const nowStr = () => {
    const d = new Date();
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  };

  reminders.forEach((r) => {
    const startStr = toICSTimestamp(r.date, r.time);
    const [y, m, d] = r.date.split('-').map(Number);
    const [h, min] = r.time.split(':').map(Number);
    const endDate = new Date(y, m - 1, d, h, min + 30);
    const endStr = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;

    ics.push('BEGIN:VEVENT');
    ics.push(`UID:reminder-${r.id}@ruberemember.app`);
    ics.push(`DTSTAMP:${nowStr()}`);
    ics.push(`DTSTART:${startStr}`);
    ics.push(`DTEND:${endStr}`);
    ics.push(`SUMMARY:${r.text}`);
    ics.push('DESCRIPTION:Recordatorio programado desde la app Rube Remember');
    ics.push('END:VEVENT');
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

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
  const [goals, setGoals] = useState<Goal[]>([]);
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
        const storedGoals = await AsyncStorage.getItem(STORAGE_KEY_GOALS);
        if (storedGoals) {
          setGoals(JSON.parse(storedGoals));
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
    timeSlotId?: string,
    goalId?: string,
    phaseId?: string
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
      goalId,
      phaseId,
    };
    await saveReminders([...reminders, newReminder]);
  }, [reminders, saveReminders]);

  const updateReminder = useCallback(async (
    id: string,
    text: string,
    dateStr: string,
    timeStr: string,
    timeSlotId?: string,
    goalId?: string,
    phaseId?: string
  ) => {
    const updated = reminders.map((r) => {
      if (r.id === id) {
        return {
          ...r,
          text: text.trim(),
          date: dateStr,
          time: timeStr,
          timeSlotId,
          goalId,
          phaseId,
          alarmScheduled: false
        };
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
      if (Platform.OS === 'web') {
        Alert.alert('No Soportado', 'La programación de alarmas no está soportada en la web. Utiliza la app en un dispositivo Android o iOS.');
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

      // Parse date and time
      const [year, month, day] = reminder.date.split('-').map(Number);
      const [hour, minute] = reminder.time.split(':').map(Number);
      const alarmDate = new Date(year, month - 1, day, hour, minute, 0);

      if (alarmDate.getTime() <= Date.now()) {
        Alert.alert('Fecha Invalida', 'No se puede programar una alarma para una hora o fecha en el pasado.');
        return;
      }

      // 1. Set local app notification (Cross-platform)
      try {
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
          trigger: { date: alarmDate },
        });
      } catch (notificationError) {
        console.warn('Local Notification Error:', notificationError);
      }

      // 2. Open Calendar Event Creation Screen
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const toUTCBasicString = (date: Date) => {
          const pad = (num: number) => num.toString().padStart(2, '0');
          return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;
        };
        const endDate = new Date(alarmDate.getTime() + 30 * 60 * 1000);
        const datesParam = `${toUTCBasicString(alarmDate)}/${toUTCBasicString(endDate)}`;
        const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(reminder.text)}&dates=${datesParam}&details=${encodeURIComponent('Recordatorio de Rube Remember')}`;
        
        await Linking.openURL(gcalUrl);
      }

      // Update state
      const updated = reminders.map((r) => {
        if (r.id === reminder.id) {
          return { ...r, alarmScheduled: true };
        }
        return r;
      });
      await saveReminders(updated);
    } catch (e) {
      console.error('Error scheduling alarm:', e);
      Alert.alert('Error', 'No se pudo abrir el calendario del sistema.');
    }
  }, [reminders]);

  const scheduleAllAlarms = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('No Soportado', 'La programación en el calendario no está soportada en la web.');
        return;
      }

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
      const validForCalendar: Reminder[] = [];

      for (const reminder of reminders) {
        const [year, month, day] = reminder.date.split('-').map(Number);
        const [hour, minute] = reminder.time.split(':').map(Number);
        const alarmDate = new Date(year, month - 1, day, hour, minute, 0);

        if (alarmDate.getTime() <= Date.now()) {
          pastCount++;
          updated.push(reminder);
          continue;
        }

        // Set local app notification
        try {
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
            trigger: { date: alarmDate },
          });
        } catch (notificationError) {
          console.warn('Local Notification Error:', notificationError);
        }

        scheduledCount++;
        validForCalendar.push(reminder);
        updated.push({ ...reminder, alarmScheduled: true });
      }

      // Generate and share .ics file
      if (validForCalendar.length > 0) {
        const icsString = generateICSString(validForCalendar);
        const FileSystem = require('expo-file-system/legacy');
        
        const fileUri = FileSystem.cacheDirectory + 'rube_remember_calendar_events.ics';
        await FileSystem.writeAsStringAsync(fileUri, icsString, {
          encoding: 'utf8',
        });

        if (Platform.OS === 'android') {
          try {
            const IntentLauncher = require('expo-intent-launcher');
            const contentUri = await FileSystem.getContentUriAsync(fileUri);
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
              data: contentUri,
              type: 'text/calendar',
              flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
            });
          } catch (intentErr) {
            console.warn('IntentLauncher VIEW error, falling back to Share:', intentErr);
            const Sharing = require('expo-sharing');
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri, {
                mimeType: 'text/calendar',
                dialogTitle: 'Importar Eventos al Calendario',
                UTI: 'public.calendar-event',
              });
            }
          }
        } else {
          const Sharing = require('expo-sharing');
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'text/calendar',
              dialogTitle: 'Importar Eventos al Calendario',
              UTI: 'public.calendar-event',
            });
          }
        }
      }

      await saveReminders(updated);


    } catch (e) {
      console.error('Error scheduling all alarms:', e);
      Alert.alert('Error', 'No se pudieron programar todos los eventos en el calendario.');
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
    const storedGoals = await AsyncStorage.getItem(STORAGE_KEY_GOALS);
    const data = {
      [STORAGE_KEY]: val ? JSON.parse(val) : [],
      [PROXIMITY_DAYS_KEY]: storedDays ? parseInt(storedDays, 10) : 20,
      [STORAGE_KEY_SLOTS]: storedSlots ? JSON.parse(storedSlots) : [],
      [STORAGE_KEY_SEPARATION]: storedSep ? parseInt(storedSep, 10) : 30,
      [STORAGE_KEY_GOALS]: storedGoals ? JSON.parse(storedGoals) : [],
    };
    return JSON.stringify(data, null, 2);
  }, []);

  const importBackupData = useCallback(async (jsonString: string): Promise<{
    success: boolean;
    errors: string[];
    importedKeys: string[];
  }> => {
    const errors: string[] = [];
    const importedKeys: string[] = [];

    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e: any) {
      return {
        success: false,
        errors: [`Error al procesar el archivo JSON: ${e.message}`],
        importedKeys: [],
      };
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return {
        success: false,
        errors: ['El contenido del archivo no es un objeto JSON válido.'],
        importedKeys: [],
      };
    }

    let importedSlots = timeSlots;
    let importedSep = slotSeparationMinutes;

    // 1. Time slots
    if (STORAGE_KEY_SLOTS in parsed) {
      try {
        const slotsData = parsed[STORAGE_KEY_SLOTS];
        if (Array.isArray(slotsData)) {
          const validSlots: TimeSlot[] = [];
          slotsData.forEach((s, idx) => {
            if (s && typeof s === 'object' && s.id && s.name && s.startTime && s.endTime) {
              validSlots.push({
                id: String(s.id),
                name: String(s.name),
                startTime: String(s.startTime),
                endTime: String(s.endTime)
              });
            } else {
              errors.push(`Franja horaria en posición ${idx + 1} no es válida.`);
            }
          });
          if (validSlots.length > 0) {
            importedSlots = validSlots;
            setTimeSlots(validSlots);
            await AsyncStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(validSlots));
            importedKeys.push('Franjas Horarias');
          }
        } else {
          errors.push('El campo de franjas horarias no tiene formato de lista.');
        }
      } catch (e: any) {
        errors.push(`Error al importar franjas horarias: ${e.message}`);
      }
    }

    // 2. Slot Separation
    if (STORAGE_KEY_SEPARATION in parsed) {
      try {
        const sepData = parsed[STORAGE_KEY_SEPARATION];
        const sepNum = Number(sepData);
        if (!isNaN(sepNum) && sepNum > 0) {
          importedSep = sepNum;
          setSlotSeparationMinutesState(sepNum);
          await AsyncStorage.setItem(STORAGE_KEY_SEPARATION, String(sepNum));
          importedKeys.push('Separación de Franjas');
        } else {
          errors.push('La separación de franjas debe ser un número válido.');
        }
      } catch (e: any) {
        errors.push(`Error al importar separación de franjas: ${e.message}`);
      }
    }

    // 3. Proximity Days
    try {
      const backupDays = parsed[PROXIMITY_DAYS_KEY] ?? parsed['proximity_days'];
      if (backupDays !== undefined) {
        const daysNum = Number(backupDays);
        if (!isNaN(daysNum) && daysNum >= 0) {
          await setProximityDays(daysNum);
          importedKeys.push('Días de Proximidad');
        } else {
          errors.push('Los días de proximidad deben ser un número válido.');
        }
      }
    } catch (e: any) {
      errors.push(`Error al importar días de proximidad: ${e.message}`);
    }

    // 4. Reminders
    if (STORAGE_KEY in parsed) {
      try {
        const remindersData = parsed[STORAGE_KEY];
        if (Array.isArray(remindersData)) {
          const validReminders: Reminder[] = [];
          remindersData.forEach((r, idx) => {
            if (r && typeof r === 'object' && r.id && r.text) {
              validReminders.push({
                id: String(r.id),
                text: String(r.text),
                date: r.date ? String(r.date) : '',
                time: r.time ? String(r.time) : '',
                completed: !!r.completed,
                alarmScheduled: !!r.alarmScheduled,
                createdAt: r.createdAt ? String(r.createdAt) : new Date().toISOString(),
                comments: Array.isArray(r.comments) ? r.comments.filter((c: any) => c && typeof c === 'object' && c.id && c.text) : [],
                pinned: !!r.pinned,
                timeSlotId: r.timeSlotId ? String(r.timeSlotId) : undefined,
                goalId: r.goalId ? String(r.goalId) : undefined,
                phaseId: r.phaseId ? String(r.phaseId) : undefined,
              });
            } else {
              errors.push(`Recordatorio en posición ${idx + 1} no es válido.`);
            }
          });
          if (validReminders.length > 0) {
            await saveReminders(validReminders, importedSlots, importedSep);
            importedKeys.push('Recordatorios');
          }
        } else {
          errors.push('El campo de recordatorios no tiene formato de lista.');
        }
      } catch (e: any) {
        errors.push(`Error al importar recordatorios: ${e.message}`);
      }
    }

    // 5. Goals
    if (STORAGE_KEY_GOALS in parsed) {
      try {
        const goalsData = parsed[STORAGE_KEY_GOALS];
        if (Array.isArray(goalsData)) {
          const validGoals: Goal[] = [];
          goalsData.forEach((g, idx) => {
            if (g && typeof g === 'object' && g.id && g.title && g.startDate && g.endDate && Array.isArray(g.phases)) {
              validGoals.push({
                id: String(g.id),
                title: String(g.title),
                description: g.description ? String(g.description) : '',
                startDate: String(g.startDate),
                endDate: String(g.endDate),
                createdAt: g.createdAt ? String(g.createdAt) : new Date().toISOString(),
                phases: g.phases.map((p: any) => ({
                  id: String(p.id),
                  name: String(p.name),
                  description: p.description ? String(p.description) : '',
                  order: typeof p.order === 'number' ? p.order : 0
                }))
              });
            } else {
              errors.push(`Objetivo en posición ${idx + 1} no es válido.`);
            }
          });
          if (validGoals.length > 0) {
            setGoals(validGoals);
            await AsyncStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(validGoals));
            importedKeys.push('Objetivos y Fases');
          }
        }
      } catch (e: any) {
        errors.push(`Error al importar objetivos: ${e.message}`);
      }
    }

    return {
      success: importedKeys.length > 0,
      errors,
      importedKeys,
    };
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

  // ── Goals & Roadmap CRUD ───────────────────────────────────────────────────

  const addGoal = useCallback(async (title: string, description: string, startDate: string, endDate: string) => {
    const newGoal: Goal = {
      id: `goal-${Math.random().toString(36).substring(7)}`,
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      phases: [],
      createdAt: new Date().toISOString(),
      completed: false,
    };
    const updated = [...goals, newGoal];
    setGoals(updated);
    await AsyncStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(updated));
  }, [goals]);

  const updateGoal = useCallback(async (id: string, title: string, description: string, startDate: string, endDate: string) => {
    const updated = goals.map((g) => {
      if (g.id === id) {
        return { ...g, title: title.trim(), description: description.trim(), startDate, endDate };
      }
      return g;
    });
    setGoals(updated);
    await AsyncStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(updated));
  }, [goals]);

  const deleteGoal = useCallback(async (id: string) => {
    const updated = goals.filter((g) => g.id !== id);
    setGoals(updated);
    await AsyncStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(updated));

    // Also clean up reminders pointing to this goal
    const updatedReminders = reminders.map((r) => {
      if (r.goalId === id) {
        return { ...r, goalId: undefined, phaseId: undefined };
      }
      return r;
    });
    await saveReminders(updatedReminders);
  }, [goals, reminders, saveReminders]);

  const toggleGoalCompleted = useCallback(async (id: string) => {
    const updated = goals.map((g) => {
      if (g.id === id) {
        return { ...g, completed: !g.completed };
      }
      return g;
    });
    setGoals(updated);
    await AsyncStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(updated));
  }, [goals]);

  const addPhase = useCallback(async (goalId: string, name: string, description: string) => {
    const updated = goals.map((g) => {
      if (g.id === goalId) {
        const newPhase: Phase = {
          id: `phase-${Math.random().toString(36).substring(7)}`,
          name: name.trim(),
          description: description.trim(),
          order: g.phases.length,
        };
        return { ...g, phases: [...g.phases, newPhase] };
      }
      return g;
    });
    setGoals(updated);
    await AsyncStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(updated));
  }, [goals]);

  const updatePhase = useCallback(async (goalId: string, phaseId: string, name: string, description: string) => {
    const updated = goals.map((g) => {
      if (g.id === goalId) {
        const updatedPhases = g.phases.map((p) => {
          if (p.id === phaseId) {
            return { ...p, name: name.trim(), description: description.trim() };
          }
          return p;
        });
        return { ...g, phases: updatedPhases };
      }
      return g;
    });
    setGoals(updated);
    await AsyncStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(updated));
  }, [goals]);

  const deletePhase = useCallback(async (goalId: string, phaseId: string) => {
    const updated = goals.map((g) => {
      if (g.id === goalId) {
        const filteredPhases = g.phases.filter((p) => p.id !== phaseId);
        const reordered = filteredPhases.map((p, idx) => ({ ...p, order: idx }));
        return { ...g, phases: reordered };
      }
      return g;
    });
    setGoals(updated);
    await AsyncStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(updated));

    // Also clean up reminders pointing to this phase
    const updatedReminders = reminders.map((r) => {
      if (r.phaseId === phaseId) {
        return { ...r, phaseId: undefined };
      }
      return r;
    });
    await saveReminders(updatedReminders);
  }, [goals, reminders, saveReminders]);

  const reorderPhases = useCallback(async (goalId: string, orderedPhases: Phase[]) => {
    const updated = goals.map((g) => {
      if (g.id === goalId) {
        const reordered = orderedPhases.map((p, idx) => ({ ...p, order: idx }));
        return { ...g, phases: reordered };
      }
      return g;
    });
    setGoals(updated);
    await AsyncStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(updated));
  }, [goals]);

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
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        toggleGoalCompleted,
        addPhase,
        updatePhase,
        deletePhase,
        reorderPhases,
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
