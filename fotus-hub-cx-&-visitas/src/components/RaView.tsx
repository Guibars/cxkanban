import { useMemo, useState } from 'react';
import { ArchiveRestore, CalendarRange, FileSpreadsheet, FileText, Frown, Mail, Meh, Pencil, Phone, Plus, Search, Smile, Trash2 } from 'lucide-react';
import type { CurrentUser } from '../lib/currentUser';
import { deleteData } from '../lib/dataMutations';
import { exportRaExcel } from '../lib/excelExport';
import { calculateRaReputation, customerScoreValue, wouldDoBusinessValue } from '../lib/raReputation';
import { buildRaReport, openA4PrintWindow } from '../lib/reportPrint';
import type { CaseStatus, RACase } from '../types';

interface RaViewProps {
  cases: RACase[];
  currentUser: CurrentUser;
  onNew: () => void;
  onEdit: (item: RACase) => void;
}

type DatePreset = 'month' | 'custom' | 'all';
const statuses: Array<'Todos' | CaseStatus> = ['Todos', 'Aberto', 'Em Andamento', 'Resolvido', 'Cancelado'];

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
  const [statusFilter, setStatusFilter] = useState<'Todos' | CaseStatus>('Todos');
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
      const date = localDate(item.createdAt);
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
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-white bg-white/80 shadow-sm">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.1fr_1fr] lg:p-6">
          <div>
            <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#385041] text-white"><ArchiveRestore className="h-5 w-5" /></span><div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#385041]">Reputação do período</p><h2 className="text-xl font-extrabold text-gray-950">Calculadora Reclame Aqui</h2></div></div>
            <p className="mt-3 max-w-2xl text-xs leading-relaxed text-gray-500">Nota automática com os pesos oficiais: resposta 20%, solução 30%, nota do cliente 30% e voltaria a fazer negócio 20%.</p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Resposta" value={`${reputation.responseRate.toFixed(0)}%`} /><Metric label="Solução" value={`${reputation.solutionRate.toFixed(0)}%`} /><Metric label="Nota do cliente" value={reputation.customerScore === null ? '—' : reputation.customerScore.toFixed(1)} /><Metric label="Voltaria" value={reputation.wouldDoBusinessRate === null ? '—' : `${reputation.wouldDoBusinessRate.toFixed(0)}%`} /></div>
          </div>
          <ReputationGauge score={score} classification={reputation.classification} />
        </div>
      </section>

      <section className="rounded-2xl border border-white bg-white/75 p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex items-center gap-2 px-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-500"><CalendarRange className="h-4 w-4 text-[#385041]" />Período</div>
          <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-gray-100 p-1.5">{[{ id: 'month', label: 'Mês atual' }, { id: 'custom', label: 'Escolher período' }, { id: 'all', label: 'Todo o histórico' }].map((option) => <button key={option.id} onClick={() => setDatePreset(option.id as DatePreset)} className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-extrabold ${datePreset === option.id ? 'bg-white text-[#385041] shadow-sm' : 'text-gray-500'}`}>{option.label}</button>)}</div>
          {datePreset === 'custom' && <div className="flex flex-col gap-2 sm:flex-row"><label className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[10px] font-bold text-gray-500">De <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="ml-2 bg-transparent text-xs text-gray-800 outline-none" /></label><label className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[10px] font-bold text-gray-500">Até <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="ml-2 bg-transparent text-xs text-gray-800 outline-none" /></label></div>}
          <span className="ml-auto rounded-full bg-[#eef5eb] px-3 py-1.5 text-[10px] font-extrabold text-[#385041]">{filtered.length} chamado(s)</span>
        </div>
      </section>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white bg-white/60 p-1.5">{statuses.map((item) => <button key={item} onClick={() => setStatusFilter(item)} className={`rounded-xl px-3 py-2 text-xs font-bold ${statusFilter === item ? 'bg-[#385041] text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}>{item}</button>)}</div>
        <div className="flex flex-col gap-2 sm:flex-row"><label className="relative min-w-0 sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="RA, cliente, contato..." className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#385041]" /></label><button onClick={generatePdf} className="flex items-center justify-center gap-2 rounded-xl border border-[#123e5b]/20 bg-white px-4 py-2.5 text-xs font-extrabold text-[#123e5b]"><FileText className="h-4 w-4" />PDF</button><button onClick={() => exportRaExcel(filtered, periodLabel)} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-extrabold text-emerald-700"><FileSpreadsheet className="h-4 w-4" />Excel</button><button onClick={onNew} className="flex items-center justify-center gap-2 rounded-xl bg-[#385041] px-4 py-2.5 text-xs font-extrabold text-white"><Plus className="h-4 w-4" />Novo chamado</button></div>
      </div>

      {message && <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800">{message}</p>}

      {filtered.length === 0 ? <div className="rounded-3xl border border-dashed border-gray-300 bg-white/60 px-6 py-14 text-center"><ArchiveRestore className="mx-auto h-11 w-11 text-gray-300" /><h3 className="mt-3 text-sm font-extrabold text-gray-800">Nenhum chamado neste período</h3><p className="mt-1 text-xs text-gray-500">Altere o período ou registre um novo chamado.</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => {
        const customerScore = customerScoreValue(item);
        const wouldReturn = wouldDoBusinessValue(item);
        return <article key={item.id} className="group rounded-3xl border border-white bg-white/85 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-extrabold ${item.status === 'Resolvido' ? 'bg-emerald-50 text-emerald-700' : item.status === 'Cancelado' ? 'bg-red-50 text-red-700' : item.status === 'Em Andamento' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{item.status}</span><p className="mt-3 text-[9px] font-extrabold uppercase tracking-wide text-gray-400">Reclamação</p><h3 className="truncate text-lg font-extrabold text-gray-950">{item.raNumber}</h3></div><div className="flex gap-1"><button onClick={() => onEdit(item)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-[#385041]" title="Editar"><Pencil className="h-4 w-4" /></button><button disabled={deletingId === item.id} onClick={() => void remove(item)} className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" title="Excluir"><Trash2 className="h-4 w-4" /></button></div></div>
          <div className="mt-4 rounded-2xl bg-gray-50 p-3"><strong className="block truncate text-sm text-gray-900">{item.customerName}</strong><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500">{item.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{item.phone}</span>}{item.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{item.email}</span>}</div></div>
          <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl border border-gray-100 p-3"><span className="text-[9px] font-bold uppercase text-gray-400">Nota do cliente</span><strong className="mt-1 block text-lg text-[#385041]">{customerScore === null ? '—' : customerScore.toFixed(1)}</strong></div><div className="rounded-xl border border-gray-100 p-3"><span className="text-[9px] font-bold uppercase text-gray-400">Voltaria</span><strong className={`mt-1 block text-sm ${wouldReturn === null ? 'text-gray-400' : wouldReturn ? 'text-emerald-600' : 'text-red-600'}`}>{wouldReturn === null ? 'Sem resposta' : wouldReturn ? 'Sim' : 'Não'}</strong></div></div>
          {item.information && <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-gray-500">{item.information}</p>}
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-[10px] text-gray-400"><span>{displayDate(item.createdAt)}</span><span>{item.assigneeName || 'Sem responsável'}</span></div>
        </article>;
      })}</div>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-gray-50 p-3"><span className="block text-[9px] font-bold uppercase tracking-wide text-gray-400">{label}</span><strong className="mt-1 block text-lg text-gray-900">{value}</strong></div>;
}

function ReputationGauge({ score, classification }: { score: number | null; classification: string }) {
  const percentage = score === null ? 0 : Math.max(0, Math.min(100, score * 10));
  const Icon = score === null || score >= 7 ? Smile : score >= 5 ? Meh : Frown;
  const tone = score === null ? 'text-gray-300' : score >= 8 ? 'text-emerald-500' : score >= 7 ? 'text-blue-500' : score >= 6 ? 'text-amber-500' : 'text-red-500';
  return <div className="flex flex-col justify-center rounded-3xl bg-[#f4f7f6] p-5"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm"><Icon className={`h-8 w-8 ${tone}`} /></span><div><span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">Reputação calculada</span><strong className="block text-lg text-gray-950">{classification}</strong></div></div><strong className="text-3xl font-black text-[#385041]">{score === null ? '—' : score.toFixed(1)}</strong></div><div className="relative mt-7 pt-3"><div className="absolute top-0 h-4 w-0.5 bg-gray-800 transition-all" style={{ left: `calc(${percentage}% - 1px)` }} /><div className="flex h-3 overflow-hidden rounded-full"><span className="w-1/2 bg-red-400" /><span className="w-[10%] bg-orange-400" /><span className="w-[10%] bg-amber-400" /><span className="w-[10%] bg-blue-500" /><span className="w-1/5 bg-emerald-500" /></div><div className="mt-2 flex justify-between text-[8px] font-bold text-gray-400"><span>0</span><span>5</span><span>6</span><span>7</span><span>8</span><span>10</span></div></div></div>;
}
