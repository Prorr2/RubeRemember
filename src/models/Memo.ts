import { BaseItem } from './BaseItem';
import { ItemType } from './ItemType';

export interface Memo extends BaseItem {
  type: ItemType.MEMO;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  hasAlarm: boolean;
  alarmTime?: string; // HH:MM
  completed: boolean;
}
