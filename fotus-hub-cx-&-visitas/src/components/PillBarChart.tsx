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
const HEIGHT = 238;
const PLOT_LEFT = 44;
const PLOT_RIGHT = 1182;
const PLOT_TOP = 22;
const PLOT_BOTTOM = 190;

function coordinates(data: PillBarDatum[], selector: (item: PillBarDatum) => number, max: number) {
  const plotWidth = PLOT_RIGHT - PLOT_LEFT;
  const step = plotWidth / Math.max(data.length, 1);
  return data.map((item, index) => ({
    x: PLOT_LEFT + (step * index) + (step / 2),
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
  const gridValues = [1, 0.75, 0.5, 0.25, 0];
  const barWidth = Math.min(58, Math.max(28, ((PLOT_RIGHT - PLOT_LEFT) / Math.max(data.length, 1)) * 0.32));

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_55px_rgba(30,55,45,0.08)]" role="img" aria-label={ariaLabel}>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-extrabold text-slate-600">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />{primaryLabel}</span>
          {secondaryLabel && <span className="flex items-center gap-2"><span className="w-5 border-t-2 border-dashed border-[#6366f1]" />{secondaryLabel}</span>}
          {chartYear && <span className="rounded-lg bg-[#f2f6f2] px-2.5 py-1 text-[9px] text-[#385041]">{chartYear}</span>}
        </div>
        {focused && <div className="flex min-w-[190px] items-center justify-between gap-4 rounded-2xl bg-[#17223b] px-4 py-3 text-white shadow-lg shadow-slate-300/40"><div><span className="block text-[9px] font-extrabold uppercase tracking-[0.14em] text-amber-400">{focused.label}{chartYear ? ` '${chartYear.slice(-2)}` : ''}</span><strong className="mt-0.5 block text-sm">{valueFormatter(focused.value)}</strong></div>{secondaryLabel && <div className="border-l border-white/10 pl-3 text-right"><span className="block text-[8px] font-bold text-slate-400">{secondaryLabel}</span><strong className="text-[11px] text-indigo-200">{valueFormatter(focused.secondaryValue || 0)}</strong></div>}</div>}
      </div>

      {!hasData && <p className="mx-5 mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs font-semibold text-slate-500">{emptyMessage}</p>}

      <div className="overflow-x-auto px-3 pt-4 sm:px-5">
        <div className="relative min-w-[760px]" style={{ height: `${HEIGHT}px` }}>
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={`bar-${chartId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#ea7a00" /></linearGradient>
              <linearGradient id={`area-${chartId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" /><stop offset="100%" stopColor="#f59e0b" stopOpacity="0.025" /></linearGradient>
            </defs>
            {gridValues.map((ratio) => {
              const y = PLOT_TOP + ((1 - ratio) * (PLOT_BOTTOM - PLOT_TOP));
              return <g key={ratio}><line x1={PLOT_LEFT} y1={y} x2={PLOT_RIGHT} y2={y} stroke="#dfe7ee" strokeWidth="1" strokeDasharray="4 6" /><text x={PLOT_LEFT - 10} y={y + 3} textAnchor="end" fill="#94a3b8" fontSize="8" fontWeight="700">{Math.round(max * ratio)}</text></g>;
            })}
            {primaryPoints.map((point, index) => {
              const barHeight = Math.max(0, PLOT_BOTTOM - point.y);
              return <rect key={`bar-${data[index]?.key}`} x={point.x - (barWidth / 2)} y={point.y} width={barWidth} height={barHeight} rx={Math.min(12, barWidth / 2)} fill={`url(#bar-${chartId})`} opacity={focusedIndex === index ? 1 : 0.86} />;
            })}
            <path d={primaryArea} fill={`url(#area-${chartId})`} />
            <path d={primaryLine} fill="none" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
            {secondaryLabel && <path d={smoothPath(secondaryPoints)} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 8" />}
            {secondaryLabel && secondaryPoints.map((point, index) => <circle key={`secondary-${data[index]?.key}`} cx={point.x} cy={point.y} r="3.5" fill="#ffffff" stroke="#6366f1" strokeWidth="2.5" />)}
            {focusedPoint && <line x1={focusedPoint.x} y1={PLOT_TOP} x2={focusedPoint.x} y2={PLOT_BOTTOM} stroke="#cbd5e1" strokeWidth="1" />}
            {primaryPoints.map((point, index) => <circle key={`primary-${data[index]?.key}`} cx={point.x} cy={point.y} r={focusedIndex === index ? 5 : 3} fill="#ffffff" stroke="#f59e0b" strokeWidth={focusedIndex === index ? 3 : 2} />)}
          </svg>

          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0, 1fr))`, paddingLeft: `${(PLOT_LEFT / WIDTH) * 100}%`, paddingRight: `${((WIDTH - PLOT_RIGHT) / WIDTH) * 100}%` }}>
            {data.map((item) => <button key={item.key} type="button" onMouseEnter={() => setFocusedKey(item.key)} onFocus={() => setFocusedKey(item.key)} onClick={() => setFocusedKey(item.key)} title={item.tooltip || `${item.label}: ${valueFormatter(item.value)}`} aria-pressed={focused?.key === item.key} className="h-full outline-none" />)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 bg-slate-50/55 p-3 sm:grid-cols-6">
        {data.map((item) => {
          const selected = item.key === focused?.key;
          const isCurrent = item.key === currentKey;
          const completion = item.value > 0 && secondaryLabel ? Math.round(((item.secondaryValue || 0) / item.value) * 100) : null;
          return <button key={`summary-${item.key}`} type="button" onMouseEnter={() => setFocusedKey(item.key)} onFocus={() => setFocusedKey(item.key)} onClick={() => setFocusedKey(item.key)} className={`min-w-0 rounded-xl border px-3 py-2.5 text-left transition-all ${selected ? 'border-amber-300 bg-amber-50 shadow-sm' : 'border-slate-200/80 bg-white hover:border-slate-300'}`}><span className="flex items-center justify-between gap-1 text-[8px] font-extrabold uppercase text-slate-500"><span>{item.label}{chartYear ? ` '${chartYear.slice(-2)}` : ''}</span>{isCurrent && <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[7px] text-[#17223b]">Atual</span>}</span><strong className="mt-1 block truncate text-xs text-slate-900">{valueFormatter(item.value)}</strong>{completion !== null && <span className={`mt-1 block text-[8px] font-bold ${completion >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{completion}% {secondaryLabel.toLocaleLowerCase('pt-BR')}</span>}</button>;
        })}
      </div>
    </div>
  );
}
