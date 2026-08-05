import { BaseItem } from './BaseItem';
import { ItemType } from './ItemType';

export enum ActivityCategory {
  SPORT = 'SPORT',
  MOVIES = 'MOVIES',
  GAMES = 'GAMES',
  RESTAURANTS = 'RESTAURANTS',
  TRAVEL = 'TRAVEL',
  LEARNING = 'LEARNING',
  SOCIAL = 'SOCIAL',
  WALK = 'WALK',
  READING = 'READING',
  OTHER = 'OTHER'
}

export interface CustomCategory {
  id: string;
  name: string; // e.g. "🏃 Deporte" or "Deporte"
}

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

export interface Activity extends BaseItem {
  type: ItemType.ACTIVITY;
  category: string; // Dynamic custom categories or legacy enum keys
  suggestedCount: number;
  doneCount: number;
  lastSuggestedAt?: string; // ISO date string
  lastDoneAt?: string; // ISO date string
}
