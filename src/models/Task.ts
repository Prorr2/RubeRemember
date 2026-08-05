import { BaseItem } from './BaseItem';
import { ItemType } from './ItemType';
import { Comment } from './Comment';

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
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

}
