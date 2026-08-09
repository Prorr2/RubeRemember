export interface ListItem {
  id: string;
  text: string;
  imageUri?: string;
  alarmTime?: string;
  completed?: boolean;
}

export interface ReminderList {
  id: string;
  name: string;
  items: ListItem[];
  collapsed?: boolean;
  createdAt: string;
  alarmTime?: string;
  parentId?: string;
}
