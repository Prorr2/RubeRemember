import { MigrationEngine } from '../services/migration-engine';
import { Task, ItemType } from '../models/Item';

export const TaskRepository = {
  async getAll(): Promise<Task[]> {
    const db = await MigrationEngine.getDatabase();
    return (db.items || []).filter(item => item.type === ItemType.TASK) as Task[];
  },

  async getById(id: string): Promise<Task | undefined> {
    const db = await MigrationEngine.getDatabase();
    const item = (db.items || []).find(i => i.id === id);
    if (item && item.type === ItemType.TASK) {
      return item as Task;
    }
    return undefined;
  },

  async save(task: Task): Promise<void> {
    const db = await MigrationEngine.getDatabase();
    const items = [...(db.items || [])];
    const index = items.findIndex(i => i.id === task.id);
    
    if (index >= 0) {
      items[index] = task;
    } else {
      items.push(task);
    }
    
    db.items = items;
    await MigrationEngine.saveDatabase(db);
  },

  async saveAll(tasks: Task[]): Promise<void> {
    const db = await MigrationEngine.getDatabase();
    const items = [...(db.items || [])];
    
    tasks.forEach(task => {
      const index = items.findIndex(i => i.id === task.id);
      if (index >= 0) {
        items[index] = task;
      } else {
        items.push(task);
      }
    });

    db.items = items;
    await MigrationEngine.saveDatabase(db);
  },

  async delete(id: string): Promise<void> {
    const db = await MigrationEngine.getDatabase();
    db.items = (db.items || []).filter(i => i.id !== id);
    await MigrationEngine.saveDatabase(db);
  }
};
