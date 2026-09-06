import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
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
import { TaskCategory } from '../models/TaskCategory';
import { materializeDatabaseImages } from './image-store';

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
  taskCategories?: TaskCategory[];
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
let saveQueue: Promise<void> = Promise.resolve();
const V2_DB_KEY = 'rube_v2_database';

// Holds a one-shot notice shown to the user when the local DB file was corrupt
// and the app had to recover from a backup (or start empty). Consumed (and
// cleared) by the store right after loading.
let recoveryNotice: string | null = null;

function setRecoveryNotice(message: string): void {
  recoveryNotice = message;
}

export function takeRecoveryNotice(): string | null {
  const notice = recoveryNotice;
  recoveryNotice = null;
  return notice;
}

const DB_FILE_NAME = 'rube_database_v3.json';

function getDbFileUri(): string | null {
  if (!FileSystem.documentDirectory) {
    return null;
  }
  return `${FileSystem.documentDirectory}${DB_FILE_NAME}`;
}

async function readDbFile(): Promise<string | null> {
  try {
    const uri = getDbFileUri();
    if (!uri) {
      return null;
    }
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      return null;
    }
    return await FileSystem.readAsStringAsync(uri);
  } catch (e) {
    console.warn('[MigrationEngine] readDbFile error:', e);
    return null;
  }
}

async function writeDbFile(content: string): Promise<void> {
  try {
    const uri = getDbFileUri();
    if (!uri) {
      throw new Error('Filesystem no disponible');
    }
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      const dir = FileSystem.documentDirectory!;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
    }
    // Atomic write: write to a temp file first, then rename over the real file so a
    // crash mid-write can never leave a truncated/corrupt DB file behind.
    const tmpUri = `${uri}.tmp`;
    await FileSystem.writeAsStringAsync(tmpUri, content);
    await FileSystem.moveAsync({ from: tmpUri, to: uri });
  } catch (e) {
    console.warn('[MigrationEngine] writeDbFile error:', e);
    throw e;
  }
}

export async function clearDatabaseFile(): Promise<void> {
  try {
    const uri = getDbFileUri();
    if (uri) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (e) {
    console.warn('[MigrationEngine] clearDatabaseFile error:', e);
  }
}

// Clears all legacy AsyncStorage keys (V1/V2/V3) so stale data can never be
// re-migrated ("resurrected") after a clearAll or a corrupt-file recovery.
export async function clearLegacyStorage(): Promise<void> {
  const legacyKeys = [
    STORAGE_KEY,
    PROXIMITY_DAYS_KEY,
    STORAGE_KEY_LISTS,
    STORAGE_KEY_SLOTS,
    STORAGE_KEY_SEPARATION,
    STORAGE_KEY_GOALS,
    V2_DB_KEY,
    V3_DB_KEY,
  ];
  try {
    await AsyncStorage.multiRemove(legacyKeys);
  } catch (e) {
    console.warn('[MigrationEngine] clearLegacyStorage error:', e);
  }
}

// Old V1 keys
const STORAGE_KEY = 'rube_remember_reminders_v1';
const PROXIMITY_DAYS_KEY = 'rube_remember_proximity_days_v1';
const STORAGE_KEY_LISTS = 'rube_remember_lists_v1';
const STORAGE_KEY_SLOTS = 'rube_remember_time_slots_v1';
const STORAGE_KEY_SEPARATION = 'rube_remember_slot_separation_v1';
const STORAGE_KEY_GOALS = 'rube_remember_goals_v1';

function parseImagesFromText(text: string | undefined): { cleanText: string; images: string[] } {
  if (!text) return { cleanText: '', images: [] };
  const lines = text.split('\n');
  const images: string[] = [];
  const textLines: string[] = [];
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('data:image/') && trimmed.includes(';base64,')) {
      images.push(trimmed);
    } else {
      textLines.push(line);
    }
  });
  return {
    cleanText: textLines.join('\n').trim(),
    images,
  };
}

