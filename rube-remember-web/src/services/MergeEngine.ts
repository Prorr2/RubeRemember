import {
  Item,
  ItemType,
  Task,
  Comment,
  Goal,
  TimeSlot,
  Session,
  UserSettings,
  Statistics,
  HourWeight,
  CustomCategory,
  TaskCategory,
  DEFAULT_USER_SETTINGS,
  DEFAULT_HOUR_WEIGHTS,
  DEFAULT_ACTIVITY_CATEGORIES,
  DEFAULT_TASK_CATEGORIES,
  DEFAULT_STATISTICS,
  DEFAULT_TIME_SLOTS
} from '../types';
import type { DatabaseState } from '../store';

export interface MergeStats {
  itemsAddedFromRemote: number;
  itemsKeptFromLocal: number;
  itemsUpdatedFromRemote: number;
  itemsUpdatedFromLocal: number;
  commentsMerged: number;
  goalsMerged: number;
  listsMerged: number;
  sessionsMerged: number;
  timestamp: number;
}

export interface MergeResult {
  success: boolean;
  merged?: DatabaseState;
  stats?: MergeStats;
  error?: string;
  rolledBack?: boolean;
}

const PRE_MERGE_BACKUP_KEY = 'rube_v3_pre_merge_backup';

function getItemTimestamp(item: Item): number {
  if (item.updatedAt) {
    const t = new Date(item.updatedAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (item.createdAt) {
    const t = new Date(item.createdAt).getTime();
    if (!isNaN(t)) return t;
  }
  return 0;
}

function getCommentTimestamp(c: Comment): number {
  if (c.createdAt) {
    const t = new Date(c.createdAt).getTime();
    if (!isNaN(t)) return t;
  }
  return 0;
}

function countActiveComments(items: Item[]): number {
  return items.reduce((sum, it) => {
    if (it.type === ItemType.TASK && !it.trash) {
      const task = it as Task;
      return sum + (task.comments ? task.comments.length : 0);
    }
    return sum;
  }, 0);
}

function countActiveTasks(items: Item[]): number {
  return items.filter(i => i.type === ItemType.TASK && !i.trash).length;
}

/**
 * Merges comments of two versions of the same task non-destructively.
 */
function mergeComments(localComments: Comment[] = [], remoteComments: Comment[] = []): Comment[] {
  const commentMap = new Map<string, Comment>();

  // Helper key for comments without id
  const getKey = (c: Comment) => c.id || `${c.createdAt}_${c.text.slice(0, 30)}`;

  for (const c of localComments) {
    commentMap.set(getKey(c), c);
  }

  for (const c of remoteComments) {
    const key = getKey(c);
    if (!commentMap.has(key)) {
      commentMap.set(key, c);
    } else {
      // If both have it, take the one with newer timestamp or more images
      const existing = commentMap.get(key)!;
      const tExisting = getCommentTimestamp(existing);
      const tRemote = getCommentTimestamp(c);
      if (tRemote > tExisting || ((c.images?.length || 0) > (existing.images?.length || 0))) {
        commentMap.set(key, c);
      }
    }
  }

  // Sort by createdAt
  return Array.from(commentMap.values()).sort((a, b) => getCommentTimestamp(a) - getCommentTimestamp(b));
}

/**
 * Merges two items with the same ID.
 */
function mergeItemPair(localItem: Item, remoteItem: Item): { item: Item; winner: 'local' | 'remote' } {
  const tLocal = getItemTimestamp(localItem);
  const tRemote = getItemTimestamp(remoteItem);

  const isRemoteNewer = tRemote > tLocal;
  const base = isRemoteNewer ? { ...remoteItem } : { ...localItem };

  // Soft delete rule: if either was marked as trash, stay trash! Never accidentally resurrect
  if (localItem.trash || remoteItem.trash) {
    base.trash = true;
  }

  // Completed rule: if marked completed recently
  const locCompleted = 'completed' in localItem ? (localItem as any).completed : undefined;
  const remCompleted = 'completed' in remoteItem ? (remoteItem as any).completed : undefined;
  if (locCompleted !== undefined && remCompleted !== undefined && locCompleted !== remCompleted) {
    (base as any).completed = isRemoteNewer ? remCompleted : locCompleted;
  }

  // Task comments preservation: never lose comments
  if (base.type === ItemType.TASK) {
    const taskLocal = localItem as Task;
    const taskRemote = remoteItem as Task;
    const mergedComments = mergeComments(taskLocal.comments || [], taskRemote.comments || []);
    (base as Task).comments = mergedComments;

    // Merge image references
    const allImages = Array.from(new Set([...(taskLocal.images || []), ...(taskRemote.images || [])]));
    if (allImages.length > 0) {
      (base as Task).images = allImages;
    }
  }

  return { item: base, winner: isRemoteNewer ? 'remote' : 'local' };
}

/**
 * Merges lists collection preserving items within lists.
 */
function mergeLists(localLists: any[] = [], remoteLists: any[] = []): any[] {
  const listMap = new Map<string, any>();

  for (const l of localLists) {
    listMap.set(l.id, l);
  }

  for (const r of remoteLists) {
    if (!listMap.has(r.id)) {
      listMap.set(r.id, r);
    } else {
      const loc = listMap.get(r.id)!;
      // Merge items inside the list by id
      const itemMap = new Map<string, any>();
      (loc.items || []).forEach((it: any) => itemMap.set(it.id, it));
      (r.items || []).forEach((it: any) => {
        if (!itemMap.has(it.id)) {
          itemMap.set(it.id, it);
        } else {
          // Compare updatedAt or take completed if toggle happened
          const localSub = itemMap.get(it.id);
          const tLoc = localSub.updatedAt ? new Date(localSub.updatedAt).getTime() : 0;
          const tRem = it.updatedAt ? new Date(it.updatedAt).getTime() : 0;
          itemMap.set(it.id, tRem > tLoc ? it : localSub);
        }
      });
      listMap.set(r.id, {
        ...loc,
        ...r,
        items: Array.from(itemMap.values())
      });
    }
  }

  return Array.from(listMap.values());
}

/**
 * Merges generic collections by ID with updatedAt comparison.
 */
function mergeById<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  localList: T[] = [],
  remoteList: T[] = []
): T[] {
  const map = new Map<string, T>();
  for (const l of localList) map.set(l.id, l);
  for (const r of remoteList) {
    if (!map.has(r.id)) {
      map.set(r.id, r);
    } else {
      const existing = map.get(r.id)!;
      const tEx = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const tRem = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
      if (tRem > tEx) {
        map.set(r.id, r);
      }
    }
  }
  return Array.from(map.values());
}

export const MergeEngine = {
  savePreMergeBackup(localDb: DatabaseState) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(PRE_MERGE_BACKUP_KEY, JSON.stringify(localDb));
    } catch (e) {
      console.warn('[MergeEngine] Error guardando backup pre-merge:', e);
    }
  },

  restorePreMergeBackup(): DatabaseState | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(PRE_MERGE_BACKUP_KEY);
      if (raw) {
        return JSON.parse(raw) as DatabaseState;
      }
    } catch (e) {
      console.error('[MergeEngine] Error restaurando backup pre-merge:', e);
    }
    return null;
  },

  validatePreMerge(localDb: DatabaseState, remoteDb: DatabaseState, force: boolean = false): { ok: boolean; reason?: string } {
    const localTasks = countActiveTasks(localDb.items || []);
    const remoteTasks = countActiveTasks(remoteDb.items || []);

    // Zero-task safety check
    if (!force && localTasks > 0 && remoteTasks === 0) {
      return {
        ok: false,
        reason: 'Zero-task safety: La base de datos remota tiene 0 tareas activas mientras que la local tiene ' + localTasks + '. Sincronización bloqueada para prevenir borrado masivo accidental.'
      };
    }

    if (!force && remoteTasks > 0 && localTasks === 0 && (localDb.items || []).length > 5) {
      return {
        ok: false,
        reason: 'Zero-task safety: Estado local irregular detectado.'
      };
    }

    return { ok: true };
  },

  validatePostMerge(mergedDb: DatabaseState, localDb: DatabaseState, remoteDb: DatabaseState): { ok: boolean; reason?: string } {
    const localComments = countActiveComments(localDb.items || []);
    const remoteComments = countActiveComments(remoteDb.items || []);
    const mergedComments = countActiveComments(mergedDb.items || []);

    const maxExpectedComments = Math.max(localComments, remoteComments);

    // Comment integrity check: merged comments should never be less than either source
    if (maxExpectedComments > 0 && mergedComments < maxExpectedComments) {
      return {
        ok: false,
        reason: `Violación de integridad de comentarios: Se esperaban al menos ${maxExpectedComments} notas pero el resultado final tiene ${mergedComments}.`
      };
    }

    // Task count check: merged tasks should not drop below max
    const localTasks = countActiveTasks(localDb.items || []);
    const remoteTasks = countActiveTasks(remoteDb.items || []);
    const mergedTasks = countActiveTasks(mergedDb.items || []);

    if (localTasks > 0 && remoteTasks > 0 && mergedTasks < Math.min(localTasks, remoteTasks)) {
      return {
        ok: false,
        reason: `Violación de población de tareas: Resultado contiene menos tareas activas (${mergedTasks}) que las existentes.`
      };
    }

    return { ok: true };
  },

  mergeDatabases(localDb: DatabaseState, remoteDb: DatabaseState, options?: { force?: boolean }): MergeResult {
    // 1. Pre-merge validation
    const preVal = this.validatePreMerge(localDb, remoteDb, options?.force);
    if (!preVal.ok) {
      return { success: false, error: preVal.reason };
    }

    // 2. Save pre-merge snapshot
    this.savePreMergeBackup(localDb);

    const stats: MergeStats = {
      itemsAddedFromRemote: 0,
      itemsKeptFromLocal: 0,
      itemsUpdatedFromRemote: 0,
      itemsUpdatedFromLocal: 0,
      commentsMerged: 0,
      goalsMerged: 0,
      listsMerged: 0,
      sessionsMerged: 0,
      timestamp: Date.now()
    };

    // 3. Merge Items
    const itemMap = new Map<string, Item>();
    const localItems = localDb.items || [];
    const remoteItems = remoteDb.items || [];

    for (const it of localItems) {
      itemMap.set(it.id, it);
    }

    for (const rIt of remoteItems) {
      if (!itemMap.has(rIt.id)) {
        itemMap.set(rIt.id, rIt);
        stats.itemsAddedFromRemote++;
      } else {
        const lIt = itemMap.get(rIt.id)!;
        const { item: mergedItem, winner } = mergeItemPair(lIt, rIt);
        itemMap.set(rIt.id, mergedItem);
        if (winner === 'remote') {
          stats.itemsUpdatedFromRemote++;
        } else {
          stats.itemsUpdatedFromLocal++;
        }
      }
    }

    stats.itemsKeptFromLocal = localItems.length - stats.itemsUpdatedFromRemote;

    // 4. Merge Collections
    const mergedGoals = mergeById<Goal>(localDb.goals || [], remoteDb.goals || []);
    stats.goalsMerged = mergedGoals.length;

    const mergedLists = mergeLists(localDb.lists || [], remoteDb.lists || []);
    stats.listsMerged = mergedLists.length;

    const mergedSessions = mergeById<Session>(localDb.sessions || [], remoteDb.sessions || []);
    stats.sessionsMerged = mergedSessions.length;

    const mergedTimeSlots = mergeById<TimeSlot>(localDb.timeSlots || DEFAULT_TIME_SLOTS, remoteDb.timeSlots || []);
    const mergedActivityCategories = mergeById<CustomCategory>(localDb.activityCategories || DEFAULT_ACTIVITY_CATEGORIES, remoteDb.activityCategories || []);
    const mergedTaskCategories = mergeById<TaskCategory>(localDb.taskCategories || DEFAULT_TASK_CATEGORIES, remoteDb.taskCategories || []);
    const mergedHourWeights = mergeById<HourWeight>(localDb.hourWeights || DEFAULT_HOUR_WEIGHTS, remoteDb.hourWeights || []);

    // 5. Merge UserSettings: keep credentials from local if remote is blank
    const localSet = localDb.userSettings || DEFAULT_USER_SETTINGS;
    const remoteSet = remoteDb.userSettings || {};
    const mergedUserSettings: UserSettings = {
      ...localSet,
      ...remoteSet,
      // Preserve local secrets if remote sanitized them
      dropboxAccessToken: remoteSet.dropboxAccessToken || localSet.dropboxAccessToken || '',
      dropboxRefreshToken: remoteSet.dropboxRefreshToken || localSet.dropboxRefreshToken || '',
      dropboxAppKey: remoteSet.dropboxAppKey || localSet.dropboxAppKey || '',
      dropboxAppSecret: remoteSet.dropboxAppSecret || localSet.dropboxAppSecret || '',
      dropboxTokenFetchedTimestamp: remoteSet.dropboxTokenFetchedTimestamp || localSet.dropboxTokenFetchedTimestamp || 0,
      dropboxStorageBudgetMB: remoteSet.dropboxStorageBudgetMB || localSet.dropboxStorageBudgetMB || 1500,
    };

    // 6. Merge Statistics: max streaks, sum sessions
    const locStats = localDb.statistics || DEFAULT_STATISTICS;
    const remStats = remoteDb.statistics || DEFAULT_STATISTICS;
    const mergedStatistics: Statistics = {
      totalWorkedTime: Math.max(locStats.totalWorkedTime || 0, remStats.totalWorkedTime || 0),
      totalSessions: Math.max(locStats.totalSessions || 0, remStats.totalSessions || 0),
      completedTasks: Math.max(locStats.completedTasks || 0, remStats.completedTasks || 0),
      focusTasksCompleted: Math.max(locStats.focusTasksCompleted || 0, remStats.focusTasksCompleted || 0),
      currentStreak: Math.max(locStats.currentStreak || 0, remStats.currentStreak || 0),
      longestStreak: Math.max(locStats.longestStreak || 0, remStats.longestStreak || 0),
      averageSessionTime: Math.max(locStats.averageSessionTime || 0, remStats.averageSessionTime || 0),
      averageDailyWork: Math.max(locStats.averageDailyWork || 0, remStats.averageDailyWork || 0),
    };

    const mergedState: DatabaseState = {
      version: 3,
      items: Array.from(itemMap.values()),
      goals: mergedGoals,
      lists: mergedLists,
      timeSlots: mergedTimeSlots,
      sessions: mergedSessions,
      activityCategories: mergedActivityCategories,
      taskCategories: mergedTaskCategories,
      hourWeights: mergedHourWeights,
      userSettings: mergedUserSettings,
      statistics: mergedStatistics,
      settings: {
        proximityDays: remoteDb.settings?.proximityDays ?? localDb.settings?.proximityDays ?? 20,
        slotSeparationMinutes: remoteDb.settings?.slotSeparationMinutes ?? localDb.settings?.slotSeparationMinutes ?? 30,
      },
      recommendations: remoteDb.recommendations || localDb.recommendations || []
    };

    // 7. Post-merge validation
    const postVal = this.validatePostMerge(mergedState, localDb, remoteDb);
    if (!postVal.ok) {
      // Auto rollback
      this.restorePreMergeBackup();
      return {
        success: false,
        error: `Fallo post-merge: ${postVal.reason}. Se aplicó rollback automático.`,
        rolledBack: true
      };
    }

    return {
      success: true,
      merged: mergedState,
      stats
    };
  }
};
