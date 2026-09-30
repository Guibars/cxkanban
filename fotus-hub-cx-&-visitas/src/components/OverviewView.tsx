import { useMemo, useState } from 'react';
import { Activity, ArrowUpRight, CheckCircle2, CircleDollarSign, ClipboardList, Star, Truck } from 'lucide-react';
import { AppSection, ExtraCost, IntegratorVisit, Occurrence, RACase } from '../types';
import { calculateRaReputation, formatRaNumber } from '../lib/raReputation';
import PillBarChart from './PillBarChart';

interface OverviewViewProps {
  occurrences: Occurrence[];
  costs: ExtraCost[];
  raCases: RACase[];
  visits: IntegratorVisit[];
  scopeLabel: string;
  canViewOccurrences: boolean;
  canViewCosts: boolean;
  canViewRa: boolean;
  canViewVisits: boolean;
  onNavigate: (tab: AppSection) => void;
}

const currency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function groupValues<T>(items: T[], labelFor: (item: T) => string, valueFor: (item: T) => number) {
  const grouped = new Map<string, { label: string; value: number; count: number }>();
  items.forEach((item) => {
    const label = labelFor(item).trim() || 'Não informado';
    const key = label.toLocaleUpperCase('pt-BR');
    const current = grouped.get(key);
    grouped.set(key, { label: current?.label || label, value: (current?.value || 0) + valueFor(item), count: (current?.count || 0) + 1 });
  });
  return [...grouped.values()].sort((a, b) => b.value - a.value);
}

