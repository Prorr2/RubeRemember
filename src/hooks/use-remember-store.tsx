import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';
import { NotificationService } from '@/services/notification-service';

import { Item, ItemType, Priority, Task, TaskState, Reminder as ReminderV2, Activity, ActivityCategory, ReminderTriggerType, CustomCategory, DEFAULT_ACTIVITY_CATEGORIES, HourWeight, DEFAULT_HOUR_WEIGHTS, Session, Recommendation, UserSettings, DEFAULT_USER_SETTINGS, Statistics, DEFAULT_STATISTICS, EnergyType, Memo, Plan, VoiceKeywords, DEFAULT_VOICE_KEYWORDS, TaskCategory, DEFAULT_TASK_CATEGORIES } from '@/models/Item';
import { Goal, Phase } from '@/models/Goal';
import { TimeSlot } from '@/models/TimeSlot';
import { ReminderList, ListItem } from '@/models/ReminderList';
import { Comment } from '@/models/Comment';
import { MigrationEngine, DatabaseV2, DatabaseV3 } from '@/services/migration-engine';
import { ActivityEngine } from '@/services/activity-engine';

export { Comment } from '@/models/Comment';
export { Goal, Phase } from '@/models/Goal';
export { TimeSlot } from '@/models/TimeSlot';
export { ReminderList, ListItem } from '@/models/ReminderList';
export { Item, ItemType, Priority, Task, TaskState, Reminder as ReminderV2, Activity, ActivityCategory, ReminderTriggerType, CustomCategory, DEFAULT_ACTIVITY_CATEGORIES, HourWeight, DEFAULT_HOUR_WEIGHTS, Session, Recommendation, UserSettings, DEFAULT_USER_SETTINGS, Statistics, DEFAULT_STATISTICS, EnergyType, Memo, Plan, VoiceKeywords, DEFAULT_VOICE_KEYWORDS, TaskCategory, DEFAULT_TASK_CATEGORIES } from '@/models/Item';




// Legacy Reminder interface for backward compatibility with existing views
export interface Reminder {
  id: string;
  text: string;
  date: string; // "YYYY-MM-DD"
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  dates?: string[];
  time: string; // "HH:MM"
  completed: boolean;
  alarmScheduled: boolean;
  createdAt: string;
  comments?: Comment[];
  pinned?: boolean;
  timeSlotId?: string;
  goalId?: string;
  phaseId?: string;
  estimatedHours?: number;
}

interface RememberStore {
  items: Item[];
  reminders: Reminder[]; // Legacy compatibility
  loading: boolean;

  // New Selectors
  getTasks: () => Task[];
  getReminders: () => ReminderV2[];
  getActivities: () => Activity[];
  getMemos: () => Memo[];
  getPlans: () => Plan[];
  getArchivedItems: () => Item[];
  getTrashItems: () => Item[];
  getTodayReminders: () => ReminderV2[];
  getSuggestedActivities: () => Activity[];

