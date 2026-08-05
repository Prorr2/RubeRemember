import { EnergyType } from '../models/Item';

export const EnergyEngine = {
  calculatePenalty(energyType: EnergyType | undefined, recentEnergyTypes: EnergyType[]): number {
    if (!energyType || recentEnergyTypes.length === 0) {
      return 0;
    }

    let consecutiveMatches = 0;
    for (const type of recentEnergyTypes) {
      if (type === energyType) {
        consecutiveMatches++;
      } else {
        break; // Stop counting once the chain breaks
      }
    }

    if (consecutiveMatches === 1) {
      return 0.15; // 2nd consecutive session -> -15%
    } else if (consecutiveMatches === 2) {
      return 0.35; // 3rd consecutive session -> -35%
    } else if (consecutiveMatches >= 3) {
      return 0.60; // 4th or more consecutive session -> -60%
    }

    return 0;
  },

  applyEnergyAdjustment(score: number, penalty: number): number {
    if (score <= 0) return score;
    return Math.round(score * (1 - penalty));
  }
};
