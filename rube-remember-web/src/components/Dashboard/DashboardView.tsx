import { Item, Reminder, Memo, Recommendation } from '../../types';
import RecommendationCard from './RecommendationCard';
import MiniStats from './MiniStats';
import TimeSlotsPanel from './TimeSlotsPanel';
import ReminderAlerts from './ReminderAlerts';

interface DashboardViewProps {
  items: Item[];
  timeSlots: any[];
  recommendation: Recommendation;
  currentStreak: number;
  activeTasksCount: number;
  workedHoursStr: string;
  activeReminders: (Reminder | Memo)[];
  onStartFocus: (taskId: string, duration: number, sessionType: string) => void;
  onNewTask: () => void;
  onImageClick: (img: string) => void;
}

export default function DashboardView({
  items,
  timeSlots,
  recommendation,
  currentStreak,
  activeTasksCount,
  workedHoursStr,
  activeReminders,
  onStartFocus,
  onNewTask,
  onImageClick,
}: DashboardViewProps) {
  return (
    <div className="dashboard-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <RecommendationCard
          recommendation={recommendation}
          items={items}
          onStartFocus={onStartFocus}
          onNewTask={onNewTask}
          onImageClick={onImageClick}
        />
        <MiniStats
          currentStreak={currentStreak}
          activeTasksCount={activeTasksCount}
          workedHoursStr={workedHoursStr}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <TimeSlotsPanel timeSlots={timeSlots} items={items} />
        <ReminderAlerts activeReminders={activeReminders} />
      </div>
    </div>
  );
}