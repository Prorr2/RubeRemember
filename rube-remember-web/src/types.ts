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

export enum TaskState {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
  WAITING = 'WAITING'
}

export enum EnergyType {
  CREATIVE = 'CREATIVE',
  ANALYTICAL = 'ANALYTICAL',
  LEARNING = 'LEARNING',
  SOCIAL = 'SOCIAL',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  PHYSICAL = 'PHYSICAL'
}

export interface BaseItem {
  id: string;
  type: ItemType;
  title: string;
  description?: string;
  completed: boolean;
  archived: boolean;
  trash: boolean;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
  favourite?: boolean;
}

export interface Task extends BaseItem {
  type: ItemType.TASK;
  taskState: TaskState;
  priority: Priority;
  energyType: EnergyType;
  estimatedHours: number;
  focusLocked: boolean;
  progress?: number;
  lastProgress?: string;
  startDate?: string;
  dueDate?: string;
  recommendationCooldown?: string;
  goalId?: string;
  phaseId?: string;
  timeSlotId?: string;
  time?: string;
  workedTime?: number;
  sessionsCount?: number;
  lastSession?: string;
  images?: string[];
  active?: boolean;
  habit?: boolean;
  habitTime?: string;
}

export interface Activity extends BaseItem {
  type: ItemType.ACTIVITY;
  category: string;
  suggestedCount: number;
  doneCount: number;
  lastSuggestedAt?: string;
  lastDoneAt?: string;
}

export interface Reminder extends BaseItem {
  type: ItemType.REMINDER;
  pinned: boolean;
  remindAt: {
    dates: string[];
    time: string;
  };
}

export interface Memo extends BaseItem {
  type: ItemType.MEMO;
  startDate?: string;
  endDate?: string;
}

export interface Plan extends BaseItem {
  type: ItemType.PLAN;
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
}

export type Item = Task | Activity | Reminder | Memo | Plan;

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
}

export interface HourWeight {
  id: string;
  name: string;
  minHours: number;
}

export interface CustomCategory {
  id: string;
  name: string;
}

export interface Statistics {
  totalWorkedTime: number;
  totalSessions: number;
  completedSessions: number;
  currentStreak: number;
  longestStreak: number;
}

export interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  assignedTaskIds: string[];
}

export interface Phase {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  order: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  completed: boolean;
  phases: Phase[];
  createdAt: string;
  updatedAt?: string;
}

export interface Session {
  id: string;
  taskId: string;
  plannedDuration: number;
  realDuration: number;
  completed: boolean;
  notes?: string;
  nextStep?: string;
  progress?: number;
  endTime?: string | null;
  notesImages?: string[];
  nextStepImages?: string[];
  title?: string;
}

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
  confidenceLevel: number;
  sessionType: string;
  actionSuggested: string;
  alternatives: string[];
}

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

export const DEFAULT_STATISTICS: Statistics = {
  totalWorkedTime: 0,
  totalSessions: 0,
  completedSessions: 0,
  currentStreak: 0,
  longestStreak: 0
};

export const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { id: 'slot-1', name: 'Bloque Mañana', startTime: '09:00', endTime: '12:00', assignedTaskIds: [] },
  { id: 'slot-2', name: 'Enfoque Mediodía', startTime: '12:30', endTime: '14:30', assignedTaskIds: [] },
  { id: 'slot-3', name: 'Sesión Tarde', startTime: '15:30', endTime: '18:00', assignedTaskIds: [] }
];
