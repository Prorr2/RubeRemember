import { MigrationEngine } from '../services/migration-engine';
import { Session } from '../models/Item';

export const SessionRepository = {
  async getAll(): Promise<Session[]> {
    const db = await MigrationEngine.getDatabase();
    return db.sessions || [];
  },

  async getById(id: string): Promise<Session | undefined> {
    const db = await MigrationEngine.getDatabase();
    return (db.sessions || []).find(s => s.id === id);
  },

  async save(session: Session): Promise<void> {
    const db = await MigrationEngine.getDatabase();
    const sessions = [...(db.sessions || [])];
    const index = sessions.findIndex(s => s.id === session.id);
    
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    
    db.sessions = sessions;
    await MigrationEngine.saveDatabase(db);
  },

  async delete(id: string): Promise<void> {
    const db = await MigrationEngine.getDatabase();
    db.sessions = (db.sessions || []).filter(s => s.id !== id);
    await MigrationEngine.saveDatabase(db);
  }
};
