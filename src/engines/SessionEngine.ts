import { Task, UserSettings, HourWeight } from '../models/Item';
import { getTaskWeightLabel } from './ScoreEngine';

export interface SessionRecommendation {
  duration: number; // in minutes
  objective: 'COMPLETAR' | 'AVANZAR' | 'SIGUIENTE_PASO' | 'HABITO';
  message: string;
  actionOnFinish: string;
  suggestedActionText: string;
}

export const SessionEngine = {
  calculateSession(
    task: Task,
    availableTime: number,
    userSettings: UserSettings,
    hourWeights: HourWeight[]
  ): SessionRecommendation {
    const weightLabel = getTaskWeightLabel(task.estimatedHours, hourWeights).toLowerCase();

    if (weightLabel === 'terra') {
      return {
        duration: Math.min(availableTime, userSettings.terraDuration || 45),
        objective: 'AVANZAR',
        message: 'Progreso incremental. Concéntrate en mantener el foco sin la presión de terminar.',
        actionOnFinish: 'ASK_PROGRESS_TERRA',
        suggestedActionText: 'Avanza un paso'
      };
    } else if (weightLabel === 'sol') {
      return {
        duration: Math.min(availableTime, userSettings.solDuration || 90),
        objective: 'SIGUIENTE_PASO',
        message: 'Planifica y ataca el siguiente hito concreto de esta tarea.',
        actionOnFinish: 'ASK_NEXT_STEP_SOL',
        suggestedActionText: 'Define y ejecuta tu siguiente paso'
      };
    } else if (weightLabel === 'astra') {
      return {
        duration: Math.min(availableTime, userSettings.astraDuration || 20),
        objective: 'HABITO',
        message: 'Lo importante es la constancia. Dedica unos minutos para no romper la racha.',
        actionOnFinish: 'UPDATE_HABIT_ASTRA',
        suggestedActionText: 'Mantén la racha'
      };
    } else {
      // Luna / default
      const lunaDuration = userSettings.lunaDuration || 30;
      return {
        duration: Math.min(availableTime, lunaDuration),
        objective: 'COMPLETAR',
        message: 'Puedes quitártela de encima ahora mismo. ¡Hazlo rápido!',
        actionOnFinish: 'CELEBRATE_LUNA',
        suggestedActionText: 'Termina esta tarea'
      };
    }
  }
};