export function sanitizeDatabase(db: DatabaseV3): DatabaseV3 {
  let modified = false;

  // 1. Sanitize tasks and task comments
  const sanitizedItems = (db.items || []).map((item) => {
    if (item.type === ItemType.TASK) {
      const task = item as Task;
      let taskUpdated = false;
      const images: string[] = [...(task.images || [])];

      // Parse legacy images from description
      if (task.description && task.description.includes('data:image/') && task.description.includes(';base64,')) {
        const parsed = parseImagesFromText(task.description);
        task.description = parsed.cleanText;
        images.push(...parsed.images);
        taskUpdated = true;
      }

      // Sanitize comments
      const sanitizedComments = (task.comments || []).map((cmt) => {
        if (cmt.text && cmt.text.includes('data:image/') && cmt.text.includes(';base64,')) {
          const parsed = parseImagesFromText(cmt.text);
          cmt.text = parsed.cleanText;
          cmt.images = [...(cmt.images || []), ...parsed.images];
          taskUpdated = true;
        }
        return cmt;
      });

      if (taskUpdated) {
        modified = true;
        return {
          ...task,
          description: task.description,
          comments: sanitizedComments,
          images: images.length > 0 ? images : undefined,
        } as Task;
      }
    }
    return item;
  });

  // 2. Sanitize lists and list items
  const sanitizedLists = (db.lists || []).map((list) => {
    let listUpdated = false;
    const sanitizedListItems = (list.items || []).map((it) => {
      let itemUpdated = false;
      let text = it.text;
      const images = [...(it.images || [])];

      if (it.imageUri && !images.includes(it.imageUri)) {
        images.push(it.imageUri);
        itemUpdated = true;
      }

      if (it.text && it.text.includes('data:image/') && it.text.includes(';base64,')) {
        const parsed = parseImagesFromText(it.text);
        text = parsed.cleanText;
        parsed.images.forEach((img) => {
          if (!images.includes(img)) {
            images.push(img);
          }
        });
        itemUpdated = true;
      }

      if (itemUpdated) {
        listUpdated = true;
        return {
          ...it,
          text,
          images: images.length > 0 ? images : undefined,
        };
      }
      return it;
    });

    if (listUpdated) {
      modified = true;
      return {
        ...list,
        items: sanitizedListItems,
      };
    }
    return list;
  });

  // 3. Sanitize sessions
  const sanitizedSessions = (db.sessions || []).map((sess) => {
    let sessUpdated = false;
    let notes = sess.notes;
    let nextStep = sess.nextStep;
    const notesImages = [...(sess.notesImages || [])];
    const nextStepImages = [...(sess.nextStepImages || [])];

    if (sess.notes && sess.notes.includes('data:image/') && sess.notes.includes(';base64,')) {
      const parsed = parseImagesFromText(sess.notes);
      notes = parsed.cleanText;
      notesImages.push(...parsed.images);
      sessUpdated = true;
    }

    if (sess.nextStep && sess.nextStep.includes('data:image/') && sess.nextStep.includes(';base64,')) {
      const parsed = parseImagesFromText(sess.nextStep);
      nextStep = parsed.cleanText;
      nextStepImages.push(...parsed.images);
      sessUpdated = true;
    }

    if (sessUpdated) {
      modified = true;
      return {
        ...sess,
        notes,
        nextStep,
        notesImages: notesImages.length > 0 ? notesImages : undefined,
        nextStepImages: nextStepImages.length > 0 ? nextStepImages : undefined,
      };
    }
    return sess;
  });

  if (modified) {
    console.log('MigrationEngine: Sanitized legacy base64 concatenated fields to independent fields.');
    return {
      ...db,
      items: sanitizedItems,
      lists: sanitizedLists,
      sessions: sanitizedSessions,
    };
  }

  return db;
}

