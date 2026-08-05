export interface Statistics {
  totalSessions: number;
  totalWorkedTime: number; // in minutes
  completedTasks: number;
  focusTasksCompleted: number;
  currentStreak: number;
  longestStreak: number;
  averageSessionTime: number; // in minutes
  averageDailyWork: number; // in minutes
  lastActivity?: string; // ISO date string
}

export const DEFAULT_STATISTICS: Statistics = {
  totalSessions: 0,
  totalWorkedTime: 0,
  completedTasks: 0,
  focusTasksCompleted: 0,
  currentStreak: 0,
  longestStreak: 0,
  averageSessionTime: 0,
  averageDailyWork: 0,
};
