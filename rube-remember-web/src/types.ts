// ─── Enums ───────────────────────────────────────────────────────────────────

export enum ItemType {
  TASK = 'TASK',
  REMINDER = 'REMINDER',
  ACTIVITY = 'ACTIVITY',
  MEMO = 'MEMO',
  PLAN = 'PLAN'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum ExecutionStrategy {
  SPRINT = 'SPRINT',
  MARATHON = 'MARATHON',
  CONSTANCY = 'CONSTANCY',
  WAIT = 'WAIT'
}

export enum EnergyType {
  CREATIVE = 'CREATIVE',
  ANALYTICAL = 'ANALYTICAL',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  SOCIAL = 'SOCIAL',
  PHYSICAL = 'PHYSICAL',
  LEARNING = 'LEARNING'
}

export enum TaskState {
  NOT_STARTED = 'NOT_STARTED',
  THINKING = 'THINKING',
  PREPARING = 'PREPARING',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  WAITING = 'WAITING',
  COMPLETED = 'COMPLETED'
}

// ─── Base Interfaces ─────────────────────────────────────────────────────────

export interface BaseItem {
  id: string;
  type: ItemType;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  archived?: boolean;
  favourite?: boolean;
  tags?: string[];
  trash?: boolean;
  deletedAt?: string;
  completed?: boolean;
  pinned?: boolean;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
  images?: string[];
}

// ─── Item Interfaces ─────────────────────────────────────────────────────────

export interface Task extends BaseItem {
  type: ItemType.TASK;
  completed: boolean;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  priority: Priority;
  goalId?: string;
  phaseId?: string;
  parentTaskId?: string;
  categoryId?: string;
  timeSlotId?: string;
  time?: string;
  comments?: Comment[];
  habit?: boolean;
  habitTime?: string;
  completedDates?: string[];
  active?: boolean;
  activeOrder?: number;
  executionStrategy?: ExecutionStrategy;
  energyType?: EnergyType;
  taskState?: TaskState;
  focusLocked?: boolean;
  progress?: number;
  nextStep?: string;
  lastProgress?: string;
  workedTime?: number;
  sessionsCount?: number;
  lastSession?: string;
  recommendationCooldown?: string;
  images?: string[];
}

export interface Activity extends BaseItem {
  type: ItemType.ACTIVITY;
  category: string;
  suggestedCount: number;
  doneCount: number;
  lastSuggestedAt?: string;
  lastDoneAt?: string;
}

export enum ReminderTriggerType {
  DATE = 'DATE',
  DATE_TIME = 'DATE_TIME',
  LOCATION = 'LOCATION',
  MANUAL = 'MANUAL'
}

export interface ReminderTrigger {
  type?: ReminderTriggerType;
  date?: string;
  time?: string;
  dates: string[];
}

export interface Reminder extends BaseItem {
  type: ItemType.REMINDER;
  remindAt: ReminderTrigger;
  autoArchive?: boolean;
  completed: boolean;
  pinned?: boolean;
}

export interface Memo extends BaseItem {
  type: ItemType.MEMO;
  startDate?: string;
  endDate?: string;
  hasAlarm?: boolean;
  alarmTime?: string;
  completed: boolean;
}

export interface Plan extends BaseItem {
  type: ItemType.PLAN;
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
  completed: boolean;
}

export type Item = Task | Activity | Reminder | Memo | Plan;

// ─── Goal & Phase ────────────────────────────────────────────────────────────

export interface Phase {
  id: string;
  name: string;
  description: string;
  order: number;
  completed?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  phases: Phase[];
  createdAt: string;
  updatedAt?: string;
  completed?: boolean;
  isMain?: boolean;
  emoji?: string;
}

// ─── TimeSlot ────────────────────────────────────────────────────────────────

export interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  assignedTaskIds?: string[];
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  taskId: string;
  startTime?: string;
  endTime?: string;
  plannedDuration: number;
  realDuration?: number;
  completed: boolean;
  notes?: string;
  title?: string;
  createdAt?: string;
  nextStep?: string;
  progress?: number;
  notesImages?: string[];
  nextStepImages?: string[];
}

// ─── Recommendation ──────────────────────────────────────────────────────────

