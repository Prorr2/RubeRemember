import { MigrationEngine } from '../services/migration-engine';
import { Statistics, DEFAULT_STATISTICS } from '../models/Item';

export const StatisticsRepository = {
  async getStatistics(): Promise<Statistics> {
    const db = await MigrationEngine.getDatabase();
    return db.statistics || DEFAULT_STATISTICS;
  },

  async save(statistics: Statistics): Promise<void> {
    const db = await MigrationEngine.getDatabase();
    db.statistics = statistics;
    await MigrationEngine.saveDatabase(db);
  }
};
