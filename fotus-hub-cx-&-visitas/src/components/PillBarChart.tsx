interface PillBarDatum {
  key: string;
  label: string;
  value: number;
  tooltip?: string;
}

interface PillBarChartProps {
  data: PillBarDatum[];
  ariaLabel: string;
  valueFormatter?: (value: number) => string;
  emptyMessage?: string;
}

const BAR_COLORS = [
  '#ef5b57', '#f07843', '#f2a33a', '#d8b92f', '#a4ba49', '#76ad68',
  '#70ad92', '#69aeb0', '#49b3c6', '#3bb7d7', '#57bdf0', '#7da9ee',
];

export default function PillBarChart({ data, ariaLabel, valueFormatter = (value) => String(value), emptyMessage = 'Sem dados para este período.' }: PillBarChartProps) {
  const max = Math.max(...data.map((item) => item.value), 0);
  const hasData = max > 0;

  return (
    <div className="overflow-x-auto rounded-3xl bg-[#252a28] px-4 pb-4 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_40px_rgba(30,40,35,0.14)]" role="img" aria-label={ariaLabel}>
      {!hasData && <p className="mb-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xs font-semibold text-white/55">{emptyMessage}</p>}
      <div className="min-w-[760px]">
        <div className="relative flex h-60 items-end gap-2 px-2 sm:gap-3">
          <div className="pointer-events-none absolute inset-x-2 bottom-[39px] h-px bg-white/10" />
          {data.map((item, index) => {
            const color = BAR_COLORS[index % BAR_COLORS.length];
            const fill = item.value > 0 && max > 0 ? Math.max(18, Math.round((item.value / max) * 100)) : 0;
            return (
              <div key={item.key} className="group relative z-10 flex min-w-0 flex-1 flex-col items-center justify-end" title={item.tooltip || `${item.label}: ${valueFormatter(item.value)}`}>
                <div className="relative flex h-44 w-full max-w-[54px] items-end overflow-hidden rounded-full bg-white/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)]">
                  <div className="relative w-full rounded-full transition-all duration-500 ease-out group-hover:brightness-110" style={{ height: `${fill}%`, backgroundColor: color, boxShadow: `0 0 24px ${color}33` }}>
                    {item.value > 0 && <span className="absolute left-1/2 top-2 max-w-[48px] -translate-x-1/2 truncate rounded-full bg-black/10 px-1.5 py-1 text-[9px] font-black leading-none text-[#17201c]">{valueFormatter(item.value)}</span>}
                  </div>
                  {item.value === 0 && <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white/25">0</span>}
                </div>
                <span className="mt-3 h-2.5 w-2.5 rounded-full border-2 border-[#252a28] shadow-[0_0_0_1px_rgba(255,255,255,0.12)]" style={{ backgroundColor: color }} />
                <span className="mt-2 truncate text-[9px] font-bold uppercase tracking-wide text-white/55">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
