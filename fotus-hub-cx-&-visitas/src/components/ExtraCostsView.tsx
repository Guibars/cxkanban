import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { BarChart3, Building2, CalendarDays, CircleDollarSign, FileText, FileUp, LoaderCircle, Pencil, Plus, Receipt, Search, Sparkles, Tag, UserRound } from 'lucide-react';
import { ExtraCost } from '../types';
import { readExtraCostsSpreadsheet, saveImportedExtraCosts } from '../lib/extraCostImport';
import { buildExtraCostsReport, openA4PrintWindow } from '../lib/reportPrint';
import ExtraCostModal from './ExtraCostModal';

interface ExtraCostsViewProps {
  costs: ExtraCost[];
  currentUser: User;
}

const currency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split('-');
  if (!year || !month) return value;
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(Number(year), Number(month) - 1, 1));
}

function displayDate(date: string) {
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}/${month}/${year}` : date || 'Sem data';
}

function aggregateCost(costs: ExtraCost[], selector: (cost: ExtraCost) => string, limit = 5) {
  const result = new Map<string, { label: string; total: number; count: number }>();
  costs.forEach((cost) => {
    const label = selector(cost).trim();
    if (!label) return;
    const key = label.toLocaleUpperCase('pt-BR');
    const current = result.get(key);
    result.set(key, { label: current?.label || label, total: (current?.total || 0) + cost.totalCost, count: (current?.count || 0) + 1 });
  });
  return [...result.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

export default function ExtraCostsView({ costs, currentUser }: ExtraCostsViewProps) {
  const [search, setSearch] = useState('');
  const [responsibleFilter, setResponsibleFilter] = useState<'Todos' | 'Comercial' | 'Cliente'>('Todos');
  const [monthFilter, setMonthFilter] = useState(currentMonthKey());
  const [showInsights, setShowInsights] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<ExtraCost | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const spreadsheetInput = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return costs.filter((cost) => {
      if (responsibleFilter !== 'Todos' && cost.responsible !== responsibleFilter) return false;
      if (monthFilter !== 'Todos' && cost.monthYear !== monthFilter) return false;
      if (!query) return true;
      return [cost.orderNumber, cost.regional, cost.product, cost.origin, cost.reasonCategory, cost.detailedReason]
        .some((value) => value.toLocaleLowerCase('pt-BR').includes(query));
    });
  }, [costs, monthFilter, responsibleFilter, search]);

  const total = filtered.reduce((sum, cost) => sum + cost.totalCost, 0);
  const average = filtered.length ? total / filtered.length : 0;
  const commercialTotal = filtered.filter((cost) => cost.responsible === 'Comercial').reduce((sum, cost) => sum + cost.totalCost, 0);
  const commercialShare = total ? Math.round((commercialTotal / total) * 100) : 0;

  const monthOptions = useMemo(() => {
    const options = new Set(costs.map((cost) => cost.monthYear).filter(Boolean));
    options.add(currentMonthKey());
    return [...options].sort((a, b) => b.localeCompare(a));
  }, [costs]);

  const insights = useMemo(() => ({
    responsible: aggregateCost(filtered, (cost) => cost.responsible),
    regional: aggregateCost(filtered, (cost) => cost.regional),
    origin: aggregateCost(filtered, (cost) => cost.origin),
    category: aggregateCost(filtered, (cost) => cost.reasonCategory),
  }), [filtered]);

  const months = useMemo(() => {
    const grouped = new Map<string, { total: number; count: number }>();
    filtered.forEach((cost) => {
      if (!cost.monthYear) return;
      const current = grouped.get(cost.monthYear) || { total: 0, count: 0 };
      grouped.set(cost.monthYear, { total: current.total + cost.totalCost, count: current.count + 1 });
    });
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, values]) => ({ month, ...values }));
  }, [filtered]);

  const annualMonths = useMemo(() => {
    const year = new Date().getFullYear();
    const grouped = new Map<string, { total: number; count: number }>();
    costs.forEach((cost) => {
      if (!(cost.monthYear || '').startsWith(`${year}-`)) return;
      const current = grouped.get(cost.monthYear) || { total: 0, count: 0 };
      grouped.set(cost.monthYear, { total: current.total + cost.totalCost, count: current.count + 1 });
    });
    return Array.from({ length: 12 }, (_, index) => {
      const month = `${year}-${String(index + 1).padStart(2, '0')}`;
      return { month, ...(grouped.get(month) || { total: 0, count: 0 }) };
    });
  }, [costs]);
  const highestMonth = Math.max(...months.map((month) => month.total), 1);

  const importSpreadsheet = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsImporting(true);
    setImportError(false);
    setImportMessage('Lendo a base de custos extras...');
    try {
      const imported = await readExtraCostsSpreadsheet(file, currentUser);
      if (!window.confirm(`Encontramos ${imported.length} custos extras na planilha. Deseja enviá-los ao Firestore?`)) {
        setImportMessage('Importação cancelada. Nenhum registro foi enviado.');
        return;
      }
      const saved = await saveImportedExtraCosts(imported, (current, amount) => setImportMessage(`Importando ${current} de ${amount} registros...`));
      setImportMessage(`${saved} custos extras foram sincronizados com sucesso.`);
    } catch (error) {
      console.error('Erro ao importar custos extras:', error);
      setImportError(true);
      setImportMessage(error instanceof Error ? error.message : 'Não foi possível importar essa planilha.');
    } finally {
      setIsImporting(false);
    }
  };

  const openNew = () => {
    setEditingCost(null);
    setIsModalOpen(true);
  };

  const openEdit = (cost: ExtraCost) => {
    setEditingCost(cost);
    setIsModalOpen(true);
  };

  const generateReport = () => {
    const opened = openA4PrintWindow('Relatório de Custos Extras', buildExtraCostsReport(filtered));
    setReportMessage(opened ? 'Relatório A4 aberto para impressão ou salvamento em PDF.' : 'Permita pop-ups para abrir o relatório A4.');
    window.setTimeout(() => setReportMessage(''), 6000);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Total gasto" value={currency(total)} icon={CircleDollarSign} tone="bg-red-50 text-red-700" />
        <Metric label="Ocorrências no filtro" value={filtered.length.toLocaleString('pt-BR')} icon={Receipt} tone="bg-blue-50 text-blue-700" />
        <Metric label="Custo médio" value={currency(average)} icon={BarChart3} tone="bg-amber-50 text-amber-700" />
        <Metric label="Responsabilidade comercial" value={`${commercialShare}%`} icon={UserRound} tone="bg-violet-50 text-violet-700" />
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-1.5 rounded-2xl border border-white/90 bg-white/60 p-1.5">
          {(['Todos', 'Comercial', 'Cliente'] as const).map((item) => <button key={item} onClick={() => setResponsibleFilter(item)} className={`rounded-xl px-4 py-2 text-xs font-bold ${responsibleFilter === item ? 'bg-[#385041] text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}>{item}</button>)}
        </div>
        <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-2xl border border-white/90 bg-white/60 p-1.5">
          <button onClick={() => setMonthFilter('Todos')} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${monthFilter === 'Todos' ? 'bg-[#123e5b] text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}>Todos</button>
          {monthOptions.map((month) => <button key={month} onClick={() => setMonthFilter(month)} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold capitalize ${monthFilter === month ? 'bg-[#123e5b] text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}>{month === currentMonthKey() ? 'Mês atual' : monthLabel(month)}</button>)}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 flex-1 sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pedido, regional, produto, motivo..." className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#385041]" /></label>
          <button onClick={() => setShowInsights((current) => !current)} className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-extrabold ${showInsights ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-[#385041]/20 bg-white text-[#385041]'}`}><Sparkles className="h-4 w-4" />Insights</button>
          <button onClick={generateReport} className="flex items-center justify-center gap-2 rounded-xl border border-[#123e5b]/20 bg-white px-4 py-2.5 text-xs font-extrabold text-[#123e5b] transition-all hover:bg-[#eff5f8]"><FileText className="h-4 w-4" />Gerar relatório PDF</button>
          <input ref={spreadsheetInput} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importSpreadsheet} className="hidden" />
          <button disabled={isImporting} onClick={() => spreadsheetInput.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-[#385041]/20 bg-white px-4 py-2.5 text-xs font-extrabold text-[#385041] disabled:opacity-60">{isImporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}{isImporting ? 'Importando...' : 'Importar planilha'}</button>
          <button onClick={openNew} className="flex items-center justify-center gap-2 rounded-xl bg-[#385041] px-4 py-2.5 text-xs font-extrabold text-white"><Plus className="h-4 w-4" />Novo custo</button>
        </div>
      </div>

      {importMessage && <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold ${importError ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{isImporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}<span>{importMessage}</span></div>}
      {reportMessage && <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800"><FileText className="h-4 w-4 shrink-0" /><span>{reportMessage}</span></div>}

      {showInsights && (
        <section className="rounded-3xl border border-[#385041]/10 bg-gradient-to-br from-[#eef5eb] via-white to-amber-50/50 p-5 shadow-sm sm:p-6">
          <div className="mb-5"><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#385041]">Painel consolidado</p><h2 className="mt-1 text-xl font-extrabold text-gray-950">Onde os custos extras estão concentrados</h2><p className="mt-1 text-xs text-gray-500">Indicadores atualizados automaticamente com os registros do Firestore.</p></div>
          {costs.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-8 text-center text-sm text-gray-500">Importe a planilha ou cadastre o primeiro custo para visualizar os insights.</div> : (
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2">
                <CostRanking title="Custo por regional" icon={Building2} items={insights.regional} grandTotal={total} />
                <CostRanking title="Custo por origem" icon={Tag} items={insights.origin} grandTotal={total} />
                <CostRanking title="Custo por responsável" icon={UserRound} items={insights.responsible} grandTotal={total} />
                <CostRanking title="Categorias do motivo" icon={BarChart3} items={insights.category} grandTotal={total} />
              </div>
              <div className="rounded-2xl border border-white bg-white/85 p-4 shadow-sm">
                <h3 className="flex items-center gap-2 text-xs font-extrabold text-gray-800"><CalendarDays className="h-4 w-4 text-[#385041]" />Evolução mensal</h3>
                <div className="mt-5 flex h-52 items-end gap-2 border-b border-gray-200 px-1">
                  {months.map((month) => <div key={month.month} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${month.month}: ${currency(month.total)} em ${month.count} registros`}><span className="hidden text-[8px] font-bold text-gray-500 2xl:block">{currency(month.total)}</span><div className="w-full min-w-2 rounded-t-lg bg-gradient-to-t from-[#385041] to-[#7da08a]" style={{ height: `${Math.max(4, Math.round((month.total / highestMonth) * 170))}px` }} /><span className="text-[8px] font-bold text-gray-500">{month.month.slice(5)}/{month.month.slice(2, 4)}</span></div>)}
                  {!months.length && <p className="m-auto text-xs text-gray-400">Sem datas para montar a evolução</p>}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center"><CostType label="Produto" value={filtered.reduce((sum, cost) => sum + cost.productCost, 0)} /><CostType label="Logística" value={filtered.reduce((sum, cost) => sum + cost.logisticsCost, 0)} /><CostType label="Impostos" value={filtered.reduce((sum, cost) => sum + cost.taxCost, 0)} /></div>
              </div>
            </div>
          )}
          <AnnualCostChart months={annualMonths} year={new Date().getFullYear()} />
        </section>
      )}

      {costs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white/60 px-6 py-16 text-center"><CircleDollarSign className="mx-auto h-12 w-12 text-gray-300" /><h3 className="mt-4 text-base font-extrabold text-gray-800">Nenhum custo extra cadastrado</h3><p className="mx-auto mt-1 max-w-lg text-xs text-gray-500">Importe o histórico da planilha ou registre o primeiro gasto não previsto.</p><div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row"><button onClick={() => spreadsheetInput.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-[#385041]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#385041]"><FileUp className="h-4 w-4" />Importar histórico</button><button onClick={openNew} className="rounded-xl bg-[#385041] px-4 py-2.5 text-xs font-bold text-white">Cadastrar primeiro custo</button></div></div>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-white/90 bg-white/80 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 className="text-sm font-extrabold text-gray-900">Registros de custos extras</h2><p className="text-[11px] text-gray-500">{filtered.length} de {costs.length} registros exibidos · {monthFilter === 'Todos' ? 'todos os meses' : monthFilter === currentMonthKey() ? 'mês atual' : monthLabel(monthFilter)}</p></div><strong className="text-sm text-[#385041]">{currency(filtered.reduce((sum, cost) => sum + cost.totalCost, 0))}</strong></div>
          <div className="divide-y divide-gray-100">{filtered.map((cost) => (
            <article key={cost.id} className={`grid gap-3 px-5 py-4 transition-colors hover:bg-gray-50/70 lg:grid-cols-[130px_1.1fr_0.9fr_0.8fr_150px_40px] lg:items-center ${cost.totalCost > 1000 ? 'bg-orange-50/45' : ''}`}>
              <div><span className="text-[9px] font-extrabold uppercase text-gray-400">{displayDate(cost.date)}</span><strong className="mt-0.5 block text-xs text-gray-900">#{cost.orderNumber}</strong></div>
              <div className="min-w-0"><strong className="block truncate text-xs text-gray-900">{cost.product} {cost.quantity ? `×${cost.quantity}` : ''}</strong><span className="block truncate text-[10px] text-gray-500">{cost.detailedReason}</span></div>
              <div><span className="block text-[10px] text-gray-400">Regional</span><strong className="text-xs text-gray-700">{cost.regional}</strong></div>
              <div><span className="block text-[10px] text-gray-400">{cost.origin}</span><span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold ${cost.responsible === 'Comercial' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>{cost.responsible}</span></div>
              <div className="lg:text-right"><span className="block text-[10px] text-gray-400">Custo total</span><strong className="text-sm text-gray-950">{currency(cost.totalCost)}</strong></div>
              <button onClick={() => openEdit(cost)} className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-700" title="Editar"><Pencil className="h-4 w-4" /></button>
            </article>
          ))}{filtered.length === 0 && <p className="px-5 py-10 text-center text-xs text-gray-400">Nenhum registro encontrado com esses filtros.</p>}</div>
        </section>
      )}

      <ExtraCostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} cost={editingCost} currentUser={currentUser} />
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Receipt; tone: string }) {
  return <div className="rounded-2xl border border-white/90 bg-white/80 p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">{label}</p><p className="mt-1 truncate text-xl font-extrabold text-gray-950 sm:text-2xl">{value}</p></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span></div></div>;
}

function CostRanking({ title, icon: Icon, items, grandTotal }: { title: string; icon: typeof Tag; items: Array<{ label: string; total: number; count: number }>; grandTotal: number }) {
  return <div className="rounded-2xl border border-white bg-white/85 p-4 shadow-sm"><h3 className="flex items-center gap-2 text-xs font-extrabold text-gray-800"><Icon className="h-4 w-4 text-[#385041]" />{title}</h3><div className="mt-4 space-y-3">{items.map((item, index) => <div key={item.label}><div className="mb-1 flex items-center justify-between gap-2 text-[11px]"><span className="truncate font-semibold text-gray-600">{index + 1}. {item.label} <small className="text-gray-400">({item.count})</small></span><strong className="text-gray-900">{currency(item.total)}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#6f8f79]" style={{ width: `${Math.max(5, Math.round((item.total / grandTotal) * 100))}%` }} /></div></div>)}{!items.length && <p className="text-xs text-gray-400">Sem dados suficientes</p>}</div></div>;
}

function CostType({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-gray-50 p-2"><span className="block text-[9px] font-bold text-gray-400">{label}</span><strong className="mt-0.5 block truncate text-[10px] text-gray-800">{currency(value)}</strong></div>;
}

function AnnualCostChart({ months, year }: { months: Array<{ month: string; total: number; count: number }>; year: number }) {
  const max = Math.max(...months.map((month) => month.total), 1);
  return (
    <div className="mt-5 rounded-2xl border border-white bg-white/85 p-4 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="flex items-center gap-2 text-xs font-extrabold text-gray-800"><CalendarDays className="h-4 w-4 text-[#123e5b]" />Visão anual de custos · {year}</h3><p className="mt-1 text-[11px] text-gray-500">Comparativo mensal de todos os registros do ano. Passe o cursor sobre uma coluna para ver os detalhes.</p></div><span className="rounded-full bg-[#eef5eb] px-3 py-1 text-[10px] font-extrabold text-[#385041]">12 meses</span></div>
      <div className="mt-5 flex h-56 items-end gap-1 border-b border-gray-200 px-1 sm:gap-2">
        {months.map((month) => {
          const [, monthNumber] = month.month.split('-');
          const label = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(year, Number(monthNumber) - 1, 1)).replace('.', '');
          return <div key={month.month} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${monthLabel(month.month)}: ${currency(month.total)} em ${month.count} registro(s)`}><span className="hidden rounded bg-gray-900 px-1.5 py-1 text-[9px] font-bold text-white group-hover:block">{currency(month.total)}</span><div className={`w-full min-w-1.5 rounded-t-lg transition-all group-hover:brightness-110 ${month.total ? 'bg-gradient-to-t from-[#123e5b] to-[#6f9bb4]' : 'bg-gray-100'}`} style={{ height: `${Math.max(month.total ? 5 : 2, Math.round((month.total / max) * 175))}px` }} /><span className="text-[9px] font-bold uppercase text-gray-500">{label}</span></div>;
        })}
      </div>
    </div>
  );
}
