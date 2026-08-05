export interface HourWeight {
  id: string;
  name: string;
  minHours: number;
}

export const DEFAULT_HOUR_WEIGHTS: HourWeight[] = [
  { id: 'luna', name: '🌙 Luna', minHours: 1 },
  { id: 'terra', name: '🌍 Terra', minHours: 5 },
  { id: 'sol', name: '☀️ Sol', minHours: 10 },
];
