import { useMemo, useState } from 'react';
import { Activity, ArrowUpRight, CheckCircle2, CircleDollarSign, ClipboardList, Star, Truck } from 'lucide-react';
import { AppSection, ExtraCost, IntegratorVisit, Occurrence, RACase } from '../types';
import PillBarChart from './PillBarChart';

interface OverviewViewProps {
  occurrences: Occurrence[];
  costs: ExtraCost[];
  raCases: RACase[];
  visits: IntegratorVisit[];
  scopeLabel: string;
  canViewCosts: boolean;
  canViewRa: boolean;
  onNavigate: (tab: AppSection) => void;
}

const currency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function scoreOnTen(value: number) {
  return value > 10 ? value / 10 : value;
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

export default function OverviewView({ occurrences, costs, raCases, visits, scopeLabel, canViewCosts, canViewRa, onNavigate }: OverviewViewProps) {
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
  const scoredRa = raCases.map((item) => item.finalScore).filter((value): value is number => typeof value === 'number');
  const averageRa = scoredRa.length ? scoredRa.reduce((sum, value) => sum + scoreOnTen(value), 0) / scoredRa.length : null;
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
      <section className="overflow-hidden rounded-3xl border border-[#385041]/10 bg-white/85 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 bg-[#f4f8f2] p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div><p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#385041]"><Activity className="h-4 w-4" />Visão Geral</p><h2 className="mt-1 text-xl font-extrabold text-gray-950">O Hub inteiro em uma leitura simples</h2><p className="mt-1 text-xs text-gray-500">Escopo exibido: <strong className="text-gray-700">{scopeLabel}</strong>.</p></div>
          <div className="flex w-fit gap-1 rounded-2xl border border-white bg-white/80 p-1.5 shadow-sm">
            <button onClick={() => setPeriod('month')} className={`rounded-xl px-4 py-2 text-[10px] font-extrabold ${period === 'month' ? 'bg-[#385041] text-white' : 'text-gray-500'}`}>Mês atual</button>
            <button onClick={() => setPeriod('year')} className={`rounded-xl px-4 py-2 text-[10px] font-extrabold ${period === 'year' ? 'bg-[#385041] text-white' : 'text-gray-500'}`}>Ano atual</button>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4 sm:p-6">
          <OverviewMetric label="Ocorrências no período" value={periodOccurrences.length.toLocaleString('pt-BR')} supporting={`${open} abertas · ${finalized} finalizadas`} icon={ClipboardList} tone="bg-blue-50 text-blue-700" onClick={() => onNavigate('ocorrencias')} />
          <OverviewMetric label="Custo de avarias" value={currency(damageTotal)} supporting={`${damageOccurrences.length} avarias registradas`} icon={Truck} tone="bg-amber-50 text-amber-700" onClick={() => onNavigate('ocorrencias')} />
          {canViewCosts ? <OverviewMetric label="Custos extras" value={currency(extraCostTotal)} supporting={`${periodCosts.length} registros no período`} icon={CircleDollarSign} tone="bg-red-50 text-red-700" onClick={() => onNavigate('custos')} /> : <RestrictedMetric label="Custo Extra" />}
          {canViewRa ? <OverviewMetric label="Reclame Aqui" value={averageRa === null ? 'Sem nota' : `${averageRa.toFixed(1)} / 10`} supporting={`${raCases.length} reclamações visíveis`} icon={Star} tone="bg-emerald-50 text-emerald-700" onClick={() => onNavigate('ra')} /> : <RestrictedMetric label="Reclame Aqui" />}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <section className="rounded-3xl border border-white/90 bg-white/85 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-sm font-extrabold text-gray-950">Ritmo mensal das ocorrências</h3><p className="mt-1 text-[11px] text-gray-500">Cada coluna é um mês; a faixa verde representa o que já foi finalizado.</p></div><span className="mt-2 w-fit rounded-full bg-[#eef5eb] px-3 py-1 text-[10px] font-extrabold text-[#385041] sm:mt-0">{currentTrend?.total || 0} cards neste mês</span></div>
          <div className="mt-5"><PillBarChart data={monthlyTrend.map((item) => ({ key: item.key, label: item.label, value: item.total, secondaryValue: item.closed, tooltip: `${item.label}: ${item.total} ocorrências, ${item.closed} finalizadas` }))} ariaLabel={`Ritmo mensal das ocorrências em ${now.getFullYear()}`} valueFormatter={(value) => `${value} cards`} primaryLabel="Ocorrências" secondaryLabel="Finalizadas" emptyMessage="Ainda não há ocorrências cadastradas neste ano." /></div>
        </section>

        <section className="rounded-3xl border border-white/90 bg-white/85 p-5 shadow-sm sm:p-6">
          <h3 className="text-sm font-extrabold text-gray-950">Impacto financeiro por transportadora</h3>
          <p className="mt-1 text-[11px] text-gray-500">Ranking calculado apenas com ocorrências marcadas como avaria.</p>
          <div className="mt-5 space-y-4">
            {damageByCarrier.map((item, index) => <div key={item.label}><div className="mb-1.5 flex items-center justify-between gap-3"><span className="truncate text-[11px] font-bold text-gray-700"><strong className="mr-1 text-[#385041]">{index + 1}º</strong>{item.label}</span><strong className="shrink-0 text-xs text-gray-950">{currency(item.value)}</strong></div><div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.max(5, (item.value / maxDamage) * 100)}%` }} /></div></div>)}
            {!damageByCarrier.length && <div className="rounded-2xl border border-dashed border-gray-300 p-7 text-center text-xs text-gray-500">Marque os novos registros como avaria e informe o valor para formar este ranking.</div>}
          </div>
          <button onClick={() => onNavigate('ocorrencias')} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#385041]/20 px-4 py-2.5 text-xs font-extrabold text-[#385041] hover:bg-[#eef5eb]">Abrir análise completa <ArrowUpRight className="h-4 w-4" /></button>
        </section>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <QuickStatus label="Taxa de conclusão" value={`${periodOccurrences.length ? Math.round((finalized / periodOccurrences.length) * 100) : 0}%`} detail="das ocorrências do período" icon={CheckCircle2} />
        <QuickStatus label="Visitas agendadas" value={visits.filter((item) => item.status === 'Agendada').length.toLocaleString('pt-BR')} detail="na agenda visível" icon={Activity} />
        <QuickStatus label="Maior causa atual" value={groupValues(periodOccurrences, (item) => item.occurrenceType, () => 1)[0]?.label || 'Sem dados'} detail="tipo mais frequente" icon={ClipboardList} />
      </section>
    </div>
  );
}

function OverviewMetric({ label, value, supporting, icon: Icon, tone, onClick }: { label: string; value: string; supporting: string; icon: typeof ClipboardList; tone: string; onClick: () => void }) {
  return <button onClick={onClick} className="group rounded-2xl border border-gray-100 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#385041]/20 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">{label}</span><strong className="mt-1 block truncate text-xl text-gray-950">{value}</strong><span className="mt-1 block text-[10px] text-gray-500">{supporting}</span></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span></div><span className="mt-3 flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wide text-[#385041] opacity-0 transition-opacity group-hover:opacity-100">Abrir área <ArrowUpRight className="h-3 w-3" /></span></button>;
}

function RestrictedMetric({ label }: { label: string }) {
  return <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-4"><span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">{label}</span><strong className="mt-2 block text-sm text-gray-600">Área restrita</strong><span className="mt-1 block text-[10px] leading-relaxed text-gray-400">O administrador controla a visibilidade desta informação.</span></div>;
}

function QuickStatus({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Activity }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/75 p-4 shadow-sm"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef5eb] text-[#385041]"><Icon className="h-5 w-5" /></span><span className="min-w-0"><small className="block text-[9px] font-extrabold uppercase tracking-wide text-gray-400">{label}</small><strong className="mt-0.5 block truncate text-sm text-gray-900">{value}</strong><small className="block text-[9px] text-gray-500">{detail}</small></span></div>;
}
