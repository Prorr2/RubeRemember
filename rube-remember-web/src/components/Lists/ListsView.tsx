import { memo, useState } from 'react';
import { useRememberStore, rememberStore } from '../../store';
import { ReminderList } from '../../types';
import { RichText } from '../../RichText';

interface ListsViewProps {
  onImageClick: (src: string) => void;
}

type ImageMap = Record<string, string[]>;

const imageUpload = (e: React.ChangeEvent<HTMLInputElement>, onImagesAdded: (base64s: string[]) => void) => {
  if (e.target.files) {
    const files = Array.from(e.target.files);
    const promises = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    });
    Promise.all(promises).then(onImagesAdded);
  }
};

export const ListsView = memo(function ListsView({ onImageClick }: ListsViewProps) {
  const db = useRememberStore();

  const [newListName, setNewListName] = useState('');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [editingListItemId, setEditingListItemId] = useState<string | null>(null);
  const [editingListIdForItem, setEditingListIdForItem] = useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState('');
  const [editingItemText, setEditingItemText] = useState('');
  const [editingItemImages, setEditingItemImages] = useState<string[]>([]);
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({});
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});
  const [newItemImages, setNewItemImages] = useState<ImageMap>({});

  const lists = db.lists || [];
  const rootLists = lists.filter((l: ReminderList) => !l.parentId);

  const handleAddListItem = (targetListId: string) => {
    const text = (newItemTexts[targetListId] || '').trim();
    const title = (newItemTitles[targetListId] || '').trim();
    const images = newItemImages[targetListId] || [];

    if (!text && !title && images.length === 0) {
      alert('Por favor escribe el texto o un título para el elemento.');
      return;
    }

    rememberStore.addListItem(
      targetListId,
      text,
      undefined,
      images,
      title || undefined
    );

    setNewItemTexts(prev => ({ ...prev, [targetListId]: '' }));
    setNewItemTitles(prev => ({ ...prev, [targetListId]: '' }));
    setNewItemImages(prev => ({ ...prev, [targetListId]: [] }));
  };

  return (
    <section className="tab-content-parent">
      <div className="lists-tab-container">
        <div className="section-header">
          <div className="section-title-group">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Listas de Recordatorios</h2>
            <span className="section-subtitle">Gestiona tus listas, sublistas y notas adjuntas</span>
          </div>
        </div>

        {/* Create List form */}
        <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>Nueva Lista Principal</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (newListName.trim()) {
              rememberStore.addList(newListName);
              setNewListName('');
            }
          }} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Nombre de la lista..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary">Crear Lista</button>
          </form>
        </div>

        {/* Lists Forest */}
        <div className="lists-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {rootLists.length === 0 ? (
            <div className="slot-empty-msg" style={{ padding: '40px', textAlign: 'center' }}>
              No hay listas creadas aún. Crea una arriba para empezar.
            </div>
          ) : (
            rootLists.map(list => {
              const sublists = lists.filter(l => l.parentId === list.id);
              const isEditingList = editingListId === list.id;

              return (
                <div key={list.id} className="glass-panel list-group-panel" style={{ padding: '16px' }}>
                  {/* List Header */}
                  <div className="list-group-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '12px' }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: isEditingList ? 'default' : 'pointer', userSelect: 'none' }}
                      onClick={() => {
                        if (!isEditingList) {
                          rememberStore.toggleListCollapse(list.id);
                        }
                      }}
                      title={list.collapsed ? 'Desplegar lista' : 'Plegar lista'}
                    >
                      <span style={{ fontSize: '1.1rem', userSelect: 'none' }}>
                        {list.collapsed ? '▶' : '▼'}
                      </span>
                      {isEditingList ? (
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (editingListName.trim()) {
                            rememberStore.updateList(list.id, editingListName);
                            setEditingListId(null);
                          }
                        }} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '6px', flex: 1 }}>
                          <input
                            type="text"
                            className="form-control"
                            value={editingListName}
                            onChange={(e) => setEditingListName(e.target.value)}
                            style={{ fontSize: '1rem', padding: '4px 8px' }}
                            autoFocus
                          />
                          <button type="submit" className="btn btn-success" style={{ padding: '4px 8px' }}>✓</button>
                          <button type="button" className="btn btn-secondary" onClick={() => setEditingListId(null)} style={{ padding: '4px 8px' }}>&times;</button>
                        </form>
                      ) : (
                        <span style={{ fontSize: '1.15rem', fontWeight: 800 }} onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingListId(list.id);
                          setEditingListName(list.name);
                        }}>
                          {list.name}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => {
                        const subName = window.prompt(`Nombre de la sublista para "${list.name}":`);
                        if (subName && subName.trim()) {
                          rememberStore.addList(subName, list.id);
                        }
                      }}>
                        + Sublista
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => {
                        setEditingListId(list.id);
                        setEditingListName(list.name);
                      }}>
                        ✏️
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => {
                        if (window.confirm(`¿Seguro que deseas eliminar la lista "${list.name}" y todos sus elementos?`)) {
                          rememberStore.deleteList(list.id);
                        }
                      }}>
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* List Content */}
                  {!list.collapsed && (
                    <div className="list-group-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* List Items */}
                      <div className="list-items-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(list.items || []).map((item: any) => {
                          const isEditingItem = editingListItemId === item.id && editingListIdForItem === list.id;

                          if (isEditingItem) {
                            return (
                              <div key={item.id} className="list-item-edit-box" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Título (opcional)..."
                                  value={editingItemTitle}
                                  onChange={(e) => setEditingItemTitle(e.target.value)}
                                  style={{ fontWeight: 'bold', fontSize: '1.05rem' }}
                                />
                                <textarea
                                  className="form-control"
                                  placeholder="Texto del elemento..."
                                  value={editingItemText}
                                  onChange={(e) => setEditingItemText(e.target.value)}
                                  rows={2}
                                />

                                {editingItemImages.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {editingItemImages.map((img, idx) => (
                                      <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden' }}>
                                        <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button
                                          type="button"
                                          onClick={() => setEditingItemImages(prev => prev.filter((_, i) => i !== idx))}
                                          style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        >
                                          &times;
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                                    📷 Adjuntar
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      style={{ display: 'none' }}
                                      onChange={(e) => imageUpload(e, (base64s) => {
                                        setEditingItemImages(prev => [...prev, ...base64s]);
                                      })}
                                    />
                                  </label>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button className="btn btn-success btn-sm" onClick={() => {
                                      rememberStore.updateListItem(list.id, item.id, editingItemText, undefined, editingItemImages, editingItemTitle);
                                      setEditingListItemId(null);
                                      setEditingListIdForItem(null);
                                    }}>
                                      Guardar
                                    </button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => {
                                      setEditingListItemId(null);
                                      setEditingListIdForItem(null);
                                    }}>
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={item.id} className="list-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flex: 1 }}>
                                <input
                                  type="checkbox"
                                  checked={!!item.completed}
                                  onChange={() => rememberStore.toggleListItemCompleted(list.id, item.id)}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '3px' }}
                                />
                                <div style={{ flex: 1 }}>
                                  {item.title && (
                                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff', textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.6 : 1, marginBottom: '4px' }}>
                                      {item.title}
                                    </div>
                                  )}
                                  <RichText
                                    text={item.text}
                                    images={item.images}
                                    onImageClick={onImageClick}
                                    style={{ textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.6 : 1, fontSize: '1rem', lineHeight: '1.4' }}
                                  />
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', marginLeft: '10px' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => {
                                  setEditingListItemId(item.id);
                                  setEditingListIdForItem(list.id);
                                  setEditingItemTitle(item.title || '');
                                  setEditingItemText(item.text || '');
                                  setEditingItemImages(item.images || []);
                                }}>
                                  ✏️
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => rememberStore.deleteListItem(list.id, item.id)}>
                                  🗑️
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Item form */}
                      <div className="add-item-form-box" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Título (opcional)..."
                          value={newItemTitles[list.id] || ''}
                          onChange={(e) => {
                            const txt = e.target.value;
                            setNewItemTitles(prev => ({ ...prev, [list.id]: txt }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddListItem(list.id);
                            }
                          }}
                          style={{ fontWeight: 'bold', fontSize: '1.05rem' }}
                        />
                        <textarea
                          className="form-control"
                          placeholder="Añadir elemento..."
                          value={newItemTexts[list.id] || ''}
                          onChange={(e) => {
                            const txt = e.target.value;
                            setNewItemTexts(prev => ({ ...prev, [list.id]: txt }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault();
                              handleAddListItem(list.id);
                            }
                          }}
                          rows={2}
                        />

                        {newItemImages[list.id] && newItemImages[list.id].length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {newItemImages[list.id].map((img, idx) => (
                              <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden' }}>
                                <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewItemImages(prev => ({
                                      ...prev,
                                      [list.id]: prev[list.id].filter((_, i) => i !== idx)
                                    }));
                                  }}
                                  style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                >
                                  &times;
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                            📷 Adjuntar Imágenes
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              style={{ display: 'none' }}
                              onChange={(e) => imageUpload(e, (base64s) => {
                                setNewItemImages(prev => ({
                                  ...prev,
                                  [list.id]: [...(prev[list.id] || []), ...base64s]
                                }));
                              })}
                            />
                          </label>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAddListItem(list.id)}
                          >
                            Agregar Elemento
                          </button>
                        </div>
                      </div>

                      {/* Sublists */}
                      {sublists.length > 0 && (
                        <div className="sublists-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '24px', borderLeft: '2px solid rgba(255,255,255,0.05)' }}>
                          {sublists.map(sublist => {
                            const isEditingSublist = editingListId === sublist.id;

                            return (
                              <div key={sublist.id} className="sublist-group" style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '8px', padding: '12px' }}>
                                {/* Sublist Header */}
                                <div className="sublist-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', marginBottom: '10px' }}>
                                  <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: isEditingSublist ? 'default' : 'pointer', userSelect: 'none' }}
                                    onClick={() => {
                                      if (!isEditingSublist) {
                                        rememberStore.toggleListCollapse(sublist.id);
                                      }
                                    }}
                                    title={sublist.collapsed ? 'Desplegar sublista' : 'Plegar sublista'}
                                  >
                                    <span style={{ fontSize: '0.9rem', userSelect: 'none' }}>
                                      {sublist.collapsed ? '▶' : '▼'}
                                    </span>
                                    {isEditingSublist ? (
                                      <form onSubmit={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (editingListName.trim()) {
                                          rememberStore.updateList(sublist.id, editingListName);
                                          setEditingListId(null);
                                        }
                                      }} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '6px', flex: 1 }}>
                                        <input
                                          type="text"
                                          className="form-control"
                                          value={editingListName}
                                          onChange={(e) => setEditingListName(e.target.value)}
                                          style={{ fontSize: '0.9rem', padding: '2px 6px' }}
                                          autoFocus
                                        />
                                        <button type="submit" className="btn btn-success" style={{ padding: '2px 6px' }}>✓</button>
                                        <button type="button" className="btn btn-secondary" onClick={() => setEditingListId(null)} style={{ padding: '2px 6px' }}>&times;</button>
                                      </form>
                                    ) : (
                                      <span
                                        style={{ fontSize: '1.05rem', fontWeight: 700 }}
                                        onDoubleClick={(e) => {
                                          e.stopPropagation();
                                          setEditingListId(sublist.id);
                                          setEditingListName(sublist.name);
                                        }}
                                      >
                                        {sublist.name}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => {
                                      setEditingListId(sublist.id);
                                      setEditingListName(sublist.name);
                                    }} style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                                      ✏️
                                    </button>
                                    <button className="btn btn-danger btn-sm" onClick={() => {
                                      if (window.confirm(`¿Seguro que deseas eliminar la sublista "${sublist.name}"?`)) {
                                        rememberStore.deleteList(sublist.id);
                                      }
                                    }} style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                                      🗑️
                                    </button>
                                  </div>
                                </div>

                                {/* Sublist Content */}
                                {!sublist.collapsed && (
                                  <div className="sublist-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div className="sublist-items-container" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {(sublist.items || []).map((item: any) => {
                                        const isEditingSubItem = editingListItemId === item.id && editingListIdForItem === sublist.id;

                                        if (isEditingSubItem) {
                                          return (
                                            <div key={item.id} className="list-item-edit-box" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                              <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Título (opcional)..."
                                                value={editingItemTitle}
                                                onChange={(e) => setEditingItemTitle(e.target.value)}
                                                style={{ fontWeight: 'bold', fontSize: '0.95rem' }}
                                              />
                                              <textarea
                                                className="form-control"
                                                placeholder="Texto del elemento..."
                                                value={editingItemText}
                                                onChange={(e) => setEditingItemText(e.target.value)}
                                                rows={2}
                                              />

                                              {editingItemImages.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                  {editingItemImages.map((img, idx) => (
                                                    <div key={idx} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '6px', overflow: 'hidden' }}>
                                                      <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                      <button
                                                        type="button"
                                                        onClick={() => setEditingItemImages(prev => prev.filter((_, i) => i !== idx))}
                                                        style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                      >
                                                        &times;
                                                      </button>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}

                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', padding: '2px 6px', fontSize: '0.75rem' }}>
                                                  📷 Adjuntar
                                                  <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => imageUpload(e, (base64s) => {
                                                      setEditingItemImages(prev => [...prev, ...base64s]);
                                                    })}
                                                  />
                                                </label>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                  <button className="btn btn-success btn-sm" onClick={() => {
                                                    rememberStore.updateListItem(sublist.id, item.id, editingItemText, undefined, editingItemImages, editingItemTitle);
                                                    setEditingListItemId(null);
                                                    setEditingListIdForItem(null);
                                                  }} style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                                                    Guardar
                                                  </button>
                                                  <button className="btn btn-secondary btn-sm" onClick={() => {
                                                    setEditingListItemId(null);
                                                    setEditingListIdForItem(null);
                                                  }} style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                                                    Cancelar
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }

                                        return (
                                          <div key={item.id} className="list-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', padding: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flex: 1 }}>
                                              <input
                                                type="checkbox"
                                                checked={!!item.completed}
                                                onChange={() => rememberStore.toggleListItemCompleted(sublist.id, item.id)}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer', marginTop: '3px' }}
                                              />
                                              <div style={{ flex: 1 }}>
                                                {item.title && (
                                                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.6 : 1, marginBottom: '4px' }}>
                                                    {item.title}
                                                  </div>
                                                )}
                                                <RichText
                                                  text={item.text}
                                                  images={item.images}
                                                  onImageClick={onImageClick}
                                                  style={{ textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.6 : 1, fontSize: '0.95rem' }}
                                                />
                                              </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                                              <button className="btn btn-secondary btn-sm" onClick={() => {
                                                setEditingListItemId(item.id);
                                                setEditingListIdForItem(sublist.id);
                                                setEditingItemTitle(item.title || '');
                                                setEditingItemText(item.text || '');
                                                setEditingItemImages(item.images || []);
                                              }} style={{ padding: '2px 4px', fontSize: '0.7rem' }}>
                                                ✏️
                                              </button>
                                              <button className="btn btn-danger btn-sm" onClick={() => rememberStore.deleteListItem(sublist.id, item.id)} style={{ padding: '2px 4px', fontSize: '0.7rem' }}>
                                                🗑️
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    <div className="add-item-form-box" style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Título (opcional)..."
                                        value={newItemTitles[sublist.id] || ''}
                                        onChange={(e) => {
                                          const txt = e.target.value;
                                          setNewItemTitles(prev => ({ ...prev, [sublist.id]: txt }));
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddListItem(sublist.id);
                                          }
                                        }}
                                        style={{ fontWeight: 'bold', fontSize: '0.95rem', padding: '4px 8px' }}
                                      />
                                      <textarea
                                        className="form-control"
                                        placeholder="Añadir elemento..."
                                        value={newItemTexts[sublist.id] || ''}
                                        onChange={(e) => {
                                          const txt = e.target.value;
                                          setNewItemTexts(prev => ({ ...prev, [sublist.id]: txt }));
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                            e.preventDefault();
                                            handleAddListItem(sublist.id);
                                          }
                                        }}
                                        rows={2}
                                        style={{ fontSize: '0.9rem', padding: '4px 8px' }}
                                      />

                                      {newItemImages[sublist.id] && newItemImages[sublist.id].length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                          {newItemImages[sublist.id].map((img, idx) => (
                                            <div key={idx} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '6px', overflow: 'hidden' }}>
                                              <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setNewItemImages(prev => ({
                                                    ...prev,
                                                    [sublist.id]: prev[sublist.id].filter((_, i) => i !== idx)
                                                  }));
                                                }}
                                                style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                              >
                                                &times;
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', padding: '2px 6px', fontSize: '0.75rem' }}>
                                          📷 Adjuntar Imágenes
                                          <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            style={{ display: 'none' }}
                                            onChange={(e) => imageUpload(e, (base64s) => {
                                              setNewItemImages(prev => ({
                                                ...prev,
                                                [sublist.id]: [...(prev[sublist.id] || []), ...base64s]
                                              }));
                                            })}
                                          />
                                        </label>
                                        <button
                                          type="button"
                                          className="btn btn-primary btn-sm"
                                          onClick={() => handleAddListItem(sublist.id)}
                                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                        >
                                          Agregar Elemento
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
});