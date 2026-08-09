import { Task, HourWeight } from '../models/Item';
import { ScoreEngine } from './ScoreEngine';

export const FocusEngine = {
  calculateFocusTasks(
    tasks: Task[],
    hourWeights: HourWeight[],
    maxFocus: number,
    scoreFormula?: string
  ): Task[] {
    // 1. Filter out eligible tasks for scoring
    const eligibleTasks = tasks.filter(t => 
      !t.completed && 
      !t.archived && 
      !t.trash && 
      t.taskState !== 'BLOCKED' && 
      t.taskState !== 'WAITING'
    );

    // 2. Score eligible tasks based on their current focus status
    const scoredTasks = eligibleTasks.map(t => ({
      task: t,
      score: ScoreEngine.calculateScore(t, hourWeights, scoreFormula)
    }));

    // 3. Sort descending by score, then by creation date to break ties
    scoredTasks.sort((a, b) => b.score - a.score || b.task.createdAt.localeCompare(a.task.createdAt));

    // 4. Map over ALL tasks to assign the correct focusLocked value (self-healing)
    const updatedTasks = tasks.map(t => {
      const isEligible = !t.completed && !t.archived && !t.trash && t.taskState !== 'BLOCKED' && t.taskState !== 'WAITING';
      if (!isEligible) {
        return { ...t, focusLocked: false };
      }
      
      const eligibleRank = scoredTasks.findIndex(item => item.task.id === t.id);
      const shouldBeFocused = eligibleRank !== -1 && eligibleRank < maxFocus;
      
      return {
        ...t,
        focusLocked: shouldBeFocused
      };
    });

    return updatedTasks;
  }
};
