import { memo, useMemo, useState } from 'react';
import { useRememberStore, rememberStore } from '../../store';
import { ItemType, Memo, Reminder } from '../../types';
import { RichText } from '../../RichText';

interface RemindersViewProps {
  onOpenReminder: (id?: string) => void;
}

const THEME_COLOR = '#00C7BE'; // Premium Teal for Recordatorios (matching mobile src/app/memos.tsx)

interface NormalizedReminder {
  id: string;
  type: ItemType;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  hasAlarm?: boolean;
  alarmTime?: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
}

const formatShortDate = (dateStr?: string) => {
  if (!dateStr) return 'Siempre';
  const [, m, d] = dateStr.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mIdx = parseInt(m, 10) - 1;
  return `${parseInt(d, 10)} ${months[mIdx] || ''}`;
};

const getDateRangeStr = (item: NormalizedReminder) => {
  if (item.startDate || item.endDate) {
    const startStr = item.startDate ? formatShortDate(item.startDate) : 'Siempre';
    const endStr = item.endDate ? formatShortDate(item.endDate) : 'Siempre';
    if (item.startDate && !item.endDate) return `Desde el ${startStr}`;
    if (!item.startDate && item.endDate) return `Hasta el ${endStr}`;
    if (item.startDate === item.endDate) return startStr;
    return `${startStr} al ${endStr}`;
  }
  return 'Mostrar indefinidamente';
};

const getReminderText = (item: NormalizedReminder) => {
  const dateStr = getDateRangeStr(item);
  const alarmStr = item.hasAlarm ? ` (Alarma: ${item.alarmTime || '12:00'})` : '';
  return `${item.title}${item.description ? ` - ${item.description}` : ''} [${dateStr}${alarmStr}]`;
};

