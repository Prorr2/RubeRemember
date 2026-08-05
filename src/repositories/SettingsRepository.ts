import { MigrationEngine } from '../services/migration-engine';
import { UserSettings, DEFAULT_USER_SETTINGS } from '../models/Item';

export const SettingsRepository = {
  async getSettings(): Promise<UserSettings> {
    const db = await MigrationEngine.getDatabase();
    return db.userSettings || DEFAULT_USER_SETTINGS;
  },

  async save(settings: UserSettings): Promise<void> {
    const db = await MigrationEngine.getDatabase();
    db.userSettings = settings;
    await MigrationEngine.saveDatabase(db);
  }
};
