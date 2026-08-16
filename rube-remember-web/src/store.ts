import { useSyncExternalStore } from 'react';
import {
  Item,
  ItemType,
  Priority,
  TaskState,
  EnergyType,
  UserSettings,
  HourWeight,
  CustomCategory,
  Statistics,
  TimeSlot,
  Session,
  DEFAULT_USER_SETTINGS,
  DEFAULT_HOUR_WEIGHTS,
  DEFAULT_ACTIVITY_CATEGORIES,
  DEFAULT_STATISTICS,
  DEFAULT_TIME_SLOTS
} from './types';

export interface DatabaseState {
  version: number;
  items: Item[];
  goals: any[];
  lists: any[];
  timeSlots: TimeSlot[];
  sessions: Session[];
  userSettings: UserSettings;
  statistics: Statistics;
  activityCategories: CustomCategory[];
  hourWeights: HourWeight[];
  settings?: {
    proximityDays?: number;
    slotSeparationMinutes?: number;
  };
  recommendations?: Recommendation[];
}

const LOCAL_STORAGE_KEY = 'rube_v3_react_database';

// Helper: Format date as YYYY-MM-DD
function getLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const seedData: DatabaseState = {
  version: 3,
  items: [
    {
      id: 'task-1',
      type: ItemType.TASK,
      title: 'Configurar estructura del proyecto Web React',
      description: 'Escribir App.tsx, store.ts y styles en React Vite.',
      completed: false,
      archived: false,
      trash: false,
      taskState: TaskState.IN_PROGRESS,
      priority: Priority.URGENT,
      energyType: EnergyType.CREATIVE,
      estimatedHours: 2,
      focusLocked: true,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task-2',
      type: ItemType.TASK,
      title: 'Crear algoritmos de motores cognitivos en React',
      description: 'Validar y calcular scores de tareas, fatiga y secuencias preferidas en JS.',
      completed: false,
      archived: false,
      trash: false,
      taskState: TaskState.NOT_STARTED,
      priority: Priority.HIGH,
      energyType: EnergyType.ANALYTICAL,
      estimatedHours: 6,
      focusLocked: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task-3',
      type: ItemType.TASK,
      title: 'Escribir manual de ayuda web',
      description: 'Incluir la descripción detallada de pesos y metodologías cognitivas.',
      completed: true,
      archived: false,
      trash: false,
      taskState: TaskState.COMPLETED,
      priority: Priority.LOW,
      energyType: EnergyType.LEARNING,
      estimatedHours: 0.5,
      focusLocked: false,
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 23).toISOString()
    },
    {
      id: 'act-1',
      type: ItemType.ACTIVITY,
      title: 'Hacer ejercicio diario',
      description: '30 minutos de cardio o pesas.',
      category: 'SPORT',
      suggestedCount: 1,
      doneCount: 0,
      completed: false,
      archived: false,
      trash: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'rem-1',
      type: ItemType.REMINDER,
      title: 'Revisar copias de seguridad de base de datos',
      description: 'Verificar exportaciones JSON.',
      completed: false,
      archived: false,
      trash: false,
      pinned: true,
      remindAt: {
        dates: [getLocalDateStr()],
        time: '18:00'
      },
      createdAt: new Date().toISOString()
    },
    {
      id: 'memo-1',
      type: ItemType.MEMO,
      title: 'Idea de diseño premium React',
      description: 'Usar componentes de estado dinámicos en React con animaciones fluidas.',
      completed: false,
      archived: false,
      trash: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'plan-1',
      type: ItemType.PLAN,
      title: 'Aprender Next.js en profundidad',
      description: 'Implementar proyectos de prueba y estudiar SSR/ISR.',
      startMonth: 9,
      startYear: 2026,
      endMonth: 12,
      endYear: 2026,
      completed: false,
      archived: false,
      trash: false,
      createdAt: new Date().toISOString()
    }
  ],
  goals: [],
  lists: [],
  timeSlots: DEFAULT_TIME_SLOTS,
  sessions: [
    {
      id: 'session-prev-1',
      taskId: 'task-1',
      plannedDuration: 30,
      realDuration: 30,
      completed: true,
      notes: 'Estructura inicial React creada.',
      nextStep: 'Añadir Componentes y lógica TS.',
      progress: 50,
      endTime: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ],
  userSettings: DEFAULT_USER_SETTINGS,
  statistics: DEFAULT_STATISTICS,
  activityCategories: DEFAULT_ACTIVITY_CATEGORIES,
  hourWeights: DEFAULT_HOUR_WEIGHTS,
  settings: {
    proximityDays: 20,
    slotSeparationMinutes: 30
  },
  recommendations: []
};

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

