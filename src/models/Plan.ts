import { BaseItem } from './BaseItem';
import { ItemType } from './ItemType';

export interface Plan extends BaseItem {
  type: ItemType.PLAN;
  startMonth?: number; // 1-12
  startYear?: number;
  endMonth?: number;   // 1-12
  endYear?: number;
  completed: boolean;
}
