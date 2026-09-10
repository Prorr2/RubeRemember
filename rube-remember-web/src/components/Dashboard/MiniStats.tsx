interface MiniStatsProps {
  currentStreak: number;
  activeTasksCount: number;
  workedHoursStr: string;
}

export default function MiniStats({ currentStreak, activeTasksCount, workedHoursStr }: MiniStatsProps) {
  return (
    <div className="mini-stats-row">
      <div className="glass-panel mini-stat-card">
        <span className="mini-stat-val">{currentStreak || 0}</span>
        <span className="mini-stat-lbl">Racha Actual</span>
      </div>
      <div className="glass-panel mini-stat-card">
        <span className="mini-stat-val">{activeTasksCount}</span>
        <span className="mini-stat-lbl">Tareas Activas</span>
      </div>
      <div className="glass-panel mini-stat-card">
        <span className="mini-stat-val">{workedHoursStr}</span>
        <span className="mini-stat-lbl">Tiempo Enfocado</span>
      </div>
    </div>
  );
}