export const RemindersView = memo(function RemindersView({ onOpenReminder }: RemindersViewProps) {
  const db = useRememberStore();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pastCollapsed, setPastCollapsed] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Normalize all Recordatorios (Memos + any legacy Reminders)
  const allReminders = useMemo(() => {
    const list: NormalizedReminder[] = [];

    db.items.forEach((item) => {
      if (item.trash) return;

      if (item.type === ItemType.MEMO) {
        const m = item as Memo;
        list.push({
          id: m.id,
          type: ItemType.MEMO,
          title: m.title,
          description: m.description,
          startDate: m.startDate,
          endDate: m.endDate,
          hasAlarm: m.hasAlarm,
          alarmTime: m.alarmTime,
          completed: !!m.completed,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        });
      } else if (item.type === ItemType.REMINDER) {
        // Support legacy reminders seamlessly
        const r = item as Reminder;
        const firstDate = r.remindAt?.dates?.[0] || r.remindAt?.date;
        const lastDate = r.remindAt?.dates?.[r.remindAt.dates.length - 1] || r.remindAt?.date;
        list.push({
          id: r.id,
          type: ItemType.REMINDER,
          title: r.title,
          description: r.description,
          startDate: firstDate,
          endDate: lastDate,
          hasAlarm: true,
          alarmTime: r.remindAt?.time || '12:00',
          completed: !!r.completed,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        });
      }
    });

    return list;
  }, [db.items]);

  // Group recordatorios dynamically (Past, Active, Upcoming, Completed)
  const groupedSections = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const q = searchQuery.toLowerCase().trim();

    const filtered = q
      ? allReminders.filter(
          (rem) =>
            rem.title.toLowerCase().includes(q) ||
            (rem.description || '').toLowerCase().includes(q)
        )
      : allReminders;

    const activeList: NormalizedReminder[] = [];
    const upcomingList: NormalizedReminder[] = [];
    const pastList: NormalizedReminder[] = [];
    const completedList: NormalizedReminder[] = [];

    filtered.forEach((memo) => {
      if (memo.completed) {
        completedList.push(memo);
      } else {
        const hasStart = !!memo.startDate;
        const hasEnd = !!memo.endDate;
        const start = memo.startDate || '';
        const end = memo.endDate || '';

        const effectiveEndDate = hasEnd ? end : (hasStart ? start : '');

        if (effectiveEndDate && effectiveEndDate < today) {
          pastList.push(memo);
        } else if (hasStart && start > today) {
          upcomingList.push(memo);
        } else {
          activeList.push(memo);
        }
      }
    });

    const sortByDate = (a: NormalizedReminder, b: NormalizedReminder) => {
      const dateA = a.startDate || a.createdAt;
      const dateB = b.startDate || b.createdAt;
      return dateA.localeCompare(dateB);
    };

    // Subtly separate active reminders with alarm from those without
    const activeWithAlarm = activeList.filter((item) => !!item.hasAlarm);
    const activeWithoutAlarm = activeList.filter((item) => !item.hasAlarm);

    activeWithAlarm.sort((a, b) => {
      const timeA = a.alarmTime || '12:00';
      const timeB = b.alarmTime || '12:00';
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      return sortByDate(a, b);
    });

    activeWithoutAlarm.sort(sortByDate);

    return [
      {
        title: 'Pasados de fecha',
        data: pastList.sort(sortByDate),
        icon: '🚨',
        color: '#FF3B30',
        isPastSection: true,
      },
      {
        title: 'Activos en este momento',
        data: [...activeWithAlarm, ...activeWithoutAlarm],
        icon: '🟢',
        color: '#34C759',
        hasAlarmSeparation: activeWithAlarm.length > 0 && activeWithoutAlarm.length > 0,
        alarmCount: activeWithAlarm.length,
      },
      {
        title: 'Programados próximamente',
        data: upcomingList.sort(sortByDate),
        icon: '📅',
        color: '#FF9500',
      },
      {
        title: 'Pasados o Completados',
        data: completedList.sort(sortByDate),
        icon: '📦',
        color: 'rgba(255, 255, 255, 0.45)',
        isCompletedSection: true,
      },
    ];
  }, [allReminders, searchQuery]);

  const isListEmpty = useMemo(() => {
    return groupedSections.every((s) => s.data.length === 0);
  }, [groupedSections]);

  const copyToClipboard = async (text: string, count: number = 1) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setToastMessage(count === 1 ? 'Recordatorio copiado' : `${count} recordatorios copiados`);
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allFilteredIds = groupedSections.flatMap((g) => g.data.map((p) => p.id));
    if (selectedIds.length === allFilteredIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allFilteredIds);
    }
  };

  const handleBulkDelete = () => {
    if (
      window.confirm(`¿Deseas mover ${selectedIds.length} recordatorios a la papelera?`)
    ) {
      for (const id of selectedIds) {
        rememberStore.deleteItem(id);
      }
      setSelectedIds([]);
    }
  };

  const handleBulkCopy = () => {
    const texts: string[] = [];
    allReminders.forEach((rem) => {
      if (selectedIds.includes(rem.id)) {
        texts.push(getReminderText(rem));
      }
    });

    if (texts.length === 0) return;
    copyToClipboard(texts.join('\n\n'), texts.length);
    setSelectedIds([]);
  };

  const handleCopyItem = (item: NormalizedReminder, e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(getReminderText(item), 1);
  };

  const handleDeleteItem = (item: NormalizedReminder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`¿Deseas mover el recordatorio "${item.title}" a la papelera?`)) {
      rememberStore.deleteItem(item.id);
    }
  };

  const handleToggleCompleted = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    rememberStore.toggleItemCompleted(id);
  };

  return (
    <section className="tab-content-parent reminders-view-container">
      {/* Header Bar: switches to bulk actions when multi-select active */}
      {selectedIds.length > 0 ? (
        <div className="reminders-bulk-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              onClick={() => setSelectedIds([])}
              title="Cancelar selección"
            >
              ✕
            </button>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: THEME_COLOR }}>
              {selectedIds.length} seleccionados
            </span>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              onClick={handleSelectAll}
            >
              {selectedIds.length === groupedSections.flatMap((g) => g.data).length
                ? 'Deseleccionar todos'
                : 'Seleccionar todos'}
            </button>
          </div>

          <div className="reminders-bulk-actions">
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={handleBulkCopy}
              title="Copiar texto de recordatorios seleccionados"
            >
              📋 Copiar texto
            </button>
            <button
              className="btn btn-danger"
              style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={handleBulkDelete}
              title="Mover seleccionados a la papelera"
            >
              🗑️ Eliminar
            </button>
          </div>
        </div>
      ) : (
        <div className="section-header">
          <div className="section-title-group">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Mis Recordatorios</h2>
            <span className="section-subtitle">Alertas temporales y recordatorios con fechas activas</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {allReminders.length > 0 && (
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
                onClick={() => {
                  const allIds = groupedSections.flatMap((g) => g.data.map((p) => p.id));
                  if (allIds.length > 0) {
                    setSelectedIds([allIds[0]]);
                  }
                }}
                title="Modo selección múltiple"
              >
                ☑️ Seleccionar
              </button>
            )}
            <button
              className="btn btn-primary"
              style={{ background: THEME_COLOR, borderColor: THEME_COLOR, fontWeight: 700, color: '#fff' }}
              onClick={() => onOpenReminder()}
            >
              + Nuevo Recordatorio
            </button>
          </div>
        </div>
      )}

      {/* Toolbar: Search */}
      {selectedIds.length === 0 && (
        <div className="reminders-toolbar">
          <div className="reminders-search-box">
            <span style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.4)' }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar recordatorios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery.length > 0 && (
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  fontSize: '0.9rem',
                }}
                onClick={() => setSearchQuery('')}
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {isListEmpty ? (
        <div
          className="glass-panel"
          style={{
            textAlign: 'center',
            padding: '50px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {searchQuery ? (
            <>
              <span style={{ fontSize: '2.5rem', opacity: 0.7 }}>🔍</span>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', maxWidth: '400px' }}>
                No se encontraron recordatorios para &ldquo;<strong>{searchQuery}</strong>&rdquo;
              </p>
            </>
          ) : (
            <>
              <span style={{ fontSize: '2.8rem', opacity: 0.8 }}>🔖</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                No tienes recordatorios registrados
              </h3>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.9rem',
                  maxWidth: '480px',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Crea un nuevo recordatorio para recordar cosas durante una franja de fechas específica o con alarma programada.
              </p>
              <button
                className="btn btn-primary"
                style={{
                  marginTop: '12px',
                  background: THEME_COLOR,
                  borderColor: THEME_COLOR,
                  fontWeight: 700,
                  color: '#fff',
                }}
                onClick={() => onOpenReminder()}
              >
                + Crear primer recordatorio
              </button>
            </>
          )}
        </div>
      ) : (
        /* Recordatorios Grouped Sections */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {groupedSections.map((section) => {
            if (section.data.length === 0) return null;

            const isPast = section.isPastSection;
            const isCollapsed = isPast && pastCollapsed;

            return (
              <div key={section.title} className="reminder-section">
                <div
                  className="reminder-section-header"
                  style={{ cursor: isPast ? 'pointer' : 'default', userSelect: 'none' }}
                  onClick={() => {
                    if (isPast) setPastCollapsed(!pastCollapsed);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.95rem' }}>{section.icon}</span>
                    <span className="reminder-section-title" style={{ color: section.color }}>
                      {section.title}
                    </span>
                    <span className="reminder-section-badge">{section.data.length}</span>
                  </div>

                  {isPast && (
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>
                      {isCollapsed ? '▶ Desplegar' : '▼ Plegar'}
                    </span>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="reminder-items-list">
                    {section.data.map((item, idx) => {
                      const isSelected = selectedIds.includes(item.id);
                      const dateRangeStr = getDateRangeStr(item);
                      const isAlarmSeparator = Boolean(section.hasAlarmSeparation) && idx === section.alarmCount;

                      return (
                        <div
                          key={item.id}
                          className={`reminder-item-card ${isSelected ? 'selected' : ''}`}
                          style={isAlarmSeparator ? { marginTop: '14px' } : undefined}
                          onClick={() => {
                            if (selectedIds.length > 0) {
                              handleToggleSelect(item.id);
                            }
                          }}
                        >
                          {/* Multi-select checkbox or completion circle */}
                          {selectedIds.length > 0 ? (
                            <button
                              className="reminder-checkbox-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSelect(item.id);
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '6px',
                                  border: isSelected
                                    ? `2px solid ${THEME_COLOR}`
                                    : '2px solid rgba(255,255,255,0.3)',
                                  background: isSelected ? THEME_COLOR : 'transparent',
                                  color: '#fff',
                                  fontSize: '13px',
                                  fontWeight: 'bold',
                                }}
                              >
                                {isSelected ? '✓' : ''}
                              </span>
                            </button>
                          ) : (
                            <button
                              className="reminder-checkbox-btn"
                              onClick={(e) => handleToggleCompleted(item.id, e)}
                              title={item.completed ? 'Marcar como pendiente' : 'Completar recordatorio'}
                            >
                              <span
                                className={`reminder-circle-check ${item.completed ? 'checked' : ''}`}
                              >
                                {item.completed ? '✓' : ''}
                              </span>
                            </button>
                          )}

                          {/* Main Content */}
                          <div
                            className="reminder-item-main"
                            onClick={() => {
                              if (selectedIds.length === 0) {
                                onOpenReminder(item.id);
                              }
                            }}
                          >
                            <h4
                              className={`reminder-item-title ${item.completed ? 'completed' : ''}`}
                            >
                              {item.title}
                            </h4>

                            {item.description && (
                              <RichText
                                text={item.description}
                                className="reminder-item-desc"
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              />
                            )}

                            <div className="reminder-meta-row">
                              <span style={{ color: THEME_COLOR, fontSize: '0.85rem' }}>📅</span>
                              <span>{dateRangeStr}</span>

                              {item.hasAlarm && (
                                <>
                                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                                  <span style={{ color: '#34C759', fontSize: '0.85rem' }}>🔔</span>
                                  <span style={{ color: '#34C759', fontWeight: 600 }}>
                                    {item.alarmTime || '12:00'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="reminder-actions-group">
                            <button
                              className="reminder-action-btn"
                              title="Copiar texto del recordatorio"
                              onClick={(e) => handleCopyItem(item, e)}
                            >
                              📋
                            </button>
                            <button
                              className="reminder-action-btn"
                              title="Editar recordatorio"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenReminder(item.id);
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              className="reminder-action-btn trash"
                              title="Mover a la papelera"
                              onClick={(e) => handleDeleteItem(item, e)}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="reminder-toast">
          <span>📋</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </section>
  );
});
