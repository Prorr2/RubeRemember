import { memo } from 'react';

interface DonutChartProps {
  counts: Record<string, number>;
  colors: Record<string, string>;
}

export const DonutChart = memo(function DonutChart({ counts, colors }: DonutChartProps) {
  const keys = Object.keys(counts).filter(k => counts[k] > 0);
  const total = keys.reduce((acc, k) => acc + counts[k], 0);

  if (total === 0) {
    return <div className="slot-empty-msg">Sin datos suficientes para graficar.</div>;
  }

  const r = 50;
  const circ = 2 * Math.PI * r;
  let accumulatedAngle = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="160" height="160" viewBox="0 0 160 160" className="timer-svg">
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
        {keys.map(key => {
          const count = counts[key];
          const fraction = count / total;
          const strokeLength = fraction * circ;
          const strokeOffset = circ - strokeLength;
          const strokeColor = colors[key] || '#94a3b8';
          const angleOffset = (accumulatedAngle / total) * 360;

          accumulatedAngle += count;

          return (
            <circle
              key={key}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={strokeColor}
              strokeWidth="12"
              strokeDasharray={circ}
              strokeDashoffset={strokeOffset}
              transform={`rotate(${angleOffset} 80 80)`}
              strokeLinecap="round"
            />
          );
        })}
        <circle cx="80" cy="80" r={r - 8} fill="#171727" />
        <text x="80" y="77" className="chart-text-val" transform="rotate(90 80 80)">{total}</text>
        <text x="80" y="88" className="chart-text-lbl" transform="rotate(90 80 80)">SESIONES</text>
      </svg>

      <div className="chart-legend">
        {keys.map(key => (
          <div key={key} className="legend-item">
            <div className="legend-color-box" style={{ backgroundColor: colors[key] }}></div>
            <span>{key}: {counts[key]} ({Math.round((counts[key] / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
});