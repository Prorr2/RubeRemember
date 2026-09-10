import React, { useState, useMemo } from 'react';
import { Item, ItemType, Task, Reminder } from '../../types';
import { rememberStore } from '../../store';

interface SearchOverlayProps {
  query: string;
  items: Item[];
  onClose: () => void;
  onSelectTask: (taskId: string) => void;
  onOpenEditor: (type: ItemType, id?: string) => void;
  onFocusTask?: (taskId: string) => void;
  onOpenRoadmap?: (taskId: string) => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  query,
  items,
  onClose,
  onSelectTask,
  onOpenEditor,
  onFocusTask,
  onOpenRoadmap
}) => {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | ItemType>('ALL');

  // Filter items matching query and type
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return items.filter(item => {
      if (item.trash) return false;
      if (selectedTypeFilter !== 'ALL') {
        if (selectedTypeFilter === ItemType.REMINDER || selectedTypeFilter === ItemType.MEMO) {
          if (item.type !== ItemType.REMINDER && item.type !== ItemType.MEMO) return false;
        } else if (item.type !== selectedTypeFilter) {
          return false;
        }
      }
      const titleMatch = (item.title || '').toLowerCase().includes(q);
      const descMatch = (item.description || '').toLowerCase().includes(q);
      return titleMatch || descMatch;
    });
  }, [items, query, selectedTypeFilter]);

  // Counts by type for badge indicators
  const countsByType = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return {} as Record<string, number>;

    const counts: Record<string, number> = {
      ALL: 0,
      [ItemType.TASK]: 0,
      [ItemType.ACTIVITY]: 0,
      [ItemType.REMINDER]: 0,
      [ItemType.PLAN]: 0
    };

    items.forEach(item => {
      if (item.trash) return;
      const match = (item.title || '').toLowerCase().includes(q) ||
                    (item.description || '').toLowerCase().includes(q);
      if (match) {
        counts.ALL++;
        if (item.type === ItemType.MEMO || item.type === ItemType.REMINDER) {
          counts[ItemType.REMINDER]++;
        } else if (counts[item.type] !== undefined) {
          counts[item.type]++;
        }
      }
    });

    return counts;
  }, [items, query]);

  const getTypeBadgeInfo = (type: ItemType) => {
    switch (type) {
      case ItemType.TASK:
        return { label: 'Tarea', icon: '🎯', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
      case ItemType.ACTIVITY:
        return { label: 'Ocio', icon: '🏃', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      case ItemType.REMINDER:
      case ItemType.MEMO:
        return { label: 'Recordatorio', icon: '🔖', color: '#00c7be', bg: 'rgba(0, 199, 190, 0.15)' };
      case ItemType.PLAN:
        return { label: 'Plan', icon: '📅', color: '#bf5af2', bg: 'rgba(191, 90, 242, 0.15)' };
      default:
        return { label: type, icon: '📄', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
    }
  };

  return (
    <div
      id="search-results-overlay"
      className="search-results-overlay glass-panel"
      style={{
        maxWidth: '720px',
        width: '95vw',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        className="search-results-header"
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.1rem' }}>🔍</span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            Resultados de búsqueda ({filteredResults.length})
          </span>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
            "{query}"
          </span>
        </div>
        <button
          id="close-search-results"
          className="modal-close"
          onClick={onClose}
          style={{ fontSize: '1.2rem', cursor: 'pointer', background: 'none', border: 'none', color: '#fff' }}
        >
          &times;
        </button>
      </div>

      {/* Type Filter Pills */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          padding: '10px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.2)',
          overflowX: 'auto'
        }}
      >
        <button
          className={`btn ${selectedTypeFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSelectedTypeFilter('ALL')}
          style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '16px' }}
        >
          Todos ({countsByType.ALL || 0})
        </button>
        <button
          className={`btn ${selectedTypeFilter === ItemType.TASK ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSelectedTypeFilter(ItemType.TASK)}
          style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '16px' }}
        >
          🎯 Tareas ({countsByType[ItemType.TASK] || 0})
        </button>
        <button
          className={`btn ${selectedTypeFilter === ItemType.ACTIVITY ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSelectedTypeFilter(ItemType.ACTIVITY)}
          style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '16px' }}
        >
          🏃 Ocio ({countsByType[ItemType.ACTIVITY] || 0})
        </button>
        <button
          className={`btn ${selectedTypeFilter === ItemType.REMINDER ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSelectedTypeFilter(ItemType.REMINDER)}
          style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '16px' }}
        >
          🔔 Recordatorios ({countsByType[ItemType.REMINDER] || 0})
        </button>
        <button
          className={`btn ${selectedTypeFilter === ItemType.PLAN ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSelectedTypeFilter(ItemType.PLAN)}
          style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '16px' }}
        >
          📅 Planes ({countsByType[ItemType.PLAN] || 0})
        </button>
      </div>

      {/* Results List */}
      <div
        className="search-results-list"
        style={{
          overflowY: 'auto',
          padding: '8px 12px',
          flex: 1
        }}
      >
        {filteredResults.length === 0 ? (
          <div className="slot-empty-msg" style={{ padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
            No se encontraron resultados para los filtros seleccionados.
          </div>
        ) : (
          filteredResults.map(item => {
            const badge = getTypeBadgeInfo(item.type);
            const isCompleted = item.type === ItemType.TASK
              ? (item as Task).completed
              : item.type === ItemType.REMINDER
              ? (item as Reminder).completed
              : false;

            return (
              <div
                key={item.id}
                className="search-item-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  margin: '4px 0',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
                onClick={() => {
                  onClose();
                  if (item.type === ItemType.TASK) {
                    onSelectTask(item.id);
                  } else {
                    onOpenEditor(item.type, item.id);
                  }
                }}
              >
                {/* Left Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.color}33`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>{badge.icon}</span> {badge.label}
                    </span>

                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        color: isCompleted ? 'rgba(255,255,255,0.45)' : '#fff',
                        textDecoration: isCompleted ? 'line-through' : 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.title}
                    </span>
                  </div>

                  {item.description ? (
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.55)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.description}
                    </span>
                  ) : null}
                </div>

                {/* Right Action Buttons */}
                <div
                  style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Task Specific Actions */}
                  {item.type === ItemType.TASK && (
                    <>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        onClick={() => {
                          onClose();
                          onFocusTask?.(item.id);
                        }}
                        title="Iniciar sesión de enfoque"
                      >
                        🎯 Enfocar
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        onClick={() => {
                          onClose();
                          onOpenRoadmap?.(item.id);
                        }}
                        title="Ver historial y roadmap"
                      >
                        🗺️ Roadmap
                      </button>
                    </>
                  )}

                  {/* Activity Specific Action */}
                  {item.type === ItemType.ACTIVITY && (
                    <button
                      className="btn btn-success"
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                      onClick={() => {
                        rememberStore.registerActivityDone(item.id);
                      }}
                      title="Registrar actividad como realizada hoy"
                    >
                      ✓ Hecho
                    </button>
                  )}

                  {/* Reminder Specific Action */}
                  {item.type === ItemType.REMINDER && (
                    <button
                      className={`btn ${isCompleted ? 'btn-secondary' : 'btn-success'}`}
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                      onClick={() => {
                        rememberStore.toggleItemCompleted(item.id);
                      }}
                      title={isCompleted ? 'Marcar como pendiente' : 'Marcar como completado'}
                    >
                      {isCompleted ? '↩ Desmarcar' : '✓ Completar'}
                    </button>
                  )}

                  {/* Common Edit Button */}
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    onClick={() => {
                      onClose();
                      onOpenEditor(item.type, item.id);
                    }}
                    title="Editar item"
                  >
                    ✏️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;
