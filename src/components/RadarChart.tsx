"use client";

export interface RadarSeries {
  name: string;
  color: string;
  values: number[]; // 0–10, one per axis
  isOwn?: boolean;
}

interface RadarChartProps {
  axes: string[];
  series: RadarSeries[];
  max?: number;
}

const CX = 210;
const CY = 160;
const R = 110;

function polar(angleIdx: number, total: number, radius: number): [number, number] {
  const angle = (Math.PI * 2 * angleIdx) / total - Math.PI / 2;
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
}

export function RadarChart({ axes, series, max = 10 }: RadarChartProps) {
  const n = axes.length;
  const rings = [0.25, 0.5, 0.75, 1];

  const ringPath = (frac: number) =>
    Array.from({ length: n }, (_, i) => polar(i, n, R * frac))
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ") + " Z";

  const seriesPath = (values: number[]) =>
    values
      .map((v, i) => {
        const [x, y] = polar(i, n, (Math.max(0, Math.min(v, max)) / max) * R);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") + " Z";

  return (
    <div>
      <svg viewBox="0 0 420 320" className="w-full max-w-xl mx-auto" role="img" aria-label="Competitive scores radar chart">
        {/* Grid rings */}
        {rings.map((frac) => (
          <path key={frac} d={ringPath(frac)} fill="none" stroke="var(--color-border)" strokeWidth="1" />
        ))}
        {/* Spokes + axis labels */}
        {axes.map((axis, i) => {
          const [x2, y2] = polar(i, n, R);
          const [lx, ly] = polar(i, n, R + 18);
          const anchor = Math.abs(lx - CX) < 8 ? "middle" : lx > CX ? "start" : "end";
          return (
            <g key={axis}>
              <line x1={CX} y1={CY} x2={x2} y2={y2} stroke="var(--color-border)" strokeWidth="1" />
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize="10"
                fill="var(--color-text-secondary)"
              >
                {axis}
              </text>
            </g>
          );
        })}
        {/* Scale label on the top spoke */}
        <text x={CX + 4} y={CY - R * 0.5} fontSize="8" fill="var(--color-text-muted)">
          {max / 2}
        </text>
        <text x={CX + 4} y={CY - R + 8} fontSize="8" fill="var(--color-text-muted)">
          {max}
        </text>
        {/* Series polygons */}
        {series.map((s) => (
          <path
            key={s.name}
            d={seriesPath(s.values)}
            fill={s.color}
            fillOpacity="0.08"
            stroke={s.color}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        ))}
        {/* Vertex dots with native tooltips */}
        {series.map((s) =>
          s.values.map((v, i) => {
            const [x, y] = polar(i, n, (Math.max(0, Math.min(v, max)) / max) * R);
            return (
              <g key={`${s.name}-${i}`}>
                <circle cx={x} cy={y} r={3.5} fill={s.color} stroke="var(--color-bg-card)" strokeWidth="2" />
                <circle cx={x} cy={y} r={9} fill="transparent">
                  <title>{`${s.name} — ${axes[i]}: ${v}/${max}`}</title>
                </circle>
              </g>
            );
          })
        )}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-text-secondary">
              {s.name}
              {s.isOwn ? " (You)" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
