import { memo, useMemo, useState } from 'react';
import { getTaskWeightLabel, ScoreEngine } from '../../engines';
import { useRememberStore } from '../../store';
import { ItemType, Task, TaskState, Priority } from '../../types';
import { RichText } from '../../RichText';

interface TasksViewProps {
  onNewTask: () => void;
  onOpenTask: (id: string) => void;
  onImageClick: (src: string) => void;
  onToggleActive?: (taskId: string) => void;
  onToggleComplete?: (taskId: string) => void;
  onReorderActiveTasks?: (orderedIds: string[]) => void;
}

type TaskStatusTab = 'PENDING' | 'COMPLETED' | 'HABITS';
type DateRange = 'ALL' | 'TODAY_OVERDUE' | 'WEEK' | 'MONTH' | 'FUTURE' | 'UNSCHEDULED';
type SortBy = 'goals' | 'score';
type OpenDropdown = 'sort' | 'date' | 'goal' | 'priority' | 'weight' | null;

const getLocalDateStr = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

type ThreadedTask = Task & { isSubtask?: boolean; isLastSubtask?: boolean; isThreadParent?: boolean };

function threadTasks(tasksToThread: Task[], visibleParents?: ReadonlySet<string> | null): ThreadedTask[] {
  const parentList: Task[] = [];
  const subtaskMap = new Map<string, Task[]>();
  const presentIds = new Set(tasksToThread.map(t => t.id));

  tasksToThread.forEach(t => {
    if (t.parentTaskId && presentIds.has(t.parentTaskId)) {
      const arr = subtaskMap.get(t.parentTaskId) || [];
      arr.push(t);
      subtaskMap.set(t.parentTaskId, arr);
    } else {
      parentList.push(t);
    }
  });

  const out: ThreadedTask[] = [];
  parentList.forEach(parent => {
    const children = subtaskMap.get(parent.id) || [];
    const show = !visibleParents || visibleParents.has(parent.id);
    out.push({ ...parent, isSubtask: false, isThreadParent: show && children.length > 0 });
    if (show && children.length > 0) {
      children.forEach((st, idx) => {
        out.push({
          ...st,
          isSubtask: true,
          isLastSubtask: idx === children.length - 1,
        });
      });
    }
  });

  return out;
}

function weightEmoji(weight: string): string {
  if (weight === 'luna') return '🌙';
  if (weight === 'terra') return '🌍';
  if (weight === 'sol') return '☀️';
  return '⭐';
}

const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.URGENT]: 'Urgente',
  [Priority.HIGH]: 'Alta',
  [Priority.MEDIUM]: 'Media',
  [Priority.LOW]: 'Baja',
};

