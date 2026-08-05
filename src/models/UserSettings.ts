export interface TimeRange {
  start: string; // HH:MM
  end: string; // HH:MM
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
}

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
};
