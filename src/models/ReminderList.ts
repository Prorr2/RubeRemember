export interface ListItem {
  id: string;
  text: string;
  imageUri?: string;
  alarmTime?: string;
}

export interface ReminderList {
  id: string;
  name: string;
  items: ListItem[];
  collapsed?: boolean;
  createdAt: string;
  alarmTime?: string;
}
