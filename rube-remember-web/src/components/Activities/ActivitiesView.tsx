import React, { useState, useMemo } from 'react';
import { useRememberStore, rememberStore } from '../../store';
import { ItemType, Activity } from '../../types';
import { RichText } from '../../RichText';

interface ActivitiesViewProps {
  onOpenEditor: (type: ItemType, id?: string) => void;
  onZoomImage?: (url: string) => void;
}

const DEFAULT_CATEGORIES: Record<string, string> = {
  SPORT: '🏃 Deporte',
  MOVIES: '🎬 Cine/Series',
  GAMES: '🎮 Juegos',
  RESTAURANTS: '🍔 Restaurantes',
  TRAVEL: '✈ Viajes',
  LEARNING: '📚 Leer/Aprender',
  SOCIAL: '👥 Social',
  WALK: '🌳 Pasear',
  READING: '📖 Lectura',
  OTHER: '✨ General',
};

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({ onOpenEditor, onZoomImage }) => {
  const db = useRememberStore();
  const [subTab, setSubTab] = useState<'SUGGESTIONS' | 'ALL'>('SUGGESTIONS');
  const [suggestionKey, setSuggestionKey] = useState(0);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastDoneMessage, setLastDoneMessage] = useState<string | null>(null);

  // All activities (non-trash, non-archived)
  const activities = useMemo(() => {
    return (db.items.filter(
      item => item.type === ItemType.ACTIVITY && !item.trash && !item.archived
    ) as Activity[]);
  }, [db.items]);

  // Custom categories list from store
  const categories = db.activityCategories || [];

  const getCategoryLabel = (catId?: string) => {
    if (!catId) return '✨ General';
    const custom = categories.find(c => c.id === catId);
    if (custom) return custom.name;
    return DEFAULT_CATEGORIES[catId] || catId;
  };

  // Category counts for filter chips
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const act of activities) {
      const cat = act.category || 'OTHER';
      map[cat] = (map[cat] || 0) + 1;
    }
    return Object.entries(map).map(([id, count]) => ({
      id,
      label: getCategoryLabel(id),
      count,
    }));
  }, [activities, categories]);

  const favoriteCount = useMemo(() => {
    return activities.filter(a => a.favourite).length;
  }, [activities]);

  // Filtered activities for 'ALL' tab
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      if (filterCategory === 'FAV') {
        if (!act.favourite) return false;
      } else if (filterCategory !== 'ALL') {
        const actCat = act.category || 'OTHER';
        if (actCat !== filterCategory) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (act.title || '').toLowerCase().includes(q);
        const matchDesc = (act.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    }).sort((a, b) => {
      // Favorites first, then most completed, then title
      if (a.favourite && !b.favourite) return -1;
      if (!a.favourite && b.favourite) return 1;
      return (b.doneCount || 0) - (a.doneCount || 0);
    });
  }, [activities, filterCategory, searchQuery]);

  // Suggestions calculated via engine
  const suggestedActivities = useMemo(() => {
    if (activities.length === 0) return [];
    return rememberStore.getSuggestedActivities();
  }, [activities, suggestionKey]);

  const handleRegisterDone = (act: Activity) => {
    rememberStore.registerActivityDone(act.id);
    const newCount = (act.doneCount || 0) + 1;
    setLastDoneMessage(`¡Registrado: "${act.title}" completado! (Total: ${newCount})`);
    setTimeout(() => {
      setLastDoneMessage(null);
    }, 3500);
  };

  const handleToggleFavorite = (act: Activity) => {
    rememberStore.updateItem(act.id, { favourite: !act.favourite });
  };

  const handleDelete = (act: Activity) => {
    if (window.confirm(`¿Mover "${act.title}" a la papelera?`)) {
      rememberStore.deleteItem(act.id);
    }
  };

  const getReasonBadge = (act: Activity) => {
    if (!act.lastDoneAt || !act.doneCount) {
      return { text: '✨ Pendiente estrenar', bg: 'rgba(16, 185, 129, 0.14)', color: '#34d399' };
    }
    const daysSince = Math.floor((Date.now() - new Date(act.lastDoneAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince === 0) {
      return { text: '⚡ Hecho hoy', bg: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' };
    }
    if (daysSince > 30) {
      return { text: `⏳ Hace ${daysSince} días`, bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };
    }
    if (act.favourite) {
      return { text: '⭐ Favorito', bg: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' };
    }
    return { text: `Hace ${daysSince} ${daysSince === 1 ? 'día' : 'días'}`, bg: 'rgba(139, 92, 246, 0.15)', color: '#c084fc' };
  };

  const renderCard = (act: Activity, showReason: boolean) => {
    const categoryLabel = getCategoryLabel(act.category);
    const reason = showReason ? getReasonBadge(act) : null;

    return (
      <div key={act.id} className="activity-card-modern">
        {/* Card Header: Category Tag, Reason Tag and Action Buttons */}
        <div className="activity-card-modern-header">
          <div className="activity-badge-cluster">
            <span className="badge-category-tag">
              {categoryLabel}
            </span>
            {reason && (
              <span
                className="badge-reason-tag"
                style={{ backgroundColor: reason.bg, color: reason.color }}
              >
                {reason.text}
              </span>
            )}
          </div>

          <div className="card-action-icons">
            <button
              className={`icon-btn-star ${act.favourite ? 'favorited' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFavorite(act);
              }}
              title={act.favourite ? 'Quitar de favoritos' : 'Marcar como favorito'}
            >
              {act.favourite ? '★' : '☆'}
            </button>
            <button
              className="icon-btn-action"
              onClick={(e) => {
                e.stopPropagation();
                onOpenEditor(ItemType.ACTIVITY, act.id);
              }}
              title="Editar actividad"
            >
              ✏️
            </button>
            <button
              className="icon-btn-action trash"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(act);
              }}
              title="Mover a papelera"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Card Body: Title & Rich Description */}
        <div
          className="activity-card-modern-body"
          onClick={() => onOpenEditor(ItemType.ACTIVITY, act.id)}
          title="Haz clic para editar los detalles de esta actividad"
        >
          <h3 className="activity-card-modern-title">{act.title}</h3>
          {act.description ? (
            <RichText
              text={act.description}
              className="activity-card-modern-desc"
              onImageClick={onZoomImage}
            />
          ) : (
            <span style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.35)', fontStyle: 'italic' }}>
              Sin descripción adicional.
            </span>
          )}
        </div>

        {/* Card Footer: Metadata and Register Done Button */}
        <div className="activity-card-modern-footer">
          <div className="activity-stats-column">
            <span>
              Completado: <strong style={{ color: '#fff' }}>{act.doneCount || 0}</strong> {act.doneCount === 1 ? 'vez' : 'veces'}
            </span>
            <span>
              {act.lastDoneAt
                ? `Último: ${new Date(act.lastDoneAt).toLocaleDateString()}`
                : 'Nunca registrado'}
            </span>
          </div>

          <button
            className="btn-register-done"
            onClick={(e) => {
              e.stopPropagation();
              handleRegisterDone(act);
            }}
            title="Registrar que has realizado esta actividad"
          >
            <span>✓</span>
            <span>Registrar</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="activities-view-container">
      {/* Header Bar */}
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div className="section-title-group">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🏃</span> Ocio y Tiempo Libre
          </h2>
          <span className="section-subtitle">
            Ideas recreativas, desconexión y hábitos saludables para equilibrar tu día a día
          </span>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => onOpenEditor(ItemType.ACTIVITY)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <span>+</span> Nueva Actividad
        </button>
      </div>

      {/* Success Notification Banner */}
      {lastDoneMessage && (
        <div
          className="glass-panel"
          style={{
            padding: '10px 16px',
            background: 'rgba(16, 185, 129, 0.16)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '10px',
            color: '#34d399',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.15)'
          }}
        >
          <span>🎉</span> {lastDoneMessage}
        </div>
      )}

      {/* Segmented Subtabs Control */}
      <div className="activities-tabs-container">
        <div className="tabs-segmented">
          <button
            className={`tab-segment-btn ${subTab === 'SUGGESTIONS' ? 'active' : ''}`}
            onClick={() => setSubTab('SUGGESTIONS')}
          >
            <span>💡</span>
            <span>Sugerencias Inteligentes</span>
            <span className="tab-count-badge">{suggestedActivities.length}</span>
          </button>
          <button
            className={`tab-segment-btn ${subTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setSubTab('ALL')}
          >
            <span>📋</span>
            <span>Catálogo Completo</span>
            <span className="tab-count-badge">{activities.length}</span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: SUGERENCIAS INTELIGENTES ────────────────────────── */}
      {subTab === 'SUGGESTIONS' && (
        <div>
          <div className="suggestions-banner">
            <div className="suggestions-banner-text">
              <span>🎯</span>
              <span>
                Recomendaciones calculadas según tiempo sin realizar, favoritos y momentos de descanso.
              </span>
            </div>
            <button
              className="btn-shuffle-action"
              onClick={() => setSuggestionKey(k => k + 1)}
              title="Barajar o recalcular sugerencias de ocio"
            >
              <span>🔄</span>
              <span>Barajar Sugerencias</span>
            </button>
          </div>

          {suggestedActivities.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', borderRadius: 16 }}>
              <div style={{ fontSize: '2.8rem', marginBottom: '14px' }}>✨</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', fontWeight: 700 }}>¡Todo al día!</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                {activities.length === 0
                  ? 'Aún no tienes actividades de ocio creadas. Agrega algunas ideas (libros, series, deporte, paseos) para recibir sugerencias.'
                  : 'Has practicado tus actividades recientemente o no hay sugerencias pendientes para este momento.'}
              </p>
              <button
                className="btn btn-primary"
                onClick={() => activities.length === 0 ? onOpenEditor(ItemType.ACTIVITY) : setSubTab('ALL')}
              >
                {activities.length === 0 ? '+ Crear Primera Actividad' : 'Explorar Todo el Catálogo'}
              </button>
            </div>
          ) : (
            <div className="activities-grid">
              {suggestedActivities.map(act => renderCard(act, true))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: CATÁLOGO COMPLETO ───────────────────────────────── */}
      {subTab === 'ALL' && (
        <div>
          {/* Search Box */}
          <div className="search-box-activities">
            <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.4)' }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar actividades por nombre o notas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  padding: '2px 6px'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="category-filter-scroll">
            <button
              className={`category-chip-btn ${filterCategory === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterCategory('ALL')}
            >
              ✨ Todas ({activities.length})
            </button>

            {favoriteCount > 0 && (
              <button
                className={`category-chip-btn ${filterCategory === 'FAV' ? 'active' : ''}`}
                onClick={() => setFilterCategory(filterCategory === 'FAV' ? 'ALL' : 'FAV')}
              >
                ⭐ Favoritos ({favoriteCount})
              </button>
            )}

            {categoryStats.map(cat => (
              <button
                key={cat.id}
                className={`category-chip-btn ${filterCategory === cat.id ? 'active' : ''}`}
                onClick={() => setFilterCategory(filterCategory === cat.id ? 'ALL' : cat.id)}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>

          {filteredActivities.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '50px 20px', borderRadius: 16, marginTop: 10 }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔍</div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '6px', fontWeight: 700 }}>
                No se encontraron actividades
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '420px', margin: '0 auto 16px', fontSize: '0.9rem' }}>
                {searchQuery || filterCategory !== 'ALL'
                  ? 'Prueba a cambiar el término de búsqueda o selecciona otra categoría.'
                  : 'Comienza creando tu primera actividad de ocio para desconectar.'}
              </p>
              {(searchQuery || filterCategory !== 'ALL') ? (
                <button
                  className="btn btn-secondary"
                  onClick={() => { setSearchQuery(''); setFilterCategory('ALL'); }}
                >
                  Restablecer Filtros
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => onOpenEditor(ItemType.ACTIVITY)}
                >
                  + Nueva Actividad
                </button>
              )}
            </div>
          ) : (
            <div className="activities-grid" style={{ marginTop: 8 }}>
              {filteredActivities.map(act => renderCard(act, false))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
