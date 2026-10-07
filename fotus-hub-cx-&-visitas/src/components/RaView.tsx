import { useMemo, useState } from 'react';
import { ArchiveRestore, CalendarRange, FileSpreadsheet, FileText, Frown, Mail, Meh, Pencil, Phone, Plus, Search, Smile, Trash2 } from 'lucide-react';
import type { CurrentUser } from '../lib/currentUser';
import { deleteData } from '../lib/dataMutations';
import { exportRaExcel } from '../lib/excelExport';
import { calculateRaReputation, customerScoreValue, isRaCaseIncludedInReputation, wouldDoBusinessValue, formatRaNumber } from '../lib/raReputation';
import { buildRaReport, openA4PrintWindow } from '../lib/reportPrint';
import type { RACase, RaStatus } from '../types';

interface RaViewProps {
  cases: RACase[];
  currentUser: CurrentUser;
  onNew: () => void;
  onEdit: (item: RACase) => void;
}

type DatePreset = 'month' | 'custom' | 'all';
const statuses: Array<'Todos' | RaStatus> = ['Todos', 'Em Andamento', 'Finalizado', 'Moderado', 'Desativado'];

function localDate(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function displayDate(timestamp: number) {
  return timestamp ? new Date(timestamp).toLocaleDateString('pt-BR') : 'Sem data';
}

export default function RaView({ cases, currentUser, onNew, onEdit }: RaViewProps) {
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | RaStatus>('Todos');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const today = localDate(Date.now());
  const monthStart = `${today.slice(0, 7)}-01`;
  const period = datePreset === 'all'
    ? { start: '', end: '' }
    : datePreset === 'custom'
      ? { start: customStart, end: customEnd }
      : { start: monthStart, end: today };
  const periodLabel = datePreset === 'all'
    ? 'Todo o histórico'
    : datePreset === 'month'
      ? `Mês atual (${monthStart.split('-').reverse().join('/')} a ${today.split('-').reverse().join('/')})`
      : `${customStart ? customStart.split('-').reverse().join('/') : 'início'} a ${customEnd ? customEnd.split('-').reverse().join('/') : 'hoje'}`;

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return cases.filter((item) => {
      const date = item.complaintDate || localDate(item.createdAt);
      if (period.start && date < period.start) return false;
      if (period.end && date > period.end) return false;
      if (statusFilter !== 'Todos' && item.status !== statusFilter) return false;
      return !term || [item.raNumber, item.customerName, item.phone, item.email, item.information, item.assigneeName || ''].some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(term));
    });
  }, [cases, period.end, period.start, search, statusFilter]);

  const reputation = useMemo(() => calculateRaReputation(filtered), [filtered]);
  const score = reputation.finalScore;

  const generatePdf = () => {
    const opened = openA4PrintWindow('Relatório Estratégico RA', buildRaReport(filtered, periodLabel));
    setMessage(opened ? 'Relatório A4 aberto para impressão ou PDF.' : 'Permita pop-ups para abrir o relatório.');
    window.setTimeout(() => setMessage(''), 5000);
  };

  const remove = async (item: RACase) => {
    if (!window.confirm(`Excluir definitivamente o chamado ${item.raNumber}?`)) return;
    setDeletingId(item.id);
    setMessage('');
    try {
      await deleteData(currentUser, 'ra_cases', item.id);
      setMessage('Chamado excluído com sucesso.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível excluir o chamado.');
    } finally {
      setDeletingId('');
      window.setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-[30px]">
        <div className="relative overflow-hidden bg-fotus-blue">
          <img src="/ra-banner.png" alt="Fotus — ao seu lado, em cada projeto" className="block h-24 w-full object-cover object-[35%_center] sm:h-auto" />
        </div>
        <div className="relative z-10 -mt-3 px-3 pb-3 sm:-mt-4 sm:px-5 sm:pb-5">
          <div className="overflow-hidden rounded-[26px] bg-fotus-neutral">
            <div className="fotus-glass grid min-w-0 gap-5 rounded-[inherit] p-5 lg:grid-cols-[1.1fr_1fr] lg:p-6">
              <div className="min-w-0">
                <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fotus-blue text-fotus-neutral"><ArchiveRestore className="h-5 w-5" /></span><div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-fotus-blue">Reputação do período</p><h2 className="text-xl font-extrabold text-fotus-ink">Calculadora Reclame Aqui</h2></div></div>
                <p className="mt-3 max-w-2xl text-xs leading-relaxed text-fotus-ink/80">Nota automática com os pesos oficiais. Entram no cálculo somente reclamações finalizadas e com avaliação completa.</p>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Resposta" value={`${formatRaNumber(reputation.responseRate)}%`} /><Metric label="Solução" value={`${formatRaNumber(reputation.solutionRate)}%`} /><Metric label="Nota do cliente" value={reputation.customerScore === null ? '—' : formatRaNumber(reputation.customerScore)} /><Metric label="Voltaria" value={reputation.wouldDoBusinessRate === null ? '—' : `${formatRaNumber(reputation.wouldDoBusinessRate)}%`} /></div>
                <p className="mt-3 text-[10px] font-bold text-fotus-blue">{reputation.evaluatedCases} caso(s) respondido(s) e avaliado(s) considerado(s) nesta nota.</p>
              </div>
              <ReputationGauge score={score} classification={reputation.classification} />
            </div>
          </div>
        </div>
      </section>

      <section className="fotus-glass rounded-3xl p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex items-center gap-2 px-1 text-[10px] font-extrabold uppercase tracking-wider text-fotus-ink/80"><CalendarRange className="h-4 w-4 text-fotus-blue" />Período</div>
          <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-fotus-neutral/70 p-1.5">{[{ id: 'month', label: 'Mês atual' }, { id: 'custom', label: 'Escolher período' }, { id: 'all', label: 'Todo o histórico' }].map((option) => <button key={option.id} onClick={() => setDatePreset(option.id as DatePreset)} className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-extrabold ${datePreset === option.id ? 'bg-fotus-neutral text-fotus-blue shadow-sm' : 'text-fotus-ink/80'}`}>{option.label}</button>)}</div>
          {datePreset === 'custom' && <div className="flex flex-col gap-2 sm:flex-row"><label className="rounded-xl border border-fotus-blue/20 bg-fotus-neutral px-3 py-2 text-[10px] font-bold text-fotus-ink/80">De <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="ml-2 bg-transparent text-xs text-fotus-ink outline-none" /></label><label className="rounded-xl border border-fotus-blue/20 bg-fotus-neutral px-3 py-2 text-[10px] font-bold text-fotus-ink/80">Até <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="ml-2 bg-transparent text-xs text-fotus-ink outline-none" /></label></div>}
          <span className="ml-auto rounded-full bg-fotus-blue/6 px-3 py-1.5 text-[10px] font-extrabold text-fotus-blue">{filtered.length} chamado(s)</span>
        </div>
      </section>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="fotus-glass-inset flex flex-wrap gap-1.5 rounded-full p-1.5">{statuses.map((item) => <button key={item} onClick={() => setStatusFilter(item)} className={`rounded-full px-3 py-2 text-xs font-bold ${statusFilter === item ? 'bg-fotus-yellow text-fotus-ink shadow-sm' : 'text-fotus-ink hover:bg-fotus-neutral'}`}>{item}</button>)}</div>
        <div className="flex flex-col gap-2 sm:flex-row"><label className="relative min-w-0 sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fotus-ink/80" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="RA, cliente, contato..." className="w-full rounded-xl border border-fotus-blue/20 bg-fotus-neutral py-2.5 pl-9 pr-3 text-xs outline-none focus:border-fotus-blue" /></label><button onClick={generatePdf} className="flex items-center justify-center gap-2 rounded-xl border border-fotus-blue/20 bg-fotus-neutral px-4 py-2.5 text-xs font-extrabold text-fotus-blue"><FileText className="h-4 w-4" />PDF</button><button onClick={() => exportRaExcel(filtered, periodLabel)} className="flex items-center justify-center gap-2 rounded-xl border border-fotus-blue/25 bg-fotus-neutral px-4 py-2.5 text-xs font-extrabold text-fotus-blue"><FileSpreadsheet className="h-4 w-4" />Excel</button><button onClick={onNew} className="flex items-center justify-center gap-2 rounded-xl fotus-action px-4 py-2.5 text-xs font-extrabold"><Plus className="h-4 w-4" />Novo chamado</button></div>
      </div>

      {message && <p className="rounded-2xl border border-fotus-blue/25 bg-fotus-blue/7 px-4 py-3 text-xs font-semibold text-fotus-blue">{message}</p>}

      {filtered.length === 0 ? <div className="fotus-glass rounded-3xl border-dashed px-6 py-14 text-center"><ArchiveRestore className="mx-auto h-11 w-11 text-fotus-ink/50" /><h3 className="mt-3 text-sm font-extrabold text-fotus-ink">Nenhum chamado neste período</h3><p className="mt-1 text-xs text-fotus-ink/80">Altere o período ou registre um novo chamado.</p></div> : <div className="fotus-bento-grid grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => {
        const customerScore = customerScoreValue(item);
        const wouldReturn = wouldDoBusinessValue(item);
        const includedInReputation = isRaCaseIncludedInReputation(item);
        return <article key={item.id} className="fotus-glass-card ra-case-card group relative flex min-w-0 flex-col rounded-3xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className={`fotus-pill ${item.status === 'Finalizado' ? 'ra-pill-success' : item.status === 'Desativado' ? 'fotus-pill-neutral' : item.status === 'Moderado' ? 'fotus-pill-blue' : 'fotus-pill-yellow'}`}>{item.status}</span>
              <span title={includedInReputation ? 'Reclamação finalizada e com avaliação completa' : 'Fora do cálculo da reputação'} className={`fotus-pill ${includedInReputation ? 'ra-pill-success' : 'fotus-pill-yellow'}`}><span className={`h-2 w-2 shrink-0 rounded-full ${includedInReputation ? 'bg-emerald-600' : 'bg-fotus-yellow'}`} />{includedInReputation ? 'Na reputação' : 'Fora da reputação'}</span>
            </div>
            <div className="flex shrink-0 gap-1"><button onClick={() => onEdit(item)} className="rounded-xl p-2 text-fotus-ink/80 hover:bg-fotus-neutral/70 hover:text-fotus-blue" title="Editar" aria-label={`Editar chamado ${item.raNumber}`}><Pencil className="h-4 w-4" /></button><button disabled={deletingId === item.id} onClick={() => void remove(item)} className="rounded-xl p-2 text-fotus-ink/80 hover:bg-fotus-yellow/20 hover:text-fotus-ink disabled:opacity-40" title="Excluir" aria-label={`Excluir chamado ${item.raNumber}`}><Trash2 className="h-4 w-4" /></button></div>
          </div>
          <div className="mt-4 flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-fotus-yellow/20 ring-1 ring-white/70"><ArchiveRestore className="h-5 w-5 text-fotus-blue" /></span><div className="min-w-0"><p className="text-[9px] font-extrabold uppercase tracking-wide text-fotus-ink/80">Reclamação</p><h3 className="break-words text-lg font-extrabold text-fotus-ink">{item.raNumber}</h3></div></div>
          <div className="fotus-glass-inset mt-4 rounded-2xl p-3.5"><strong className="block break-words text-sm text-fotus-ink">{item.customerName}</strong><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-fotus-ink/80">{item.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{item.phone}</span>}{item.email && <span className="flex min-w-0 items-center gap-1 break-all"><Mail className="h-3 w-3 shrink-0" />{item.email}</span>}</div></div>
          <dl className="ra-evaluation my-4">
            <div className="fotus-glass-inset flex min-w-0 flex-col items-start gap-2 rounded-2xl p-3"><dt className="text-[9px] font-bold uppercase leading-relaxed text-fotus-ink/80">Resolvido?</dt><dd className={`fotus-pill ${item.resolved == null ? 'fotus-pill-neutral' : item.resolved ? 'ra-pill-success' : 'ra-pill-danger'}`}>{item.resolved == null ? 'Sem resposta' : item.resolved ? 'Sim' : 'Não'}</dd></div>
            <div className="fotus-glass-inset flex min-w-0 flex-col items-start gap-2 rounded-2xl p-3"><dt className="text-[9px] font-bold uppercase leading-relaxed text-fotus-ink/80">Nota do cliente</dt><dd className="text-lg font-extrabold text-fotus-ink">{customerScore === null ? '—' : formatRaNumber(customerScore)}</dd></div>
            <div className="fotus-glass-inset flex min-w-0 flex-col items-start gap-2 rounded-2xl p-3"><dt className="text-[9px] font-bold uppercase leading-relaxed text-fotus-ink/80">Voltaria</dt><dd className={`fotus-pill ${wouldReturn === null ? 'fotus-pill-neutral' : wouldReturn ? 'ra-pill-success' : 'ra-pill-danger'}`}>{wouldReturn === null ? 'Sem resposta' : wouldReturn ? 'Sim' : 'Não'}</dd></div>
          </dl>
          {item.information && <p className="mb-4 line-clamp-3 text-xs leading-relaxed text-fotus-ink/80">{item.information}</p>}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-fotus-blue/10 pt-4 text-[10px] text-fotus-ink/80"><span>Reclamação: {item.complaintDate ? item.complaintDate.split('-').reverse().join('/') : displayDate(item.createdAt)}</span><span>{item.assigneeName || 'Sem responsável'}</span></div>
        </article>;
      })}</div>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="fotus-glass-inset min-w-0 rounded-2xl p-3"><span className="block text-[9px] font-bold uppercase tracking-wide text-fotus-ink/80">{label}</span><strong className="mt-1 block break-words text-lg tabular-nums text-fotus-ink">{value}</strong></div>;
}

