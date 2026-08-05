import { useCallback } from 'react';
import { useRememberStore } from '../hooks/use-remember-store';
import { SettingsRepository } from '../repositories/SettingsRepository';
import { UserSettings } from '../models/Item';
import { useRecommendationService } from './RecommendationService';

export function useSettingsService() {
  const store = useRememberStore();
  const recommendationService = useRecommendationService();

  const getSettings = useCallback(async () => {
    return await SettingsRepository.getSettings();
  }, []);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    const nextSettings = { ...store.userSettings, ...updates };
    await SettingsRepository.save(nextSettings);
    await store.updateUserSettings(updates);
    await recommendationService.triggerRecalculate();
  }, [store, recommendationService]);

  return {
    getSettings,
    updateSettings,
    userSettings: store.userSettings,
  };
}
