import React, { useState } from 'react';
import { useRememberStore, rememberStore } from '../../store';
import { CustomCategory, TaskCategory } from '../../types';

export const SettingsView: React.FC = () => {
  const store = useRememberStore();
  const settings = store.userSettings;
  const dbSettings = store.settings || {};

  const [savedBadge, setSavedBadge] = useState(false);

  // New Category States
  const [newActCatId, setNewActCatId] = useState('');
  const [newActCatName, setNewActCatName] = useState('');
  const [newTaskCatId, setNewTaskCatId] = useState('');
  const [newTaskCatName, setNewTaskCatName] = useState('');
  const [newTaskCatEmoji, setNewTaskCatEmoji] = useState('📌');

  const showSaved = () => {
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
  };

  const handleAddActivityCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActCatId.trim() || !newActCatName.trim()) return;
    rememberStore.addActivityCategory({
      id: newActCatId.trim().toUpperCase(),
      name: newActCatName.trim()
    });
    setNewActCatId('');
    setNewActCatName('');
    showSaved();
  };

  const handleAddTaskCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskCatId.trim() || !newTaskCatName.trim()) return;
    rememberStore.addTaskCategory({
      id: newTaskCatId.trim().toUpperCase(),
      name: newTaskCatName.trim(),
      emoji: newTaskCatEmoji.trim() || '📌'
    });
    setNewTaskCatId('');
    setNewTaskCatName('');
    setNewTaskCatEmoji('📌');
    showSaved();
  };

  return (
    <div className="view-container">
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            ⚙️ Configuración y Preferencias
            {savedBadge && (
              <span className="badge badge-success" style={{ fontSize: 12 }}>
                ✓ Guardado
              </span>
            )}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: 14 }}>
            Personaliza los motores cognitivos, categorías, pesos y parámetros de tiempo.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* 1. Categorías de Actividades (Hábitos) */}
        <div className="glass-card" style={{ borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: 16 }}>🏃 Categorías de Actividades (Hábitos)</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {(store.activityCategories || []).map((cat: CustomCategory) => (
              <div
                key={cat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255, 255, 255, 0.06)',
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: 13
                }}
              >
                <span>{cat.name}</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 11 }}>({cat.id})</span>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    if (window.confirm(`¿Eliminar la categoría "${cat.name}"?`)) {
                      rememberStore.deleteActivityCategory(cat.id);
                      showSaved();
                    }
                  }}
                  style={{ padding: '0 4px', fontSize: 12, color: '#ff4d4f' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddActivityCat} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input"
              placeholder="ID (ej. RUNNING)"
              value={newActCatId}
              onChange={(e) => setNewActCatId(e.target.value)}
              style={{ width: 140, fontSize: 13 }}
              required
            />
            <input
              type="text"
              className="input"
              placeholder="Nombre con emoji (ej. 👟 Running)"
              value={newActCatName}
              onChange={(e) => setNewActCatName(e.target.value)}
              style={{ flex: 1, minWidth: 200, fontSize: 13 }}
              required
            />
            <button type="submit" className="btn btn-secondary" style={{ fontSize: 13 }}>
              ➕ Añadir Categoría
            </button>
          </form>
        </div>

        {/* 2. Categorías de Tareas */}
        <div className="glass-card" style={{ borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: 16 }}>💼 Categorías de Tareas</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {(store.taskCategories || []).map((cat: TaskCategory) => (
              <div
                key={cat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255, 255, 255, 0.06)',
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: 13
                }}
              >
                <span>{cat.emoji || '📌'} {cat.name}</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 11 }}>({cat.id})</span>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    if (window.confirm(`¿Eliminar la categoría de tarea "${cat.name}"?`)) {
                      rememberStore.deleteTaskCategory(cat.id);
                      showSaved();
                    }
                  }}
                  style={{ padding: '0 4px', fontSize: 12, color: '#ff4d4f' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddTaskCat} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input"
              placeholder="Emoji (ej. 💼)"
              value={newTaskCatEmoji}
              onChange={(e) => setNewTaskCatEmoji(e.target.value)}
              style={{ width: 70, fontSize: 13, textAlign: 'center' }}
            />
            <input
              type="text"
              className="input"
              placeholder="ID (ej. DEV)"
              value={newTaskCatId}
              onChange={(e) => setNewTaskCatId(e.target.value)}
              style={{ width: 140, fontSize: 13 }}
              required
            />
            <input
              type="text"
              className="input"
              placeholder="Nombre (ej. Programación)"
              value={newTaskCatName}
              onChange={(e) => setNewTaskCatName(e.target.value)}
              style={{ flex: 1, minWidth: 200, fontSize: 13 }}
              required
            />
            <button type="submit" className="btn btn-secondary" style={{ fontSize: 13 }}>
              ➕ Añadir Categoría
            </button>
          </form>
        </div>

        {/* 3. Pesos Horarios y Duraciones */}
        <div className="glass-card" style={{ borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: 16 }}>⏱️ Duraciones de Sesiones de Enfoque (minutos)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 4 }}>
                🌙 Luna (Bloque ligero)
              </label>
              <input
                type="number"
                className="input"
                value={settings.lunaDuration || 30}
                onChange={(e) => {
                  rememberStore.updateUserSettings({ lunaDuration: parseInt(e.target.value, 10) || 30 });
                  showSaved();
                }}
                min={5}
                max={180}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 4 }}>
                🌍 Terra (Bloque estándar)
              </label>
              <input
                type="number"
                className="input"
                value={settings.terraDuration || 45}
                onChange={(e) => {
                  rememberStore.updateUserSettings({ terraDuration: parseInt(e.target.value, 10) || 45 });
                  showSaved();
                }}
                min={5}
                max={180}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 4 }}>
                ☀️ Sol (Bloque profundo)
              </label>
              <input
                type="number"
                className="input"
                value={settings.solDuration || 90}
                onChange={(e) => {
                  rememberStore.updateUserSettings({ solDuration: parseInt(e.target.value, 10) || 90 });
                  showSaved();
                }}
                min={5}
                max={240}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 4 }}>
                ✨ Astra (Micro-sesión)
              </label>
              <input
                type="number"
                className="input"
                value={settings.astraDuration || 20}
                onChange={(e) => {
                  rememberStore.updateUserSettings({ astraDuration: parseInt(e.target.value, 10) || 20 });
                  showSaved();
                }}
                min={5}
                max={60}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* 4. Parámetros de Planificación y Horarios */}
        <div className="glass-card" style={{ borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: 16 }}>📅 Parámetros de Planificación y Horarios</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 4 }}>
                Días de Proximidad para Alertas
              </label>
              <input
                type="number"
                className="input"
                value={dbSettings.proximityDays ?? 20}
                onChange={(e) => {
                  rememberStore.setProximityDays(parseInt(e.target.value, 10) || 20);
                  showSaved();
                }}
                min={1}
                max={90}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 4 }}>
                Separación entre Franjas (minutos)
              </label>
              <input
                type="number"
                className="input"
                value={dbSettings.slotSeparationMinutes ?? 30}
                onChange={(e) => {
                  rememberStore.setSlotSeparationMinutes(parseInt(e.target.value, 10) || 30);
                  showSaved();
                }}
                min={0}
                max={120}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 4 }}>
                Máximo de Tareas en Foco Simultáneo
              </label>
              <input
                type="number"
                className="input"
                value={settings.maxFocusTasks || 3}
                onChange={(e) => {
                  rememberStore.updateUserSettings({ maxFocusTasks: parseInt(e.target.value, 10) || 3 });
                  showSaved();
                }}
                min={1}
                max={10}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 4 }}>
                Enfriamiento por Defecto (minutos)
              </label>
              <input
                type="number"
                className="input"
                value={settings.defaultCooldown || 120}
                onChange={(e) => {
                  rememberStore.updateUserSettings({ defaultCooldown: parseInt(e.target.value, 10) || 120 });
                  showSaved();
                }}
                min={10}
                max={720}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* 5. Acciones de Base de Datos */}
        <div className="glass-card" style={{ borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: 16 }}>💾 Datos y Respaldos</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                const json = rememberStore.exportBackupData();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `rube_remember_backup_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              📥 Descargar Backup JSON
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => {
                if (window.confirm('¿Restablecer a los datos iniciales de prueba?')) {
                  rememberStore.resetToSeed();
                  showSaved();
                }
              }}
            >
              🔄 Restablecer a Datos de Prueba
            </button>

            <button
              className="btn btn-danger"
              onClick={() => {
                if (window.confirm('¿Eliminar todos los datos de la aplicación? Esta acción es irreversible.')) {
                  rememberStore.clearAll();
                  showSaved();
                }
              }}
            >
              ⚠️ Vaciar Base de Datos
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
