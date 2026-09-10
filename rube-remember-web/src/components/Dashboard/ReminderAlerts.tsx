import { Memo, Reminder } from '../../types';
import { rememberStore } from '../../store';

interface ReminderAlertsProps {
  activeReminders: (Reminder | Memo)[];
}

export default function ReminderAlerts({ activeReminders }: ReminderAlertsProps) {
  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px' }}>Alertas de Recordatorios</h3>
      <div>
        {activeReminders.length > 0 ? (
          activeReminders.map(rem => {
            const timeStr = (rem as any).alarmTime || (rem as any).remindAt?.time || 'Todo el día';
            return (
              <div key={rem.id} className="reminder-alert-card">
                <div>
                  <span className="reminder-alert-title">{rem.title}</span>
                  <span className="reminder-alert-time">{timeStr}</span>
                </div>
                <button
                  className="reminder-alert-btn"
                  onClick={() => rememberStore.toggleItemCompleted(rem.id)}
                >
                  Atendido
                </button>
              </div>
            );
          })
        ) : (
          <div className="slot-empty-msg" style={{ padding: '20px', textAlign: 'center' }}>
            Sin alertas activas.
          </div>
        )}
      </div>
    </div>
  );
}