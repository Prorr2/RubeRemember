import { useCallback } from 'react';
import { useRememberStore } from '../hooks/use-remember-store';
import { Task, ItemType } from '../models/Item';
import { useTaskService } from './TaskService';

export function useFocusService() {
  const store = useRememberStore();
  const taskService = useTaskService();

  const getFocusTasks = useCallback(() => {
    return (store.items || []).filter(
      (i) => i.type === ItemType.TASK && (i as Task).focusLocked && !i.completed && !i.archived
    ) as Task[];
  }, [store.items]);

  const toggleFocus = useCallback(async (taskId: string) => {
    const task = store.items.find((i) => i.id === taskId && i.type === ItemType.TASK) as Task;
    if (!task) return;

    const isLocked = !task.focusLocked;
    
    // Check if we exceed maxFocusTasks
    if (isLocked) {
      const currentFocusCount = getFocusTasks().length;
      const maxFocus = store.userSettings.maxFocusTasks;
      if (currentFocusCount >= maxFocus) {
        throw new Error(`Has alcanzado el límite de ${maxFocus} tareas en foco.`);
      }
    }

    await taskService.updateTask(taskId, { focusLocked: isLocked });
  }, [store.items, store.userSettings.maxFocusTasks, getFocusTasks, taskService]);

  return {
    getFocusTasks,
    toggleFocus,
  };
}
