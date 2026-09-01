export interface TimeRange {
  start: string; // HH:MM
  end: string; // HH:MM
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
  defaultCooldown: number; // in minutes (default 120 = 2 hours)
  notificationsEnabled: boolean;
  sleepSchedule?: TimeRange;
  workingHours?: TimeRange;
  preferredOrderEnergy?: string[]; // array of EnergyType string values
  preferredOrderWeight?: string[]; // array of HourWeight/HourWeight name strings

  // Weights duration configuration (in minutes)
  lunaDuration: number;
  terraDuration: number;
  solDuration: number;
  astraDuration: number;

  // Voice command assistant keywords
  voiceKeywords?: VoiceKeywords;

  // Custom task priority score formula
  scoreFormula?: string;

  // Dropbox configuration and status
  dropboxAccessToken?: string;
  dropboxAutoUploadEnabled?: boolean;
  lastDropboxUploadTimestamp?: number;
  lastDropboxUploadStatus?: string;
  dropboxFileName?: string;
  hasLocalChanges?: boolean;
  dropboxSyncCooldownMinutes?: number;
  lastDropboxSlotIndex?: number;
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
  defaultCooldown: 120, // 2 hours
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
  dropboxAutoUploadEnabled: true,
  lastDropboxUploadTimestamp: 0,
  lastDropboxUploadStatus: 'No sincronizado aún',
  dropboxFileName: 'rube_remember_backup.json',
  hasLocalChanges: false,
  dropboxSyncCooldownMinutes: 10,
  lastDropboxSlotIndex: 1,
};