export interface Recommendation {
  id: string;
  taskId?: string;
  score: number;
  reason: string;
  reasonsSecondary?: string[];
  recommendedDuration: number;
  generatedAt: string;
  priorityLevel: string;
  energyAdjustment?: number;
  transitionAdjustment?: number;
  confidenceLevel?: number;
  sessionType?: string;
  actionSuggested?: string;
  alternatives?: string[];
}

// ─── Lists ───────────────────────────────────────────────────────────────────

export interface ListItem {
  id: string;
  text: string;
  title?: string;
  imageUri?: string;
  images?: string[];
  alarmTime?: string;
  completed?: boolean;
}

export interface ReminderList {
  id: string;
  name: string;
  items: ListItem[];
  collapsed?: boolean;
  createdAt: string;
  alarmTime?: string;
  parentId?: string;
}

// ─── Categories & Weights ────────────────────────────────────────────────────

export interface CustomCategory {
  id: string;
  name: string;
}

export interface TaskCategory {
  id: string;
  name: string;
  emoji: string;
}

export interface HourWeight {
  id: string;
  name: string;
  minHours: number;
}

// ─── Statistics ──────────────────────────────────────────────────────────────

export interface Statistics {
  totalSessions: number;
  totalWorkedTime: number;
  completedTasks: number;
  focusTasksCompleted: number;
  currentStreak: number;
  longestStreak: number;
  averageSessionTime: number;
  averageDailyWork: number;
  completedSessions?: number;
  lastActivity?: string;
}

// ─── User Settings ───────────────────────────────────────────────────────────

export interface TimeRange {
  start: string;
  end: string;
}

export interface VoiceKeywords {
  type: string[];
  title: string[];
  description: string[];
  priority: string[];
  weight: string[];
  hours: string[];
  date: string[];
  time: string[];
  energy: string[];
  slot: string[];
  goal: string[];
  favourite: string[];
  queryLists: string[];
  queryListItems: string[];
  addListItem: string[];
}

