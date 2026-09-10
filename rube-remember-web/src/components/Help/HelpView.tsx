import { memo } from 'react';

export const HelpView = memo(function HelpView() {
  return (
    <section className="tab-content-parent">
      <div className="glass-panel" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '20px' }}>Manual de Ayuda Inteligente</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: '1.6' }}>
          <p>
            Bienvenido a la versión web de <strong>RubeRemember</strong>. Esta aplicación utiliza metodologías cognitivas y de gamificación basadas en el peso temporal para priorizar tus actividades.
          </p>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-luna)' }}>Clasificación de Tareas (Pesos)</h3>
          <p>
            Las tareas se clasifican dinámicamente según sus horas estimadas:
          </p>
          <ul>
            <li><strong>🌙 Luna (menos de 5 horas):</strong> Tareas rápidas y de bajo esfuerzo. El objetivo sugerido suele ser completarlas.</li>
            <li><strong>🌍 Terra (de 5 a 10 horas):</strong> Tareas medianas. Se aconseja avanzar en pasos progresivos.</li>
            <li><strong>☀️ Sol (10 horas o más):</strong> Tareas complejas y proyectos de gran tamaño. Se divide el enfoque para abordar hitos o roadmaps.</li>
            <li><strong>⭐ Astra (Tareas de hábito):</strong> Tareas periódicas y repetitivas que fomentan hábitos constantes.</li>
          </ul>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-terra)' }}>El Algoritmo de Recomendación</h3>
          <p>
            El sistema no solo calcula un score bruto para cada tarea, sino que aplica penalizaciones y bonificaciones:
          </p>
          <ul>
            <li><strong>Fatiga por tipo de energía:</strong> Si encadenas varias tareas del mismo tipo de esfuerzo (como analítica o creativa), el sistema aplica una penalización progresiva para evitar el agotamiento.</li>
            <li><strong>Bonificación de transición:</strong> Se te recomendará la tarea que encaje mejor con el flujo o ritmo ideal configurado en tus preferencias de secuencia de energía y pesos.</li>
            <li><strong>Ajuste de franjas horarias:</strong> Si estás dentro de un bloque temporal definido, el temporizador sugerido se reduce para encajar en el tiempo restante del bloque.</li>
          </ul>
        </div>
      </div>
    </section>
  );
});