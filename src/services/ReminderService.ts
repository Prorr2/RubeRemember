import { useCallback } from 'react';
import { useRememberStore } from '../hooks/use-remember-store';
import { ReminderRepository } from '../repositories/ReminderRepository';
import { Reminder as ReminderV2, ItemType } from '../models/Item';
import { useRecommendationService } from './RecommendationService';

export function useReminderService() {
  const store = useRememberStore();
  const recommendationService = useRecommendationService();

  const createReminder = useCallback(async (
    title: string,
    description = '',
    remindAt: ReminderV2['remindAt'],
    autoArchive = true
  ) => {
    const newReminder: ReminderV2 = {
      id: Math.random().toString(36).substring(7),
      type: ItemType.REMINDER,
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      completed: false,
      favourite: false,
      tags: [],
      remindAt,
      autoArchive
    };

    await ReminderRepository.save(newReminder);
    
    const nextItems = [...store.items, newReminder];
    await store.saveItems(nextItems);

    recommendationService.triggerRecalculate();
  }, [store, recommendationService]);

  const updateReminder = useCallback(async (id: string, updates: Partial<ReminderV2>) => {
    const reminder = store.items.find(i => i.id === id && i.type === ItemType.REMINDER) as ReminderV2;
    if (!reminder) return;

    const updatedReminder = {
      ...reminder,
      ...updates,
      updatedAt: new Date().toISOString()
    } as ReminderV2;

    await ReminderRepository.save(updatedReminder);

    const nextItems = store.items.map(i => i.id === id ? updatedReminder : i);
    await store.saveItems(nextItems);

    recommendationService.triggerRecalculate();
  }, [store, recommendationService]);

  const deleteReminder = useCallback(async (id: string) => {
    await ReminderRepository.delete(id);
    await store.deleteItem(id);
    recommendationService.triggerRecalculate();
  }, [store, recommendationService]);

  return {
    createReminder,
    updateReminder,
    deleteReminder,
    reminders: store.getReminders()
  };
}
