import { Task, UserSettings, HourWeight, EnergyType, TaskState } from '../models/Item';
import { ScoreEngine, getTaskWeightLabel } from './ScoreEngine';
import { EnergyEngine } from './EnergyEngine';
import { TransitionEngine } from './TransitionEngine';
import { SessionEngine } from './SessionEngine';

export interface RecommendationCandidate extends Task {
  baseScore: number;
  energyPenalty: number;
  adjustedScore: number;
  transitionBonus: number;
  finalScore: number;
}

export interface RecommendationResult {
  selected?: Task;
  alternatives: Task[];
}

export const RecommendationEngine = {
  selectRecommendation(
    tasks: Task[],
    availableTime: number,
    recentEnergyTypes: EnergyType[],
    lastCompletedEnergy: EnergyType | undefined,
    lastCompletedWeight: string | undefined,
    lastCompletedTaskId: string | undefined,
    userSettings: UserSettings,
    hourWeights: HourWeight[]
  ): RecommendationResult {
    // 1. Filter out ineligible tasks
    const eligibleTasks = tasks.filter(t => 
      !t.completed && 
      !t.archived && 
      !t.trash && 
      t.taskState !== TaskState.BLOCKED && 
      t.taskState !== TaskState.WAITING
    );

    if (eligibleTasks.length === 0) {
      return { alternatives: [] };
    }

    // 2. Cooldown check
    const now = new Date();
    const nonCooldownTasks = eligibleTasks.filter(t => {
      if (!t.recommendationCooldown) return true;
      return new Date(t.recommendationCooldown) <= now;
    });

    const activePool = nonCooldownTasks.length > 0 ? nonCooldownTasks : eligibleTasks;

    // 3. Map candidates with scores
    const candidates: RecommendationCandidate[] = activePool.map(t => {
      const baseScore = ScoreEngine.calculateScore(t, hourWeights, userSettings.scoreFormula);
      const energyPenalty = EnergyEngine.calculatePenalty(t.energyType, recentEnergyTypes);
      const adjustedScore = EnergyEngine.applyEnergyAdjustment(baseScore, energyPenalty);
      const transitionBonus = TransitionEngine.calculateTransitionBonus(
        t,
        lastCompletedEnergy,
        lastCompletedWeight,
        userSettings,
        hourWeights
      );
      const finalScore = adjustedScore + transitionBonus;

      return {
        ...t,
        baseScore,
        energyPenalty,
        adjustedScore,
        transitionBonus,
        finalScore
      };
    });

    // 4. Group candidates by priority categories
    const urgentFocus = candidates.filter(c => c.focusLocked && (c.priority === 'high' || c.priority === 'urgent'));
    const normalFocus = candidates.filter(c => c.focusLocked && c.priority !== 'high' && c.priority !== 'urgent');
    const standardTasks = candidates.filter(c => !c.focusLocked);

    // Helper comparator implementing the 5 tie-breaking criteria
    const tieBreakerComparator = (a: RecommendationCandidate, b: RecommendationCandidate) => {
      // 1. Primary sort: finalScore (higher score is better)
      if (Math.abs(a.finalScore - b.finalScore) > 0.01) {
        return b.finalScore - a.finalScore;
      }

      // 2. Secondary sort: whether it fits in the available time slot
      const aWeight = getTaskWeightLabel(a.estimatedHours, hourWeights).toLowerCase();
      const bWeight = getTaskWeightLabel(b.estimatedHours, hourWeights).toLowerCase();

      const aStandardDuration = aWeight === 'astra' ? 120 : (aWeight === 'sol' ? 90 : (aWeight === 'terra' ? 45 : 30));
      const bStandardDuration = bWeight === 'astra' ? 120 : (bWeight === 'sol' ? 90 : (bWeight === 'terra' ? 45 : 30));

      const aFits = aStandardDuration <= availableTime;
      const bFits = bStandardDuration <= availableTime;

      if (aFits !== bFits) {
        return aFits ? -1 : 1;
      }

      // 3. Transition bonus
      if (a.transitionBonus !== b.transitionBonus) {
        return b.transitionBonus - a.transitionBonus;
      }

      // 4. Last completed task
      const aIsLast = a.id === lastCompletedTaskId;
      const bIsLast = b.id === lastCompletedTaskId;
      if (aIsLast !== bIsLast) {
        return aIsLast ? -1 : 1;
      }

      // 5. Time elapsed since last activity
      const getDaysTimestamp = (t: Task) => {
        const d = new Date(t.lastProgress || t.updatedAt || t.createdAt);
        return d.getTime();
      };
      const aTime = getDaysTimestamp(a);
      const bTime = getDaysTimestamp(b);
      if (aTime !== bTime) {
        return aTime - bTime;
      }

      return 0;
    };

    // Sort the buckets
    urgentFocus.sort(tieBreakerComparator);
    normalFocus.sort(tieBreakerComparator);
    standardTasks.sort(tieBreakerComparator);

    // Build the sorted candidates list
    const sortedPool = [...urgentFocus, ...normalFocus, ...standardTasks];
    const selected = sortedPool[0];
    const alternatives = sortedPool.slice(1, 4);

    return {
      selected,
      alternatives
    };
  }
};
