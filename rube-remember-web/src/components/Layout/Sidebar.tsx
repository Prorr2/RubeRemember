
import { useRememberStore } from '../../store';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onhandleRequestFromMobile: () => void;
  onhandleSendToMobile: () => void;
  syncBusy: boolean;
  mobileConnected: boolean;
}

// 1. Sección de 4 elementos principales
const MAIN_FOUR = [
  { key: 'tasks', label: 'Tareas', icon: '✅' },
  { key: 'reminders', label: 'Recordatorios', icon: '🔔' },
  { key: 'activities', label: 'Ocio', icon: '🏃' },
  { key: 'plans', label: 'Planes', icon: '📅' },
];

// 2. Sección de Mis listas y Roadmaps
const LISTS_AND_ROADMAPS = [
  { key: 'lists', label: 'Mis listas', icon: '📋' },
  { key: 'goals', label: 'Roadmaps', icon: '🗺️' },
];

// 3. Papelera y el resto de secciones
const TRASH_AND_REST = [
  { key: 'trash', label: 'Papelera', icon: '🗑️' },
  { key: 'statistics', label: 'Estadísticas', icon: '📊' },
  { key: 'dropbox', label: 'Dropbox', icon: '☁️' },
  { key: 'sync', label: 'Sincronización', icon: '📶' },
  { key: 'help', label: 'Manual', icon: '📖' },
  { key: 'settings', label: 'Ajustes', icon: '⚙️' },
];

export default function Sidebar({
  currentTab,
  setCurrentTab,
  onhandleRequestFromMobile,
  onhandleSendToMobile,
  syncBusy,
  mobileConnected,
}: SidebarProps) {
  const store = useRememberStore();
  const trashCount = store.items.filter(i => i.trash).length;

  return (
    <aside className="sidebar glass-panel">
      <div className="logo-container">
        <img
          src="/app_icon.png"
          alt="Logo"
          className="logo-img"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23818cf8"><circle cx="12" cy="12" r="10"/></svg>';
          }}
        />
        <span className="logo-text">RubeRemember</span>
      </div>

      <nav className="nav-menu">
        {/* Dashboard / Inicio */}
        <button
          className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentTab('dashboard')}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Dashboard</span>
        </button>

        <div className="sidebar-divider" />

        {/* Sección 1: 4 elementos principales */}
        <div className="sidebar-section-header">Actividades</div>
        {MAIN_FOUR.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${currentTab === item.key ? 'active' : ''}`}
            onClick={() => setCurrentTab(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}

        <div className="sidebar-divider" />

        {/* Sección 2: Mis listas y roadmaps */}
        <div className="sidebar-section-header">Listas y Roadmaps</div>
        {LISTS_AND_ROADMAPS.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${currentTab === item.key ? 'active' : ''}`}
            onClick={() => setCurrentTab(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}

        <div className="sidebar-divider" />

        {/* Sección 3: Papelera y resto de secciones */}
        <div className="sidebar-section-header">Papelera y Sistema</div>
        {TRASH_AND_REST.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${currentTab === item.key ? 'active' : ''} ${item.key === 'trash' ? 'trash-item' : ''}`}
            onClick={() => setCurrentTab(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.key === 'trash' && trashCount > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: 'rgba(255, 77, 79, 0.2)',
                  color: '#ff7875',
                  fontWeight: 600,
                }}
              >
                {trashCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
        <button
          className="btn btn-secondary btn-full"
          onClick={onhandleRequestFromMobile}
          disabled={syncBusy || !mobileConnected}
          title={!mobileConnected ? 'El móvil no está conectado. Conéctalo desde la app móvil' : 'Solicitar la base de datos del móvil'}
        >
          📱 Solicitar datos {mobileConnected ? '🟢' : '🔴'}
        </button>
        <button className="btn btn-secondary btn-full" onClick={onhandleSendToMobile} disabled={syncBusy || !mobileConnected}>
          📤 Enviar al Móvil
        </button>
      </div>
    </aside>
  );
}
