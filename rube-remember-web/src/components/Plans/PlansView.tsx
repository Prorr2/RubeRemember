import { memo, useMemo, useState } from 'react';
import { useRememberStore, rememberStore } from '../../store';
import { ItemType, Plan } from '../../types';
import { RichText } from '../../RichText';

interface PlansViewProps {
  onOpenPlan: (id?: string) => void;
}

const THEME_COLOR = '#BF5AF2'; // Premium Violet for Long-Term Plans

const formatPlanDates = (plan: Plan): string => {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  if (!plan.startMonth || !plan.startYear) return 'Sin fecha fija';
  const startText = `${months[plan.startMonth - 1]} ${plan.startYear}`;
  if (!plan.endMonth || !plan.endYear) return startText;

  if (plan.startMonth === plan.endMonth && plan.startYear === plan.endYear) {
    return startText;
  }

  return `${startText} - ${months[plan.endMonth - 1]} ${plan.endYear}`;
};

const getPlanText = (plan: Plan): string => {
  const datesText = formatPlanDates(plan);
  return `${plan.title}${plan.description ? ` - ${plan.description}` : ''} (${datesText})`;
};

export const PlansView = memo(function PlansView({ onOpenPlan }: PlansViewProps) {
  const db = useRememberStore();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('Todos');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const plans = useMemo(
    () => db.items.filter((i) => i.type === ItemType.PLAN && !i.trash) as Plan[],
    [db.items]
  );

  // Compute available years dynamically from active plans, ensuring 2026, 2027, 2028 exist
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    plans.forEach((plan) => {
      if (plan.startYear && plan.endYear) {
        for (let y = plan.startYear; y <= plan.endYear; y++) {
          years.add(y.toString());
        }
      } else {
        if (plan.startYear) years.add(plan.startYear.toString());
        if (plan.endYear) years.add(plan.endYear.toString());
      }
    });
    const allYears = Array.from(years).sort();
    if (!allYears.includes('2026')) allYears.push('2026');
    if (!allYears.includes('2027')) allYears.push('2027');
    if (!allYears.includes('2028')) allYears.push('2028');
    return ['Todos', ...allYears.sort()];
  }, [plans]);

  // Group plans by target month/year and completion status
  const groupedPlans = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    let filteredList = q
      ? plans.filter(
          (plan) =>
            plan.title.toLowerCase().includes(q) ||
            (plan.description || '').toLowerCase().includes(q)
        )
      : plans;

    // Apply year filter (includes intermediate years in range)
    if (selectedYearFilter !== 'Todos') {
      const yVal = Number(selectedYearFilter);
      filteredList = filteredList.filter((plan) => {
        if (plan.startYear && plan.endYear) {
          return plan.startYear <= yVal && yVal <= plan.endYear;
        }
        if (plan.startYear) return plan.startYear === yVal;
        if (plan.endYear) return plan.endYear === yVal;
        return false;
      });
    }

    // Separate completed and pending
    const pendingList = filteredList.filter((p) => !p.completed);
    const completedList = filteredList.filter((p) => p.completed);

    const getMonthNameSpanish = (monthIdx: number): string => {
      const months = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ];
      return months[monthIdx];
    };

    const groups: { title: string; data: Plan[]; isCompletedSection?: boolean }[] = [];

    if (pendingList.length > 0) {
      // Group pending plans by Start Month/Year
      const monthlyGroups: Record<string, Plan[]> = {};
      const noDateGroup: Plan[] = [];

      pendingList.forEach((plan) => {
        if (plan.startYear && plan.startMonth) {
          const monthStr = plan.startMonth.toString().padStart(2, '0');
          const key = `${plan.startYear}-${monthStr}`; // YYYY-MM
          if (!monthlyGroups[key]) {
            monthlyGroups[key] = [];
          }
          monthlyGroups[key].push(plan);
        } else {
          noDateGroup.push(plan);
        }
      });

      // Sort keys chronologically
      const sortedKeys = Object.keys(monthlyGroups).sort();
      sortedKeys.forEach((key) => {
        const [yearStr, monthStr] = key.split('-');
        const monthName = getMonthNameSpanish(parseInt(monthStr, 10) - 1);
        groups.push({
          title: `${monthName} ${yearStr}`,
          data: monthlyGroups[key].sort((a, b) => {
            const endA = `${a.endYear || 9999}-${(a.endMonth || 12).toString().padStart(2, '0')}`;
            const endB = `${b.endYear || 9999}-${(b.endMonth || 12).toString().padStart(2, '0')}`;
            return endA.localeCompare(endB);
          }),
        });
      });

      if (noDateGroup.length > 0) {
        groups.push({
          title: 'Algún día / Sin fecha fija',
          data: noDateGroup.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
        });
      }
    }

    if (completedList.length > 0) {
      groups.push({
        title: 'Planes Completados',
        data: completedList.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
        isCompletedSection: true,
      });
    }

    return groups;
  }, [plans, searchQuery, selectedYearFilter]);

  const isListEmpty = useMemo(() => {
    return groupedPlans.every((s) => s.data.length === 0);
  }, [groupedPlans]);

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
      setToastMessage(count === 1 ? 'Plan copiado al portapapeles' : `${count} planes copiados`);
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
    const allFilteredIds = groupedPlans.flatMap((g) => g.data.map((p) => p.id));
    if (selectedIds.length === allFilteredIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allFilteredIds);
    }
  };

  const handleBulkDelete = () => {
    if (
      window.confirm(`¿Deseas mover ${selectedIds.length} planes a la papelera?`)
    ) {
      for (const id of selectedIds) {
        rememberStore.deleteItem(id);
      }
      setSelectedIds([]);
    }
  };

  const handleBulkCopy = () => {
    const texts: string[] = [];
    plans.forEach((plan) => {
      if (selectedIds.includes(plan.id)) {
        texts.push(getPlanText(plan));
      }
    });

    if (texts.length === 0) return;
    copyToClipboard(texts.join('\n\n'), texts.length);
    setSelectedIds([]);
  };

  const handleCopyItemText = (plan: Plan, e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(getPlanText(plan), 1);
  };

  const handleDeletePlan = (plan: Plan, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`¿Deseas mover el plan "${plan.title}" a la papelera?`)) {
      rememberStore.deleteItem(plan.id);
    }
  };

  const handleToggleCompleted = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    rememberStore.toggleItemCompleted(id);
  };

  return (
    <section className="tab-content-parent plans-view-container">
      {/* Header Bar: switches to bulk actions when multi-select active */}
      {selectedIds.length > 0 ? (
        <div className="plans-bulk-bar">
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
              {selectedIds.length === groupedPlans.flatMap((g) => g.data).length
                ? 'Deseleccionar todos'
                : 'Seleccionar todos'}
            </button>
          </div>

          <div className="plans-bulk-actions">
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={handleBulkCopy}
              title="Copiar texto de planes seleccionados"
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
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Planes a Largo Plazo</h2>
            <span className="section-subtitle">Visualiza tus aspiraciones y objetivos a gran escala</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {plans.length > 0 && (
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
                onClick={() => {
                  const allFilteredIds = groupedPlans.flatMap((g) => g.data.map((p) => p.id));
                  if (allFilteredIds.length > 0) {
                    setSelectedIds([allFilteredIds[0]]);
                  }
                }}
                title="Modo selección múltiple"
              >
                ☑️ Seleccionar
              </button>
            )}
            <button
              className="btn btn-primary"
              style={{ background: THEME_COLOR, borderColor: THEME_COLOR, fontWeight: 700 }}
              onClick={() => onOpenPlan()}
            >
              + Nuevo Plan
            </button>
          </div>
        </div>
      )}

      {/* Toolbar: Search + Year Filter Chips */}
      {selectedIds.length === 0 && (
        <div className="plans-toolbar">
          {/* Search Box */}
          <div className="plans-search-box">
            <span style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.4)' }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar planes..."
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

          {/* Year Filter Chips */}
          <div className="plans-year-filter-scroll">
            {availableYears.map((year) => {
              const isActive = selectedYearFilter === year;
              return (
                <button
                  key={year}
                  className={`plans-year-chip ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedYearFilter(year)}
                >
                  {year}
                </button>
              );
            })}
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
                No se encontraron planes para &ldquo;<strong>{searchQuery}</strong>&rdquo;
              </p>
            </>
          ) : (
            <>
              <span style={{ fontSize: '2.8rem', opacity: 0.8 }}>🧭</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                No tienes planes a largo plazo registrados
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
                Agrega cosas que te gustaría hacer en el futuro (viajes, mudanzas, proyectos, metas).
              </p>
              <button
                className="btn btn-primary"
                style={{
                  marginTop: '12px',
                  background: THEME_COLOR,
                  borderColor: THEME_COLOR,
                  fontWeight: 700,
                }}
                onClick={() => onOpenPlan()}
              >
                + Crear primer plan
              </button>
            </>
          )}
        </div>
      ) : (
        /* Plan Groups Chronologically */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {groupedPlans.map((section) => {
            if (section.data.length === 0) return null;
            return (
              <div key={section.title} className="plan-section">
                <div className="plan-section-header">
                  <span style={{ fontSize: '0.95rem' }}>
                    {section.isCompletedSection ? '✅' : '📅'}
                  </span>
                  <span
                    className="plan-section-title"
                    style={section.isCompletedSection ? { color: '#34C759' } : {}}
                  >
                    {section.title}
                  </span>
                  <span className="plan-section-badge">{section.data.length}</span>
                </div>

                <div className="plan-items-list">
                  {section.data.map((item) => {
                    const isSelected = selectedIds.includes(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`plan-item-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          if (selectedIds.length > 0) {
                            handleToggleSelect(item.id);
                          }
                        }}
                      >
                        {/* Multi-select checkbox or completion circle */}
                        {selectedIds.length > 0 ? (
                          <button
                            className="plan-checkbox-btn"
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
                            className="plan-checkbox-btn"
                            onClick={(e) => handleToggleCompleted(item.id, e)}
                            title={item.completed ? 'Marcar como pendiente' : 'Completar plan'}
                          >
                            <span className={`plan-circle-check ${item.completed ? 'checked' : ''}`}>
                              {item.completed ? '✓' : ''}
                            </span>
                          </button>
                        )}

                        {/* Main Info */}
                        <div
                          className="plan-item-main"
                          onClick={() => {
                            if (selectedIds.length === 0) {
                              onOpenPlan(item.id);
                            }
                          }}
                        >
                          <h4 className={`plan-item-title ${item.completed ? 'completed' : ''}`}>
                            {item.title}
                          </h4>

                          {item.description && (
                            <RichText
                              text={item.description}
                              className="plan-item-desc"
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            />
                          )}

                          <div className="plan-meta-row">
                            {item.startMonth && item.startYear ? (
                              <>
                                <span style={{ color: THEME_COLOR, fontSize: '0.85rem' }}>📅</span>
                                <span>{formatPlanDates(item)}</span>
                              </>
                            ) : (
                              <>
                                <span style={{ fontSize: '0.85rem' }}>♾️</span>
                                <span>Aspiración a largo plazo</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="plan-actions-group">
                          <button
                            className="plan-action-btn"
                            title="Copiar texto del plan"
                            onClick={(e) => handleCopyItemText(item, e)}
                          >
                            📋
                          </button>
                          <button
                            className="plan-action-btn"
                            title="Editar plan"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPlan(item.id);
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            className="plan-action-btn trash"
                            title="Mover a la papelera"
                            onClick={(e) => handleDeletePlan(item, e)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="plan-toast">
          <span>📋</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </section>
  );
});