export function sanitizeDatabase(db: DatabaseState): DatabaseState {
  let modified = false;

  // 1. Sanitize tasks and task comments
  const sanitizedItems = (db.items || []).map((item) => {
    if (item.type === ItemType.TASK) {
      const task = item as any;
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
      const sanitizedComments = (task.comments || []).map((cmt: any) => {
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
        };
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
    return {
      ...db,
      items: sanitizedItems,
      lists: sanitizedLists,
      sessions: sanitizedSessions,
    };
  }

  return db;
}

let storeState: DatabaseState = seedData;
const listeners = new Set<() => void>();

function getInitialState(): DatabaseState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version === 3) {
        const merged = { ...seedData, ...parsed };
        const sanitized = sanitizeDatabase(merged);
        if (JSON.stringify(sanitized) !== JSON.stringify(merged)) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
        }
        return sanitized;
      }
    }
  } catch (e) {
    console.error('Error loading database state:', e);
  }
  return seedData;
}

storeState = getInitialState();

function emit() {
  listeners.forEach(l => l());
}

function saveState(nextState: DatabaseState) {
  storeState = nextState;
  try {
    // Clean up missing tasks from slots during saving
    const validTaskIds = new Set(nextState.items.filter(i => i.type === ItemType.TASK && !i.trash).map(t => t.id));
    nextState.timeSlots.forEach(slot => {
      slot.assignedTaskIds = (slot.assignedTaskIds || []).filter(id => validTaskIds.has(id));
    });

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextState));
  } catch (e) {
    console.error('Error saving state:', e);
  }
  emit();
}

