import { MigrationEngine } from '../services/migration-engine';
import { Reminder as ReminderV2, ItemType } from '../models/Item';

export const ReminderRepository = {
  async getAll(): Promise<ReminderV2[]> {
    const db = await MigrationEngine.getDatabase();
    return (db.items || []).filter(item => item.type === ItemType.REMINDER) as ReminderV2[];
  },

  async getById(id: string): Promise<ReminderV2 | undefined> {
    const db = await MigrationEngine.getDatabase();
    const item = (db.items || []).find(i => i.id === id);
    if (item && item.type === ItemType.REMINDER) {
      return item as ReminderV2;
    }
    return undefined;
  },

  async save(reminder: ReminderV2): Promise<void> {
    const db = await MigrationEngine.getDatabase();
    const items = [...(db.items || [])];
    const index = items.findIndex(i => i.id === reminder.id);
    
    if (index >= 0) {
      items[index] = reminder;
    } else {
      items.push(reminder);
    }
    
    db.items = items;
    await MigrationEngine.saveDatabase(db);
  },

  async delete(id: string): Promise<void> {
    const db = await MigrationEngine.getDatabase();
    db.items = (db.items || []).filter(i => i.id !== id);
    await MigrationEngine.saveDatabase(db);
  }
};