export default function OverviewView({ occurrences, costs, raCases, visits, scopeLabel, canViewOccurrences, canViewCosts, canViewRa, canViewVisits, onNavigate }: OverviewViewProps) {
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const now = new Date();
  const currentMonth = monthKey(now);
  const currentYear = String(now.getFullYear());
  const periodOccurrences = occurrences.filter((item) => period === 'month' ? item.date?.startsWith(currentMonth) : item.date?.startsWith(currentYear));
  const periodCosts = costs.filter((item) => period === 'month' ? item.date?.startsWith(currentMonth) : item.date?.startsWith(currentYear));
  const damageOccurrences = periodOccurrences.filter((item) => item.isDamage || item.occurrenceType?.toLocaleLowerCase('pt-BR').includes('avari'));
  const damageTotal = damageOccurrences.reduce((sum, item) => sum + (item.damageAmount || 0), 0);
  const extraCostTotal = periodCosts.reduce((sum, item) => sum + item.totalCost, 0);
  const finalized = periodOccurrences.filter((item) => item.stage === 'Finalizada').length;
  const open = periodOccurrences.length - finalized;
  const raReputation = calculateRaReputation(raCases);
  const damageByCarrier = groupValues(damageOccurrences, (item) => item.carrier, (item) => item.damageAmount || 0).slice(0, 5);
  const maxDamage = damageByCarrier[0]?.value || 1;

  const monthlyTrend = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const key = `${now.getFullYear()}-${String(index + 1).padStart(2, '0')}`;
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(now.getFullYear(), index, 1)).replace('.', '');
    const items = occurrences.filter((item) => item.date?.startsWith(key));
    return { key, label, total: items.length, closed: items.filter((item) => item.stage === 'Finalizada').length };
  }), [occurrences, now.getFullYear()]);
  const currentTrend = monthlyTrend.find((item) => item.key === currentMonth);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-fotus-blue/10 bg-fotus-neutral/85 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-fotus-blue/10 bg-fotus-neutral p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div><p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-fotus-blue"><Activity className="h-4 w-4" />Visão Geral</p><h2 className="mt-1 text-xl font-extrabold text-fotus-ink">O Hub inteiro em uma leitura simples</h2><p className="mt-1 text-xs text-fotus-ink/80">Escopo exibido: <strong className="text-fotus-ink">{scopeLabel}</strong>.</p></div>
          <div className="flex w-fit gap-1 rounded-2xl border border-fotus-neutral bg-fotus-neutral/80 p-1.5 shadow-sm">
            <button onClick={() => setPeriod('month')} className={`rounded-xl px-4 py-2 text-[10px] font-extrabold ${period === 'month' ? 'bg-fotus-blue text-fotus-neutral' : 'text-fotus-ink/80'}`}>Mês atual</button>
            <button onClick={() => setPeriod('year')} className={`rounded-xl px-4 py-2 text-[10px] font-extrabold ${period === 'year' ? 'bg-fotus-blue text-fotus-neutral' : 'text-fotus-ink/80'}`}>Ano atual</button>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4 sm:p-6">
          {canViewOccurrences ? <OverviewMetric label="Ocorrências no período" value={periodOccurrences.length.toLocaleString('pt-BR')} supporting={`${open} abertas · ${finalized} finalizadas`} icon={ClipboardList} tone="bg-fotus-blue/7 text-fotus-blue" onClick={() => onNavigate('ocorrencias')} /> : <RestrictedMetric label="Ocorrências" />}
          {canViewOccurrences ? <OverviewMetric label="Custo de avarias" value={currency(damageTotal)} supporting={`${damageOccurrences.length} avarias registradas`} icon={Truck} tone="bg-fotus-yellow/7 text-fotus-ink" onClick={() => onNavigate('ocorrencias')} /> : <RestrictedMetric label="Avarias" />}
          {canViewCosts ? <OverviewMetric label="Custos extras" value={currency(extraCostTotal)} supporting={`${periodCosts.length} registros no período`} icon={CircleDollarSign} tone="bg-fotus-yellow/7 text-fotus-ink" onClick={() => onNavigate('custos')} /> : <RestrictedMetric label="Custo Extra" />}
          {canViewRa ? <OverviewMetric label="Reclame Aqui" value={raReputation.finalScore === null ? 'Sem nota' : `${formatRaNumber(raReputation.finalScore)} / 10`} supporting={`${raReputation.classification} · ${raCases.length} reclamações`} icon={Star} tone="bg-fotus-blue/7 text-fotus-blue" onClick={() => onNavigate('ra')} /> : <RestrictedMetric label="Reclame Aqui" />}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        {canViewOccurrences ? <section className="rounded-3xl border border-fotus-neutral/90 bg-fotus-neutral/85 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-sm font-extrabold text-fotus-ink">Ritmo mensal das ocorrências</h3><p className="mt-1 text-[11px] text-fotus-ink/80">Cada coluna é um mês; a linha azul representa as ocorrências finalizadas.</p></div><span className="mt-2 w-fit rounded-full bg-fotus-blue/6 px-3 py-1 text-[10px] font-extrabold text-fotus-blue sm:mt-0">{currentTrend?.total || 0} cards neste mês</span></div>
          <div className="mt-5"><PillBarChart data={monthlyTrend.map((item) => ({ key: item.key, label: item.label, value: item.total, secondaryValue: item.closed, tooltip: `${item.label}: ${item.total} ocorrências, ${item.closed} finalizadas` }))} ariaLabel={`Ritmo mensal das ocorrências em ${now.getFullYear()}`} valueFormatter={(value) => `${value} cards`} primaryLabel="Ocorrências" secondaryLabel="Finalizadas" emptyMessage="Ainda não há ocorrências cadastradas neste ano." /></div>
        </section> : <RestrictedPanel title="Ritmo mensal das ocorrências" />}

        {canViewOccurrences ? <section className="rounded-3xl border border-fotus-neutral/90 bg-fotus-neutral/85 p-5 shadow-sm sm:p-6">
          <h3 className="text-sm font-extrabold text-fotus-ink">Impacto financeiro por transportadora</h3>
          <p className="mt-1 text-[11px] text-fotus-ink/80">Ranking calculado apenas com ocorrências marcadas como avaria.</p>
          <div className="mt-5 space-y-4">
            {damageByCarrier.map((item, index) => <div key={item.label}><div className="mb-1.5 flex items-center justify-between gap-3"><span className="truncate text-[11px] font-bold text-fotus-ink"><strong className="mr-1 text-fotus-blue">{index + 1}º</strong>{item.label}</span><strong className="shrink-0 text-xs text-fotus-ink">{currency(item.value)}</strong></div><div className="h-2 overflow-hidden rounded-full bg-fotus-neutral/70"><div className="h-full rounded-full bg-fotus-yellow" style={{ width: `${Math.max(5, (item.value / maxDamage) * 100)}%` }} /></div></div>)}
            {!damageByCarrier.length && <div className="rounded-2xl border border-dashed border-fotus-blue/20 p-7 text-center text-xs text-fotus-ink/80">Marque os novos registros como avaria e informe o valor para formar este ranking.</div>}
          </div>
          <button onClick={() => onNavigate('ocorrencias')} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-fotus-blue/20 px-4 py-2.5 text-xs font-extrabold text-fotus-blue hover:bg-fotus-blue/6">Abrir análise completa <ArrowUpRight className="h-4 w-4" /></button>
        </section> : <RestrictedPanel title="Impacto financeiro por transportadora" />}
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        {canViewOccurrences ? <QuickStatus label="Taxa de conclusão" value={`${periodOccurrences.length ? Math.round((finalized / periodOccurrences.length) * 100) : 0}%`} detail="das ocorrências do período" icon={CheckCircle2} /> : <RestrictedMetric label="Taxa de conclusão" />}
        {canViewVisits ? <QuickStatus label="Visitas agendadas" value={visits.filter((item) => item.status === 'Agendada').length.toLocaleString('pt-BR')} detail="na agenda visível" icon={Activity} /> : <RestrictedMetric label="Visitas" />}
        {canViewOccurrences ? <QuickStatus label="Maior causa atual" value={groupValues(periodOccurrences, (item) => item.occurrenceType, () => 1)[0]?.label || 'Sem dados'} detail="tipo mais frequente" icon={ClipboardList} /> : <RestrictedMetric label="Causas das ocorrências" />}
      </section>
    </div>
  );
}

