import { Item, ItemType, Task, TimeSlot } from '../../types';
import { rememberStore } from '../../store';

interface TimeSlotsPanelProps {
  timeSlots: TimeSlot[];
  items: Item[];
}

export default function TimeSlotsPanel({ timeSlots, items }: TimeSlotsPanelProps) {
  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px' }}>Bloques de Tiempo Hoy</h3>
      <div className="slots-container">
        {timeSlots.map(slot => {
          const assigned = (slot.assignedTaskIds || [])
            .map(tid => items.find(i => i.id === tid && i.type === ItemType.TASK && !i.trash) as Task)
            .filter(Boolean);

          return (
            <div key={slot.id} className="slot-card">
              <div className="slot-left">
                <div className="slot-indicator slot-luna">📅</div>
                <div className="slot-meta">
                  <span className="slot-name">{slot.name}</span>
                  <span className="slot-time">{slot.startTime} - {slot.endTime}</span>
                </div>
              </div>
              <div className="slot-assigned-tasks">
                {assigned.length > 0 ? (
                  assigned.map(task => (
                    <span key={task.id} className="slot-task-tag">
                      {task.title}
                      <span
                        className="slot-task-tag-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          rememberStore.unassignTaskFromSlot(slot.id, task.id);
                        }}
                      >
                        &times;
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="slot-empty-msg">Vacío - Sin tareas</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}