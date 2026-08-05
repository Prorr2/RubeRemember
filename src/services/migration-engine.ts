import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Item,
  ItemType,
  Priority,
  Task,
  ExecutionStrategy,
  EnergyType,
  TaskState,
  Session,
  Recommendation,
  UserSettings,
  Statistics,
  DEFAULT_USER_SETTINGS,
  DEFAULT_STATISTICS
} from '../models/Item';
import { Goal } from '../models/Goal';
import { TimeSlot } from '../models/TimeSlot';
import { ReminderList } from '../models/ReminderList';
import { CustomCategory } from '../models/Activity';
import { HourWeight } from '../models/HourWeight';

export interface DatabaseV2 {
  version: number;
  items: Item[];
  goals: Goal[];
  lists: ReminderList[];
  timeSlots: TimeSlot[];
  activityCategories?: CustomCategory[];
  hourWeights?: HourWeight[];
  settings: {
    proximityDays: number;
    slotSeparationMinutes: number;
  };
}

export interface DatabaseV3 {
  version: number;
  items: Item[];
  goals: Goal[];
  lists: ReminderList[];
  timeSlots: TimeSlot[];
  activityCategories?: CustomCategory[];
  hourWeights?: HourWeight[];
  sessions?: Session[];
  recommendations?: Recommendation[];
  userSettings?: UserSettings;
  statistics?: Statistics;
  settings: {
    proximityDays: number;
    slotSeparationMinutes: number;
  };
}

const V3_DB_KEY = 'rube_v3_database';
const V2_DB_KEY = 'rube_v2_database';

// Old V1 keys
const STORAGE_KEY = 'rube_remember_reminders_v1';
const PROXIMITY_DAYS_KEY = 'rube_remember_proximity_days_v1';
const STORAGE_KEY_LISTS = 'rube_remember_lists_v1';
const STORAGE_KEY_SLOTS = 'rube_remember_time_slots_v1';
const STORAGE_KEY_SEPARATION = 'rube_remember_slot_separation_v1';
const STORAGE_KEY_GOALS = 'rube_remember_goals_v1';

