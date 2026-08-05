import AsyncStorage from '@react-native-async-storage/async-storage';
import { Item, ItemType, Priority, Task } from '../models/Item';
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

const V2_DB_KEY = 'rube_v2_database';

// Old V1 keys
const STORAGE_KEY = 'rube_remember_reminders_v1';
const PROXIMITY_DAYS_KEY = 'rube_remember_proximity_days_v1';
const STORAGE_KEY_LISTS = 'rube_remember_lists_v1';
const STORAGE_KEY_SLOTS = 'rube_remember_time_slots_v1';
const STORAGE_KEY_SEPARATION = 'rube_remember_slot_separation_v1';
const STORAGE_KEY_GOALS = 'rube_remember_goals_v1';

export const MigrationEngine = {
  async getDatabase(): Promise<DatabaseV2> {
    try {
      const v2Data = await AsyncStorage.getItem(V2_DB_KEY);
      if (v2Data) {
        return JSON.parse(v2Data);
      }

      // Check if old data exists to migrate
      const hasOldData = await AsyncStorage.getItem(STORAGE_KEY);
      if (hasOldData !== null) {
        console.log('MigrationEngine: Old v1 data detected. Starting migration...');
        const db = await this.migrateV1ToV2();
        await AsyncStorage.setItem(V2_DB_KEY, JSON.stringify(db));
        return db;
      }

      // Return default empty database
      console.log('MigrationEngine: No database found. Initializing default database...');
      const defaultDb: DatabaseV2 = {
        version: 2,
        items: [],
        goals: [],
        lists: [],
        timeSlots: [
          { id: 'slot-morning', name: 'Mañana', startTime: '09:00', endTime: '12:00' },
          { id: 'slot-afternoon', name: 'Tarde', startTime: '16:00', endTime: '18:00' },
          { id: 'slot-night', name: 'Noche', startTime: '20:00', endTime: '23:00' },
        ],
        settings: {
          proximityDays: 20,
          slotSeparationMinutes: 30,
        },
      };
      await AsyncStorage.setItem(V2_DB_KEY, JSON.stringify(defaultDb));
      return defaultDb;
    } catch (e) {
      console.error('MigrationEngine error:', e);
      throw e;
    }
  },

  async saveDatabase(db: DatabaseV2): Promise<void> {
    try {
      db.version = 2; // Always ensure version is correct
      
      // Preserve properties like activityCategories and hourWeights that might not be in the updated db object
      try {
        const existingRaw = await AsyncStorage.getItem(V2_DB_KEY);
        if (existingRaw) {
          const existing = JSON.parse(existingRaw);
          if (db.activityCategories === undefined && existing.activityCategories !== undefined) {
            db.activityCategories = existing.activityCategories;
          }
          if (db.hourWeights === undefined && existing.hourWeights !== undefined) {
            db.hourWeights = existing.hourWeights;
          }
        }
      } catch (err) {
        console.warn('MigrationEngine: Could not read existing DB for merge', err);
      }

      await AsyncStorage.setItem(V2_DB_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('MigrationEngine save error:', e);
      throw e;
    }
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