  // New Actions
  createTask: (
    title: string,
    description?: string,
    startDate?: string,
    dueDate?: string,
    estimatedHours?: number,
    priority?: Priority,
    goalId?: string,
    phaseId?: string,
    timeSlotId?: string,
    energyType?: EnergyType,
    images?: string[]
  ) => Promise<string>;
  createReminder: (
    title: string,
    description?: string,
    date?: string,
    time?: string,
    dates?: string[],
    autoArchive?: boolean
  ) => Promise<string>;
  createMemo: (
    title: string,
    description?: string,
    startDate?: string,
    endDate?: string,
    hasAlarm?: boolean,
    alarmTime?: string
  ) => Promise<string>;
  createActivity: (
    title: string,
    category: string,
    description?: string,
    tags?: string[],
    favourite?: boolean
  ) => Promise<string>;
  createPlan: (
    title: string,
    description?: string,
    startMonth?: number,
    startYear?: number,
    endMonth?: number,
    endYear?: number
  ) => Promise<string>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  updateItems: (ids: string[], updates: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  restoreItem: (id: string) => Promise<void>;
  archiveItem: (id: string) => Promise<void>;
  unarchiveItem: (id: string) => Promise<void>;
  toggleItemCompleted: (id: string) => Promise<void>;
  registerActivityDone: (id: string) => Promise<void>;
  convertItem: (id: string, targetType: ItemType) => Promise<void>;
  emptyTrash: () => Promise<void>;
  deleteItemPermanently: (id: string) => Promise<void>;


  // Legacy CRUD Actions (Wrappers for compatibility)
  addReminder: (
    text: string,
    dateStr: string,
    timeStr: string,
    timeSlotId?: string,
    goalId?: string,
    phaseId?: string,
    dates?: string[],
    estimatedHours?: number
  ) => Promise<void>;
  updateReminder: (
    id: string,
    text: string,
    dateStr: string,
    timeStr: string,
    timeSlotId?: string,
    goalId?: string,
    phaseId?: string,
    dates?: string[],
    estimatedHours?: number
  ) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  deleteCompleted: () => Promise<void>;
  toggleReminderCompleted: (id: string) => Promise<void>;
  toggleReminderPinned: (id: string) => Promise<void>;

  // Other legacy functions
  scheduleSystemAlarm: (reminder: any) => Promise<void>;
  scheduleAllAlarms: () => Promise<void>;
  scheduleTodayMemosAlarms: () => Promise<void>;
  clearAll: () => Promise<void>;
  addComment: (taskId: string, text: string, images?: string[]) => Promise<void>;
  updateComment: (taskId: string, commentId: string, text: string) => Promise<void>;
  deleteComment: (taskId: string, commentId: string) => Promise<void>;
  exportBackupData: () => Promise<string>;
  importBackupData: (jsonString: string) => Promise<{
    success: boolean;
    errors: string[];
    importedKeys: string[];
  }>;
  proximityDays: number;
  setProximityDays: (days: number) => Promise<void>;
  timeSlots: TimeSlot[];
  slotSeparationMinutes: number;
  addTimeSlot: (name: string, startTime: string, endTime: string) => Promise<void>;
  updateTimeSlot: (id: string, name: string, startTime: string, endTime: string) => Promise<void>;
  deleteTimeSlot: (id: string) => Promise<void>;
  setSlotSeparationMinutes: (minutes: number) => Promise<void>;

  // Goals
  goals: Goal[];
  addGoal: (title: string, description: string, startDate: string, endDate: string, emoji?: string) => Promise<void>;
  updateGoal: (id: string, title: string, description: string, startDate: string, endDate: string, emoji?: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  toggleGoalCompleted: (id: string) => Promise<void>;
  toggleGoalMain: (id: string) => Promise<void>;
  addPhase: (goalId: string, name: string, description: string) => Promise<void>;
  updatePhase: (goalId: string, phaseId: string, name: string, description: string) => Promise<void>;
  deletePhase: (goalId: string, phaseId: string) => Promise<void>;
  reorderPhases: (goalId: string, phases: Phase[]) => Promise<void>;

  // Lists
  lists: ReminderList[];
  addList: (name: string, parentId?: string) => Promise<string>;
  updateList: (id: string, name: string) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  toggleListCollapse: (id: string) => Promise<void>;
  addListItem: (listId: string, text: string, imageUri?: string, images?: string[], title?: string) => Promise<string>;
  updateListItem: (listId: string, itemId: string, text: string, imageUri?: string, images?: string[], title?: string) => Promise<void>;
  deleteListItem: (listId: string, itemId: string) => Promise<void>;
  toggleListItemCompleted: (listId: string, itemId: string) => Promise<void>;
  setListAlarm: (listId: string, time: string | null) => Promise<void>;
  setListItemAlarm: (listId: string, itemId: string, time: string | null) => Promise<void>;

  // Activity Categories
  activityCategories: CustomCategory[];
  addActivityCategory: (name: string) => Promise<void>;
  updateActivityCategory: (id: string, name: string) => Promise<void>;
  deleteActivityCategory: (id: string) => Promise<void>;

  // Task Categories
  taskCategories: TaskCategory[];
  addTaskCategory: (name: string, emoji: string) => Promise<void>;
  updateTaskCategory: (id: string, name: string, emoji: string) => Promise<void>;
  deleteTaskCategory: (id: string) => Promise<void>;

  // Hour Weights configuration
  hourWeights: HourWeight[];
  addHourWeight: (name: string, minHours: number) => Promise<void>;
  updateHourWeight: (id: string, name: string, minHours: number) => Promise<void>;
  deleteHourWeight: (id: string) => Promise<void>;

  // Cognitive Engine V3 fields & actions
  sessions: Session[];
  recommendations: Recommendation[];
  userSettings: UserSettings;
  statistics: Statistics;
  createSession: (taskId: string, plannedDuration: number, notes?: string, title?: string, notesImages?: string[]) => Promise<string>;
  updateSession: (id: string, updates: Partial<Session>) => Promise<void>;
  endSession: (
    sessionId: string,
    realDuration: number,
    completed: boolean,
    notes?: string,
    taskUpdates?: Partial<Task> & { notesImages?: string[]; nextStepImages?: string[] }
  ) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  updateUserSettings: (updates: Partial<UserSettings>) => Promise<void>;
  updateStatistics: (updates: Partial<Statistics>) => Promise<void>;
  saveRecommendations: (recs: Recommendation[]) => Promise<void>;
}

const V2_DB_KEY = 'rube_v2_database';


export const getLocalDateStr = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

function getDatesBetween(startStr: string, endStr: string): string[] {
  if (!startStr || !endStr) return [];
  const dates = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

export const getReminderActiveDate = (r: Reminder): string => {
  if (r.endDate) {
    return r.endDate;
  }
  if (r.dates && r.dates.length > 0) {
    const sortedDates = [...r.dates].sort();
    return sortedDates[sortedDates.length - 1];
  }
  return r.date || '';
};

// Helper: recalculates times for all tasks assigned to time slots
function recalculateTaskSlotTimes(
  items: Item[],
  slots: TimeSlot[],
  separation: number
): Item[] {
  const tasks = items.filter((item) => item.type === ItemType.TASK && !item.trash) as Task[];

  const getTaskActiveDate = (t: Task) => t.startDate || t.dueDate || '';

  const groupedByDate: Record<string, Task[]> = {};
  tasks.forEach((task) => {
    const activeDate = getTaskActiveDate(task);
    if (!activeDate) return;
    if (!groupedByDate[activeDate]) {
      groupedByDate[activeDate] = [];
    }
    groupedByDate[activeDate].push(task);
  });

  return items.map((item) => {
    if (item.type !== ItemType.TASK) return item;
    const task = item as Task;
    if (!task.timeSlotId) return task;

    const slot = slots.find((s) => s.id === task.timeSlotId);
    if (!slot) {
      return { ...task, timeSlotId: undefined };
    }

    const activeDate = getTaskActiveDate(task);
    if (!activeDate) return task;

    const dayTasks = (groupedByDate[activeDate] || [])
      .filter((t) => t.timeSlotId === task.timeSlotId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const index = dayTasks.findIndex((t) => t.id === task.id);
    if (index === -1) return task;

    const [startH, startM] = slot.startTime.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const computedTotal = startTotal + index * separation;
    const computedH = Math.floor(computedTotal / 60) % 24;
    const computedM = computedTotal % 60;

    const formattedTime = `${String(computedH).padStart(2, '0')}:${String(computedM).padStart(2, '0')}`;
    return { ...task, time: formattedTime };
  });
}

// Map from Item to legacy Reminder
export function mapItemToLegacyReminder(item: Item, slots: TimeSlot[] = []): Reminder {
  if (item.type === ItemType.TASK) {
    const task = item as Task;
    let timeStr = task.time || '12:00';
    if (task.timeSlotId && !task.time) {
      const slot = slots.find((s) => s.id === task.timeSlotId);
      if (slot) {
        timeStr = slot.startTime;
      }
    }
    return {
      id: task.id,
      text: task.title,
      date: task.startDate || task.dueDate || '',
      startDate: task.startDate,
      endDate: task.dueDate,
      dates: task.startDate && task.dueDate ? getDatesBetween(task.startDate, task.dueDate) : (task.startDate ? [task.startDate] : []),
      time: timeStr,
      completed: task.completed,
      alarmScheduled: false,
      createdAt: task.createdAt,
      comments: task.comments || [],
      pinned: task.favourite,
      timeSlotId: task.timeSlotId,
      goalId: task.goalId,
      phaseId: task.phaseId,
      estimatedHours: task.estimatedHours,
    };
  } else if (item.type === ItemType.REMINDER) {
    const rem = item as ReminderV2;
    return {
      id: rem.id,
      text: rem.title,
      date: rem.remindAt.date || '',
      dates: rem.remindAt.dates || (rem.remindAt.date ? [rem.remindAt.date] : []),
      time: rem.remindAt.time || '12:00',
      completed: rem.completed,
      alarmScheduled: true,
      createdAt: rem.createdAt,
      pinned: rem.favourite,
      comments: [],
    };
  } else {
    const act = item as Activity;
    return {
      id: act.id,
      text: act.title,
      date: '',
      dates: [],
      time: '',
      completed: false,
      alarmScheduled: false,
      createdAt: act.createdAt,
      pinned: act.favourite,
      comments: [],
    };
  }
}

function generateICSStringForReminderFields(id: string, text: string, dates: string[], time: string): string {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rube Remember//Calendar Event//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
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

  dates.forEach((dStr, idx) => {
    if (!dStr) return;
    const startStr = toICSTimestamp(dStr, time);
    const [y, m, d] = dStr.split('-').map(Number);
    const [h, min] = time.split(':').map(Number);
    const endDate = new Date(y, m - 1, d, h, min + 30);
    const endStr = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;

    ics.push('BEGIN:VEVENT');
    ics.push(`UID:reminder-${id}-${idx}@ruberemember.app`);
    ics.push(`DTSTAMP:${nowStr()}`);
    ics.push(`DTSTART:${startStr}`);
    ics.push(`DTEND:${endStr}`);
    ics.push(`SUMMARY:${text}`);
    ics.push('DESCRIPTION:Recordatorio programado desde la app Rube Remember');
    ics.push('END:VEVENT');
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

const RememberStoreContext = createContext<RememberStore | undefined>(undefined);

export function RememberStoreProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [proximityDays, setProximityDaysState] = useState<number>(20);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [slotSeparationMinutes, setSlotSeparationMinutesState] = useState<number>(30);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [lists, setLists] = useState<ReminderList[]>([]);
  const [activityCategories, setActivityCategories] = useState<CustomCategory[]>(DEFAULT_ACTIVITY_CATEGORIES);
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>(DEFAULT_TASK_CATEGORIES);
  const [hourWeights, setHourWeights] = useState<HourWeight[]>(DEFAULT_HOUR_WEIGHTS);
  
  // Cognitive Engine V3 States
  const [sessions, setSessions] = useState<Session[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [statistics, setStatistics] = useState<Statistics>(DEFAULT_STATISTICS);
  
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize notifications handler
  useEffect(() => {
    NotificationService.initialize();
  }, []);

  // Load and migrate database
  useEffect(() => {
    async function loadData() {
      try {
        const db: DatabaseV3 = await MigrationEngine.getDatabase();
        setItems(db.items || []);
        setGoals(db.goals || []);
        setLists(db.lists || []);
        setTimeSlots(db.timeSlots || []);
        setProximityDaysState(db.settings?.proximityDays ?? 20);
        setSlotSeparationMinutesState(db.settings?.slotSeparationMinutes ?? 30);
        
        if (db.activityCategories && db.activityCategories.length > 0) {
          setActivityCategories(db.activityCategories);
        } else {
          setActivityCategories(DEFAULT_ACTIVITY_CATEGORIES);
        }

        if (db.taskCategories && db.taskCategories.length > 0) {
          setTaskCategories(db.taskCategories);
        } else {
          setTaskCategories(DEFAULT_TASK_CATEGORIES);
        }

        if (db.hourWeights && db.hourWeights.length > 0) {
          setHourWeights(db.hourWeights);
        } else {
          setHourWeights(DEFAULT_HOUR_WEIGHTS);
        }

        setSessions(db.sessions || []);
        setRecommendations(db.recommendations || []);
        setUserSettings(db.userSettings || DEFAULT_USER_SETTINGS);
        setStatistics(db.statistics || DEFAULT_STATISTICS);
      } catch (e) {
        console.error('Error loading database in store:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const saveTimeoutRef = useRef<any>(null);

  // General V3 Database Persist Helper
  const saveDatabaseState = useCallback(async (
    newItems = items,
    newGoals = goals,
    newLists = lists,
    newSlots = timeSlots,
    newSessions = sessions,
    newRecs = recommendations,
    newSettings = userSettings,
    newStats = statistics,
    currentProximity = proximityDays,
    currentSeparation = slotSeparationMinutes,
    immediate = false
  ) => {
    try {
      const itemsOrSlotsChanged =
        newItems !== items || newSlots !== timeSlots || currentSeparation !== slotSeparationMinutes;

      const adjusted = itemsOrSlotsChanged
        ? recalculateTaskSlotTimes(newItems, newSlots, currentSeparation)
        : newItems;

      const settingsToSave: UserSettings = {
        ...newSettings,
        hasLocalChanges: true,
      };

      if (adjusted !== items) setItems(adjusted);
      if (newGoals !== goals) setGoals(newGoals);
      if (newLists !== lists) setLists(newLists);
      if (newSlots !== timeSlots) setTimeSlots(newSlots);
      if (newSessions !== sessions) setSessions(newSessions);
      if (newRecs !== recommendations) setRecommendations(newRecs);
      if (settingsToSave !== userSettings) setUserSettings(settingsToSave);
      if (newStats !== statistics) setStatistics(newStats);

      const db: DatabaseV3 = {
        version: 3,
        items: adjusted,
        goals: newGoals,
        lists: newLists,
        timeSlots: newSlots,
        sessions: newSessions,
        recommendations: newRecs,
        userSettings: settingsToSave,
        statistics: newStats,
        settings: {
          proximityDays: currentProximity,
          slotSeparationMinutes: currentSeparation,
        },
      };

      const executeSave = () => {
        MigrationEngine.saveDatabase(db).catch((e) =>
          console.error('Error saving database state:', e)
        );
      };

      if (immediate) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        await MigrationEngine.saveDatabase(db);
      } else {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(executeSave, 300);
      }
    } catch (e) {
      console.error('Error saving database state:', e);
    }
  }, [items, goals, lists, timeSlots, sessions, recommendations, userSettings, statistics, proximityDays, slotSeparationMinutes]);

  // Persist helper for tasks/reminders/activities
  const saveItems = useCallback(async (
    newItems: Item[],
    currentSlots = timeSlots,
    currentSeparation = slotSeparationMinutes
  ) => {
    await saveDatabaseState(
      newItems,
      goals,
      lists,
      currentSlots,
      sessions,
      recommendations,
      userSettings,
      statistics,
      proximityDays,
      currentSeparation
    );
  }, [saveDatabaseState, goals, lists, sessions, recommendations, userSettings, statistics, proximityDays, timeSlots, slotSeparationMinutes]);

  // Sync calendar and alarms wrapper
  const syncCalendarAndAlarms = useCallback(async (item: Item, isDelete: boolean = false) => {
    try {
      let reminderText = '';
      let reminderId = '';
      let datesToSchedule: string[] = [];
      let timeStr = '12:00';
      let isCompleted = false;

      if (item.type === ItemType.REMINDER) {
        const rem = item as ReminderV2;
        reminderText = rem.title;
        reminderId = rem.id;
        datesToSchedule = rem.remindAt.dates || (rem.remindAt.date ? [rem.remindAt.date] : []);
        timeStr = rem.remindAt.time || '12:00';
        isCompleted = rem.completed;
      } else if (item.type === ItemType.MEMO) {
        const memo = item as Memo;
        if (!memo.hasAlarm) {
          await NotificationService.cancelNotification(memo.id, []);
          return;
        }
        reminderText = memo.title;
        reminderId = memo.id;
        datesToSchedule = [memo.startDate || getLocalDateStr(new Date())];
        timeStr = memo.alarmTime || '12:00';
        isCompleted = memo.completed;
      } else {
        return; // Tasks, Activities, Plans and other types do not trigger push alerts
      }

      await NotificationService.cancelNotification(reminderId, datesToSchedule);

      if (isDelete || isCompleted) {
        return;
      }

      await NotificationService.scheduleNotification(reminderId, reminderText, datesToSchedule, timeStr);

      // Open Android/iOS native calendar
      if (datesToSchedule.length > 0 && (Platform.OS === 'android' || Platform.OS === 'ios')) {
        const icsString = generateICSStringForReminderFields(reminderId, reminderText, datesToSchedule, timeStr);
        const FileSystem = require('expo-file-system/legacy');
        const fileUri = FileSystem.cacheDirectory + 'rube_remember_reminder_events.ics';
        await FileSystem.writeAsStringAsync(fileUri, icsString, { encoding: 'utf8' });

        if (Platform.OS === 'android') {
          try {
            const IntentLauncher = require('expo-intent-launcher');
            const contentUri = await FileSystem.getContentUriAsync(fileUri);
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
              data: contentUri,
              type: 'text/calendar',
              flags: 1,
            });
          } catch (intentErr) {
            const Sharing = require('expo-sharing');
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri);
            }
          }
        } else {
          const Sharing = require('expo-sharing');
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri);
          }
        }
      }
    } catch (e) {
      console.warn('syncCalendarAndAlarms error:', e);
    }
  }, []);

  // ── New Selectors ──────────────────────────────────────────────────────────

  const getTasks = useCallback(() => {
    return items.filter((i) => i.type === ItemType.TASK && !i.archived && !i.trash) as Task[];
  }, [items]);

  const getReminders = useCallback(() => {
    return items.filter((i) => i.type === ItemType.REMINDER && !i.archived && !i.trash) as ReminderV2[];
  }, [items]);

  const getActivities = useCallback(() => {
    return items.filter((i) => i.type === ItemType.ACTIVITY && !i.archived && !i.trash) as Activity[];
  }, [items]);

  const getMemos = useCallback(() => {
    return items.filter((i) => i.type === ItemType.MEMO && !i.archived && !i.trash) as Memo[];
  }, [items]);

  const getPlans = useCallback(() => {
    return items.filter((i) => i.type === ItemType.PLAN && !i.archived && !i.trash) as Plan[];
  }, [items]);

  const getArchivedItems = useCallback(() => {
    return items.filter((i) => i.archived && !i.trash);
  }, [items]);

  const getTrashItems = useCallback(() => {
    return items.filter((i) => i.trash);
  }, [items]);

  const getTodayReminders = useCallback(() => {
    const todayStr = getLocalDateStr();
    const reminders = getReminders();
    return reminders.filter((r) => {
      if (r.remindAt.dates && r.remindAt.dates.length > 0) {
        return r.remindAt.dates.includes(todayStr);
      }
      return r.remindAt.date === todayStr;
    });
  }, [getReminders]);

  const getSuggestedActivities = useCallback(() => {
    const list = getActivities();
    return ActivityEngine.suggestActivities(list);
  }, [getActivities]);

  // Dynamic mapped legacy reminders array for compatibility
  const reminders = React.useMemo(() => {
    return items
      .filter((i) => !i.trash && !i.archived)
      .map((i) => mapItemToLegacyReminder(i, timeSlots));
  }, [items, timeSlots]);

  // ── New CRUD Actions ────────────────────────────────────────────────────────

  const createTask = useCallback(async (
    title: string,
    description = '',
    startDate?: string,
    dueDate?: string,
    estimatedHours?: number,
    priority = Priority.MEDIUM,
    goalId?: string,
    phaseId?: string,
    timeSlotId?: string,
    energyType?: EnergyType,
    images?: string[],
    categoryId?: string
  ) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return '';

    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      type: ItemType.TASK,
      title: cleanTitle,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      favourite: false,
      tags: [],
      trash: false,
      completed: false,
      startDate,
      dueDate,
      estimatedHours,
      priority,
      goalId,
      phaseId,
      categoryId,
      timeSlotId,
      energyType: energyType || EnergyType.CREATIVE,
      comments: [],
      images,
    };

    await saveItems([...items, newTask]);
    return newTask.id;
  }, [items, saveItems]);

  const createReminder = useCallback(async (
    title: string,
    description = '',
    date?: string,
    time?: string,
    dates?: string[],
    autoArchive = false
  ) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return '';

    const newReminder: ReminderV2 = {
      id: Math.random().toString(36).substring(7),
      type: ItemType.REMINDER,
      title: cleanTitle,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      favourite: false,
      tags: [],
      trash: false,
      completed: false,
      autoArchive,
      remindAt: {
        type: time ? ReminderTriggerType.DATE_TIME : ReminderTriggerType.DATE,
        date,
        time,
        dates: dates || (date ? [date] : []),
      },
    };

    await saveItems([...items, newReminder]);
    await syncCalendarAndAlarms(newReminder);
    return newReminder.id;
  }, [items, saveItems, syncCalendarAndAlarms]);

  const createMemo = useCallback(async (
    title: string,
    description = '',
    startDate?: string,
    endDate?: string,
    hasAlarm = false,
    alarmTime = '12:00'
  ) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return '';

    const newMemo: Memo = {
      id: Math.random().toString(36).substring(7),
      type: ItemType.MEMO,
      title: cleanTitle,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      favourite: false,
      tags: [],
      trash: false,
      startDate,
      endDate,
      hasAlarm,
      alarmTime,
      completed: false,
    };

    await saveItems([...items, newMemo]);
    await syncCalendarAndAlarms(newMemo);
    return newMemo.id;
  }, [items, saveItems, syncCalendarAndAlarms]);

  const createActivity = useCallback(async (
    title: string,
    category: string,
    description = '',
    tags: string[] = [],
    favourite = false
  ) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return '';

    const newActivity: Activity = {
      id: Math.random().toString(36).substring(7),
      type: ItemType.ACTIVITY,
      title: cleanTitle,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      favourite,
      tags,
      trash: false,
      category,
      suggestedCount: 0,
      doneCount: 0,
    };

    await saveItems([...items, newActivity]);
    return newActivity.id;
  }, [items, saveItems]);

