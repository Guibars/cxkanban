import { useId, useMemo, useState } from 'react';

export interface PillBarDatum {
  key: string;
  label: string;
  value: number;
  secondaryValue?: number;
  tooltip?: string;
}

interface PillBarChartProps {
  data: PillBarDatum[];
  ariaLabel: string;
  valueFormatter?: (value: number) => string;
  emptyMessage?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

const WIDTH = 1200;
const HEIGHT = 230;
const PLOT_TOP = 28;
const PLOT_BOTTOM = 184;

function coordinates(data: PillBarDatum[], selector: (item: PillBarDatum) => number, max: number) {
  const step = WIDTH / Math.max(data.length, 1);
  return data.map((item, index) => ({
    x: step * index + step / 2,
    y: PLOT_BOTTOM - (selector(item) / max) * (PLOT_BOTTOM - PLOT_TOP),
  }));
}

function smoothPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const middleX = (previous.x + point.x) / 2;
    return `${path} C ${middleX} ${previous.y}, ${middleX} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

export default function PillBarChart({
  data,
  ariaLabel,
  valueFormatter = (value) => String(value),
  emptyMessage = 'Sem dados para este período.',
  primaryLabel = 'Realizado',
  secondaryLabel,
}: PillBarChartProps) {
  const chartId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [focusedKey, setFocusedKey] = useState(data.find((item) => item.value > 0)?.key || data[0]?.key || '');
  const max = Math.max(...data.flatMap((item) => [item.value, item.secondaryValue || 0]), 1);
  const hasData = data.some((item) => item.value > 0 || (item.secondaryValue || 0) > 0);
  const primaryPoints = useMemo(() => coordinates(data, (item) => item.value, max), [data, max]);
  const secondaryPoints = useMemo(() => coordinates(data, (item) => item.secondaryValue || 0, max), [data, max]);
  const primaryLine = smoothPath(primaryPoints);
  const primaryArea = primaryPoints.length
    ? `${primaryLine} L ${primaryPoints[primaryPoints.length - 1].x} ${PLOT_BOTTOM} L ${primaryPoints[0].x} ${PLOT_BOTTOM} Z`
    : '';
  const focused = data.find((item) => item.key === focusedKey) || data[0];
  const focusedIndex = Math.max(0, data.findIndex((item) => item.key === focused?.key));
  const focusedPoint = primaryPoints[focusedIndex];
  const currentKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const chartYear = data.find((item) => /^\d{4}-/.test(item.key))?.key.slice(0, 4);

  return (
    <div className="overflow-hidden rounded-[30px] border border-[#29314d] bg-[#121426] shadow-[0_26px_70px_rgba(17,20,38,0.24)]" role="img" aria-label={ariaLabel}>
      <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-extrabold text-slate-300">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#46e0c5] shadow-[0_0_12px_rgba(70,224,197,0.75)]" />{primaryLabel}</span>
          {secondaryLabel && <span className="flex items-center gap-2"><span className="h-0.5 w-5 border-t-2 border-dashed border-[#ffb547]" />{secondaryLabel}</span>}
          {chartYear && <span className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[9px] text-cyan-200">{chartYear}</span>}
        </div>
        {focused && <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-2.5"><span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">{focused.label}</span><strong className="text-sm text-white">{valueFormatter(focused.value)}</strong>{secondaryLabel && <small className="text-[9px] font-semibold text-amber-300">{secondaryLabel}: {valueFormatter(focused.secondaryValue || 0)}</small>}</div>}
      </div>

      {!hasData && <p className="mx-5 mt-5 rounded-2xl border border-dashed border-white/10 bg-white/[0.035] px-4 py-3 text-center text-xs font-semibold text-slate-400">{emptyMessage}</p>}

      <div className="overflow-x-auto px-3 pb-3 pt-3 sm:px-5">
        <div className="relative min-w-[760px]" style={{ height: `${HEIGHT + 34}px` }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[230px]">
            {[0, 1, 2, 3].map((line) => <span key={line} className="absolute inset-x-0 border-t border-dashed border-white/[0.075]" style={{ top: `${PLOT_TOP + line * 52}px` }} />)}
          </div>

          <div className="absolute inset-x-0 top-0 grid h-[230px]" style={{ gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0, 1fr))` }}>
            {data.map((item) => {
              const isFocused = focused?.key === item.key;
              const isCurrent = item.key === currentKey;
              return <button key={item.key} type="button" onClick={() => setFocusedKey(item.key)} title={item.tooltip || `${item.label}: ${valueFormatter(item.value)}`} aria-pressed={isFocused} className={`group relative flex flex-col items-center justify-end pb-[34px] outline-none transition-colors ${isFocused ? 'bg-cyan-300/[0.035]' : 'hover:bg-white/[0.025]'}`}>
                <span className={`absolute bottom-[38px] top-4 w-px transition-opacity ${isFocused ? 'bg-cyan-200/25 opacity-100' : 'bg-white/10 opacity-0 group-hover:opacity-100'}`} />
                <span className={`absolute bottom-1 rounded-lg px-2 py-1 text-[9px] font-extrabold uppercase transition-all ${isCurrent ? 'border border-amber-300/40 bg-amber-300/10 text-amber-200' : isFocused ? 'bg-cyan-300/15 text-cyan-100' : 'text-slate-500 group-hover:text-slate-300'}`}>{item.label}</span>
              </button>;
            })}
          </div>

          <svg className="pointer-events-none absolute inset-x-0 top-0 h-[230px] w-full overflow-visible" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={`line-${chartId}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#4d8dff" /><stop offset="54%" stopColor="#46d9ca" /><stop offset="100%" stopColor="#52f0c2" /></linearGradient>
              <linearGradient id={`area-${chartId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4b8dff" stopOpacity="0.34" /><stop offset="62%" stopColor="#3edbc6" stopOpacity="0.12" /><stop offset="100%" stopColor="#3edbc6" stopOpacity="0" /></linearGradient>
              <filter id={`glow-${chartId}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <path d={primaryArea} fill={`url(#area-${chartId})`} />
            <path d={primaryLine} fill="none" stroke={`url(#line-${chartId})`} strokeWidth="4" strokeLinecap="round" filter={`url(#glow-${chartId})`} />
            {primaryPoints.map((point, index) => {
              const isFocused = index === focusedIndex;
              return <circle key={`primary-${data[index]?.key}`} cx={point.x} cy={point.y} r={isFocused ? 7 : 3.5} fill={isFocused ? '#121426' : '#eafffb'} stroke={isFocused ? '#46e0c5' : '#65e8d2'} strokeWidth={isFocused ? 4 : 2} filter={isFocused ? `url(#glow-${chartId})` : undefined} />;
            })}
            {secondaryLabel && <path d={smoothPath(secondaryPoints)} fill="none" stroke="#ffb547" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="8 8" opacity=".9" />}
            {secondaryLabel && secondaryPoints.map((point, index) => <circle key={`secondary-${data[index]?.key}`} cx={point.x} cy={point.y} r="3" fill="#ffb547" stroke="#121426" strokeWidth="2" />)}
            {focusedPoint && <text x={focusedPoint.x} y={Math.max(15, focusedPoint.y - 17)} textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="800">{valueFormatter(focused?.value || 0)}</text>}
          </svg>
        </div>
      </div>
    </div>
  );
}
