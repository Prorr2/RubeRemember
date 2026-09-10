import React, { useState } from 'react';
import { useRememberStore, rememberStore } from '../../store';
import { ItemType, Item } from '../../types';

export const TrashView: React.FC = () => {
  const store = useRememberStore();
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const trashedItems = (store.items || []).filter((item) => item.trash);

  const filteredItems = selectedType === 'ALL'
    ? trashedItems
    : trashedItems.filter((i) => i.type === selectedType);

  const handleEmptyTrash = () => {
    if (window.confirm('¿Estás seguro de que deseas vaciar la papelera? Todos los elementos se eliminarán de forma permanente.')) {
      rememberStore.emptyTrash();
    }
  };

  const getItemTypeBadge = (type: ItemType) => {
    switch (type) {
      case ItemType.TASK:
        return <span className="badge badge-primary">📌 Tarea</span>;
      case ItemType.REMINDER:
        return <span className="badge badge-warning">⏰ Recordatorio</span>;
      case ItemType.ACTIVITY:
        return <span className="badge badge-success">🏃 Hábito</span>;
      case ItemType.MEMO:
        return <span className="badge badge-info">📝 Memo</span>;
      case ItemType.PLAN:
        return <span className="badge badge-purple">🎯 Plan</span>;
      default:
        return <span className="badge badge-neutral">Elemento</span>;
    }
  };

  return (
    <div className="view-container">
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            🗑️ Papelera
            <span className="badge badge-neutral" style={{ fontSize: 13 }}>{trashedItems.length}</span>
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: 14 }}>
            Elementos eliminados que pueden ser restaurados o borrados permanentemente.
          </p>
        </div>

        {trashedItems.length > 0 && (
          <button
            className="btn btn-danger"
            onClick={handleEmptyTrash}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            🔥 Vaciar Papelera
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          className={`btn ${selectedType === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setSelectedType('ALL')}
          style={{ fontSize: 13, padding: '6px 12px' }}
        >
          Todos ({trashedItems.length})
        </button>
        <button
          className={`btn ${selectedType === ItemType.TASK ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setSelectedType(ItemType.TASK)}
          style={{ fontSize: 13, padding: '6px 12px' }}
        >
          Tareas ({trashedItems.filter(i => i.type === ItemType.TASK).length})
        </button>
        <button
          className={`btn ${selectedType === ItemType.REMINDER ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setSelectedType(ItemType.REMINDER)}
          style={{ fontSize: 13, padding: '6px 12px' }}
        >
          Recordatorios ({trashedItems.filter(i => i.type === ItemType.REMINDER).length})
        </button>
        <button
          className={`btn ${selectedType === ItemType.ACTIVITY ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setSelectedType(ItemType.ACTIVITY)}
          style={{ fontSize: 13, padding: '6px 12px' }}
        >
          Hábitos ({trashedItems.filter(i => i.type === ItemType.ACTIVITY).length})
        </button>
        <button
          className={`btn ${selectedType === ItemType.MEMO ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setSelectedType(ItemType.MEMO)}
          style={{ fontSize: 13, padding: '6px 12px' }}
        >
          Memos ({trashedItems.filter(i => i.type === ItemType.MEMO).length})
        </button>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
          <h3 style={{ margin: '0 0 8px 0' }}>La papelera está vacía</h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', margin: 0, fontSize: 14 }}>
            No hay elementos eliminados en esta categoría.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredItems.map((item: Item) => (
            <div
              key={item.id}
              className="glass-card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                borderRadius: 12,
                gap: 16
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {getItemTypeBadge(item.type)}
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </h4>
                </div>
                {item.description && (
                  <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.description}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => rememberStore.restoreItem(item.id)}
                  style={{ fontSize: 13, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5 }}
                  title="Restaurar elemento"
                >
                  ↩️ Restaurar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    if (window.confirm(`¿Eliminar definitivamente "${item.title}"?`)) {
                      rememberStore.deleteItemPermanently(item.id);
                    }
                  }}
                  style={{ fontSize: 13, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5 }}
                  title="Eliminar permanentemente"
                >
                  ❌ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
