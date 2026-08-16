import { BaseItem } from './BaseItem';
import { ItemType } from './ItemType';
import { Comment } from './Comment';

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
  THINKING = 'THINKING',
  PREPARING = 'PREPARING',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  WAITING = 'WAITING',
  COMPLETED = 'COMPLETED'
}

export interface Task extends BaseItem {
  type: ItemType.TASK;
  completed: boolean;
  startDate?: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  estimatedHours?: number;
  priority: Priority;
  goalId?: string;
  phaseId?: string;
  timeSlotId?: string;
  time?: string; // HH:MM (calculated from slot or custom)
  comments: Comment[];
  habit?: boolean; // true when the task is saved as a habit
  habitTime?: string; // HH:MM configurable time shown for the habit
  active?: boolean; // true when the task is marked as Active ("Trabajando en este momento")

  // Cognitive Engine fields
  executionStrategy?: ExecutionStrategy;
  energyType?: EnergyType;
  taskState?: TaskState;
  focusLocked?: boolean;
  progress?: number; // percentage (0-100) or metric
  nextStep?: string; // for SOL peso
  lastProgress?: string; // ISO date string
  workedTime?: number; // total minutes worked
  sessionsCount?: number;
  lastSession?: string; // ISO date string of last session
  recommendationCooldown?: string; // ISO date string when cooldown ends
  images?: string[];
}