export const rememberStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  
  getSnapshot() {
    return storeState;
  },

  // --- MUTATION ACTIONS ---

  createTask(data: {
    title: string;
    description: string;
    priority?: Priority;
    energyType?: EnergyType;
    estimatedHours?: string;
    taskState?: TaskState;
    goalId?: string;
    phaseId?: string;
    timeSlotId?: string;
    favourite?: boolean;
    tags?: string[];
  }) {
    const newTask: Item = {
      id: 'task-' + Math.random().toString(36).substring(2, 9),
      type: ItemType.TASK,
      title: data.title,
      description: data.description || '',
      completed: false,
      archived: false,
      trash: false,
      taskState: data.taskState || TaskState.NOT_STARTED,
      priority: data.priority || Priority.MEDIUM,
      energyType: data.energyType || EnergyType.ANALYTICAL,
      estimatedHours: parseFloat(data.estimatedHours || '1') || 1,
      focusLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      goalId: data.goalId || undefined,
      phaseId: data.phaseId || undefined,
      timeSlotId: data.timeSlotId || undefined,
      favourite: data.favourite || false,
      tags: data.tags || []
    };
    saveState({
      ...storeState,
      items: [...storeState.items, newTask]
    });
    return newTask.id;
  },

  createActivity(data: { title: string; description: string; category?: string; favourite?: boolean; tags?: string[] }) {
    const newAct: Item = {
      id: 'act-' + Math.random().toString(36).substring(2, 9),
      type: ItemType.ACTIVITY,
      title: data.title,
      description: data.description || '',
      category: data.category || 'OTHER',
      suggestedCount: 1,
      doneCount: 0,
      completed: false,
      archived: false,
      trash: false,
      createdAt: new Date().toISOString(),
      favourite: data.favourite || false,
      tags: data.tags || []
    };
    saveState({
      ...storeState,
      items: [...storeState.items, newAct]
    });
    return newAct.id;
  },

  createReminder(data: { title: string; description: string; date?: string; time?: string; favourite?: boolean; tags?: string[] }) {
    const newRem: Item = {
      id: 'rem-' + Math.random().toString(36).substring(2, 9),
      type: ItemType.REMINDER,
      title: data.title,
      description: data.description || '',
      completed: false,
      archived: false,
      trash: false,
      pinned: false,
      remindAt: {
        dates: [data.date || getLocalDateStr()],
        time: data.time || '12:00'
      },
      createdAt: new Date().toISOString(),
      favourite: data.favourite || false,
      tags: data.tags || []
    };
    saveState({
      ...storeState,
      items: [...storeState.items, newRem]
    });
    return newRem.id;
  },

  createMemo(data: { title: string; description: string; startDate?: string; endDate?: string; favourite?: boolean; tags?: string[] }) {
    const newMemo: Item = {
      id: 'memo-' + Math.random().toString(36).substring(2, 9),
      type: ItemType.MEMO,
      title: data.title,
      description: data.description || '',
      completed: false,
      archived: false,
      trash: false,
      startDate: data.startDate || getLocalDateStr(),
      endDate: data.endDate || getLocalDateStr(),
      createdAt: new Date().toISOString(),
      favourite: data.favourite || false,
      tags: data.tags || []
    };
    saveState({
      ...storeState,
      items: [...storeState.items, newMemo]
    });
    return newMemo.id;
  },

  createPlan(data: { title: string; description: string; startMonth?: string; startYear?: string; endMonth?: string; endYear?: string; favourite?: boolean; tags?: string[] }) {
    const newPlan: Item = {
      id: 'plan-' + Math.random().toString(36).substring(2, 9),
      type: ItemType.PLAN,
      title: data.title,
      description: data.description || '',
      startMonth: parseInt(data.startMonth || '1') || 1,
      startYear: parseInt(data.startYear || '2026') || 2026,
      endMonth: parseInt(data.endMonth || '1') || 1,
      endYear: parseInt(data.endYear || '2026') || 2026,
      completed: false,
      archived: false,
      trash: false,
      createdAt: new Date().toISOString(),
      favourite: data.favourite || false,
      tags: data.tags || []
    };
    saveState({
      ...storeState,
      items: [...storeState.items, newPlan]
    });
    return newPlan.id;
  },

  updateItem(id: string, updates: Partial<Item>) {
    saveState({
      ...storeState,
      items: storeState.items.map(item =>
        item.id === id
          ? ({ ...item, ...updates, updatedAt: new Date().toISOString() } as Item)
          : item
      )
    });
  },

  deleteItem(id: string) {
    this.updateItem(id, { trash: true });
  },

  restoreItem(id: string) {
    this.updateItem(id, { trash: false });
  },

  archiveItem(id: string) {
    this.updateItem(id, { archived: true });
  },

  unarchiveItem(id: string) {
    this.updateItem(id, { archived: false });
  },

  toggleItemCompleted(id: string) {
    saveState({
      ...storeState,
      items: storeState.items.map(item => {
        if (item.id === id) {
          const completed = !item.completed;
          let updates: any = { completed };
          if (item.type === ItemType.TASK) {
            updates.taskState = completed ? TaskState.COMPLETED : TaskState.NOT_STARTED;
          }
          return { ...item, ...updates, updatedAt: new Date().toISOString() };
        }
        return item;
      })
    });
  },

  registerActivityDone(id: string) {
    saveState({
      ...storeState,
      items: storeState.items.map(item => {
        if (item.id === id && item.type === ItemType.ACTIVITY) {
          return {
            ...item,
            doneCount: (item.doneCount || 0) + 1,
            lastDoneAt: new Date().toISOString()
          };
        }
        return item;
      })
    });
  },

  deleteItemPermanently(id: string) {
    saveState({
      ...storeState,
      items: storeState.items.filter(i => i.id !== id),
      timeSlots: storeState.timeSlots.map(slot => ({
        ...slot,
        assignedTaskIds: (slot.assignedTaskIds || []).filter(tid => tid !== id)
      }))
    });
  },

  emptyTrash() {
    saveState({
      ...storeState,
      items: storeState.items.filter(i => !i.trash)
    });
  },

  // --- SESSIONS ---

  createSession(taskId: string, plannedDuration: number, notes = '') {
    const newSession: Session = {
      id: 'session-' + Math.random().toString(36).substring(2, 9),
      taskId,
      plannedDuration,
      realDuration: 0,
      completed: false,
      notes,
      endTime: null
    };
    saveState({
      ...storeState,
      sessions: [...storeState.sessions, newSession]
    });
    return newSession.id;
  },

  updateSession(id: string, updates: Partial<Session>) {
    const nextSessions = storeState.sessions.map(s =>
      s.id === id ? { ...s, ...updates } : s
    );
    const session = nextSessions.find(s => s.id === id);

    let nextItems = storeState.items;
    if (session && (updates.progress !== undefined || updates.completed !== undefined)) {
      const isTaskCompleted = updates.progress === 100 || updates.completed === true;
      nextItems = storeState.items.map(item => {
        if (item.id === session.taskId) {
          return {
            ...item,
            progress: updates.progress !== undefined ? updates.progress : (item as any).progress,
            completed: isTaskCompleted,
            taskState: isTaskCompleted ? TaskState.COMPLETED : TaskState.IN_PROGRESS,
            lastProgress: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as Item;
        }
        return item;
      });
    }

    saveState({
      ...storeState,
      sessions: nextSessions,
      items: nextItems
    });
  },

  deleteSession(id: string) {
    saveState({
      ...storeState,
      sessions: storeState.sessions.filter(s => s.id !== id)
    });
  },

  endSession(sessionId: string, realDuration: number, completed: boolean, notes = '', taskUpdates: any = {}) {
    const nextSessions = storeState.sessions.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          realDuration,
          completed,
          notes,
          endTime: new Date().toISOString(),
          nextStep: taskUpdates.nextStep,
          progress: taskUpdates.progress
        };
      }
      return s;
    });

    const session = nextSessions.find(s => s.id === sessionId);
    let nextItems = storeState.items;

    if (session) {
      const isCompleted = completed || taskUpdates.progress === 100;
      nextItems = storeState.items.map(item => {
        if (item.id === session.taskId) {
          return {
            ...item,
            ...taskUpdates,
            progress: taskUpdates.progress !== undefined ? taskUpdates.progress : (item as any).progress,
            completed: isCompleted,
            taskState: isCompleted ? TaskState.COMPLETED : TaskState.IN_PROGRESS,
            lastProgress: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as Item;
        }
        return item;
      });
    }

    // Recalculate Streak
    const nextStats = {
      ...storeState.statistics,
      totalWorkedTime: (storeState.statistics.totalWorkedTime || 0) + realDuration,
      totalSessions: (storeState.statistics.totalSessions || 0) + 1,
      completedSessions: completed ? (storeState.statistics.completedSessions || 0) + 1 : (storeState.statistics.completedSessions || 0)
    };

    const dailyMinutes: Record<string, number> = {};
    nextSessions.forEach(s => {
      if (s.endTime) {
        const dStr = s.endTime.split('T')[0];
        dailyMinutes[dStr] = (dailyMinutes[dStr] || 0) + (s.realDuration || 0);
      }
    });

    const dates = Object.keys(dailyMinutes).sort();
    let currentStreak = 0;
    let longestStreak = 0;

    if (dates.length > 0) {
      let tempStreak = 1;
      longestStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const diffTime = Math.abs(new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          if (tempStreak > longestStreak) longestStreak = tempStreak;
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;

      const todayStr = getLocalDateStr();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateStr(yesterday);
      if (dates.includes(todayStr) || dates.includes(yesterdayStr)) {
        currentStreak = tempStreak;
      }
    }

    nextStats.currentStreak = currentStreak;
    nextStats.longestStreak = longestStreak;

    saveState({
      ...storeState,
      sessions: nextSessions,
      items: nextItems,
      statistics: nextStats
    });
  },

  // --- TIME SLOTS ---

  assignTaskToSlot(slotId: string, taskId: string) {
    saveState({
      ...storeState,
      timeSlots: storeState.timeSlots.map(slot => {
        if (slot.id === slotId) {
          const assigned = slot.assignedTaskIds || [];
          if (!assigned.includes(taskId)) {
            return { ...slot, assignedTaskIds: [...assigned, taskId] };
          }
        }
        return slot;
      })
    });
  },

  unassignTaskFromSlot(slotId: string, taskId: string) {
    saveState({
      ...storeState,
      timeSlots: storeState.timeSlots.map(slot => {
        if (slot.id === slotId) {
          return { ...slot, assignedTaskIds: (slot.assignedTaskIds || []).filter(id => id !== taskId) };
        }
        return slot;
      })
    });
  },

  // --- SETTINGS ---

  updateUserSettings(updates: Partial<UserSettings>) {
    saveState({
      ...storeState,
      userSettings: { ...storeState.userSettings, ...updates }
    });
  },

  // --- BACKUP ---

  importBackupData(jsonString: string): { success: boolean; errors: string[] } {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed === 'object') {
        if (parsed.version && parsed.items && Array.isArray(parsed.items)) {
          const merged = {
            version: parsed.version,
            items: parsed.items || [],
            goals: parsed.goals || [],
            lists: parsed.lists || [],
            timeSlots: parsed.timeSlots || DEFAULT_TIME_SLOTS,
            sessions: parsed.sessions || [],
            userSettings: parsed.userSettings || DEFAULT_USER_SETTINGS,
            statistics: parsed.statistics || DEFAULT_STATISTICS,
            activityCategories: parsed.activityCategories || DEFAULT_ACTIVITY_CATEGORIES,
            hourWeights: parsed.hourWeights || DEFAULT_HOUR_WEIGHTS,
            settings: parsed.settings || { proximityDays: 20, slotSeparationMinutes: 30 },
            recommendations: parsed.recommendations || []
          };
          const sanitized = sanitizeDatabase(merged);
          saveState(sanitized);
          return { success: true, errors: [] };
        }
      }
      return { success: false, errors: ['El formato del archivo JSON no es una base de datos V3 válida.'] };
    } catch (e: any) {
      return { success: false, errors: ['Error al analizar el JSON: ' + e.message] };
    }
  },

  clearAll() {
    saveState({
      ...seedData,
      items: [],
      sessions: [],
      goals: [],
      lists: [],
      statistics: DEFAULT_STATISTICS,
      timeSlots: DEFAULT_TIME_SLOTS,
      settings: {
        proximityDays: 20,
        slotSeparationMinutes: 30
      },
      recommendations: []
    });
  },

  resetToSeed() {
    saveState(seedData);
  }
};

export function useRememberStore() {
  return useSyncExternalStore(
    rememberStore.subscribe,
    rememberStore.getSnapshot
  );
}
