import { BaseItem } from './BaseItem';
import { ItemType } from './ItemType';

export enum ReminderTriggerType {
  DATE = 'DATE',
  DATE_TIME = 'DATE_TIME',
  LOCATION = 'LOCATION', // future use
  MANUAL = 'MANUAL' // future use
}

export interface ReminderTrigger {
  type: ReminderTriggerType;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  dates?: string[]; // array of YYYY-MM-DD strings representing highlighted days/multiple dates
}

export interface Reminder extends BaseItem {
  type: ItemType.REMINDER;
  remindAt: ReminderTrigger;
  autoArchive: boolean;
  completed: boolean;
}
