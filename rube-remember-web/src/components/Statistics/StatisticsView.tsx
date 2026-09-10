import { memo, useMemo, useState } from 'react';
import { getTaskWeightLabel } from '../../engines';
import { useRememberStore } from '../../store';
import { ItemType, Session, Task } from '../../types';
import { DonutChart } from './DonutChart';

interface StatisticsViewProps {
  onOpenRoadmap: (taskId: string) => void;
}

export const StatisticsView = memo(function StatisticsView({ onOpenRoadmap }: StatisticsViewProps) {
  const db = useRememberStore();
  const [statsExpandedDay, setStatsExpandedDay] = useState<string | null>(null);
  const [statsExpandedTask, setStatsExpandedTask] = useState<string | null>(null);

  const statsEnergyDonut = useMemo(() => {
    const counts: Record<string, number> = {};
    db.sessions.forEach(s => {
      const task = db.items.find(i => i.id === s.taskId && i.type === ItemType.TASK) as Task;
      if (task) {
        const type = task.energyType || 'OTHER';
        counts[type] = (counts[type] || 0) + 1;
      }
    });

    const colors: Record<string, string> = {
      CREATIVE: '#3b82f6',
      ANALYTICAL: '#10b981',
      LEARNING: '#f59e0b',
      SOCIAL: '#8b5cf6',
      ADMINISTRATIVE: '#ec4899',
      PHYSICAL: '#ef4444',
      OTHER: '#64748b'
    };

    return { counts, colors };
  }, [db.sessions, db.items]);

  const statsBlocksDonut = useMemo(() => {
    const counts: Record<string, number> = { LUNA: 0, TERRA: 0, SOL: 0, ASTRA: 0 };
    db.sessions.forEach(s => {
      const task = db.items.find(i => i.id === s.taskId && i.type === ItemType.TASK) as Task;
      if (task) {
        const weight = getTaskWeightLabel(task.estimatedHours, db.hourWeights).toUpperCase();
        counts[weight] = (counts[weight] || 0) + 1;
      }
    });

    const colors: Record<string, string> = {
      LUNA: 'var(--color-luna)',
      TERRA: 'var(--color-terra)',
      SOL: 'var(--color-sol)',
      ASTRA: 'var(--color-astra)'
    };

    return { counts, colors };
  }, [db.sessions, db.items, db.hourWeights]);

  const statisticsSessionsGrouped = useMemo(() => {
    const dailyGroups: Record<string, Session[]> = {};
    db.sessions.forEach(s => {
      if (s.endTime) {
        const dStr = s.endTime.split('T')[0];
        if (!dailyGroups[dStr]) dailyGroups[dStr] = [];
        dailyGroups[dStr].push(s);
      }
    });

    const sortedDates = Object.keys(dailyGroups).sort((a, b) => b.localeCompare(a));
    return { dailyGroups, sortedDates };
  }, [db.sessions]);

  return (
    <section className="tab-content-parent">
      <div className="section-header">
        <div className="section-title-group">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Estadísticas Cognitivas</h2>
          <span className="section-subtitle">Distribución energética y diario temporal de enfoque</span>
        </div>
      </div>

      <div className="stats-dashboard">
        <div className="charts-row">
          <div className="glass-panel chart-card">
            <h3>Distribución por Energías</h3>
            <div className="chart-wrapper">
              <DonutChart counts={statsEnergyDonut.counts} colors={statsEnergyDonut.colors} />
            </div>
          </div>

          <div className="glass-panel chart-card">
            <h3>Distribución por Bloques</h3>
            <div className="chart-wrapper">
              <DonutChart counts={statsBlocksDonut.counts} colors={statsBlocksDonut.colors} />
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Diario de Sesiones Realizadas</h3>
          <div id="stats-daily-history">
            {statisticsSessionsGrouped.sortedDates.length === 0 ? (
              <div className="slot-empty-msg" style={{ textAlign: 'center', padding: '40px' }}>
                No se ha registrado ninguna sesión de enfoque aún.
              </div>
            ) : (
              statisticsSessionsGrouped.sortedDates.map(dateStr => {
                const daySessions = statisticsSessionsGrouped.dailyGroups[dateStr];
                const totalMins = daySessions.reduce((acc, s) => acc + (s.realDuration || 0), 0);
                const isDayExpanded = statsExpandedDay === dateStr;

                const taskGroups: Record<string, Session[]> = {};
                daySessions.forEach(s => {
                  if (!taskGroups[s.taskId]) taskGroups[s.taskId] = [];
                  taskGroups[s.taskId].push(s);
                });

                return (
                  <div key={dateStr} className="daily-log-day-group">
                    <div
                      className="daily-log-day-header"
                      onClick={() => setStatsExpandedDay(isDayExpanded ? null : dateStr)}
                    >
                      <span className="daily-log-day-title">
                        {new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      <span className="daily-log-day-duration">
                        Total: {totalMins} min ({daySessions.length} ses.) {isDayExpanded ? '▲' : '▼'}
                      </span>
                    </div>

                    {isDayExpanded && (
                      <div className="daily-log-day-content">
                        {Object.keys(taskGroups).map(taskId => {
                          const taskObj = db.items.find(i => i.id === taskId);
                          const taskSessions = taskGroups[taskId];
                          const taskMins = taskSessions.reduce((acc, s) => acc + (s.realDuration || 0), 0);
                          const isTaskExpanded = statsExpandedTask === taskId;

                          return (
                            <div key={taskId} className="daily-log-task-group">
                              <div
                                className="daily-log-task-header"
                                onClick={() => setStatsExpandedTask(isTaskExpanded ? null : taskId)}
                              >
                                <span className="daily-log-task-title">{taskObj ? taskObj.title : 'Tarea eliminada'}</span>
                                <span className="daily-log-task-meta">
                                  {taskMins} min ({taskSessions.length} ses.) {isTaskExpanded ? '▲' : '▼'}
                                </span>
                              </div>

                              {isTaskExpanded && (
                                <div className="daily-log-task-content">
                                  {taskSessions.map(session => (
                                    <div key={session.id} className="session-block-details">
                                      <div className="roadmap-session-header-row">
                                        <span className="session-block-title">
                                          {new Date(session.endTime!).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {session.realDuration} min
                                        </span>
                                        <span style={{ color: session.completed ? 'var(--color-terra)' : 'var(--color-danger)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                          {session.completed ? 'Completado' : 'Incompleto'}
                                        </span>
                                      </div>
                                      <div className="session-block-val"><strong>Progreso:</strong> {session.progress || 0}%</div>
                                      <div className="session-block-val"><strong>¿Qué se hizo?:</strong> {session.notes || 'No especificado'}</div>
                                      <div className="session-block-val"><strong>Siguiente paso:</strong> {session.nextStep || 'No especificado'}</div>
                                      <div className="session-block-actions">
                                        <button
                                          className="btn btn-secondary"
                                          onClick={() => onOpenRoadmap(session.taskId)}
                                        >
                                          Gestionar Roadmap
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
});