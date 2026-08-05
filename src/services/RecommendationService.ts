import { useCallback } from 'react';
import { useRememberStore } from '../hooks/use-remember-store';
import { CognitiveEngine } from '../engines/CognitiveEngine';
import { Task, ItemType } from '../models/Item';

export function useRecommendationService() {
  const store = useRememberStore();

  const triggerRecalculate = useCallback(async () => {
    try {
      const { recommendation, updatedFocusTasks } = CognitiveEngine.generateRecommendation(
        store.items,
        store.sessions,
        store.timeSlots,
        store.userSettings,
        store.hourWeights
      );

      // Save the generated recommendation in the store
      await store.saveRecommendations([recommendation]);

      // Check if any focus task locks need updating in the store
      for (const updatedTask of updatedFocusTasks) {
        const existingTask = store.items.find(i => i.id === updatedTask.id) as Task | undefined;
        if (existingTask && existingTask.focusLocked !== updatedTask.focusLocked) {
          await store.updateItem(updatedTask.id, { focusLocked: updatedTask.focusLocked });
        }
      }
    } catch (error) {
      console.error('Failed to recalculate recommendation:', error);
    }
  }, [
    store.items,
    store.sessions,
    store.timeSlots,
    store.userSettings,
    store.hourWeights,
    store.saveRecommendations,
    store.updateItem
  ]);

  const rejectRecommendation = useCallback(async (recommendationId: string) => {
    const recommendation = store.recommendations.find(r => r.id === recommendationId);
    if (!recommendation || !recommendation.taskId) return;

    const cooldownMinutes = store.userSettings.defaultCooldown || 120;
    const cooldownExpiry = new Date(Date.now() + cooldownMinutes * 60 * 1000).toISOString();

    // Set the cooldown on the task
    const task = store.items.find(i => i.id === recommendation.taskId && i.type === ItemType.TASK);
    if (task) {
      await store.updateItem(recommendation.taskId, {
        recommendationCooldown: cooldownExpiry
      });
    }

    // Trigger recalculation immediately to select a new recommendation
    await triggerRecalculate();
  }, [store.recommendations, store.items, store.userSettings.defaultCooldown, store.updateItem, triggerRecalculate]);

  return {
    triggerRecalculate,
    rejectRecommendation,
    recommendations: store.recommendations,
  };
}
