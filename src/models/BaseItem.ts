import { ItemType } from './ItemType';

export interface BaseItem {
  id: string;
  type: ItemType;
  title: string;
  description?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  archived: boolean;
  favourite: boolean;
  tags: string[];
  trash: boolean;
  deletedAt?: string; // ISO date when item was moved to trash

}
