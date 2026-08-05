import { Activity } from '../models/Activity';

export interface ActivityEngineSettings {
  recentDaysLimit?: number;
}

export const ActivityEngine = {
  suggestActivities(
    activities: Activity[],
    settings?: ActivityEngineSettings,
    currentDate: Date = new Date()
  ): Activity[] {
    const recentDaysLimit = settings?.recentDaysLimit ?? 3;
    const nowMs = currentDate.getTime();

    // 1. Discard archived activities
    const activeActivities = activities.filter((a) => !a.archived);

    // 2. Discard recently done activities (within recentDaysLimit)
    const filtered = activeActivities.filter((activity) => {
      if (!activity.lastDoneAt) return true;
      const lastDoneMs = new Date(activity.lastDoneAt).getTime();
      const daysSinceLastDone = (nowMs - lastDoneMs) / (1000 * 60 * 60 * 24);
      return daysSinceLastDone > recentDaysLimit;
    });

    // 3. Score activities
    const scored = filtered.map((activity) => {
      let score = 0;

      // Favor favorites
      if (activity.favourite) {
        score += 10;
      }

      // Favor never done
      if (!activity.lastDoneAt || activity.doneCount === 0) {
        score += 20;
      } else {
        // Favor months without doing it
        const lastDoneMs = new Date(activity.lastDoneAt).getTime();
        const daysSinceLastDone = (nowMs - lastDoneMs) / (1000 * 60 * 60 * 24);
        if (daysSinceLastDone > 30) {
          // Increase score based on time elapsed, capped
          score += Math.min(15, Math.floor(daysSinceLastDone / 30) * 5);
        }
      }

      // Add slight randomization
      const randomFactor = Math.random() * 10 - 5; // between -5 and +5
      score += randomFactor;

      return { activity, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return between 5 and 8 items
    const count = Math.min(8, Math.max(5, scored.length));
    return scored.slice(0, count).map((s) => s.activity);
  },
};
