export interface TaskCategory {
  id: string;
  name: string;
  emoji: string;
}

export const DEFAULT_TASK_CATEGORIES: TaskCategory[] = [
  { id: 'WORK', name: 'Trabajo', emoji: '💼' },
  { id: 'PERSONAL', name: 'Personal', emoji: '👤' },
  { id: 'HEALTH', name: 'Salud', emoji: '🏋️' },
  { id: 'STUDY', name: 'Estudios', emoji: '📚' },
];
