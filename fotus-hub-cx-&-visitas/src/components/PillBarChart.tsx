import { useMemo, useState } from 'react';

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
const HEIGHT = 220;
const PLOT_TOP = 20;
const PLOT_BOTTOM = 176;

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
  const [focusedKey, setFocusedKey] = useState(data.find((item) => item.value > 0)?.key || data[0]?.key || '');
  const max = Math.max(...data.flatMap((item) => [item.value, item.secondaryValue || 0]), 1);
  const hasData = data.some((item) => item.value > 0 || (item.secondaryValue || 0) > 0);
  const primaryPoints = useMemo(() => coordinates(data, (item) => item.value, max), [data, max]);
  const secondaryPoints = useMemo(() => coordinates(data, (item) => item.secondaryValue || 0, max), [data, max]);
  const focused = data.find((item) => item.key === focusedKey) || data[0];
  const currentKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(43,63,53,0.08)]" role="img" aria-label={ariaLabel}>
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-extrabold text-slate-600">
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#ef9200]" />{primaryLabel}</span>
          <span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-[#ef9200]" />Tendência</span>
          {secondaryLabel && <span className="flex items-center gap-2"><span className="h-0.5 w-5 border-t-2 border-dashed border-[#596cff]" />{secondaryLabel}</span>}
        </div>
        {focused && <div className="flex items-baseline gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"><span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{focused.label}</span><strong className="text-sm text-slate-900">{valueFormatter(focused.value)}</strong></div>}
      </div>

      {!hasData && <p className="mx-5 mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs font-semibold text-slate-400">{emptyMessage}</p>}

      <div className="overflow-x-auto px-3 pb-3 pt-4 sm:px-5">
        <div className="relative min-w-[760px]" style={{ height: `${HEIGHT + 42}px` }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[220px]">
            {[0, 1, 2, 3].map((line) => <span key={line} className="absolute inset-x-0 border-t border-dashed border-slate-200" style={{ top: `${PLOT_TOP + line * 52}px` }} />)}
          </div>

          <div className="absolute inset-x-0 top-0 grid h-[220px]" style={{ gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0, 1fr))` }}>
            {data.map((item) => {
              const fillHeight = item.value > 0 ? Math.max(4, Math.round((item.value / max) * (PLOT_BOTTOM - PLOT_TOP))) : 0;
              const isFocused = focused?.key === item.key;
              const isCurrent = item.key === currentKey;
              return <button key={item.key} type="button" onClick={() => setFocusedKey(item.key)} title={item.tooltip || `${item.label}: ${valueFormatter(item.value)}`} className={`group relative flex flex-col items-center justify-end px-2 pb-[44px] outline-none transition-colors ${isFocused ? 'bg-amber-50/35' : 'hover:bg-slate-50/60'}`}>
                <span className="absolute bottom-[44px] w-6 rounded-t-lg bg-[#ef9200] shadow-[0_10px_25px_rgba(239,146,0,0.2)] transition-all group-hover:bg-[#dd8100]" style={{ height: `${fillHeight}px` }} />
                <span className={`absolute bottom-2 rounded-lg px-2 py-1 text-[9px] font-extrabold uppercase ${isCurrent ? 'border border-amber-300 bg-amber-50 text-amber-800' : isFocused ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>{item.label}</span>
              </button>;
            })}
          </div>

          <svg className="pointer-events-none absolute inset-x-0 top-0 h-[220px] w-full overflow-visible" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
            <path d={smoothPath(primaryPoints)} fill="none" stroke="#ef9200" strokeWidth="4" strokeLinecap="round" />
            {primaryPoints.map((point, index) => <circle key={`primary-${data[index]?.key}`} cx={point.x} cy={point.y} r="4.5" fill="#fff" stroke="#ef9200" strokeWidth="3" />)}
            {secondaryLabel && <path d={smoothPath(secondaryPoints)} fill="none" stroke="#596cff" strokeWidth="3" strokeLinecap="round" strokeDasharray="9 8" />}
            {secondaryLabel && secondaryPoints.map((point, index) => <circle key={`secondary-${data[index]?.key}`} cx={point.x} cy={point.y} r="3.5" fill="#596cff" stroke="#fff" strokeWidth="2" />)}
          </svg>
        </div>
      </div>
    </div>
  );
}
