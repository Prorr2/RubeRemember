import { TimeSlot } from '../models/TimeSlot';
import { Task, Reminder as ReminderV2, Memo, UserSettings, EnergyType, Session, Item, ItemType } from '../models/Item';

export interface CognitiveContext {
  currentTime: string; // "HH:MM"
  dayOfWeek: number; // 0-6 (0 is Sunday, 6 is Saturday)
  availableTime: number; // in minutes
  activeTimeSlot: TimeSlot | undefined;
  lastCompletedTaskId: string | undefined;
  recentEnergyTypes: EnergyType[];
  activeReminders: (ReminderV2 | Memo)[];
  userSettings: UserSettings;
  focusTasks: Task[];
}

export const ContextEngine = {
  calculateContext(
    items: Item[],
    sessions: Session[],
    timeSlots: TimeSlot[],
    userSettings: UserSettings,
    overrideCurrentTime?: string // format "HH:MM" for testing
  ): CognitiveContext {
    const now = new Date();
    
    // 1. Current Time & Day of Week
    let currentTime = overrideCurrentTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dayOfWeek = now.getDay();

    // 2. Active TimeSlot & Available Time
    const [currentH, currentM] = currentTime.split(':').map(Number);
    const currentTotalMinutes = currentH * 60 + currentM;

    let activeTimeSlot: TimeSlot | undefined;
    let availableTime = userSettings.defaultFocusDuration || 30;

    for (const slot of timeSlots) {
      const [startH, startM] = slot.startTime.split(':').map(Number);
      const [endH, endM] = slot.endTime.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      if (currentTotalMinutes >= startTotal && currentTotalMinutes < endTotal) {
        activeTimeSlot = slot;
        availableTime = endTotal - currentTotalMinutes;
        break;
      }
    }

    // 3. Active Reminders (Memos with alarm or legacy reminders scheduled for today or earlier that are not completed)
    const todayStr = now.toISOString().split('T')[0];
    const activeReminders = items.filter(i => {
      if (i.completed || i.archived || i.trash) return false;
      
      if (i.type === ItemType.REMINDER) {
        const rem = i as ReminderV2;
        if (!rem.remindAt) return false;
        
        const hasTodayOrPastDate = rem.remindAt.dates.some(dateStr => {
          return dateStr <= todayStr;
        });

        if (!hasTodayOrPastDate) return false;

        // Check time
        if (rem.remindAt.time) {
          const [remH, remM] = rem.remindAt.time.split(':').map(Number);
          const remTotal = remH * 60 + remM;
          const isPastOrEqualTime = rem.remindAt.dates.includes(todayStr) 
            ? currentTotalMinutes >= remTotal 
            : true;
          return isPastOrEqualTime;
        }
        return true;
      }
      
      if (i.type === ItemType.MEMO) {
        const memo = i as Memo;
        if (!memo.hasAlarm) return false;
        
        const start = memo.startDate || '';
        const end = memo.endDate || '';
        
        const includesTodayOrPast = (
          (!start || start <= todayStr) &&
          (!end || end >= todayStr)
        );

        if (!includesTodayOrPast) return false;

        // Check time
        if (memo.alarmTime) {
          const [remH, remM] = memo.alarmTime.split(':').map(Number);
          const remTotal = remH * 60 + remM;
          return currentTotalMinutes >= remTotal;
        }
        return true;
      }

      return false;
    }) as (ReminderV2 | Memo)[];

    // 4. Focus Tasks
    const focusTasks = items.filter(i => 
      i.type === ItemType.TASK && 
      (i as Task).focusLocked && 
      !i.completed && 
      !i.archived && 
      !i.trash
    ) as Task[];

    // 5. Recent Energy Types (last 3 completed sessions)
    const completedSessions = [...sessions]
      .filter(s => s.completed && s.endTime)
      .sort((a, b) => new Date(b.endTime!).getTime() - new Date(a.endTime!).getTime());

    const recentEnergyTypes: EnergyType[] = [];
    let lastCompletedTaskId: string | undefined;

    if (completedSessions.length > 0) {
      lastCompletedTaskId = completedSessions[0].taskId;
      
      for (const s of completedSessions.slice(0, 3)) {
        const task = items.find(i => i.id === s.taskId && i.type === ItemType.TASK) as Task;
        if (task && task.energyType) {
          recentEnergyTypes.push(task.energyType);
        }
      }
    }

    return {
      currentTime,
      dayOfWeek,
      availableTime,
      activeTimeSlot,
      lastCompletedTaskId,
      recentEnergyTypes,
      activeReminders,
      userSettings,
      focusTasks,
    };
  }
};
