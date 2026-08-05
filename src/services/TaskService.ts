import { useCallback } from 'react';
import { useRememberStore } from '../hooks/use-remember-store';
import { TaskRepository } from '../repositories/TaskRepository';
import { Task, Priority, ExecutionStrategy, EnergyType, TaskState, ItemType } from '../models/Item';
import { useRecommendationService } from './RecommendationService';

export function useTaskService() {
  const store = useRememberStore();
  const recommendationService = useRecommendationService();

  const createTask = useCallback(async (
    title: string,
    description = '',
    startDate?: string,
    dueDate?: string,
    estimatedHours?: number,
    priority: Priority = Priority.MEDIUM,
    goalId?: string,
    phaseId?: string,
    timeSlotId?: string,
    executionStrategy = ExecutionStrategy.SPRINT,
    energyType = EnergyType.CREATIVE,
    taskState = TaskState.THINKING
  ) => {
    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      type: ItemType.TASK,
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      completed: false,
      favourite: false,
      tags: [],
      comments: [],
      priority,
      startDate,
      dueDate,
      estimatedHours,
      goalId,
      phaseId,
      timeSlotId,
      executionStrategy,
      energyType,
      taskState,
      focusLocked: false,
      progress: 0,
      workedTime: 0,
      sessionsCount: 0,
    };

    // Save to persistence
    await TaskRepository.save(newTask);
    
    // Update store state
    const nextItems = [...store.items, newTask];
    await store.saveItems(nextItems);

    // Notify recommendation service
    recommendationService.triggerRecalculate();
  }, [store, recommendationService]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const task = store.items.find(i => i.id === id && i.type === ItemType.TASK) as Task;
    if (!task) return;

    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString()
    } as Task;

    await TaskRepository.save(updatedTask);

    const nextItems = store.items.map(i => i.id === id ? updatedTask : i);
    await store.saveItems(nextItems);

    recommendationService.triggerRecalculate();
  }, [store, recommendationService]);

  const deleteTask = useCallback(async (id: string) => {
    await TaskRepository.delete(id);
    await store.deleteItem(id);
    recommendationService.triggerRecalculate();
  }, [store, recommendationService]);

  const updateProgress = useCallback(async (id: string, progress: number) => {
    await updateTask(id, { progress, lastProgress: new Date().toISOString() });
  }, [updateTask]);

  const changeState = useCallback(async (id: string, taskState: TaskState) => {
    const completed = taskState === TaskState.COMPLETED;
    await updateTask(id, { taskState, completed });
  }, [updateTask]);

  return {
    createTask,
    updateTask,
    deleteTask,
    updateProgress,
    changeState,
  };
}