function OverviewMetric({ label, value, supporting, icon: Icon, tone, onClick }: { label: string; value: string; supporting: string; icon: typeof ClipboardList; tone: string; onClick: () => void }) {
  return <button onClick={onClick} className="fotus-glass-card group rounded-2xl p-4 text-left"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="text-[9px] font-extrabold uppercase tracking-wider text-fotus-ink/80">{label}</span><strong className="mt-1 block truncate text-xl text-fotus-ink">{value}</strong><span className="mt-1 block text-[10px] text-fotus-ink/80">{supporting}</span></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span></div><span className="mt-3 flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wide text-fotus-blue opacity-0 transition-opacity group-hover:opacity-100">Abrir área <ArrowUpRight className="h-3 w-3" /></span></button>;
}

function RestrictedMetric({ label }: { label: string }) {
  return <div className="rounded-2xl border border-dashed border-fotus-blue/20 bg-fotus-neutral/28 p-4"><span className="text-[9px] font-extrabold uppercase tracking-wider text-fotus-ink/80">{label}</span><strong className="mt-2 block text-sm text-fotus-ink">Área restrita</strong><span className="mt-1 block text-[10px] leading-relaxed text-fotus-ink/80">O administrador controla a visibilidade desta informação.</span></div>;
}

function RestrictedPanel({ title }: { title: string }) {
  return <section className="flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-fotus-blue/20 bg-fotus-neutral/55 p-6 text-center"><div><ShieldCheckIcon /><h3 className="mt-3 text-sm font-extrabold text-fotus-ink">{title}</h3><p className="mt-1 text-[11px] text-fotus-ink/80">Esta análise não está liberada para o seu perfil.</p></div></section>;
}

function ShieldCheckIcon() {
  return <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-fotus-neutral/70 text-fotus-ink/80"><ClipboardList className="h-5 w-5" /></span>;
}

function QuickStatus({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Activity }) {
  return <div className="fotus-glass-card flex items-center gap-3 rounded-2xl p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fotus-blue/6 text-fotus-blue"><Icon className="h-5 w-5" /></span><span className="min-w-0"><small className="block text-[9px] font-extrabold uppercase tracking-wide text-fotus-ink/80">{label}</small><strong className="mt-0.5 block truncate text-sm text-fotus-ink">{value}</strong><small className="block text-[9px] text-fotus-ink/80">{detail}</small></span></div>;
}
