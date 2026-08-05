import { useCallback } from 'react';
import { useRememberStore } from '../hooks/use-remember-store';
import { SessionRepository } from '../repositories/SessionRepository';
import { Session, TaskState, Task } from '../models/Item';
import { useTaskService } from './TaskService';
import { useStatisticsService } from './StatisticsService';

export function useSessionService() {
  const store = useRememberStore();
  const taskService = useTaskService();
  const statisticsService = useStatisticsService();

  const createSession = useCallback(async (taskId: string, plannedDuration: number, notes = '') => {
    const id = await store.createSession(taskId, plannedDuration, notes);
    return id;
  }, [store]);

  const startSession = useCallback(async (sessionId: string) => {
    const session = store.sessions.find(s => s.id === sessionId);
    if (!session) return;

    const updated = {
      ...session,
      startTime: new Date().toISOString(),
    };

    await SessionRepository.save(updated);
    await store.updateSession(sessionId, updated);
  }, [store]);

  const endSession = useCallback(async (
    sessionId: string,
    realDuration: number,
    completed: boolean,
    notes?: string
  ) => {
    const session = store.sessions.find(s => s.id === sessionId);
    if (!session) return;

    const endTime = new Date().toISOString();
    const updated: Session = {
      ...session,
      endTime,
      realDuration,
      completed,
      notes: notes || session.notes,
    };

    await SessionRepository.save(updated);
    await store.updateSession(sessionId, { endTime, realDuration, completed, notes });

    // Update Task stats
    const task = store.items.find(i => i.id === session.taskId);
    if (task) {
      const workedTime = ((task as Task).workedTime || 0) + realDuration;
      const sessionsCount = ((task as Task).sessionsCount || 0) + 1;
      await taskService.updateTask(session.taskId, {
        workedTime,
        sessionsCount,
        lastSession: endTime,
        taskState: completed ? TaskState.COMPLETED : TaskState.IN_PROGRESS,
        completed
      });
    }

    // Update statistics
    const stats = store.statistics;
    const newStats = {
      ...stats,
      totalSessions: stats.totalSessions + 1,
      totalWorkedTime: stats.totalWorkedTime + realDuration,
      completedTasks: stats.completedTasks + (completed ? 1 : 0),
      averageSessionTime: Math.round((stats.totalWorkedTime + realDuration) / (stats.totalSessions + 1)),
      lastActivity: endTime,
    };
    await statisticsService.updateStatistics(newStats);
  }, [store, taskService, statisticsService]);

  const cancelSession = useCallback(async (sessionId: string) => {
    await SessionRepository.delete(sessionId);
    await store.deleteSession(sessionId);
  }, [store]);

  return {
    createSession,
    startSession,
    endSession,
    cancelSession,
    sessions: store.sessions
  };
}