export const MigrationEngine = {
  async clearDatabaseFile(): Promise<void> {
    return clearDatabaseFile();
  },

  async clearLegacyStorage(): Promise<void> {
    return clearLegacyStorage();
  },

  takeRecoveryNotice(): string | null {
    return takeRecoveryNotice();
  },

  async getDatabase(): Promise<DatabaseV3> {
    try {
      // 0. Try to load V3 database from the filesystem (primary source).
      const fileData = await readDbFile();
      if (fileData) {
        try {
          const parsed = JSON.parse(fileData);
          const sanitized = sanitizeDatabase(parsed);
          const migrated = await materializeDatabaseImages(sanitized);
          // Only rewrite when the DB actually changed (by content), so we avoid
          // unnecessary writes that could race with other saves. Serialize through
          // the saveQueue for safety.
          const serialized = JSON.stringify(migrated);
          if (fileData !== serialized) {
            saveQueue = saveQueue.then(() => writeDbFile(serialized)).catch((e) =>
              console.error('[MigrationEngine] getDatabase rewrite error:', e)
            );
          }
          return migrated;
        } catch (parseErr) {
          // The file exists but is corrupt (truncated / invalid JSON). Don't let it
          // brick the app: quarantine it and fall through to the AsyncStorage fallbacks.
          console.error('[MigrationEngine] Database file corrupt, trying fallbacks:', parseErr);
          await FileSystem.moveAsync({
            from: getDbFileUri()!,
            to: `${getDbFileUri()}.corrupt-${Date.now()}`,
          }).catch(() => {});
          setRecoveryNotice(
            'Se detectó que el archivo de la base de datos estaba dañado. ' +
            'Se buscó en los respaldos guardados en este dispositivo.'
          );
        }
      }

      // 1. Try to load V3 database (legacy AsyncStorage storage)
      try {
        const v3Data = await AsyncStorage.getItem(V3_DB_KEY);
        if (v3Data) {
          const parsed = JSON.parse(v3Data);
          const sanitized = sanitizeDatabase(parsed);
          const migrated = await materializeDatabaseImages(sanitized);
          await writeDbFile(JSON.stringify(migrated));
          if (recoveryNotice) {
            setRecoveryNotice(
              'Se detectó que el archivo de la base de datos estaba dañado y se recuperaron ' +
              'tus datos de un respaldo anterior guardado en el dispositivo. Es posible que los ' +
              'cambios más recientes no estén incluidos. Revisa tus datos; si falta algo, restaura ' +
              'un respaldo desde "Copia de seguridad" o desde Dropbox.'
            );
          }
          return migrated;
        }
      } catch (e) {
        console.warn('[MigrationEngine] No se pudo leer la DB V3 de AsyncStorage:', e);
      }

      // 2. Try to load V2 database and migrate to V3
      try {
        const v2Data = await AsyncStorage.getItem(V2_DB_KEY);
        if (v2Data) {
          console.log('MigrationEngine: V2 data detected. Migrating to V3...');
          const v2Db = JSON.parse(v2Data);
          const v3Db = this.migrateV2ToV3(v2Db);
          const sanitized = sanitizeDatabase(v3Db);
          const migrated = await materializeDatabaseImages(sanitized);
          await writeDbFile(JSON.stringify(migrated));
          if (recoveryNotice) {
            setRecoveryNotice(
              'Se detectó que el archivo de la base de datos estaba dañado y se recuperaron ' +
              'tus datos de un respaldo anterior guardado en el dispositivo. Es posible que los ' +
              'cambios más recientes no estén incluidos. Revisa tus datos; si falta algo, restaura ' +
              'un respaldo desde "Copia de seguridad" o desde Dropbox.'
            );
          }
          return migrated;
        }
      } catch (e) {
        console.warn('[MigrationEngine] No se pudo leer la DB V2 de AsyncStorage:', e);
      }

      // 3. Try to load V1 database, migrate to V2, then V3
      try {
        const hasOldData = await AsyncStorage.getItem(STORAGE_KEY);
        if (hasOldData !== null) {
          console.log('MigrationEngine: Old V1 data detected. Starting migrations to V3...');
          const v2Db = await this.migrateV1ToV2();
          const v3Db = this.migrateV2ToV3(v2Db);
          const sanitized = sanitizeDatabase(v3Db);
          const migrated = await materializeDatabaseImages(sanitized);
          await writeDbFile(JSON.stringify(migrated));
          if (recoveryNotice) {
            setRecoveryNotice(
              'Se detectó que el archivo de la base de datos estaba dañado y se recuperaron ' +
              'tus datos de un respaldo anterior guardado en el dispositivo. Es posible que los ' +
              'cambios más recientes no estén incluidos. Revisa tus datos; si falta algo, restaura ' +
              'un respaldo desde "Copia de seguridad" o desde Dropbox.'
            );
          }
          return migrated;
        }
      } catch (e) {
        console.warn('[MigrationEngine] No se pudieron leer los datos V1 de AsyncStorage:', e);
      }

      // 4. Return default empty V3 database
      console.log('MigrationEngine: No database found. Initializing default database V3...');
      if (recoveryNotice) {
        setRecoveryNotice(
          'Se detectó que el archivo de la base de datos estaba dañado y no se encontró ningún ' +
          'respaldo en el dispositivo. Se abrió la aplicación con una base de datos vacía. ' +
          'Tus datos anteriores podrían recuperarse desde Dropbox o desde un archivo de ' +
          'respaldo en "Copia de seguridad".'
        );
      }
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
        activityCategories: [],
        taskCategories: [],
        hourWeights: [],
        sessions: [],
        recommendations: [],
        userSettings: DEFAULT_USER_SETTINGS,
        statistics: DEFAULT_STATISTICS,
        settings: {
          proximityDays: 20,
          slotSeparationMinutes: 30,
        },
      };
      await writeDbFile(JSON.stringify(defaultDb));
      return defaultDb;
    } catch (e) {
      console.error('MigrationEngine error:', e);
      throw e;
    }
  },

  async saveDatabase(db: DatabaseV3, options?: { skipIntegrityGuard?: boolean }): Promise<void> {
    db.version = 3; // Always ensure version is correct V3
    
    // Add to sequential save queue to eliminate race conditions
    saveQueue = saveQueue.then(async () => {
      try {
        if (options?.skipIntegrityGuard) {
          await writeDbFile(JSON.stringify(db));
        } else {
          // The integrity guard blocks writes that would catastrophically wipe task comments.
          await this.persistDatabaseWithIntegrityGuard(db);
        }
      } catch (e) {
        console.error('MigrationEngine save error:', e);
        throw e;
      }
    }).catch((err) => {
      console.error('MigrationEngine saveQueue error:', err);
    });

    return saveQueue;
  },

  /**
   * Persists the database to the filesystem, guarding against catastrophic loss of task comments.
   *
   * The guard compares the comment count of the DB being saved against the one already on disk.
   * It only blocks when the SAME set of active (non-trash) tasks remains, but their comments
   * were wiped (dropped to 0 or cut by more than half). This prevents accidental corruption being
   * persisted locally, while still allowing legitimate operations that genuinely remove tasks or
   * remove a specific note from a task.
   */
  async persistDatabaseWithIntegrityGuard(db: DatabaseV3): Promise<boolean> {
    const itemsToSave = db.items || [];

    // Count how many active tasks are present and their comments in the DB to save.
    const activeToSave = itemsToSave.filter(i => i.type === ItemType.TASK && !i.trash);
    const commentsToSave = activeToSave.reduce((sum, i) => sum + ((i as Task).comments || []).length, 0);

    // Read the currently persisted state (best effort) to compare.
    let prevComments = -1;
    let prevActiveTasks = -1;
    try {
      const raw = await readDbFile();
      if (raw) {
        const prev = JSON.parse(raw);
        const prevItems = prev?.items || [];
        const prevActive = prevItems.filter((i: Item) => i.type === ItemType.TASK && !i.trash);
        prevActiveTasks = prevActive.length;
        prevComments = prevActive.reduce((sum: number, i: Item) => sum + ((i as Task).comments || []).length, 0);
      }
    } catch (e) {
      // If we can't read the previous state, don't block the write.
      prevComments = -1;
      prevActiveTasks = -1;
    }

    const isFirstWrite = prevComments < 0 || prevComments === -1;
    const sameTaskPopulation = prevActiveTasks >= 0 && prevActiveTasks === activeToSave.length;

    const suspiciousLoss =
      !isFirstWrite &&
      sameTaskPopulation &&
      prevComments > 0 &&
      (commentsToSave === 0 || commentsToSave < Math.floor(prevComments / 2));

    if (suspiciousLoss) {
      console.error(
        `[MigrationEngine] INTEGRITY GUARD: Se bloqueó el guardado para prevenir pérdida de comentarios. ` +
        `Comentarios previos guardados: ${prevComments}, nuevos: ${commentsToSave} (mismas ${activeToSave.length} tareas activas).`
      );
      // Do NOT write the corrupted state. Preserve the on-disk data.
      return false;
    }

    await writeDbFile(JSON.stringify(db));
    return true;
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
        trash: false,
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
