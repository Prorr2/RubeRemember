import { Task, HourWeight, Session } from '../models/Item';
import { getTaskWeightLabel } from './ScoreEngine';

export interface FormattedProgress {
  title: string;
  detailLines: string[];
  percentage?: number; // only for Terra
  nextStep?: string; // only for Sol
  lastStep?: string; // only for Sol
  streak?: number; // only for Astra
}

export const ProgressEngine = {
  calculateProgress(
    task: Task,
    sessions: Session[],
    hourWeights: HourWeight[]
  ): FormattedProgress {
    const weightLabel = getTaskWeightLabel(task.estimatedHours, hourWeights).toLowerCase();
    const taskSessions = sessions.filter(s => s.taskId === task.id);

    // Calculate total time worked in hours and minutes
    const totalMinutes = task.workedTime || taskSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    if (weightLabel === 'terra') {
      const percentage = task.progress || 0;
      const detailLines = [
        `${percentage}% completado`,
        `${task.sessionsCount || taskSessions.length} sesiones`,
        `${totalHours} horas invertidas`,
      ];
      if (task.lastProgress) {
        // Calculate days ago
        const days = Math.floor((Date.now() - new Date(task.lastProgress).getTime()) / (1000 * 60 * 60 * 24));
        detailLines.push(days <= 0 ? 'Último avance: hoy' : `Último avance: hace ${days} días`);
      }
      return {
        title: 'Progreso de Terra (Avanzar)',
        detailLines,
        percentage,
      };
    } else if (weightLabel === 'sol') {
      const detailLines: string[] = [];
      if (task.lastProgress) {
        detailLines.push(`Último avance: ${task.lastProgress}`);
      }
      if (task.nextStep) {
        detailLines.push(`Próximo paso: ${task.nextStep}`);
      }
      detailLines.push(`${totalHours} horas acumuladas`);
      
      return {
        title: 'Progreso de Sol (Hitos)',
        detailLines,
        nextStep: task.nextStep,
        lastStep: task.lastProgress,
      };
    } else if (weightLabel === 'astra') {
      const streak = task.sessionsCount || 0;
      const detailLines = [
        `Racha actual: ${streak} días`,
        `Última sesión: ${task.lastSession ? new Date(task.lastSession).toLocaleDateString() : 'Ninguna'}`
      ];
      
      if (taskSessions.length > 0) {
        const sortedSessions = [...taskSessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        const firstSessionTime = new Date(sortedSessions[0].startTime).getTime();
        const diffWeeks = Math.max(1, Math.ceil((Date.now() - firstSessionTime) / (1000 * 60 * 60 * 24 * 7)));
        const freq = (taskSessions.length / diffWeeks).toFixed(1);
        detailLines.push(`Frecuencia media: ${freq} sesiones/semana`);
      } else {
        detailLines.push('Frecuencia media: 0 sesiones/semana');
      }

      return {
        title: 'Progreso de Astra (Hábitos)',
        detailLines,
        streak,
      };
    } else {
      // Luna / default
      return {
        title: 'Progreso de Luna (Eliminar)',
        detailLines: [
          task.completed ? 'Estado: Completada' : 'Estado: Pendiente'
        ]
      };
    }
  }
};
