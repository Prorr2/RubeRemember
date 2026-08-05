import { Task, Priority, TaskState, HourWeight } from '../models/Item';

export function getTaskWeightLabel(estimatedHours: number | undefined, hourWeights: HourWeight[]): string {
  if (estimatedHours === undefined || estimatedHours === null || estimatedHours <= 0) {
    return 'luna';
  }
  const sorted = [...hourWeights].sort((a, b) => b.minHours - a.minHours);
  for (const w of sorted) {
    if (estimatedHours >= w.minHours) {
      const lowerId = w.id.toLowerCase();
      if (lowerId.includes('luna')) return 'luna';
      if (lowerId.includes('terra')) return 'terra';
      if (lowerId.includes('sol')) return 'sol';
      if (lowerId.includes('astra')) return 'astra';
      return lowerId;
    }
  }
  return 'luna';
}

export const ScoreEngine = {
  calculateScore(task: Task, hourWeights: HourWeight[], currentTimeStr?: string): number {
    if (task.completed || task.taskState === TaskState.COMPLETED) {
      return -9999; // Completed tasks do not participate
    }

    let score = 0;

    // 1. Prioridad
    if (task.priority === Priority.HIGH) {
      score += 60;
    } else if (task.priority === Priority.MEDIUM) {
      score += 30;
    } else {
      score += 10; // Low
    }

    // 2. Urgencia (based on dueDate)
    const todayStr = new Date().toISOString().split('T')[0];
    if (task.dueDate) {
      if (task.dueDate < todayStr) {
        score += 80; // Vencida
      } else if (task.dueDate === todayStr) {
        score += 40; // Hoy
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        if (task.dueDate === tomorrowStr) {
          score += 25; // Mañana
        } else {
          // Check if within this week (next 7 days)
          const inAWeek = new Date();
          inAWeek.setDate(inAWeek.getDate() + 7);
          const inAWeekStr = inAWeek.toISOString().split('T')[0];
          if (task.dueDate <= inAWeekStr) {
            score += 15; // Esta semana
          }
        }
      }
    }

    // 3. Peso
    const weightLabel = getTaskWeightLabel(task.estimatedHours, hourWeights);
    if (weightLabel === 'terra') {
      score += 20;
    } else if (weightLabel === 'sol') {
      score += 30;
    } else if (weightLabel === 'astra') {
      score += 40;
    } else {
      score += 10; // Luna / default
    }

    // 4. Focus Task
    if (task.focusLocked) {
      score += 50;
    }

    // 5. Tiempo sin avanzar (days since last progress/update/create)
    const lastProgressStr = task.lastProgress || task.updatedAt || task.createdAt;
    const lastProgressDate = new Date(lastProgressStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastProgressDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 30) {
      score += 50; // Más de un mes
    } else if (diffDays >= 14) {
      score += 35; // Dos semanas
    } else if (diffDays >= 7) {
      score += 20; // Una semana
    } else if (diffDays >= 3) {
      score += 10; // Tres días
    }

    // 6. Fecha límite (days remaining until dueDate)
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      
      const diffTimeLimit = dueDate.getTime() - todayDate.getTime();
      const diffDaysLimit = Math.round(diffTimeLimit / (1000 * 60 * 60 * 24));

      if (diffDaysLimit < 0) {
        score += 90; // Vencida
      } else if (diffDaysLimit === 0) {
        score += 60; // Hoy
      } else if (diffDaysLimit <= 3) {
        score += 35; // Tres días
      } else if (diffDaysLimit <= 7) {
        score += 20; // Una semana
      } else if (diffDaysLimit <= 14) {
        score += 10; // Dos semanas
      }
    }

    // 7. Reminder (Virtual Reminder from Task date/time)
    if (task.startDate || task.dueDate) {
      const targetDate = task.startDate || task.dueDate;
      if (targetDate && targetDate < todayStr) {
        score += 100; // Reminder crítico (overdue)
      } else if (targetDate === todayStr) {
        // Check if active or future
        const taskTime = task.time || '12:00';
        let currentH = now.getHours();
        let currentM = now.getMinutes();

        if (currentTimeStr) {
          const [h, m] = currentTimeStr.split(':').map(Number);
          currentH = h;
          currentM = m;
        }

        const [remH, remM] = taskTime.split(':').map(Number);
        const currentTotal = currentH * 60 + currentM;
        const remTotal = remH * 60 + remM;

        if (currentTotal >= remTotal) {
          // If task has high priority and is today, it can be critical
          score += task.priority === Priority.HIGH ? 100 : 50; // Reminder crítico or activo
        } else {
          score += 10; // Reminder futuro
        }
      } else {
        score += 10; // Reminder futuro
      }
    }

    // 8. Estado
    const state = task.taskState || TaskState.THINKING;
    if (state === TaskState.BLOCKED || state === TaskState.WAITING) {
      score -= 1000;
    } else if (state === TaskState.IN_PROGRESS) {
      score += 15;
    } else if (state === TaskState.PREPARING) {
      score += 5;
    }

    return score;
  }
};
