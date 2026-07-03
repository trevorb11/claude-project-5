"use client";

export interface ScatterPoint {
  x: number;
  y: number;
  label: string;
  group: string;
  color: string;
  isOwn?: boolean;
}

interface ScatterChartProps {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  xFormat?: (v: number) => string;
  yFormat?: (v: number) => string;
}

const W = 640;
const H = 340;
const PAD = { top: 16, right: 24, bottom: 44, left: 64 };

function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) {
    min = min * 0.9;
    max = max * 1.1 || 1;
  }
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = (count * step) / span;
  const mult = err <= 0.15 ? 10 : err <= 0.35 ? 5 : err <= 0.75 ? 2 : 1;
  const niceStep = step * mult;
  const start = Math.floor(min / niceStep) * niceStep;
  const ticks: number[] = [];
  for (let v = start; v <= max + niceStep * 0.5; v += niceStep) {
    if (v >= min - niceStep * 0.5) ticks.push(Math.round(v * 100) / 100);
  }
  // The plot domain is [first tick, last tick] — extend so no point overflows
  while (ticks[ticks.length - 1] < max) {
    ticks.push(Math.round((ticks[ticks.length - 1] + niceStep) * 100) / 100);
  }
  return ticks;
}

export function ScatterChart({ points, xLabel, yLabel, xFormat, yFormat }: ScatterChartProps) {
  if (points.length === 0) return null;

  const fx = xFormat || ((v: number) => String(v));
  const fy = yFormat || ((v: number) => String(v));

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xTicks = niceTicks(Math.min(...xs), Math.max(...xs));
  const yTicks = niceTicks(Math.min(...ys), Math.max(...ys));
  const xMin = xTicks[0];
  const xMax = xTicks[xTicks.length - 1];
  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];

  const px = (v: number) =>
    PAD.left + ((v - xMin) / (xMax - xMin || 1)) * (W - PAD.left - PAD.right);
  const py = (v: number) =>
    H - PAD.bottom - ((v - yMin) / (yMax - yMin || 1)) * (H - PAD.top - PAD.bottom);

  const groups = [...new Map(points.map((p) => [p.group, p])).values()];

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[480px]" role="img" aria-label={`${yLabel} vs ${xLabel} scatter chart`}>
          {/* Gridlines + y ticks */}
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={PAD.left} x2={W - PAD.right} y1={py(t)} y2={py(t)} stroke="var(--color-border)" strokeWidth="1" />
              <text x={PAD.left - 8} y={py(t)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="var(--color-text-muted)">
                {fy(t)}
              </text>
            </g>
          ))}
          {/* x ticks */}
          {xTicks.map((t) => (
            <g key={`x${t}`}>
              <line x1={px(t)} x2={px(t)} y1={H - PAD.bottom} y2={H - PAD.bottom + 4} stroke="var(--color-border-highlight)" strokeWidth="1" />
              <text x={px(t)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">
                {fx(t)}
              </text>
            </g>
          ))}
          {/* Axes */}
          <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="var(--color-border-highlight)" strokeWidth="1" />
          <text x={(PAD.left + W - PAD.right) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--color-text-secondary)">
            {xLabel}
          </text>
          <text
            x={16}
            y={(PAD.top + H - PAD.bottom) / 2}
            textAnchor="middle"
            fontSize="11"
            fill="var(--color-text-secondary)"
            transform={`rotate(-90 16 ${(PAD.top + H - PAD.bottom) / 2})`}
          >
            {yLabel}
          </text>
          {/* Points — own company drawn last (on top) as squares */}
          {[...points.filter((p) => !p.isOwn), ...points.filter((p) => p.isOwn)].map((p, i) => {
            const x = px(p.x);
            const y = py(p.y);
            return (
              <g key={i}>
                {p.isOwn ? (
                  <rect x={x - 4.5} y={y - 4.5} width={9} height={9} rx={2} fill={p.color} stroke="var(--color-bg-card)" strokeWidth="2" />
                ) : (
                  <circle cx={x} cy={y} r={4.5} fill={p.color} fillOpacity={0.85} stroke="var(--color-bg-card)" strokeWidth="2" />
                )}
                <circle cx={x} cy={y} r={11} fill="transparent">
                  <title>{`${p.label} (${p.group}) — ${xLabel}: ${fx(p.x)}, ${yLabel}: ${fy(p.y)}`}</title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
        {groups.map((g) => (
          <div key={g.group} className="flex items-center gap-1.5">
            {g.isOwn ? (
              <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: g.color }} />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
            )}
            <span className="text-xs text-text-secondary">
              {g.group}
              {g.isOwn ? " (You)" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
