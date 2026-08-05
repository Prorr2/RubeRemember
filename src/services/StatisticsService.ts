import { useCallback } from 'react';
import { useRememberStore } from '../hooks/use-remember-store';
import { StatisticsRepository } from '../repositories/StatisticsRepository';
import { Statistics } from '../models/Item';

export function useStatisticsService() {
  const store = useRememberStore();

  const getStatistics = useCallback(async () => {
    return await StatisticsRepository.getStatistics();
  }, []);

  const updateStatistics = useCallback(async (updates: Partial<Statistics>) => {
    const nextStats = { ...store.statistics, ...updates };
    await StatisticsRepository.save(nextStats);
    await store.updateStatistics(updates);
  }, [store]);

  const getComputedStats = useCallback(() => {
    const sessions = store.sessions || [];
    const tasks = store.getTasks();

    let totalWorkedTime = 0;
    let totalSessions = sessions.length;
    let completedSessions = sessions.filter(s => s.completed).length;

    // Distribution counters
    const weightCounts: Record<string, number> = { LUNA: 0, TERRA: 0, SOL: 0, ASTRA: 0 };
    const energyCounts: Record<string, number> = {};

    // Daily minutes map (YYYY-MM-DD -> minutes)
    const dailyMinutes: Record<string, number> = {};

    // Helper to extract weight classification
    const getWeight = (hours?: number) => {
      if (hours === undefined) return 'LUNA';
      const sortedWeights = [...store.hourWeights].sort((a, b) => b.minHours - a.minHours);
      const matched = sortedWeights.find((w) => hours >= w.minHours);
      if (!matched) return 'LUNA';
      const name = matched.name.toUpperCase();
      if (name.includes('LUNA')) return 'LUNA';
      if (name.includes('TERRA')) return 'TERRA';
      if (name.includes('SOL')) return 'SOL';
      if (name.includes('ASTRA')) return 'ASTRA';
      return 'LUNA';
    };

    sessions.forEach(session => {
      totalWorkedTime += session.realDuration || 0;

      // Find task weight and energy type
      const task = tasks.find(t => t.id === session.taskId);
      if (task) {
        const w = getWeight(task.estimatedHours);
        weightCounts[w] = (weightCounts[w] || 0) + 1;

        const energy = task.energyType || 'OTHER';
        energyCounts[energy] = (energyCounts[energy] || 0) + 1;
      }

      // Group by date
      if (session.endTime) {
        const dateStr = session.endTime.split('T')[0];
        dailyMinutes[dateStr] = (dailyMinutes[dateStr] || 0) + (session.realDuration || 0);
      }
    });

    // Calculate streaks
    const dates = Object.keys(dailyMinutes).sort();
    let currentStreak = 0;
    let longestStreak = 0;
    
    if (dates.length > 0) {
      let tempStreak = 1;
      longestStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const diffTime = Math.abs(new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          if (tempStreak > longestStreak) longestStreak = tempStreak;
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;

      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      if (dates.includes(todayStr) || dates.includes(yesterdayStr)) {
        currentStreak = tempStreak;
      }
    }

    return {
      totalWorkedTime,
      totalSessions,
      completedSessions,
      weightCounts,
      energyCounts,
      currentStreak,
      longestStreak,
      dailyMinutes
    };
  }, [store.sessions, store.items, store.hourWeights]);

  return {
    getStatistics,
    updateStatistics,
    getComputedStats,
    statistics: store.statistics,
  };
}
