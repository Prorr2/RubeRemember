import React, { useState } from 'react';
import { useRememberStore, rememberStore } from '../../store';
import { Goal, Phase } from '../../types';

export const GoalsView: React.FC = () => {
  const store = useRememberStore();
  const goals = store.goals || [];

  // Goal Form State
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalStartDate, setGoalStartDate] = useState('');
  const [goalEndDate, setGoalEndDate] = useState('');
  const [goalEmoji, setGoalEmoji] = useState('🎯');
  const [goalIsMain, setGoalIsMain] = useState(false);

  // Phase Input State per Goal
  const [newPhaseName, setNewPhaseName] = useState<{ [goalId: string]: string }>({});
  const [expandedGoalIds, setExpandedGoalIds] = useState<{ [goalId: string]: boolean }>({});

  const toggleExpand = (id: string) => {
    setExpandedGoalIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openNewGoalModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0];
    setEditingGoalId(null);
    setGoalTitle('');
    setGoalDescription('');
    setGoalStartDate(today);
    setGoalEndDate(nextYear);
    setGoalEmoji('🎯');
    setGoalIsMain(false);
    setShowGoalModal(true);
  };

  const openEditGoalModal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setGoalTitle(goal.title);
    setGoalDescription(goal.description || '');
    setGoalStartDate(goal.startDate || '');
    setGoalEndDate(goal.endDate || '');
    setGoalEmoji(goal.emoji || '🎯');
    setGoalIsMain(!!goal.isMain);
    setShowGoalModal(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    if (editingGoalId) {
      rememberStore.updateGoal(editingGoalId, goalTitle.trim(), goalDescription.trim(), goalStartDate, goalEndDate);
      const target = goals.find(g => g.id === editingGoalId);
      if (target) {
        target.emoji = goalEmoji.trim() || '🎯';
        if (target.isMain !== goalIsMain) {
          rememberStore.toggleGoalMain(editingGoalId);
        }
      }
    } else {
      const newId = rememberStore.addGoal(goalTitle.trim(), goalDescription.trim(), goalStartDate, goalEndDate);
      const created = (rememberStore.getSnapshot().goals || []).find(g => g.id === newId);
      if (created) created.emoji = goalEmoji.trim() || '🎯';
      if (goalIsMain) {
        rememberStore.toggleGoalMain(newId);
      }
    }

    setShowGoalModal(false);
  };

  const handleAddPhase = (goalId: string) => {
    const name = (newPhaseName[goalId] || '').trim();
    if (!name) return;
    rememberStore.addPhase(goalId, name);
    setNewPhaseName(prev => ({ ...prev, [goalId]: '' }));
  };

  return (
    <div className="view-container">
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            🎯 Metas y Objetivos
            <span className="badge badge-neutral" style={{ fontSize: 13 }}>{goals.length}</span>
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: 14 }}>
            Organiza tus proyectos en grandes metas y desglósalos en fases de ejecución.
          </p>
        </div>

        <button className="btn btn-primary" onClick={openNewGoalModal} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          ➕ Nueva Meta
        </button>
      </div>

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="modal-backdrop" onClick={() => setShowGoalModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500, width: '90%' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>{editingGoalId ? '✏️ Editar Meta' : '🎯 Nueva Meta'}</h3>
            <form onSubmit={handleSaveGoal} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'rgba(255, 255, 255, 0.8)' }}>
                  Emoji y Título del Objetivo *
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="input"
                    value={goalEmoji}
                    onChange={(e) => setGoalEmoji(e.target.value)}
                    style={{ width: 60, textAlign: 'center', fontSize: 18 }}
                    title="Emoji"
                  />
                  <input
                    type="text"
                    className="input"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="Ej. Lanzar nuevo producto / Aprender inglés B2"
                    required
                    autoFocus
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'rgba(255, 255, 255, 0.8)' }}>
                  Descripción
                </label>
                <textarea
                  className="input"
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                  placeholder="Detalles, motivación o métricas de éxito..."
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'rgba(255, 255, 255, 0.8)' }}>
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={goalStartDate}
                    onChange={(e) => setGoalStartDate(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: 'rgba(255, 255, 255, 0.8)' }}>
                    Fecha Límite
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={goalEndDate}
                    onChange={(e) => setGoalEndDate(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="chk-goal-main"
                  checked={goalIsMain}
                  onChange={(e) => setGoalIsMain(e.target.checked)}
                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                />
                <label htmlFor="chk-goal-main" style={{ cursor: 'pointer', fontSize: 13 }}>
                  ⭐ Marcar como Objetivo Principal (Prioridad Activa)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowGoalModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingGoalId ? 'Guardar Cambios' : 'Crear Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
          <h3 style={{ margin: '0 0 8px 0' }}>No hay metas creadas todavía</h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', margin: '0 0 16px 0', fontSize: 14 }}>
            Establece metas a largo plazo y divídelas en fases manejables.
          </p>
          <button className="btn btn-primary" onClick={openNewGoalModal}>
            Crear Primera Meta
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {goals.map((goal: Goal) => {
            const totalPhases = (goal.phases || []).length;
            const completedPhases = (goal.phases || []).filter(p => p.completed).length;
            const progressPercent = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : (goal.completed ? 100 : 0);
            const isExpanded = !!expandedGoalIds[goal.id];

            return (
              <div
                key={goal.id}
                className="glass-card"
                style={{
                  borderRadius: 14,
                  padding: 20,
                  border: goal.isMain ? '1px solid rgba(255, 215, 0, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: goal.isMain ? '0 0 15px rgba(255, 215, 0, 0.15)' : undefined
                }}
              >
                {/* Goal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      {goal.isMain && (
                        <span className="badge badge-warning" style={{ fontSize: 11, background: 'rgba(255, 215, 0, 0.2)', color: '#ffd700' }}>
                          ⭐ PRINCIPAL
                        </span>
                      )}
                      {goal.completed && (
                        <span className="badge badge-success" style={{ fontSize: 11 }}>
                          ✓ COMPLETADA
                        </span>
                      )}
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                        {goal.emoji || '🎯'} {goal.title}
                      </h3>
                    </div>

                    {goal.description && (
                      <p style={{ margin: '0 0 10px 0', color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}>
                        {goal.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                      <span>📅 {goal.startDate || 'Inicio'} → {goal.endDate || 'Fin'}</span>
                      <span>⛓️ {completedPhases} de {totalPhases} fases ({progressPercent}%)</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-ghost"
                      onClick={() => rememberStore.toggleGoalMain(goal.id)}
                      title={goal.isMain ? 'Quitar como principal' : 'Marcar como principal'}
                      style={{ fontSize: 16, padding: '4px 8px' }}
                    >
                      {goal.isMain ? '⭐' : '☆'}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => rememberStore.toggleGoalCompleted(goal.id)}
                      title={goal.completed ? 'Marcar incompleta' : 'Marcar completada'}
                      style={{ fontSize: 16, padding: '4px 8px' }}
                    >
                      {goal.completed ? '↩️' : '✓'}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => openEditGoalModal(goal)}
                      title="Editar meta"
                      style={{ fontSize: 14, padding: '4px 8px' }}
                    >
                      ✏️
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar la meta "${goal.title}"?`)) {
                          rememberStore.deleteGoal(goal.id);
                        }
                      }}
                      title="Eliminar meta"
                      style={{ fontSize: 14, padding: '4px 8px', color: '#ff4d4f' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ margin: '14px 0 10px 0' }}>
                  <div style={{ width: '100%', height: 6, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: progressPercent === 100 ? '#52c41a' : '#1890ff',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>

                {/* Toggle Phases */}
                <div style={{ marginTop: 8 }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => toggleExpand(goal.id)}
                    style={{ fontSize: 13, padding: '4px 8px', color: 'rgba(255, 255, 255, 0.8)' }}
                  >
                    {isExpanded ? '▲ Ocultar Fases' : `▼ Ver Fases (${totalPhases})`}
                  </button>
                </div>

                {/* Expanded Phases List */}
                {isExpanded && (
                  <div style={{ marginTop: 12, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      {(goal.phases || []).map((phase: Phase, idx: number) => (
                        <div
                          key={phase.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: phase.completed ? 'rgba(82, 196, 26, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                            borderRadius: 8,
                            gap: 10
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                            <input
                              type="checkbox"
                              checked={!!phase.completed}
                              onChange={() => rememberStore.togglePhaseCompleted(goal.id, phase.id)}
                              style={{ cursor: 'pointer', width: 16, height: 16 }}
                            />
                            <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>
                              #{idx + 1}
                            </span>
                            <span
                              style={{
                                fontSize: 14,
                                textDecoration: phase.completed ? 'line-through' : 'none',
                                color: phase.completed ? 'rgba(255, 255, 255, 0.5)' : 'white'
                              }}
                            >
                              {phase.name}
                            </span>
                          </div>

                          <button
                            className="btn btn-ghost"
                            onClick={() => rememberStore.deletePhase(goal.id, phase.id)}
                            style={{ fontSize: 12, padding: '2px 6px', color: '#ff4d4f' }}
                            title="Eliminar fase"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Phase Input */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="Nombre de la nueva fase..."
                        value={newPhaseName[goal.id] || ''}
                        onChange={(e) => setNewPhaseName(prev => ({ ...prev, [goal.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddPhase(goal.id);
                          }
                        }}
                        style={{ flex: 1, fontSize: 13, padding: '6px 10px' }}
                      />
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleAddPhase(goal.id)}
                        style={{ fontSize: 13, padding: '6px 14px' }}
                      >
                        ➕ Fase
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