  const createPlan = useCallback(async (
    title: string,
    description = '',
    startMonth?: number,
    startYear?: number,
    endMonth?: number,
    endYear?: number
  ) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return '';

    const newPlan: Plan = {
      id: Math.random().toString(36).substring(7),
      type: ItemType.PLAN,
      title: cleanTitle,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      favourite: false,
      tags: [],
      trash: false,
      startMonth,
      startYear,
      endMonth,
      endYear,
      completed: false,
    };

    await saveItems([...items, newPlan]);
    return newPlan.id;
  }, [items, saveItems]);

  const updateItem = useCallback(async (id: string, updates: Partial<Item>) => {
    const updated = items.map((i) => {
      if (i.id === id) {
        const merged = {
          ...i,
          ...updates,
          updatedAt: new Date().toISOString(),
        } as Item;
        return merged;
      }
      return i;
    });

    await saveItems(updated);

    // If updated item is a reminder or memo, reschedule alerts
    const found = updated.find((i) => i.id === id);
    if (found && (found.type === ItemType.REMINDER || found.type === ItemType.MEMO)) {
      await syncCalendarAndAlarms(found);
    }
  }, [items, saveItems, syncCalendarAndAlarms]);

  const updateItems = useCallback(async (ids: string[], updates: Partial<Item>) => {
    const updated = items.map((i) => {
      if (ids.includes(i.id)) {
        return {
          ...i,
          ...updates,
          updatedAt: new Date().toISOString(),
        } as Item;
      }
      return i;
    });

    await saveItems(updated);

    // If any updated item is a reminder, reschedule alerts
    for (const id of ids) {
      const found = updated.find((i) => i.id === id);
      if (found && (found.type === ItemType.REMINDER || found.type === ItemType.MEMO)) {
        await syncCalendarAndAlarms(found);
      }
    }
  }, [items, saveItems, syncCalendarAndAlarms]);

  const deleteItem = useCallback(async (id: string) => {
    // Moves to trash (recycle bin)
    await updateItem(id, {
      trash: true,
      deletedAt: new Date().toISOString(),
    });
    
    // Cancel alarms if it was a reminder or memo
    const found = items.find((i) => i.id === id);
    if (found && (found.type === ItemType.REMINDER || found.type === ItemType.MEMO)) {
      await syncCalendarAndAlarms(found, true);
    }
  }, [items, updateItem, syncCalendarAndAlarms]);

  const restoreItem = useCallback(async (id: string) => {
    await updateItem(id, {
      trash: false,
      deletedAt: undefined,
    });
  }, [updateItem]);

  const archiveItem = useCallback(async (id: string) => {
    await updateItem(id, { archived: true });
  }, [updateItem]);

  const unarchiveItem = useCallback(async (id: string) => {
    await updateItem(id, { archived: false });
  }, [updateItem]);

  const toggleItemCompleted = useCallback(async (id: string) => {
    const found = items.find((i) => i.id === id);
    if (!found) return;

    let nextCompleted = false;
    if (found.type === ItemType.TASK) {
      nextCompleted = !(found as Task).completed;
    } else if (found.type === ItemType.REMINDER) {
      nextCompleted = !(found as ReminderV2).completed;
    } else if (found.type === ItemType.MEMO) {
      nextCompleted = !(found as Memo).completed;
    } else {
      return; // Activities can't be "completed", only registered as "done"
    }

    await updateItem(id, { completed: nextCompleted });
  }, [items, updateItem]);

  const registerActivityDone = useCallback(async (id: string) => {
    const found = items.find((i) => i.id === id);
    if (!found || found.type !== ItemType.ACTIVITY) return;

    const act = found as Activity;
    await updateItem(id, {
      doneCount: (act.doneCount || 0) + 1,
      lastDoneAt: new Date().toISOString(),
    });
  }, [items, updateItem]);

  const convertItem = useCallback(async (id: string, targetType: ItemType) => {
    const found = items.find((i) => i.id === id);
    if (!found || found.type === targetType) return;

    let converted: Item;

    const common = {
      id: found.id,
      title: found.title,
      description: found.description,
      createdAt: found.createdAt,
      updatedAt: new Date().toISOString(),
      archived: found.archived,
      favourite: found.favourite,
      tags: found.tags,
      trash: found.trash,
      deletedAt: found.deletedAt,
    };

    if (targetType === ItemType.TASK) {
      converted = {
        ...common,
        type: ItemType.TASK,
        completed: false,
        priority: Priority.MEDIUM,
        comments: [],
      } as Task;
    } else if (targetType === ItemType.MEMO) {
      converted = {
        ...common,
        type: ItemType.MEMO,
        completed: false,
        hasAlarm: false,
        startDate: getLocalDateStr(),
        endDate: getLocalDateStr(),
      } as Memo;
    } else {
      converted = {
        ...common,
        type: ItemType.ACTIVITY,
        category: 'OTHER',
        suggestedCount: 0,
        doneCount: 0,
      } as Activity;
    }

    const updated = items.map((i) => (i.id === id ? converted : i));
    await saveItems(updated);

    // Cancel old reminder alarm if we converted AWAY from reminder or memo
    if (found.type === ItemType.REMINDER || found.type === ItemType.MEMO) {
      await syncCalendarAndAlarms(found, true);
    }
    // Schedule new reminder alarm if we converted TO reminder or memo
    if (targetType === ItemType.REMINDER || targetType === ItemType.MEMO) {
      await syncCalendarAndAlarms(converted);
    }
  }, [items, saveItems, syncCalendarAndAlarms]);

  const emptyTrash = useCallback(async () => {
    const updated = items.filter((i) => !i.trash);
    await saveItems(updated);
  }, [items, saveItems]);

  const deleteItemPermanently = useCallback(async (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    await saveItems(updated);
  }, [items, saveItems]);


  // ── Legacy CRUD Wrappers (for compatibility) ────────────────────────────────

  const addReminder = useCallback(async (
    text: string,
    dateStr: string,
    timeStr: string,
    timeSlotId?: string,
    goalId?: string,
    phaseId?: string,
    dates?: string[],
    estimatedHours?: number
  ) => {
    // Map to a Task because goals, phases, and estimated hours are Task properties in v2
    const cleanTitle = text.trim();
    if (!cleanTitle) return;

    const finalDates = dates || (dateStr ? [dateStr] : []);
    const startDate = finalDates[0];
    const dueDate = finalDates[finalDates.length - 1];

    await createTask(
      cleanTitle,
      '',
      startDate,
      dueDate,
      estimatedHours,
      Priority.MEDIUM,
      goalId,
      phaseId,
      timeSlotId
    );
  }, [createTask]);

  const updateReminder = useCallback(async (
    id: string,
    text: string,
    dateStr: string,
    timeStr: string,
    timeSlotId?: string,
    goalId?: string,
    phaseId?: string,
    dates?: string[],
    estimatedHours?: number
  ) => {
    const finalDates = dates || (dateStr ? [dateStr] : []);
    const startDate = finalDates[0];
    const dueDate = finalDates[finalDates.length - 1];

    await updateItem(id, {
      title: text,
      startDate,
      dueDate,
      estimatedHours,
      goalId,
      phaseId,
      timeSlotId,
      time: timeStr,
    } as Partial<Task>);
  }, [updateItem]);

  const deleteReminder = useCallback(async (id: string) => {
    await deleteItem(id);
  }, [deleteItem]);

  const deleteCompleted = useCallback(async () => {
    // In legacy, deleteCompleted permanently deletes. Let's send them to trash instead!
    const completedTasks = items.filter((i) => i.type === ItemType.TASK && (i as Task).completed && !i.trash);
    const completedReminders = items.filter((i) => (i.type === ItemType.REMINDER || i.type === ItemType.MEMO) && (i as any).completed && !i.trash);
    
    const idsToTrash = [...completedTasks, ...completedReminders].map((i) => i.id);

    const updated = items.map((i) => {
      if (idsToTrash.includes(i.id)) {
        return {
          ...i,
          trash: true,
          deletedAt: new Date().toISOString(),
        };
      }
      return i;
    });

    await saveItems(updated);
  }, [items, saveItems]);

  const toggleReminderCompleted = useCallback(async (id: string) => {
    await toggleItemCompleted(id);
  }, [toggleItemCompleted]);

  const toggleReminderPinned = useCallback(async (id: string) => {
    const found = items.find((i) => i.id === id);
    if (!found) return;
    await updateItem(id, { favourite: !found.favourite });
  }, [items, updateItem]);

  // Alarms
  const scheduleSystemAlarm = useCallback(async (reminder: any) => {
    // Map legacy reminder input to ReminderV2 if needed, then sync
    if (!reminder.type) {
      const mapped: ReminderV2 = {
        id: reminder.id,
        type: ItemType.REMINDER,
        title: reminder.text,
        description: '',
        createdAt: reminder.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archived: false,
        favourite: !!reminder.pinned,
        tags: [],
        trash: false,
        completed: !!reminder.completed,
        autoArchive: true,
        remindAt: {
          type: ReminderTriggerType.DATE_TIME,
          date: reminder.date,
          time: reminder.time,
          dates: reminder.dates || [reminder.date],
        },
      };
      await syncCalendarAndAlarms(mapped);
    } else {
      await syncCalendarAndAlarms(reminder);
    }
  }, [syncCalendarAndAlarms]);

  const scheduleAllAlarms = useCallback(async () => {
    if (Platform.OS === 'web') return;
    
    const remindersToSync = getReminders();
    for (const r of remindersToSync) {
      await syncCalendarAndAlarms(r);
    }
    Alert.alert('Éxito', 'Se sincronizaron todos los recordatorios futuros.');
  }, [getReminders, syncCalendarAndAlarms]);

  const scheduleTodayMemosAlarms = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('No soportado', 'La programación de alarmas del sistema no está soportada en la web.');
      return;
    }
    const todayStr = getLocalDateStr(new Date());
    const memos = getMemos().filter(memo => {
      if (memo.completed || memo.trash || memo.archived) return false;
      if (!memo.hasAlarm) return false;
      
      const start = memo.startDate || '';
      const end = memo.endDate || '';
      const effectiveEnd = end ? end : (start ? start : '');
      
      if (start && effectiveEnd) {
        return todayStr >= start && todayStr <= effectiveEnd;
      }
      if (effectiveEnd) {
        return todayStr <= effectiveEnd;
      }
      return true;
    });

    if (memos.length === 0) {
      Alert.alert('Programar Recordatorios', 'No hay recordatorios de acción programados para hoy.');
      return;
    }

    let scheduledCount = 0;
    let pastCount = 0;
    let errorMessages: string[] = [];

    for (const memo of memos) {
      const timeStr = memo.alarmTime || '12:00';
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      const now = new Date();
      const alarmDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
      const isPast = alarmDate.getTime() <= now.getTime();

      if (isPast) {
        pastCount++;
        continue;
      }

      if (Platform.OS === 'android') {
        try {
          const IntentLauncher = require('expo-intent-launcher');
          await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
            extra: {
              'android.intent.extra.alarm.HOUR': hours,
              'android.intent.extra.alarm.MINUTES': minutes,
              'android.intent.extra.alarm.MESSAGE': memo.title,
              'android.intent.extra.alarm.SKIP_UI': true,
            },
          });
          scheduledCount++;
        } catch (err: any) {
          console.warn('Failed to start system alarm intent:', err);
          errorMessages.push(`${memo.title}: ${err?.message || String(err)}`);
        }
      } else {
        errorMessages.push(`${memo.title}: Las alarmas del sistema solo están soportadas en Android.`);
      }
    }

    let resultMsg = `Se han programado ${scheduledCount} alarma(s) del sistema.`;
    if (pastCount > 0) {
      resultMsg += `\n\n⚠️ ${pastCount} recordatorio(s) tienen una hora que ya ha pasado hoy, por lo que no se programaron.`;
    }
    if (errorMessages.length > 0) {
      resultMsg += `\n\n❌ Detalles de errores:\n${errorMessages.join('\n')}`;
    }
    Alert.alert('Programación de Alarmas', resultMsg);
  }, [getMemos]);

  const clearAll = useCallback(async () => {
    await saveDatabaseState([], [], [], [], [], [], DEFAULT_USER_SETTINGS, DEFAULT_STATISTICS);
    setLists([]);
    await AsyncStorage.setItem(V2_DB_KEY, ''); // Empty storage key
    await AsyncStorage.setItem('rube_v3_database', '');
    await NotificationService.cancelAll();
  }, [saveDatabaseState]);

  // Comments logic (for Tasks)
  const addComment = useCallback(async (taskId: string, text: string, images?: string[]) => {
    if (!text.trim() && (!images || images.length === 0)) return;
    const newComment: Comment = {
      id: Math.random().toString(36).substring(7),
      text: text.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      images,
    };

    const task = items.find((i) => i.id === taskId);
    if (!task || task.type !== ItemType.TASK) return;

    const t = task as Task;
    await updateItem(taskId, {
      comments: [...(t.comments || []), newComment],
    });
  }, [items, updateItem]);

  const updateComment = useCallback(async (taskId: string, commentId: string, text: string) => {
    if (!text.trim()) return;
    const task = items.find((i) => i.id === taskId);
    if (!task || task.type !== ItemType.TASK) return;

    const t = task as Task;
    const updatedComments = (t.comments || []).map((c) => {
      if (c.id === commentId) {
        return { ...c, text: text.trim() };
      }
      return c;
    });

    await updateItem(taskId, { comments: updatedComments });
  }, [items, updateItem]);

  const deleteComment = useCallback(async (taskId: string, commentId: string) => {
    const task = items.find((i) => i.id === taskId);
    if (!task || task.type !== ItemType.TASK) return;

    const t = task as Task;
    const filteredComments = (t.comments || []).filter((c) => c.id !== commentId);

    await updateItem(taskId, { comments: filteredComments });
  }, [items, updateItem]);

  // Backup and Restore
  const exportBackupData = useCallback(async (): Promise<string> => {
    // Sanitize userSettings for backup export (never include sensitive tokens, refresh tokens, app keys/secrets, or timestamps)
    const sanitizedUserSettings = {
      ...userSettings,
      dropboxAccessToken: '',
      dropboxRefreshToken: '',
      dropboxAppKey: '',
      dropboxAppSecret: '',
      dropboxTokenFetchedTimestamp: 0,
    };

    const db: DatabaseV3 = {
      version: 3,
      items,
      goals,
      lists,
      timeSlots,
      activityCategories,
      hourWeights,
      sessions,
      recommendations,
      userSettings: sanitizedUserSettings,
      statistics,
      settings: {
        proximityDays,
        slotSeparationMinutes,
      },
    };
    return JSON.stringify(db, null, 2);
  }, [items, goals, lists, timeSlots, proximityDays, slotSeparationMinutes, activityCategories, hourWeights, sessions, recommendations, userSettings, statistics]);

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

    try {
      let importedDb: DatabaseV3;
      
      // If it contains legacy keys, migrate it!
      if (parsed['rube_remember_reminders_v1'] !== undefined) {
        console.log('ImportBackupData: Legacy backup format detected. Migrating...');
        // Mock AsyncStorage load to read legacy keys
        const mockStore: Record<string, string> = {
          rube_remember_reminders_v1: JSON.stringify(parsed['rube_remember_reminders_v1'] || []),
          rube_remember_proximity_days_v1: String(parsed['rube_remember_proximity_days_v1'] ?? 20),
          rube_remember_lists_v1: JSON.stringify(parsed['rube_remember_lists_v1'] || []),
          rube_remember_time_slots_v1: JSON.stringify(parsed['rube_remember_time_slots_v1'] || []),
          rube_remember_slot_separation_v1: String(parsed['rube_remember_slot_separation_v1'] ?? 30),
          rube_remember_goals_v1: JSON.stringify(parsed['rube_remember_goals_v1'] || []),
        };

        const originalGetItem = AsyncStorage.getItem;
        AsyncStorage.getItem = async (key: string) => mockStore[key] || null;

        importedDb = await MigrationEngine.migrateV1ToV2();

        AsyncStorage.getItem = originalGetItem; // restore original
      } else {
        // V2/V3 backup
        importedDb = parsed as DatabaseV3;
      }

      if (importedDb.items) {
        setItems(importedDb.items);
        importedKeys.push('Items (Tareas, Recordatorios, Actividades)');
      }
      if (importedDb.goals) {
        setGoals(importedDb.goals);
        importedKeys.push('Objetivos y Fases');
      }
      if (importedDb.lists) {
        setLists(importedDb.lists);
        importedKeys.push('Listas');
      }
      if (importedDb.timeSlots) {
        setTimeSlots(importedDb.timeSlots);
        importedKeys.push('Franjas Horarias');
      }
      if (importedDb.settings?.proximityDays !== undefined) {
        setProximityDaysState(importedDb.settings.proximityDays);
        importedKeys.push('Días de Proximidad');
      }
      if (importedDb.settings?.slotSeparationMinutes !== undefined) {
        setSlotSeparationMinutesState(importedDb.settings.slotSeparationMinutes);
        importedKeys.push('Separación de Franjas');
      }
      if (importedDb.activityCategories) {
        setActivityCategories(importedDb.activityCategories);
        importedKeys.push('Categorías de Actividades');
      }
      if (importedDb.hourWeights) {
        setHourWeights(importedDb.hourWeights);
        importedKeys.push('Pesos de Bloques');
      }
      if (importedDb.sessions) {
        setSessions(importedDb.sessions);
        importedKeys.push('Sesiones de Enfoque');
      }
      if (importedDb.recommendations) {
        setRecommendations(importedDb.recommendations);
        importedKeys.push('Recomendaciones');
      }

      let finalUserSettings = userSettings;
      if (importedDb.userSettings) {
        finalUserSettings = {
          ...importedDb.userSettings,
          // Preserve local dropboxAccessToken, refresh token, app credentials and local sync rotation state
          dropboxAccessToken: userSettings.dropboxAccessToken || importedDb.userSettings.dropboxAccessToken || '',
          dropboxRefreshToken: userSettings.dropboxRefreshToken || importedDb.userSettings.dropboxRefreshToken || '',
          dropboxAppKey: userSettings.dropboxAppKey || importedDb.userSettings.dropboxAppKey || '',
          dropboxAppSecret: userSettings.dropboxAppSecret || importedDb.userSettings.dropboxAppSecret || '',
          dropboxTokenFetchedTimestamp: userSettings.dropboxTokenFetchedTimestamp || importedDb.userSettings.dropboxTokenFetchedTimestamp || 0,
          dropboxAutoUploadEnabled: userSettings.dropboxAutoUploadEnabled ?? importedDb.userSettings.dropboxAutoUploadEnabled,
          lastDropboxUploadTimestamp: userSettings.lastDropboxUploadTimestamp || importedDb.userSettings.lastDropboxUploadTimestamp || 0,
          lastDropboxUploadStatus: userSettings.lastDropboxUploadStatus || importedDb.userSettings.lastDropboxUploadStatus || '',
          lastDropboxSlotIndex: userSettings.lastDropboxSlotIndex || importedDb.userSettings.lastDropboxSlotIndex || 1,
          dropboxSyncCooldownMinutes: userSettings.dropboxSyncCooldownMinutes ?? importedDb.userSettings.dropboxSyncCooldownMinutes ?? 10,
        };
        setUserSettings(finalUserSettings);
        importedKeys.push('Ajustes de Usuario');
      }
      if (importedDb.statistics) {
        setStatistics(importedDb.statistics);
        importedKeys.push('Estadísticas');
      }

      // Persist the imported data
      const mergedDb: DatabaseV3 = {
        version: 3,
        items: importedDb.items || items,
        goals: importedDb.goals || goals,
        lists: importedDb.lists || lists,
        timeSlots: importedDb.timeSlots || timeSlots,
        activityCategories: importedDb.activityCategories || activityCategories,
        hourWeights: importedDb.hourWeights || hourWeights,
        sessions: importedDb.sessions || sessions,
        recommendations: importedDb.recommendations || recommendations,
        userSettings: finalUserSettings,
        statistics: importedDb.statistics || statistics,
        settings: {
          proximityDays: importedDb.settings?.proximityDays ?? proximityDays,
          slotSeparationMinutes: importedDb.settings?.slotSeparationMinutes ?? slotSeparationMinutes,
        },
      };
      await MigrationEngine.saveDatabase(mergedDb);

      return {
        success: true,
        errors,
        importedKeys,
      };
    } catch (e: any) {
      return {
        success: false,
        errors: [`Error al restaurar copia de seguridad: ${e.message}`],
        importedKeys: [],
      };
    }
  }, [items, goals, lists, timeSlots, proximityDays, slotSeparationMinutes, activityCategories, hourWeights, sessions, recommendations, userSettings, statistics]);

  const setProximityDays = useCallback(async (days: number) => {
    setProximityDaysState(days);
    const db: DatabaseV2 = {
      version: 2,
      items,
      goals,
      lists,
      timeSlots,
      settings: {
        proximityDays: days,
        slotSeparationMinutes,
      },
    };
    await MigrationEngine.saveDatabase(db);
  }, [items, goals, lists, timeSlots, slotSeparationMinutes]);

  // Time Slots CRUD
  const saveSlots = useCallback(async (newSlots: TimeSlot[]) => {
    setTimeSlots(newSlots);
    const adjusted = recalculateTaskSlotTimes(items, newSlots, slotSeparationMinutes);
    setItems(adjusted);

    const db: DatabaseV2 = {
      version: 2,
      items: adjusted,
      goals,
      lists,
      timeSlots: newSlots,
      settings: {
        proximityDays,
        slotSeparationMinutes,
      },
    };
    await MigrationEngine.saveDatabase(db);
  }, [items, goals, lists, proximityDays, slotSeparationMinutes]);

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
    const updated = timeSlots.map((s) => (s.id === id ? { ...s, name, startTime, endTime } : s));
    await saveSlots(updated);
  }, [timeSlots, saveSlots]);

  const deleteTimeSlot = useCallback(async (id: string) => {
    const updatedSlots = timeSlots.filter((s) => s.id !== id);
    const updatedItems = items.map((i) => {
      if (i.type === ItemType.TASK && (i as Task).timeSlotId === id) {
        return { ...i, timeSlotId: undefined };
      }
      return i;
    });

    setTimeSlots(updatedSlots);
    setItems(updatedItems);

    const db: DatabaseV2 = {
      version: 2,
      items: updatedItems,
      goals,
      lists,
      timeSlots: updatedSlots,
      settings: {
        proximityDays,
        slotSeparationMinutes,
      },
    };
    await MigrationEngine.saveDatabase(db);
  }, [items, goals, lists, timeSlots, proximityDays, slotSeparationMinutes]);

  const setSlotSeparationMinutes = useCallback(async (minutes: number) => {
    setSlotSeparationMinutesState(minutes);
    const adjusted = recalculateTaskSlotTimes(items, timeSlots, minutes);
    setItems(adjusted);

    const db: DatabaseV2 = {
      version: 2,
      items: adjusted,
      goals,
      lists,
      timeSlots,
      settings: {
        proximityDays,
        slotSeparationMinutes: minutes,
      },
    };
    await MigrationEngine.saveDatabase(db);
  }, [items, timeSlots, goals, lists, proximityDays]);

  // Goals CRUD
  const saveGoals = useCallback(async (newGoals: Goal[]) => {
    setGoals(newGoals);
    const db: DatabaseV2 = {
      version: 2,
      items,
      goals: newGoals,
      lists,
      timeSlots,
      settings: {
        proximityDays,
        slotSeparationMinutes,
      },
    };
    await MigrationEngine.saveDatabase(db);
  }, [items, lists, timeSlots, proximityDays, slotSeparationMinutes]);

  const addGoal = useCallback(async (title: string, description: string, startDate: string, endDate: string, emoji?: string) => {
    const newGoal: Goal = {
      id: `goal-${Math.random().toString(36).substring(7)}`,
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      phases: [],
      createdAt: new Date().toISOString(),
      completed: false,
      emoji: emoji ? emoji.trim() : '🎯',
    };
    await saveGoals([...goals, newGoal]);
  }, [goals, saveGoals]);

  const updateGoal = useCallback(async (id: string, title: string, description: string, startDate: string, endDate: string, emoji?: string) => {
    const updated = goals.map((g) => {
      if (g.id === id) {
        return {
          ...g,
          title: title.trim(),
          description: description.trim(),
          startDate,
          endDate,
          emoji: emoji !== undefined ? emoji.trim() : (g.emoji || '🎯'),
        };
      }
      return g;
    });
    await saveGoals(updated);
  }, [goals, saveGoals]);

  const deleteGoal = useCallback(async (id: string) => {
    const updatedGoals = goals.filter((g) => g.id !== id);
    // Clean up items pointing to this goal
    const updatedItems = items.map((i) => {
      if (i.type === ItemType.TASK && (i as Task).goalId === id) {
        return { ...i, goalId: undefined, phaseId: undefined };
      }
      return i;
    });

    setGoals(updatedGoals);
    setItems(updatedItems);

    const db: DatabaseV2 = {
      version: 2,
      items: updatedItems,
      goals: updatedGoals,
      lists,
      timeSlots,
      settings: {
        proximityDays,
        slotSeparationMinutes,
      },
    };
    await MigrationEngine.saveDatabase(db);
  }, [items, goals, lists, timeSlots, proximityDays, slotSeparationMinutes]);

  const toggleGoalCompleted = useCallback(async (id: string) => {
    const updated = goals.map((g) => {
      if (g.id === id) {
        return { ...g, completed: !g.completed };
      }
      return g;
    });
    await saveGoals(updated);
  }, [goals, saveGoals]);

  const toggleGoalMain = useCallback(async (id: string) => {
    const updated = goals.map((g) => {
      if (g.id === id) {
        return { ...g, isMain: !g.isMain };
      }
      return g;
    });
    await saveGoals(updated);
  }, [goals, saveGoals]);

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
    await saveGoals(updated);
  }, [goals, saveGoals]);

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
    await saveGoals(updated);
  }, [goals, saveGoals]);

  const deletePhase = useCallback(async (goalId: string, phaseId: string) => {
    const updatedGoals = goals.map((g) => {
      if (g.id === goalId) {
        const filteredPhases = g.phases.filter((p) => p.id !== phaseId);
        const reordered = filteredPhases.map((p, idx) => ({ ...p, order: idx }));
        return { ...g, phases: reordered };
      }
      return g;
    });

    // Clean phase references in items
    const updatedItems = items.map((i) => {
      if (i.type === ItemType.TASK && (i as Task).phaseId === phaseId) {
        return { ...i, phaseId: undefined };
      }
      return i;
    });

    setGoals(updatedGoals);
    setItems(updatedItems);

    const db: DatabaseV2 = {
      version: 2,
      items: updatedItems,
      goals: updatedGoals,
      lists,
      timeSlots,
      settings: {
        proximityDays,
        slotSeparationMinutes,
      },
    };
    await MigrationEngine.saveDatabase(db);
  }, [items, goals, lists, timeSlots, proximityDays, slotSeparationMinutes]);

  const reorderPhases = useCallback(async (goalId: string, orderedPhases: Phase[]) => {
    const updated = goals.map((g) => {
      if (g.id === goalId) {
        const reordered = orderedPhases.map((p, idx) => ({ ...p, order: idx }));
        return { ...g, phases: reordered };
      }
      return g;
    });
    await saveGoals(updated);
  }, [goals, saveGoals]);

  // Lists CRUD
  const saveLists = useCallback(async (newLists: ReminderList[]) => {
    setLists(newLists);
    const db: DatabaseV2 = {
      version: 2,
      items,
      goals,
      lists: newLists,
      timeSlots,
      settings: {
        proximityDays,
        slotSeparationMinutes,
      },
    };
    await MigrationEngine.saveDatabase(db);
  }, [items, goals, timeSlots, proximityDays, slotSeparationMinutes]);

  const addList = useCallback(async (name: string, parentId?: string) => {
    const newId = `list-${Math.random().toString(36).substring(7)}`;
    const newList: ReminderList = {
      id: newId,
      name: name.trim(),
      items: [],
      collapsed: false,
      createdAt: new Date().toISOString(),
      parentId,
    };
    await saveLists([...lists, newList]);
    return newId;
  }, [lists, saveLists]);

  const toggleListItemCompleted = useCallback(async (listId: string, itemId: string) => {
    const updated = lists.map((l) => {
      if (l.id === listId) {
        const updatedItems = l.items.map((it) => {
          if (it.id === itemId) {
            return { ...it, completed: !it.completed };
          }
          return it;
        });
        return { ...l, items: updatedItems };
      }
      return l;
    });
    await saveLists(updated);
  }, [lists, saveLists]);

  const updateList = useCallback(async (id: string, name: string) => {
    const updated = lists.map((l) => (l.id === id ? { ...l, name: name.trim() } : l));
    await saveLists(updated);
  }, [lists, saveLists]);

  const deleteList = useCallback(async (id: string) => {
    await saveLists(lists.filter((l) => l.id !== id));
  }, [lists, saveLists]);

  const toggleListCollapse = useCallback(async (id: string) => {
    const updated = lists.map((l) => (l.id === id ? { ...l, collapsed: !l.collapsed } : l));
    await saveLists(updated);
  }, [lists, saveLists]);

  const addListItem = useCallback(async (listId: string, text: string, imageUri?: string, images?: string[], title?: string) => {
    const newItemId = `item-${Math.random().toString(36).substring(7)}`;
    const updated = lists.map((l) => {
      if (l.id === listId) {
        const newItem: ListItem = {
          id: newItemId,
          text: text.trim(),
          title: title?.trim() || undefined,
          imageUri,
          images,
        };
        return { ...l, items: [...l.items, newItem] };
      }
      return l;
    });
    await saveLists(updated);
    return newItemId;
  }, [lists, saveLists]);

  const updateListItem = useCallback(async (listId: string, itemId: string, text: string, imageUri?: string, images?: string[], title?: string) => {
    const updated = lists.map((l) => {
      if (l.id === listId) {
        const updatedItems = l.items.map((it) => {
          if (it.id === itemId) {
            return { ...it, text: text.trim(), title: title?.trim() || undefined, imageUri, images };
          }
          return it;
        });
        return { ...l, items: updatedItems };
      }
      return l;
    });
    await saveLists(updated);
  }, [lists, saveLists]);

  const deleteListItem = useCallback(async (listId: string, itemId: string) => {
    const updated = lists.map((l) => {
      if (l.id === listId) {
        return { ...l, items: l.items.filter((it) => it.id !== itemId) };
      }
      return l;
    });
    await saveLists(updated);
  }, [lists, saveLists]);

  const setListAlarm = useCallback(async (listId: string, time: string | null) => {
    let listName = '';
    const updated = lists.map((l) => {
      if (l.id === listId) {
        listName = l.name;
        return { ...l, alarmTime: time || undefined };
      }
      return l;
    });

    if (time) {
      const now = new Date();
      const [hours, minutes] = time.split(':').map(Number);
      const alarmDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
      const isToday = alarmDate.getTime() > now.getTime();

      // Configure system clock alarm on Android for today's alarms
      if (isToday && Platform.OS === 'android') {
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
            extra: {
              'android.intent.extra.alarm.HOUR': hours,
              'android.intent.extra.alarm.MINUTES': minutes,
              'android.intent.extra.alarm.MESSAGE': `Lista: ${listName}`,
              'android.intent.extra.alarm.SKIP_UI': true,
            },
          });
        } catch (err) {
          console.warn('Failed to start system alarm intent:', err);
        }
      }

      if (alarmDate.getTime() <= now.getTime()) {
        alarmDate.setDate(alarmDate.getDate() + 1);
      }
      const yyyy = alarmDate.getFullYear();
      const mm = String(alarmDate.getMonth() + 1).padStart(2, '0');
      const dd = String(alarmDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      await NotificationService.scheduleNotification(listId, `Lista: ${listName}`, [dateStr], time);
    } else {
      await NotificationService.cancelNotification(listId);
    }

    await saveLists(updated);
  }, [lists, saveLists]);

  const setListItemAlarm = useCallback(async (listId: string, itemId: string, time: string | null) => {
    let itemText = '';
    const updated = lists.map((l) => {
      if (l.id === listId) {
        const updatedItems = l.items.map((it) => {
          if (it.id === itemId) {
            itemText = it.text;
            return { ...it, alarmTime: time || undefined };
          }
          return it;
        });
        return { ...l, items: updatedItems };
      }
      return l;
    });

    const notifId = `${listId}_item_${itemId}`;
    if (time) {
      const now = new Date();
      const [hours, minutes] = time.split(':').map(Number);
      const alarmDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
      const isToday = alarmDate.getTime() > now.getTime();

      // Configure system clock alarm on Android for today's alarms
      if (isToday && Platform.OS === 'android') {
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
            extra: {
              'android.intent.extra.alarm.HOUR': hours,
              'android.intent.extra.alarm.MINUTES': minutes,
              'android.intent.extra.alarm.MESSAGE': itemText,
              'android.intent.extra.alarm.SKIP_UI': true,
            },
          });
        } catch (err) {
          console.warn('Failed to start system alarm intent:', err);
        }
      }

      if (alarmDate.getTime() <= now.getTime()) {
        alarmDate.setDate(alarmDate.getDate() + 1);
      }
      const yyyy = alarmDate.getFullYear();
      const mm = String(alarmDate.getMonth() + 1).padStart(2, '0');
      const dd = String(alarmDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      await NotificationService.scheduleNotification(notifId, itemText, [dateStr], time);
    } else {
      await NotificationService.cancelNotification(notifId);
    }

    await saveLists(updated);
  }, [lists, saveLists]);

  // Activity Categories CRUD
  const saveActivityCategories = useCallback(async (newCategories: CustomCategory[]) => {
    setActivityCategories(newCategories);
    const db: DatabaseV2 = {
      version: 2,
      items,
      goals,
      lists,
      timeSlots,
      activityCategories: newCategories,
      settings: {
        proximityDays,
        slotSeparationMinutes,
      },
    };
    await MigrationEngine.saveDatabase(db);
  }, [items, goals, lists, timeSlots, proximityDays, slotSeparationMinutes]);

  const addActivityCategory = useCallback(async (name: string) => {
    const id = `cat-${Math.random().toString(36).substring(7)}`;
    const newCategory: CustomCategory = {
      id,
      name: name.trim(),
    };
    await saveActivityCategories([...activityCategories, newCategory]);
  }, [activityCategories, saveActivityCategories]);

  const updateActivityCategory = useCallback(async (id: string, name: string) => {
    const updated = activityCategories.map((c) => (c.id === id ? { ...c, name: name.trim() } : c));
    await saveActivityCategories(updated);
  }, [activityCategories, saveActivityCategories]);

  const deleteActivityCategory = useCallback(async (id: string) => {
    const updatedCategories = activityCategories.filter((c) => c.id !== id);
    
    // Reset activities with this category to 'OTHER'
    const updatedItems = items.map((i) => {
      if (i.type === ItemType.ACTIVITY && (i as Activity).category === id) {
        return { ...i, category: 'OTHER' };
      }
      return i;
    });

    setItems(updatedItems);
    setActivityCategories(updatedCategories);

    const db: DatabaseV2 = {
      version: 2,
      items: updatedItems,
      goals,
      lists,
      timeSlots,
      activityCategories: updatedCategories,
      settings: {
        proximityDays,
        slotSeparationMinutes,
      },
    };
    await MigrationEngine.saveDatabase(db);
  }, [items, goals, lists, timeSlots, proximityDays, slotSeparationMinutes, activityCategories]);

  // Task Categories CRUD
  const saveTaskCategories = useCallback(async (newCategories: TaskCategory[]) => {
    setTaskCategories(newCategories);
    const db: DatabaseV3 = {
      version: 3,
      items,
      goals,
      lists,
      timeSlots,
      activityCategories,
      taskCategories: newCategories,
      hourWeights,
      sessions,
      recommendations,
      userSettings,
      statistics,
      settings: {
        proximityDays,
        slotSeparationMinutes,
      },
    };
    await MigrationEngine.saveDatabase(db);
  }, [items, goals, lists, timeSlots, activityCategories, hourWeights, sessions, recommendations, userSettings, statistics, proximityDays, slotSeparationMinutes]);

  const addTaskCategory = useCallback(async (name: string, emoji: string) => {
    const id = `tcat-${Math.random().toString(36).substring(7)}`;
    const newCategory: TaskCategory = {
      id,
      name: name.trim(),
      emoji: emoji.trim() || '📋',
    };
    await saveTaskCategories([...taskCategories, newCategory]);
  }, [taskCategories, saveTaskCategories]);

  const updateTaskCategory = useCallback(async (id: string, name: string, emoji: string) => {
    const updated = taskCategories.map((c) => (c.id === id ? { ...c, name: name.trim(), emoji: emoji.trim() || '📋' } : c));
    await saveTaskCategories(updated);
  }, [taskCategories, saveTaskCategories]);

  const deleteTaskCategory = useCallback(async (id: string) => {
    const updatedCategories = taskCategories.filter((c) => c.id !== id);
    const updatedItems = items.map((i) => {
      if (i.type === ItemType.TASK && (i as Task).categoryId === id) {
        return { ...i, categoryId: undefined };
      }
      return i;
    });

    setItems(updatedItems);
    setTaskCategories(updatedCategories);

    const db: DatabaseV3 = {
      version: 3,
      items: updatedItems,
      goals,
      lists,
      timeSlots,
      activityCategories,
      taskCategories: updatedCategories,
      hourWeights,
      sessions,
      recommendations,
      userSettings,
      statistics,
      settings: {
        proximityDays,
        slotSeparationMinutes,
      },
    };
    await MigrationEngine.saveDatabase(db);
  }, [items, goals, lists, timeSlots, activityCategories, taskCategories, hourWeights, sessions, recommendations, userSettings, statistics, proximityDays, slotSeparationMinutes]);

  // Hour Weights CRUD
  const saveHourWeights = useCallback(async (newWeights: HourWeight[]) => {
    setHourWeights(newWeights);
    const db: DatabaseV2 = {
      version: 2,
      items,
      goals,
      lists,
      timeSlots,
      activityCategories,
      hourWeights: newWeights,
      settings: {
        proximityDays,
        slotSeparationMinutes,
      },
    };
    await MigrationEngine.saveDatabase(db);
  }, [items, goals, lists, timeSlots, activityCategories, proximityDays, slotSeparationMinutes]);

  const addHourWeight = useCallback(async (name: string, minHours: number) => {
    const id = `weight-${Math.random().toString(36).substring(7)}`;
    const newWeight: HourWeight = {
      id,
      name: name.trim(),
      minHours,
    };
    const updated = [...hourWeights, newWeight].sort((a, b) => a.minHours - b.minHours);
    await saveHourWeights(updated);
  }, [hourWeights, saveHourWeights]);

  const updateHourWeight = useCallback(async (id: string, name: string, minHours: number) => {
    const updated = hourWeights
      .map((w) => (w.id === id ? { ...w, name: name.trim(), minHours } : w))
      .sort((a, b) => a.minHours - b.minHours);
    await saveHourWeights(updated);
  }, [hourWeights, saveHourWeights]);

  const deleteHourWeight = useCallback(async (id: string) => {
    const updated = hourWeights.filter((w) => w.id !== id);
    await saveHourWeights(updated);
  }, [hourWeights, saveHourWeights]);

  // V3 Cognitive Engine Actions
  const createSession = useCallback(async (taskId: string, plannedDuration: number, notes = '', title?: string, notesImages?: string[]) => {
    const newSession: Session = {
      id: Math.random().toString(36).substring(7),
      taskId,
      startTime: new Date().toISOString(),
      plannedDuration,
      completed: false,
      notes,
      title: title?.trim() || undefined,
      notesImages,
      createdAt: new Date().toISOString(),
    };

    const nextSessions = [...sessions, newSession];
    await saveDatabaseState(
      items,
      goals,
      lists,
      timeSlots,
      nextSessions,
      recommendations,
      userSettings,
      statistics,
      proximityDays,
      slotSeparationMinutes
    );
    return newSession.id;
  }, [items, goals, lists, timeSlots, sessions, recommendations, userSettings, statistics, proximityDays, slotSeparationMinutes, saveDatabaseState]);

  const updateSession = useCallback(async (id: string, updates: Partial<Session>) => {
    let nextSessions = sessions;
    const exists = sessions.some((s) => s.id === id);
    if (exists) {
      nextSessions = sessions.map((s) => (s.id === id ? { ...s, ...updates } : s));
    } else {
      const db = await MigrationEngine.getDatabase();
      const dbSession = (db.sessions || []).find((s) => s.id === id);
      if (dbSession) {
        nextSessions = [...sessions, { ...dbSession, ...updates }];
      } else {
        console.warn(`updateSession: Session ${id} not found in state or DB.`);
        return;
      }
    }

    await saveDatabaseState(
      items,
      goals,
      lists,
      timeSlots,
      nextSessions,
      recommendations,
      userSettings,
      statistics,
      proximityDays,
      slotSeparationMinutes
    );
  }, [items, goals, lists, timeSlots, sessions, recommendations, userSettings, statistics, proximityDays, slotSeparationMinutes, saveDatabaseState]);

  const endSession = useCallback(async (
    sessionId: string,
    realDuration: number,
    completed: boolean,
    notes?: string,
    taskUpdates?: Partial<Task> & { notesImages?: string[]; nextStepImages?: string[] }
  ) => {
    let session = sessions.find((s) => s.id === sessionId);
    let nextSessions = sessions;

    if (!session) {
      const db = await MigrationEngine.getDatabase();
      const dbSession = (db.sessions || []).find((s) => s.id === sessionId);
      if (dbSession) {
        session = dbSession;
        nextSessions = [...sessions, dbSession];
      }
    }

    if (!session) {
      console.warn(`endSession: Session ${sessionId} not found in state or DB.`);
      return;
    }

    const endTime = new Date().toISOString();
    console.log('[Store] endSession params:', { sessionId, realDuration, completed, notes, taskUpdates });

    nextSessions = nextSessions.map((s) => {
      if (s.id === sessionId) {
        return {
          ...s,
          endTime,
          realDuration,
          completed,
          notes: notes !== undefined ? notes : s.notes,
          notesImages: taskUpdates?.notesImages !== undefined ? taskUpdates.notesImages : s.notesImages,
          nextStep: taskUpdates?.nextStep !== undefined ? taskUpdates.nextStep : s.nextStep,
          nextStepImages: taskUpdates?.nextStepImages !== undefined ? taskUpdates.nextStepImages : s.nextStepImages,
          progress: taskUpdates?.progress !== undefined ? taskUpdates.progress : s.progress,
        };
      }
      return s;
    });

    const nextItems = items.map((item) => {
      if (item.id === session!.taskId && item.type === ItemType.TASK) {
        const task = item as Task;
        const workedTime = (task.workedTime || 0) + realDuration;
        const sessionsCount = (task.sessionsCount || 0) + 1;
        return {
          ...task,
          workedTime,
          sessionsCount,
          lastSession: endTime,
          taskState: completed ? TaskState.COMPLETED : TaskState.IN_PROGRESS,
          completed,
          ...(taskUpdates || {}),
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    const newStats = {
      ...statistics,
      totalSessions: statistics.totalSessions + 1,
      totalWorkedTime: statistics.totalWorkedTime + realDuration,
      completedTasks: statistics.completedTasks + (completed ? 1 : 0),
      averageSessionTime: Math.round((statistics.totalWorkedTime + realDuration) / (statistics.totalSessions + 1)),
      lastActivity: endTime,
    };

    await saveDatabaseState(
      nextItems,
      goals,
      lists,
      timeSlots,
      nextSessions,
      recommendations,
      userSettings,
      newStats,
      proximityDays,
      slotSeparationMinutes
    );
  }, [items, goals, lists, timeSlots, sessions, recommendations, userSettings, statistics, proximityDays, slotSeparationMinutes, saveDatabaseState]);

  const deleteSession = useCallback(async (id: string) => {
    const nextSessions = sessions.filter((s) => s.id !== id);
    await saveDatabaseState(
      items,
      goals,
      lists,
      timeSlots,
      nextSessions,
      recommendations,
      userSettings,
      statistics,
      proximityDays,
      slotSeparationMinutes
    );
  }, [items, goals, lists, timeSlots, sessions, recommendations, userSettings, statistics, proximityDays, slotSeparationMinutes, saveDatabaseState]);

  const updateUserSettings = useCallback(async (updates: Partial<UserSettings>) => {
    const hasLocalChanges = updates.hasLocalChanges !== undefined ? updates.hasLocalChanges : true;
    const nextSettings = { ...userSettings, ...updates, hasLocalChanges };
    await saveDatabaseState(
      items,
      goals,
      lists,
      timeSlots,
      sessions,
      recommendations,
      nextSettings,
      statistics,
      proximityDays,
      slotSeparationMinutes
    );
  }, [items, goals, lists, timeSlots, sessions, recommendations, userSettings, statistics, proximityDays, slotSeparationMinutes, saveDatabaseState]);

  const updateStatistics = useCallback(async (updates: Partial<Statistics>) => {
    const nextStats = { ...statistics, ...updates };
    await saveDatabaseState(
      items,
      goals,
      lists,
      timeSlots,
      sessions,
      recommendations,
      userSettings,
      nextStats,
      proximityDays,
      slotSeparationMinutes
    );
  }, [items, goals, lists, timeSlots, sessions, recommendations, userSettings, statistics, proximityDays, slotSeparationMinutes, saveDatabaseState]);

  const saveRecommendations = useCallback(async (recs: Recommendation[]) => {
    await saveDatabaseState(
      items,
      goals,
      lists,
      timeSlots,
      sessions,
      recs,
      userSettings,
      statistics,
      proximityDays,
      slotSeparationMinutes
    );
  }, [items, goals, lists, timeSlots, sessions, userSettings, statistics, proximityDays, slotSeparationMinutes, saveDatabaseState]);

  return (
    <RememberStoreContext.Provider
      value={{
        items,
        reminders,
        loading,
        getTasks,
        getReminders,
        getActivities,
        getMemos,
        getPlans,
        getArchivedItems,
        getTrashItems,
        getTodayReminders,
        getSuggestedActivities,
        createTask,
        createReminder,
        createMemo,
        createActivity,
        createPlan,
        updateItem,
        updateItems,
        deleteItem,
        restoreItem,
        archiveItem,
        unarchiveItem,
        toggleItemCompleted,
        registerActivityDone,
        convertItem,
        emptyTrash,
        deleteItemPermanently,
        addReminder,
        updateReminder,
        deleteReminder,
        deleteCompleted,
        toggleReminderCompleted,
        scheduleSystemAlarm,
        scheduleAllAlarms,
        scheduleTodayMemosAlarms,
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
        toggleGoalMain,
        addPhase,
        updatePhase,
        deletePhase,
        reorderPhases,
        lists,
        addList,
        updateList,
        deleteList,
        toggleListCollapse,
        addListItem,
        updateListItem,
        deleteListItem,
        toggleListItemCompleted,
        setListAlarm,
        setListItemAlarm,
        activityCategories,
        addActivityCategory,
        updateActivityCategory,
        deleteActivityCategory,
        taskCategories,
        addTaskCategory,
        updateTaskCategory,
        deleteTaskCategory,
        hourWeights,
        addHourWeight,
        updateHourWeight,
        deleteHourWeight,
        sessions,
        recommendations,
        userSettings,
        statistics,
        createSession,
        updateSession,
        endSession,
        deleteSession,
        updateUserSettings,
        updateStatistics,
        saveRecommendations,
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
