import { ItemType, Item } from '../../types';
import { SearchOverlay } from './SearchOverlay';

interface HeaderBarProps {
  formattedToday: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showSearchOverlay: boolean;
  setShowSearchOverlay: (show: boolean) => void;
  searchResults: Item[];
  headerBadge: { text: string; color: string };
  onTaskClick: (id: string) => void;
  onOpenEditor: (type: ItemType, id?: string) => void;
  onFocusTask?: (taskId: string) => void;
  onOpenRoadmap?: (taskId: string) => void;
}

export default function HeaderBar({
  formattedToday,
  searchQuery,
  setSearchQuery,
  showSearchOverlay,
  setShowSearchOverlay,
  searchResults,
  headerBadge,
  onTaskClick,
  onOpenEditor,
  onFocusTask,
  onOpenRoadmap,
}: HeaderBarProps) {
  return (
    <header className="header-bar glass-panel">
      <div className="header-left">
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>RubeRemember Web</h1>
        <span className="header-date">{formattedToday}</span>
      </div>

      <div className="header-right">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar tareas, notas..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchOverlay(e.target.value.trim().length > 0);
            }}
          />

          {showSearchOverlay && (
            <SearchOverlay
              query={searchQuery}
              items={searchResults}
              onClose={() => {
                setShowSearchOverlay(false);
                setSearchQuery('');
              }}
              onSelectTask={onTaskClick}
              onOpenEditor={onOpenEditor}
              onFocusTask={onFocusTask}
              onOpenRoadmap={onOpenRoadmap}
            />
          )}
        </div>

        <div id="header-cognitive-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            className="badge-dot"
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: headerBadge.color,
              boxShadow: `0 0 8px ${headerBadge.color}`
            }}
          ></div>
          <span id="header-cognitive-text" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {headerBadge.text}
          </span>
        </div>

        <button className="btn btn-primary" id="btn-create-item" onClick={() => onOpenEditor(ItemType.TASK)}>
          ➕ Crear
        </button>
      </div>
    </header>
  );
}