function ReputationGauge({ score, classification }: { score: number | null; classification: string }) {
  const percentage = score === null ? 0 : Math.max(0, Math.min(100, score * 10));
  const Icon = score === null || score >= 7 ? Smile : score >= 5 ? Meh : Frown;
  const tone = score === null ? 'text-fotus-ink/50' : score >= 8 ? 'text-emerald-700' : score >= 7 ? 'text-fotus-blue' : score >= 6 ? 'text-amber-700' : score >= 5 ? 'text-orange-700' : 'text-red-700';
  return <div className="fotus-glass flex min-w-0 flex-col justify-center rounded-3xl p-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-fotus-neutral shadow-sm"><Icon className={`h-8 w-8 ${tone}`} /></span><div className="min-w-0"><span className="text-[9px] font-extrabold uppercase tracking-wider text-fotus-ink/80">Reputação calculada</span><strong className={`block text-lg ${tone}`}>{classification}</strong></div></div>
      <strong className={`shrink-0 text-3xl font-black ${tone}`}>{score === null ? '—' : formatRaNumber(score)}</strong>
    </div>
    <div className="relative mt-7 pt-3"><div className="absolute top-0 h-4 w-0.5 bg-fotus-ink transition-all" style={{ left: `calc(${percentage}% - 1px)` }} /><div className="flex h-3 gap-0.5 overflow-hidden rounded-full"><span className="w-1/2 bg-red-400" /><span className="w-[10%] bg-orange-400" /><span className="w-[10%] bg-fotus-yellow" /><span className="w-[10%] bg-fotus-blue" /><span className="w-1/5 bg-emerald-500" /></div><div className="mt-2 flex justify-between text-[8px] font-bold text-fotus-ink/80"><span>0</span><span>5</span><span>6</span><span>7</span><span>8</span><span>10</span></div></div>
  </div>;
}
