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
    let session = store.sessions.find(s => s.id === sessionId);
    if (!session) {
      session = await SessionRepository.getById(sessionId);
    }
    if (!session) return;

    const updated = {
      ...session,
      startTime: new Date().toISOString(),
    };

    await store.updateSession(sessionId, updated);
  }, [store]);

  const endSession = useCallback(async (
    sessionId: string,
    realDuration: number,
    completed: boolean,
    notes?: string,
    taskUpdates?: Partial<Task>
  ) => {
    await store.endSession(sessionId, realDuration, completed, notes, taskUpdates);
  }, [store]);

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
