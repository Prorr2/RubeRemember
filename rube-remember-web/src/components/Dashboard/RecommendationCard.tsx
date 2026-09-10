import { Item, Task, Recommendation } from '../../types';
import { RichText } from '../../RichText';

interface RecommendationCardProps {
  recommendation: Recommendation;
  items: Item[];
  onStartFocus: (taskId: string, duration: number, sessionType: string) => void;
  onNewTask: () => void;
  onImageClick: (img: string) => void;
}

export default function RecommendationCard({
  recommendation,
  items,
  onStartFocus,
  onNewTask,
  onImageClick,
}: RecommendationCardProps) {
  return (
    <div className="glass-panel rec-hero-card">
      <span className={`card-badge badge-${recommendation.priorityLevel.toLowerCase()}`}>
        Prioridad {recommendation.priorityLevel}
      </span>
      <h2 className="rec-title">
        {recommendation.taskId
          ? (items.find(i => i.id === recommendation.taskId)?.title || recommendation.reason)
          : recommendation.reason}
      </h2>
      <div className="rec-desc">
        {recommendation.taskId ? (
          (() => {
            const task = items.find(i => i.id === recommendation.taskId) as Task;
            return task && (task.description || (task.images && task.images.length > 0)) ? (
              <RichText text={task.description || ''} images={task.images} onImageClick={onImageClick} className="rec-desc-rich" />
            ) : (
              <span className="rec-desc-fallback">Sin notas adicionales.</span>
            );
          })()
        ) : ''}
      </div>

      <div className="rec-reasons-list">
        <div className="rec-reason-item">
          {recommendation.reason}
        </div>
        {recommendation.reasonsSecondary && recommendation.reasonsSecondary.map((r, idx) => (
          <div key={idx} className="rec-reason-item">
            {r}
          </div>
        ))}
      </div>

      <div className="form-row">
        {recommendation.taskId && (
          <button
            className="btn btn-success"
            id="btn-rec-start"
            onClick={() => onStartFocus(recommendation.taskId!, recommendation.recommendedDuration, recommendation.sessionType || 'COMPLETAR')}
          >
            ⏱️ Iniciar Enfoque ({recommendation.recommendedDuration}m)
          </button>
        )}
        <button className="btn btn-secondary" onClick={onNewTask}>
          Nueva Tarea
        </button>
      </div>

      <div className="rec-confidence-widget">
        <div className="confidence-circle">
          {recommendation.confidenceLevel}%
        </div>
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block' }}>Nivel de Confianza</span>
          <span className="subtitle">Calculado según tu historial y la fatiga cognitiva</span>
        </div>
      </div>
    </div>
  );
}