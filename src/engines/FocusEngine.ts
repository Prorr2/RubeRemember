import { Task, HourWeight } from '../models/Item';
import { ScoreEngine } from './ScoreEngine';

export const FocusEngine = {
  calculateFocusTasks(
    tasks: Task[],
    hourWeights: HourWeight[],
    maxFocus: number
  ): Task[] {
    // 1. Filter out invalid tasks
    const eligibleTasks = tasks.filter(t => 
      !t.completed && 
      !t.archived && 
      !t.trash && 
      t.taskState !== 'BLOCKED' && 
      t.taskState !== 'WAITING'
    );

    // 2. Identify already focused tasks (manually locked or pre-existing focus)
    const currentFocused = eligibleTasks.filter(t => t.focusLocked);

    // 3. If we have already reached or exceeded the limit, return current focused
    if (currentFocused.length >= maxFocus) {
      return currentFocused.slice(0, maxFocus);
    }

    // 4. Otherwise, fill the remaining slots from the highest scoring eligible tasks
    const remainingSlots = maxFocus - currentFocused.length;
    const nonFocusedEligible = eligibleTasks.filter(t => !t.focusLocked);

    // Score them (temporarily, without adding the focus bonus since they are not focused yet)
    const scoredNonFocused = nonFocusedEligible.map(t => ({
      task: t,
      score: ScoreEngine.calculateScore({ ...t, focusLocked: false }, hourWeights)
    }));

    // Sort descending by score, then by creation date to break ties
    scoredNonFocused.sort((a, b) => b.score - a.score || b.task.createdAt.localeCompare(a.task.createdAt));

    // Select top candidates to fill slots and mark them as focusLocked
    const promoted = scoredNonFocused.slice(0, remainingSlots).map(item => ({
      ...item.task,
      focusLocked: true
    }));

    return [...currentFocused, ...promoted];
  }
};
