export interface Recommendation {
  id: string;
  taskId?: string; // Optional, in case no recommendation is available (e.g. leisure time, inbox clean up)
  score: number;
  reason: string;
  reasonsSecondary?: string[];
  recommendedDuration: number; // in minutes
  generatedAt: string; // ISO date string
  priorityLevel: 'ALTA' | 'MEDIA' | 'BAJA';
  energyAdjustment?: number;
  transitionAdjustment?: number;
  confidenceLevel?: number; // 0 to 100
  sessionType?: 'COMPLETAR' | 'AVANZAR' | 'PASO' | 'MANTENER';
  actionSuggested?: string;
  alternatives?: string[]; // array of alternative Task IDs
}
