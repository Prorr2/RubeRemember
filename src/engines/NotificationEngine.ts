import { Task, Reminder as ReminderV2, UserSettings, Priority } from '../models/Item';

export interface NotificationResult {
  shouldNotify: boolean;
  message?: string;
  type: 'NONE' | 'SINGLE_REMINDER' | 'GROUPED_REMINDERS' | 'TASK_ALERT';
}

const isTimeInPeriod = (time: string, start: string, end: string): boolean => {
  const [h, m] = time.split(':').map(Number);
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  
  const currentTotal = h * 60 + m;
  const startTotal = sh * 60 + sm;
  const endTotal = eh * 60 + em;

  if (startTotal <= endTotal) {
    return currentTotal >= startTotal && currentTotal < endTotal;
  } else {
    // Overnight periods (e.g., 23:00 to 07:00)
    return currentTotal >= startTotal || currentTotal < endTotal;
  }
};

export const NotificationEngine = {
  determineNotification(
    currentTime: string,
    activeReminders: ReminderV2[],
    userSettings: UserSettings,
    recommendedTask?: Task
  ): NotificationResult {
    // 1. Check if notifications are disabled globally
    if (!userSettings.notificationsEnabled) {
      return { shouldNotify: false, type: 'NONE' };
    }

    // 2. Check Sleep Schedule (protected hours)
    if (userSettings.sleepSchedule) {
      const { start, end } = userSettings.sleepSchedule;
      if (isTimeInPeriod(currentTime, start, end)) {
        return { shouldNotify: false, type: 'NONE' };
      }
    }

    // 3. Priority 1: Grouped/Active Reminders (Reminders are high priority)
    if (activeReminders.length > 0) {
      if (activeReminders.length > 1) {
        return {
          shouldNotify: true,
          message: `Tienes ${activeReminders.length} recordatorios pendientes hoy.`,
          type: 'GROUPED_REMINDERS'
        };
      } else {
        return {
          shouldNotify: true,
          message: `Recordatorio: ${activeReminders[0].title}`,
          type: 'SINGLE_REMINDER'
        };
      }
    }

    // 4. Priority 2: Recommended Task Alert
    if (recommendedTask) {
      // Low priority tasks never notify automatically
      if (recommendedTask.priority === Priority.LOW) {
        return { shouldNotify: false, type: 'NONE' };
      }

      // Medium priority only notifies if not blocked/waiting
      if (recommendedTask.priority === Priority.MEDIUM) {
        return {
          shouldNotify: true,
          message: `Sugerencia: ¿Qué tal si avanzas con "${recommendedTask.title}"?`,
          type: 'TASK_ALERT'
        };
      }

      // Urgent priority task notification
      if (recommendedTask.priority === Priority.URGENT) {
        return {
          shouldNotify: true,
          message: `🚨 URGENTE: Debes realizar la tarea "${recommendedTask.title}" ahora.`,
          type: 'TASK_ALERT'
        };
      }

      // High priority task notification
      if (recommendedTask.priority === Priority.HIGH) {
        return {
          shouldNotify: true,
          message: `Importante: Es hora de trabajar en "${recommendedTask.title}".`,
          type: 'TASK_ALERT'
        };
      }
    }

    return { shouldNotify: false, type: 'NONE' };
  }
};