export interface UserSettings {
  maxFocusTasks: number;
  defaultFocusDuration: number;
  defaultCooldown: number;
  notificationsEnabled: boolean;
  sleepSchedule?: TimeRange;
  workingHours?: TimeRange;
  preferredOrderEnergy?: string[];
  preferredOrderWeight?: string[];
  lunaDuration: number;
  terraDuration: number;
  solDuration: number;
  astraDuration: number;
  voiceKeywords?: VoiceKeywords;
  scoreFormula?: string;
  dropboxAccessToken?: string;
  dropboxRefreshToken?: string;
  dropboxAppKey?: string;
  dropboxAppSecret?: string;
  dropboxTokenFetchedTimestamp?: number;
  dropboxAutoUploadEnabled?: boolean;
  lastDropboxUploadTimestamp?: number;
  lastDropboxUploadStatus?: string;
  dropboxFileName?: string;
  hasLocalChanges?: boolean;
  dropboxSyncCooldownMinutes?: number;
  lastDropboxSlotIndex?: number;
  lastDropboxCommentCount?: number;
  lastDropboxSessionCount?: number;
  dropboxStorageBudgetMB?: number;
  lastDropboxSnapshotFiles?: string[];
  lastDropboxRestoredFiles?: string[];
  lastDropboxRestoreTimestamp?: number;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_VOICE_KEYWORDS: VoiceKeywords = {
  type: ['tipo de elemento', 'tipo elemento', 'tipo', 'crear'],
  title: ['titulo', 'nombre', 'tarea', 'recordatorio', 'alarma', 'ocio', 'actividad', 'plan'],
  description: ['descripcion', 'nota', 'detalle', 'descripcion de', 'nota de'],
  priority: ['prioridad', 'importancia'],
  weight: ['peso', 'bloque', 'clasificacion'],
  hours: ['horas', 'duracion', 'tiempo', 'horas estimadas'],
  date: ['fecha', 'dia', 'para el', 'fecha de'],
  time: ['hora', 'a las'],
  energy: ['energia', 'tipo de energia', 'actitud'],
  slot: ['franja', 'horario', 'bloque de tiempo'],
  goal: ['meta', 'objetivo'],
  favourite: ['favorito', 'destacado', 'importante'],
  queryLists: ['nombre de todas las listas', 'cuales son mis listas', 'que listas tengo', 'listas', 'cuales son las listas'],
  queryListItems: ['elementos de la lista', 'que tiene la lista', 'ver lista', 'contenido de la lista', 'que elementos tiene la lista'],
  addListItem: ['añadir elemento a la lista', 'añade a la lista', 'agregar a la lista', 'poner en la lista', 'añadir a la lista', 'agrega a la lista'],
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  maxFocusTasks: 3,
  defaultFocusDuration: 30,
  defaultCooldown: 120,
  notificationsEnabled: true,
  sleepSchedule: { start: '23:00', end: '07:00' },
  workingHours: { start: '09:00', end: '18:00' },
  preferredOrderEnergy: ['CREATIVE', 'ANALYTICAL', 'LEARNING', 'SOCIAL', 'ADMINISTRATIVE', 'PHYSICAL'],
  preferredOrderWeight: ['LUNA', 'TERRA', 'SOL', 'ASTRA'],
  lunaDuration: 30,
  terraDuration: 45,
  solDuration: 90,
  astraDuration: 20,
  voiceKeywords: DEFAULT_VOICE_KEYWORDS,
  scoreFormula: '((hours * (priorityWeight * priorityWeight)) / daysRemaining) / 1000',
  dropboxAccessToken: '',
  dropboxRefreshToken: '',
  dropboxAppKey: '',
  dropboxAppSecret: '',
  dropboxTokenFetchedTimestamp: 0,
  dropboxAutoUploadEnabled: true,
  lastDropboxUploadTimestamp: 0,
  lastDropboxUploadStatus: 'No sincronizado aún',
  dropboxFileName: 'rube_remember_backup.json',
  hasLocalChanges: false,
  dropboxSyncCooldownMinutes: 60,
  lastDropboxSlotIndex: 1,
  lastDropboxCommentCount: 0,
  lastDropboxSessionCount: 0,
  dropboxStorageBudgetMB: 1500,
  lastDropboxSnapshotFiles: [],
};

export const DEFAULT_HOUR_WEIGHTS: HourWeight[] = [
  { id: 'luna', name: '🌙 Luna', minHours: 1 },
  { id: 'terra', name: '🌍 Terra', minHours: 5 },
  { id: 'sol', name: '☀️ Sol', minHours: 10 },
];

export const DEFAULT_ACTIVITY_CATEGORIES: CustomCategory[] = [
  { id: 'SPORT', name: '🏃 Deporte' },
  { id: 'MOVIES', name: '🎬 Cine/Series' },
  { id: 'GAMES', name: '🎮 Juegos' },
  { id: 'RESTAURANTS', name: '🍔 Restaurantes' },
  { id: 'TRAVEL', name: '✈ Viajes' },
  { id: 'LEARNING', name: '📚 Leer/Aprender' },
  { id: 'SOCIAL', name: '👥 Social' },
  { id: 'WALK', name: '🌳 Pasear' },
  { id: 'READING', name: '📖 Lectura' },
  { id: 'OTHER', name: '✨ Otro' },
];

export const DEFAULT_TASK_CATEGORIES: TaskCategory[] = [
  { id: 'WORK', name: 'Trabajo', emoji: '💼' },
  { id: 'PERSONAL', name: 'Personal', emoji: '👤' },
  { id: 'HEALTH', name: 'Salud', emoji: '🏋️' },
  { id: 'STUDY', name: 'Estudios', emoji: '📚' },
];

export const DEFAULT_STATISTICS: Statistics = {
  totalSessions: 0,
  totalWorkedTime: 0,
  completedTasks: 0,
  focusTasksCompleted: 0,
  currentStreak: 0,
  longestStreak: 0,
  averageSessionTime: 0,
  averageDailyWork: 0,
};

export const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { id: 'slot-1', name: 'Bloque Mañana', startTime: '09:00', endTime: '12:00' },
  { id: 'slot-2', name: 'Enfoque Mediodía', startTime: '12:30', endTime: '14:30' },
  { id: 'slot-3', name: 'Sesión Tarde', startTime: '15:30', endTime: '18:00' }
];