export const MigrationEngine = {
  async getDatabase(): Promise<DatabaseV3> {
    try {
      // 1. Try to load V3 database
      const v3Data = await AsyncStorage.getItem(V3_DB_KEY);
      if (v3Data) {
        return JSON.parse(v3Data);
      }

      // 2. Try to load V2 database and migrate to V3
      const v2Data = await AsyncStorage.getItem(V2_DB_KEY);
      if (v2Data) {
        console.log('MigrationEngine: V2 data detected. Migrating to V3...');
        const v2Db = JSON.parse(v2Data);
        const v3Db = this.migrateV2ToV3(v2Db);
        await AsyncStorage.setItem(V3_DB_KEY, JSON.stringify(v3Db));
        return v3Db;
      }

      // 3. Try to load V1 database, migrate to V2, then V3
      const hasOldData = await AsyncStorage.getItem(STORAGE_KEY);
      if (hasOldData !== null) {
        console.log('MigrationEngine: Old V1 data detected. Starting migrations to V3...');
        const v2Db = await this.migrateV1ToV2();
        const v3Db = this.migrateV2ToV3(v2Db);
        await AsyncStorage.setItem(V3_DB_KEY, JSON.stringify(v3Db));
        return v3Db;
      }

      // 4. Return default empty V3 database
      console.log('MigrationEngine: No database found. Initializing default database V3...');
      const defaultDb: DatabaseV3 = {
        version: 3,
        items: [],
        goals: [],
        lists: [],
        timeSlots: [
          { id: 'slot-morning', name: 'Mañana', startTime: '09:00', endTime: '12:00' },
          { id: 'slot-afternoon', name: 'Tarde', startTime: '16:00', endTime: '18:00' },
          { id: 'slot-night', name: 'Noche', startTime: '20:00', endTime: '23:00' },
        ],
        sessions: [],
        recommendations: [],
        userSettings: DEFAULT_USER_SETTINGS,
        statistics: DEFAULT_STATISTICS,
        settings: {
          proximityDays: 20,
          slotSeparationMinutes: 30,
        },
      };
      await AsyncStorage.setItem(V3_DB_KEY, JSON.stringify(defaultDb));
      return defaultDb;
    } catch (e) {
      console.error('MigrationEngine error:', e);
      throw e;
    }
  },

  async saveDatabase(db: DatabaseV3): Promise<void> {
    try {
      db.version = 3; // Always ensure version is correct V3
      
      // Preserve properties that might not be in the updated db object
      try {
        const existingRaw = await AsyncStorage.getItem(V3_DB_KEY);
        if (existingRaw) {
          const existing = JSON.parse(existingRaw);
          if (db.activityCategories === undefined && existing.activityCategories !== undefined) {
            db.activityCategories = existing.activityCategories;
          }
          if (db.hourWeights === undefined && existing.hourWeights !== undefined) {
            db.hourWeights = existing.hourWeights;
          }
          if (db.sessions === undefined && existing.sessions !== undefined) {
            db.sessions = existing.sessions;
          }
          if (db.recommendations === undefined && existing.recommendations !== undefined) {
            db.recommendations = existing.recommendations;
          }
          if (db.userSettings === undefined && existing.userSettings !== undefined) {
            db.userSettings = existing.userSettings;
          }
          if (db.statistics === undefined && existing.statistics !== undefined) {
            db.statistics = existing.statistics;
          }
        }
      } catch (err) {
        console.warn('MigrationEngine: Could not read existing DB for merge', err);
      }

      await AsyncStorage.setItem(V3_DB_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('MigrationEngine save error:', e);
      throw e;
    }
  },

  migrateV2ToV3(v2Db: DatabaseV2): DatabaseV3 {
    const items = (v2Db.items || []).map((item: Item) => {
      if (item.type === ItemType.TASK) {
        const task = item as Task;
        return {
          ...task,
          executionStrategy: task.executionStrategy ?? ExecutionStrategy.SPRINT,
          energyType: task.energyType ?? EnergyType.CREATIVE,
          taskState: task.taskState ?? (task.completed ? TaskState.COMPLETED : TaskState.THINKING),
          focusLocked: task.focusLocked ?? false,
          progress: task.progress ?? (task.completed ? 100 : 0),
          workedTime: task.workedTime ?? 0,
          sessionsCount: task.sessionsCount ?? 0,
        } as Task;
      }
      return item;
    });

    return {
      version: 3,
      items,
      goals: v2Db.goals || [],
      lists: v2Db.lists || [],
      timeSlots: v2Db.timeSlots || [],
      activityCategories: v2Db.activityCategories || [],
      hourWeights: v2Db.hourWeights || [],
      sessions: [],
      recommendations: [],
      userSettings: DEFAULT_USER_SETTINGS,
      statistics: DEFAULT_STATISTICS,
      settings: v2Db.settings || {
        proximityDays: 20,
        slotSeparationMinutes: 30,
      },
    };
  },

  async migrateV1ToV2(): Promise<DatabaseV2> {
    const rawReminders = await AsyncStorage.getItem(STORAGE_KEY);
    const rawProximity = await AsyncStorage.getItem(PROXIMITY_DAYS_KEY);
    const rawLists = await AsyncStorage.getItem(STORAGE_KEY_LISTS);
    const rawSlots = await AsyncStorage.getItem(STORAGE_KEY_SLOTS);
    const rawSeparation = await AsyncStorage.getItem(STORAGE_KEY_SEPARATION);
    const rawGoals = await AsyncStorage.getItem(STORAGE_KEY_GOALS);

    const oldReminders = rawReminders ? JSON.parse(rawReminders) : [];
    const proximity = rawProximity ? parseInt(rawProximity, 10) : 20;
    const lists = rawLists ? JSON.parse(rawLists) : [];
    const slots = rawSlots ? JSON.parse(rawSlots) : [
      { id: 'slot-morning', name: 'Mañana', startTime: '09:00', endTime: '12:00' },
      { id: 'slot-afternoon', name: 'Tarde', startTime: '16:00', endTime: '18:00' },
      { id: 'slot-night', name: 'Noche', startTime: '20:00', endTime: '23:00' },
    ];
    const separation = rawSeparation ? parseInt(rawSeparation, 10) : 30;
    const goals = rawGoals ? JSON.parse(rawGoals) : [];

    // Migrate old reminders to new Tasks
    const items: Item[] = oldReminders.map((r: any) => {
      const task: Task = {
        id: r.id || Math.random().toString(36).substring(7),
        type: ItemType.TASK,
        title: r.text || '',
        description: '',
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: r.createdAt || new Date().toISOString(),
        archived: false,
        favourite: r.pinned || false,
        tags: [],
        completed: r.completed || false,
        startDate: r.startDate || r.date || undefined,
        dueDate: r.endDate || r.date || undefined,
        estimatedHours: r.estimatedHours,
        priority: Priority.MEDIUM,
        goalId: r.goalId,
        phaseId: r.phaseId,
        timeSlotId: r.timeSlotId,
        comments: r.comments || [],
      };
      return task;
    });

    return {
      version: 2,
      items,
      goals,
      lists,
      timeSlots: slots,
      settings: {
        proximityDays: proximity,
        slotSeparationMinutes: separation,
      },
    };
  },
};
