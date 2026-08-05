import { Task, EnergyType, UserSettings, HourWeight } from '../models/Item';
import { getTaskWeightLabel } from './ScoreEngine';

export const TransitionEngine = {
  calculateTransitionBonus(
    task: Task,
    lastCompletedEnergy: EnergyType | undefined,
    lastCompletedWeightLabel: string | undefined,
    userSettings: UserSettings,
    hourWeights: HourWeight[]
  ): number {
    let bonus = 0;

    // 1. Energy Transition Sequence Check
    if (lastCompletedEnergy && userSettings.preferredOrderEnergy && userSettings.preferredOrderEnergy.length > 0) {
      const order = userSettings.preferredOrderEnergy;
      const lastIndex = order.indexOf(lastCompletedEnergy);
      if (lastIndex >= 0) {
        const nextIndex = (lastIndex + 1) % order.length;
        const preferredNextEnergy = order[nextIndex];
        
        if (task.energyType === preferredNextEnergy) {
          bonus += 10; // +10 points for ideal energy transition
        }
      }
    }

    // 2. Weight Transition Sequence Check
    if (lastCompletedWeightLabel && userSettings.preferredOrderWeight && userSettings.preferredOrderWeight.length > 0) {
      const order = userSettings.preferredOrderWeight.map(w => w.toLowerCase());
      const lastIndex = order.indexOf(lastCompletedWeightLabel.toLowerCase());
      if (lastIndex >= 0) {
        const nextIndex = (lastIndex + 1) % order.length;
        const preferredNextWeight = order[nextIndex];
        
        const taskWeightLabel = getTaskWeightLabel(task.estimatedHours, hourWeights).toLowerCase();
        if (taskWeightLabel === preferredNextWeight) {
          bonus += 5; // +5 points for ideal weight transition
        }
      }
    }

    return bonus;
  }
};