export const TasksView = memo(function TasksView({
  onNewTask,
  onOpenTask,
  onImageClick,
  onToggleActive,
  onToggleComplete,
  onReorderActiveTasks,
}: TasksViewProps) {
  const db = useRememberStore();
  const hourWeights = db.hourWeights || [];
  const scoreFormula = db.userSettings?.scoreFormula;

  const [taskStatusTab, setTaskStatusTab] = useState<TaskStatusTab>('PENDING');
  const [sortBy, setSortBy] = useState<SortBy>('goals');
  const [filterDateRange, setFilterDateRange] = useState<DateRange>('ALL');
  const [filterGoalId, setFilterGoalId] = useState<string>('ALL');
  const [filterPriorities, setFilterPriorities] = useState<Priority[]>([]);
  const [filterWeightIds, setFilterWeightIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);
  const [expandedParents, setExpandedParents] = useState<ReadonlySet<string>>(() => new Set());

  const toggleSubtaskExpand = (taskId: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const activeFiltersCount =
    (sortBy !== 'goals' ? 1 : 0) +
    (filterDateRange !== 'ALL' ? 1 : 0) +
    (filterPriorities.length > 0 ? 1 : 0) +
    (filterWeightIds.length > 0 ? 1 : 0) +
    (filterGoalId !== 'ALL' ? 1 : 0);

  const tasks = useMemo(
    () => db.items.filter(i => i.type === ItemType.TASK) as Task[],
    [db.items]
  );

  const subtaskCounts = useMemo(() => {
    const m = new Map<string, number>();
    tasks.forEach(t => {
      if (t.parentTaskId) m.set(t.parentTaskId, (m.get(t.parentTaskId) || 0) + 1);
    });
    return m;
  }, [tasks]);

  const score = (t: Task) => ScoreEngine.calculateScore(t, hourWeights, scoreFormula);

  const matchesSearch = (t: Task) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  };

  const weightIdOf = (t: Task): string | null => {
    if (!t.estimatedHours || t.estimatedHours <= 0) return null;
    const sortedWeights = [...hourWeights].sort((a, b) => b.minHours - a.minHours);
    const matched = sortedWeights.find(w => t.estimatedHours! >= w.minHours);
    return matched
      ? matched.id
      : (sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1].id : null);
  };

  const activeTasks = useMemo(
    () =>
      tasks
        .filter(
          t => !t.completed && !t.archived && !t.trash && t.active && matchesSearch(t)
        )
        .sort(
          (a, b) =>
            (a.activeOrder ?? Infinity) - (b.activeOrder ?? Infinity) ||
            new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
        ),
    [tasks, searchQuery]
  );

  const activeParentIds = useMemo(
    () => new Set(tasks.filter(t => t.active && !t.completed && !t.archived && !t.trash).map(t => t.id)),
    [tasks]
  );

  const handleMoveActive = (id: string, dir: -1 | 1) => {
    const ordered = tasks
      .filter(t => t.active && !t.completed && !t.archived && !t.trash)
      .sort(
        (a, b) =>
          (a.activeOrder ?? Infinity) - (b.activeOrder ?? Infinity) ||
          new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      );
    const i = ordered.findIndex(t => t.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ordered.length) return;
    const tmp = ordered[i];
    ordered[i] = ordered[j];
    ordered[j] = tmp;
    onReorderActiveTasks?.(ordered.map(t => t.id));
  };

  const activeThreaded = useMemo(() => {
    const focus = tasks.filter(t =>
      !t.completed && !t.archived && !t.trash && matchesSearch(t) &&
      (t.active || (t.parentTaskId && activeParentIds.has(t.parentTaskId)))
    ).sort(
      (a, b) =>
        (a.activeOrder ?? Infinity) - (b.activeOrder ?? Infinity) ||
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
    return threadTasks(focus, expandedParents);
  }, [tasks, searchQuery, activeParentIds, expandedParents]);

  const list = useMemo(() => {
    let filtered = tasks.filter(t => !t.trash);

    if (taskStatusTab === 'PENDING') {
      filtered = filtered.filter(t => !t.completed && !t.archived && !t.active && !(t.parentTaskId && activeParentIds.has(t.parentTaskId)));
    } else if (taskStatusTab === 'COMPLETED') {
      filtered = filtered.filter(t => t.completed && !t.archived);
    } else if (taskStatusTab === 'HABITS') {
      filtered = filtered.filter(t => t.habit === true);
    }

    if (filterPriorities.length > 0) {
      filtered = filtered.filter(t => filterPriorities.includes(t.priority));
    }

    if (filterGoalId !== 'ALL') {
      if (filterGoalId.startsWith('goal:')) {
        const goalId = filterGoalId.slice(5);
        filtered = filtered.filter(t => t.goalId === goalId);
      } else if (filterGoalId.startsWith('cat:')) {
        const catId = filterGoalId.slice(4);
        filtered = filtered.filter(t => t.categoryId === catId);
      }
    }

    if (filterWeightIds.length > 0) {
      filtered = filtered.filter(t => {
        const id = weightIdOf(t);
        return id ? filterWeightIds.includes(id) : false;
      });
    }

    const todayStr = getLocalDateStr();
    if (filterDateRange === 'TODAY_OVERDUE') {
      filtered = filtered.filter(t => t.dueDate && t.dueDate <= todayStr);
    } else if (filterDateRange === 'WEEK') {
      const next = new Date();
      next.setDate(next.getDate() + 7);
      const nextStr = getLocalDateStr(next);
      filtered = filtered.filter(t => t.dueDate && t.dueDate >= todayStr && t.dueDate <= nextStr);
    } else if (filterDateRange === 'MONTH') {
      const next = new Date();
      next.setDate(next.getDate() + 30);
      const nextStr = getLocalDateStr(next);
      filtered = filtered.filter(t => t.dueDate && t.dueDate >= todayStr && t.dueDate <= nextStr);
    } else if (filterDateRange === 'FUTURE') {
      const next = new Date();
      next.setDate(next.getDate() + 30);
      const nextStr = getLocalDateStr(next);
      filtered = filtered.filter(t => t.dueDate && t.dueDate > nextStr);
    } else if (filterDateRange === 'UNSCHEDULED') {
      filtered = filtered.filter(t => !t.dueDate);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(t => matchesSearch(t));
    }

    const result: (ThreadedTask | { isHeader: true; title: string; id: string })[] = [];

    if (sortBy === 'goals') {
      const groupMap = new Map<string, { key: string; title: string; tasks: Task[]; maxScore: number }>();

      filtered.forEach(t => {
        const s = score(t);
        let key = 'no_group';
        let title = 'Sin Categorizar / Objetivo';

        if (t.goalId) {
          const goal = db.goals.find(g => g.id === t.goalId);
          if (goal) {
            key = `goal_${goal.id}`;
            title = `${goal.emoji || '🎯'} ${goal.title}`;
          }
        } else if (t.categoryId) {
          const category = db.taskCategories?.find(c => c.id === t.categoryId);
          if (category) {
            key = `cat_${category.id}`;
            title = `${category.emoji || '📁'} ${category.name}`;
          }
        }

        const existing = groupMap.get(key);
        if (!existing) {
          groupMap.set(key, { key, title, tasks: [t], maxScore: s });
        } else {
          existing.tasks.push(t);
          if (s > existing.maxScore) existing.maxScore = s;
        }
      });

      groupMap.forEach(group => {
        group.tasks.sort((a, b) => {
          const diff = score(b) - score(a);
          if (diff !== 0) return diff;
          return b.createdAt.localeCompare(a.createdAt);
        });
      });

      const sortedGroups = Array.from(groupMap.values()).sort((a, b) => {
        if (b.maxScore !== a.maxScore) return b.maxScore - a.maxScore;
        return a.title.localeCompare(b.title);
      });

      sortedGroups.forEach(group => {
        result.push({ isHeader: true, title: group.title, id: `header-group-${group.key}` });
        result.push(...threadTasks(group.tasks, expandedParents));
      });

      return result;
    }

    const sorted = [...filtered].sort((a, b) => {
      const scoreA = score(a);
      const scoreB = score(b);
      if (scoreA !== scoreB) return scoreB - scoreA;

      const dateA = a.dueDate || '';
      const dateB = b.dueDate || '';
      if (dateA && dateB) {
        if (dateA !== dateB) return dateA.localeCompare(dateB);
      } else if (dateA) {
        return -1;
      } else if (dateB) {
        return 1;
      }

      const weights: Record<Priority, number> = { [Priority.URGENT]: 4, [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
      const wA = weights[a.priority] || 2;
      const wB = weights[b.priority] || 2;
      if (wA !== wB) return wB - wA;

      return b.createdAt.localeCompare(a.createdAt);
    });

    if (taskStatusTab === 'HABITS') return sorted as (Task | { isHeader: true; title: string; id: string })[];

    const currentTasks = sorted.filter(t => !t.startDate || t.startDate <= todayStr);
    const futureTasks = sorted.filter(t => t.startDate && t.startDate > todayStr);

    if (currentTasks.length > 0) result.push(...threadTasks(currentTasks, expandedParents));
    if (futureTasks.length > 0) {
      result.push({ isHeader: true, title: 'Tareas para un futuro', id: 'header-future' });
      result.push(...threadTasks(futureTasks, expandedParents));
    }
    return result;
  }, [tasks, db.goals, db.taskCategories, taskStatusTab, sortBy, filterDateRange, filterGoalId, filterPriorities, filterWeightIds, searchQuery, hourWeights, scoreFormula, expandedParents]);

  const toggleDropdown = (which: Exclude<OpenDropdown, null>) => {
    setOpenDropdown(prev => (prev === which ? null : which));
  };

  const renderCard = (task: Task & { isSubtask?: boolean; isLastSubtask?: boolean; isThreadParent?: boolean }) => {
    const weight = getTaskWeightLabel(task.estimatedHours, hourWeights);
    const progress = task.progress || 0;
    const isSubtask = !!task.isSubtask;
    const parentTask = task.parentTaskId ? (db.items.find(i => i.id === task.parentTaskId) as Task | undefined) : undefined;

    const cardEl = (
      <div
        key={task.id}
        className={`glass-panel task-card ${task.completed ? 'completed' : ''} ${isSubtask ? 'subtask-card' : ''} ${task.isThreadParent ? 'is-thread-parent' : ''}`}
        style={task.parentTaskId ? { borderLeft: '3.5px solid #BF5AF2' } : undefined}
      >
        <div className="task-card-left-rail">
          <button
            type="button"
            className={`task-complete-btn ${task.completed ? 'active' : ''}`}
            title={task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete?.(task.id);
            }}
          >
            {task.completed ? '✓' : '○'}
          </button>
          {task.active && (
            <div className="task-active-arrows">
              <button
                type="button"
                className="task-active-arrow up"
                title="Subir"
                aria-label="Subir"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveActive(task.id, -1);
                }}
              >
                ▲
              </button>
              <button
                type="button"
                className="task-active-arrow down"
                title="Bajar"
                aria-label="Bajar"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveActive(task.id, 1);
                }}
              >
                ▼
              </button>
            </div>
          )}
          {!isSubtask && (subtaskCounts.get(task.id) || 0) > 0 && (
            <button
              type="button"
              className={`task-subtask-toggle ${expandedParents.has(task.id) ? 'active' : ''}`}
              title={expandedParents.has(task.id) ? 'Ocultar subtareas' : `Mostrar subtareas (${subtaskCounts.get(task.id)})`}
              onClick={(e) => {
                e.stopPropagation();
                toggleSubtaskExpand(task.id);
              }}
            >
              <span className="task-subtask-toggle-chevron">{expandedParents.has(task.id) ? '▾' : '▸'}</span>
              {subtaskCounts.get(task.id)}
            </button>
          )}
        </div>
        <div className="task-card-left" onClick={() => onOpenTask(task.id)}>
          <div className={`task-weight-indicator slot-${weight}`} style={{ background: 'rgba(255,255,255,0.03)' }}>
            {weightEmoji(weight)}
          </div>
          <div className="task-info-group">
            {task.parentTaskId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                <span className="tag-meta" style={{ backgroundColor: 'rgba(191,90,242,0.25)', color: '#BF5AF2', fontWeight: 800, fontSize: isSubtask ? '0.65rem' : '0.68rem', padding: '1px 6px' }}>
                  ⚡ SUBTAREA
                </span>
                {!isSubtask && parentTask && (
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                    ↳ {parentTask.title}
                  </span>
                )}
              </div>
            )}
            <div className="task-title-row">
              <span className="task-title" style={isSubtask ? { fontSize: '0.92rem' } : undefined}>
                {task.favourite && <span style={{ color: '#FFCC00', marginRight: '4px' }}>⭐</span>}
                {task.title}
              </span>
              {task.dueDate && <span className="task-due-date">📅 {task.dueDate}</span>}
            </div>
            {task.description || (task.images && task.images.length > 0) ? (
              <RichText text={task.description || ''} images={task.images} onImageClick={onImageClick} className="task-desc" style={{ fontSize: isSubtask ? '0.8rem' : '0.85rem', color: 'rgba(255,255,255,0.6)' }} />
            ) : (
              <span className="task-desc">Sin notas.</span>
            )}
            <div className="task-meta-tags">
              <span className="tag-meta" style={{ backgroundColor: 'rgba(255,215,0,0.12)', color: '#FFD700', fontWeight: 800 }}>
                ⭐ Score: {score(task)}
              </span>
              {task.taskState === TaskState.BLOCKED && (
                <span className="tag-meta tag-state-blocked">🚫 Bloqueada</span>
              )}
              {task.taskState === TaskState.WAITING && (
                <span className="tag-meta tag-state-waiting">⏳ Esperando</span>
              )}
              {task.goalId && !isSubtask && (() => {
                const goal = db.goals.find(g => g.id === task.goalId);
                if (!goal) return null;
                const phase = task.phaseId ? goal.phases?.find((p: any) => p.id === task.phaseId) : null;
                return (
                  <>
                    <span className="tag-meta" style={{ backgroundColor: 'rgba(191,90,242,0.15)', color: '#BF5AF2' }}>
                      🎯 {goal.title}
                    </span>
                    {phase && (
                      <span className="tag-meta" style={{ backgroundColor: 'rgba(0,199,190,0.15)', color: '#00C7BE' }}>
                        ⛓️ {phase.name}
                      </span>
                    )}
                  </>
                );
              })()}
              {progress > 0 && !task.completed && (
                <span className="tag-meta tag-energy">{progress}% completado</span>
              )}
              {task.tags && task.tags.map(tag => (
                <span key={tag} className="tag-meta" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  #{tag}
                </span>
              ))}
            </div>
            {progress > 0 && !task.completed && !isSubtask && (
              <div className="task-progress-bar-container">
                <div className="task-progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          className={`task-flash-btn ${task.active ? 'active' : ''}`}
          title={task.active ? 'Dejar de trabajar en ella' : 'Marcar que estás trabajando en ella'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleActive?.(task.id);
          }}
        >
          ⚡
        </button>
      </div>
    );

    if (isSubtask) {
      return (
        <div className="subtask-thread-row" key={task.id}>
          <div className={`subtask-tree-connector ${task.isLastSubtask ? 'is-last' : ''}`}>
            <div className="tree-line-v" />
            <div className="tree-line-elbow" />
          </div>
          <div className="subtask-card-wrapper">
            {cardEl}
          </div>
        </div>
      );
    }

    return cardEl;
  };

  return (
    <div className="tasks-tab-container">
      <div className="section-header">
        <div className="section-title-group">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Gestión de Tareas</h2>
          <span className="section-subtitle">Visualiza, programa y completa tus objetivos cognitivos</span>
        </div>
        <button className="btn btn-primary" onClick={onNewTask}>
          Nueva Tarea
        </button>
      </div>

      {/* Tabs de estado */}
      <div className="tasks-status-tabs">
        {([
          { id: 'PENDING', label: 'Pendientes' },
          { id: 'COMPLETED', label: 'Completadas' },
          { id: 'HABITS', label: 'Hábitos' },
        ] as { id: TaskStatusTab; label: string }[]).map(tab => (
          <button
            key={tab.id}
            className={`filter-btn ${taskStatusTab === tab.id ? 'active' : ''}`}
            onClick={() => setTaskStatusTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Barra de filtros */}
      <div className="glass-panel tasks-filter-bar">
        <div className="filter-search-row">
          <div className="filter-search-group">
            {searchQuery && (
              <button
                type="button"
                className="filter-search-clear"
                title="Limpiar búsqueda"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por título o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          {activeFiltersCount > 0 && (
            <span className="filter-btn active" style={{ display: 'flex', alignItems: 'center' }}>
              {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* 1. Ordenar por */}
        <div className="filter-dropdown">
          <div className="filter-dropdown-header" onClick={() => toggleDropdown('sort')}>
            <span className="filter-dropdown-title">Ordenar por:</span>
            <span className={`filter-dropdown-value ${sortBy !== 'goals' ? 'active' : ''}`}>
              {sortBy === 'goals' ? '🎯 Objetivos y categorías' : '⭐ Mayor Score'} {openDropdown === 'sort' ? '▲' : '▼'}
            </span>
          </div>
          {openDropdown === 'sort' && (
            <div className="filter-dropdown-options">
              <div className={`filter-option-item ${sortBy === 'goals' ? 'active' : ''}`} onClick={() => { setSortBy('goals'); setOpenDropdown(null); }}>
                🎯 Objetivos y categorías
              </div>
              <div className={`filter-option-item ${sortBy === 'score' ? 'active' : ''}`} onClick={() => { setSortBy('score'); setOpenDropdown(null); }}>
                ⭐ Mayor Score
              </div>
            </div>
          )}
        </div>

        {/* 2. Finalización */}
        <div className="filter-dropdown">
          <div className="filter-dropdown-header" onClick={() => toggleDropdown('date')}>
            <span className="filter-dropdown-title">Finalización:</span>
            <span className={`filter-dropdown-value ${filterDateRange !== 'ALL' ? 'active' : ''}`}>
              {filterDateRange === 'ALL' ? 'Cualquiera' :
               filterDateRange === 'TODAY_OVERDUE' ? '🏁 Hoy y Atrasadas' :
               filterDateRange === 'WEEK' ? '🗓️ Esta semana' :
               filterDateRange === 'MONTH' ? '📅 Este mes' :
               filterDateRange === 'FUTURE' ? '🚀 Más adelante' :
               '❓ Sin fecha'} {openDropdown === 'date' ? '▲' : '▼'}
            </span>
          </div>
          {openDropdown === 'date' && (
            <div className="filter-dropdown-options">
              {[
                { id: 'ALL' as DateRange, label: 'Cualquiera' },
                { id: 'TODAY_OVERDUE' as DateRange, label: '🏁 Hoy y Atrasadas' },
                { id: 'WEEK' as DateRange, label: '🗓️ Esta semana' },
                { id: 'MONTH' as DateRange, label: '📅 Este mes' },
                { id: 'FUTURE' as DateRange, label: '🚀 Más adelante' },
                { id: 'UNSCHEDULED' as DateRange, label: '❓ Sin fecha' },
              ].map(opt => (
                <div
                  key={opt.id}
                  className={`filter-option-item ${filterDateRange === opt.id ? 'active' : ''}`}
                  onClick={() => { setFilterDateRange(opt.id); setOpenDropdown(null); }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Objetivo / Categoría */}
        <div className="filter-dropdown">
          <div className="filter-dropdown-header" onClick={() => toggleDropdown('goal')}>
            <span className="filter-dropdown-title">Objetivo / Categoría:</span>
            <span className={`filter-dropdown-value ${filterGoalId !== 'ALL' ? 'active' : ''}`}>
              {(() => {
                if (filterGoalId === 'ALL') return 'Todos los objetivos y categorías';
                if (filterGoalId.startsWith('goal:')) {
                  const g = db.goals.find(g => g.id === filterGoalId.slice(5));
                  if (g) return `${g.emoji || '🎯'} ${g.title}`;
                }
                if (filterGoalId.startsWith('cat:')) {
                  const c = db.taskCategories?.find(c => c.id === filterGoalId.slice(4));
                  if (c) return `${c.emoji || '📁'} ${c.name}`;
                }
                return 'Todos los objetivos y categorías';
              })()}
              {openDropdown === 'goal' ? ' ▲' : ' ▼'}
            </span>
          </div>
          {openDropdown === 'goal' && (
            <div className="filter-dropdown-options">
              <div className={`filter-option-item ${filterGoalId === 'ALL' ? 'active' : ''}`} onClick={() => { setFilterGoalId('ALL'); setOpenDropdown(null); }}>
                Todos los objetivos y categorías
              </div>
              {(db.goals || []).map(g => (
                <div
                  key={g.id}
                  className={`filter-option-item ${filterGoalId === `goal:${g.id}` ? 'active' : ''}`}
                  onClick={() => { setFilterGoalId(`goal:${g.id}`); setOpenDropdown(null); }}
                >
                  {g.emoji || '🎯'} {g.title}
                </div>
              ))}
              {(db.taskCategories || []).map(c => (
                <div
                  key={c.id}
                  className={`filter-option-item ${filterGoalId === `cat:${c.id}` ? 'active' : ''}`}
                  onClick={() => { setFilterGoalId(`cat:${c.id}`); setOpenDropdown(null); }}
                >
                  {c.emoji || '📁'} {c.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Prioridad */}
        <div className="filter-dropdown">
          <div className="filter-dropdown-header" onClick={() => toggleDropdown('priority')}>
            <span className="filter-dropdown-title">Prioridad:</span>
            <span className={`filter-dropdown-value ${filterPriorities.length > 0 ? 'active' : ''}`}>
              {filterPriorities.length === 0 ? 'Todas' : filterPriorities.map(p => PRIORITY_LABELS[p]).join(', ')}
              {openDropdown === 'priority' ? ' ▲' : ' ▼'}
            </span>
          </div>
          {openDropdown === 'priority' && (
            <div className="filter-dropdown-options">
              <div className={`filter-option-item ${filterPriorities.length === 0 ? 'active' : ''}`} onClick={() => { setFilterPriorities([]); setOpenDropdown(null); }}>
                Todas
              </div>
              {([Priority.URGENT, Priority.HIGH, Priority.MEDIUM, Priority.LOW] as Priority[]).map(p => {
                const isActive = filterPriorities.includes(p);
                return (
                  <div
                    key={p}
                    className={`filter-option-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setFilterPriorities(isActive ? filterPriorities.filter(x => x !== p) : [p]);
                      setOpenDropdown(null);
                    }}
                  >
                    {PRIORITY_LABELS[p]}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. Peso */}
        <div className="filter-dropdown">
          <div className="filter-dropdown-header" onClick={() => toggleDropdown('weight')}>
            <span className="filter-dropdown-title">Peso:</span>
            <span className={`filter-dropdown-value ${filterWeightIds.length > 0 ? 'active' : ''}`}>
              {filterWeightIds.length === 0
                ? 'Todos los pesos'
                : (hourWeights.filter(w => filterWeightIds.includes(w.id)).map(w => w.name).join(', ') || 'Todos los pesos')}
              {openDropdown === 'weight' ? ' ▲' : ' ▼'}
            </span>
          </div>
          {openDropdown === 'weight' && (
            <div className="filter-dropdown-options">
              <div className={`filter-option-item ${filterWeightIds.length === 0 ? 'active' : ''}`} onClick={() => { setFilterWeightIds([]); setOpenDropdown(null); }}>
                Todos los pesos
              </div>
              {(hourWeights || []).map(w => {
                const isActive = filterWeightIds.includes(w.id);
                return (
                  <div
                    key={w.id}
                    className={`filter-option-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setFilterWeightIds(isActive ? filterWeightIds.filter(x => x !== w.id) : [w.id]);
                      setOpenDropdown(null);
                    }}
                  >
                    {w.name} ({w.minHours}h)
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lista de tareas */}
      <div className="tasks-list">
        {taskStatusTab === 'PENDING' && activeTasks.length > 0 && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
            <div className="tasks-group-header">
              <span>⚡ TRABAJANDO EN ESTE MOMENTO</span>
              <hr />
            </div>
            {activeThreaded.map(renderCard)}
          </div>
        )}

        {list.length === 0 ? (
          <div className="slot-empty-msg" style={{ width: '100%', textAlign: 'center', padding: '40px' }}>
            {taskStatusTab === 'HABITS'
              ? 'No tienes hábitos todavía. Usa el pin 📌 de una tarea para guardarla como hábito.'
              : 'No se encontraron tareas.'}
          </div>
        ) : (
          list.map(item => {
            if ((item as any).isHeader) {
              return (
                <div key={(item as any).id} className="tasks-group-header">
                  <span>{(item as any).title.toUpperCase()}</span>
                  <hr />
                </div>
              );
            }
            return renderCard(item as any);
          })
        )}
      </div>
    </div>
  );
});