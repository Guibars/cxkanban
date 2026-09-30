import { ChangeEvent, useMemo, useRef, useState } from 'react';
import type { CurrentUser } from '../lib/currentUser';
import { BarChart3, Building2, CalendarDays, CircleDollarSign, FileSpreadsheet, FileText, FileUp, LoaderCircle, Pencil, Plus, Receipt, Search, Sparkles, Tag, Trash2, UserRound, X } from 'lucide-react';
import { ExtraCost } from '../types';
import { readExtraCostsSpreadsheet, saveImportedExtraCosts } from '../lib/extraCostImport';
import { buildExtraCostsReport, openA4PrintWindow } from '../lib/reportPrint';
import { exportExtraCostsExcel } from '../lib/excelExport';
import { deleteData } from '../lib/dataMutations';
import ExtraCostModal from './ExtraCostModal';
import PillBarChart from './PillBarChart';

interface ExtraCostsViewProps {
  costs: ExtraCost[];
  currentUser: CurrentUser;
  canDeleteCosts: boolean;
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

export default function ExtraCostsView({ costs, currentUser, canDeleteCosts }: ExtraCostsViewProps) {
  const [search, setSearch] = useState('');
  const [responsibleFilter, setResponsibleFilter] = useState<'Todos' | 'Comercial' | 'Cliente'>('Todos');
  const [monthFilter, setMonthFilter] = useState(currentMonthKey());
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showInsights, setShowInsights] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<ExtraCost | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');
  const [deleteFailed, setDeleteFailed] = useState(false);
  const spreadsheetInput = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return costs.filter((cost) => {
      if (responsibleFilter !== 'Todos' && cost.responsible !== responsibleFilter) return false;
      if (monthFilter === 'Personalizado') {
        if (customStart && cost.date < customStart) return false;
        if (customEnd && cost.date > customEnd) return false;
      } else if (monthFilter !== 'Todos' && cost.monthYear !== monthFilter) return false;
      if (!query) return true;
      return [cost.orderNumber, cost.regional, cost.product, cost.origin, cost.reasonCategory, cost.detailedReason]
        .some((value) => value.toLocaleLowerCase('pt-BR').includes(query));
    });
  }, [costs, customEnd, customStart, monthFilter, responsibleFilter, search]);

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

  const periodLabel = monthFilter === 'Todos'
    ? 'Todo o histórico'
    : monthFilter === 'Personalizado'
      ? `${customStart ? displayDate(customStart) : 'início'} a ${customEnd ? displayDate(customEnd) : 'hoje'}`
      : monthFilter === currentMonthKey() ? 'Mês atual' : monthLabel(monthFilter);

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
  const importSpreadsheet = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsImporting(true);
    setImportError(false);
    setImportMessage('Lendo a base de custos extras...');
    try {
      const imported = await readExtraCostsSpreadsheet(file, currentUser);
      if (!window.confirm(`Encontramos ${imported.length} custos extras na planilha. Deseja enviá-los à base central?`)) {
        setImportMessage('Importação cancelada. Nenhum registro foi enviado.');
        return;
      }
      const saved = await saveImportedExtraCosts(imported, currentUser, (current, amount) => setImportMessage(`Importando ${current} de ${amount} registros...`));
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

  const removeCost = async (cost: ExtraCost) => {
    if (!canDeleteCosts || deletingId) return;
    if (!window.confirm(`Excluir definitivamente o custo do pedido #${cost.orderNumber}, de ${displayDate(cost.date)}, no valor de ${currency(cost.totalCost)}?`)) return;
    setDeletingId(cost.id);
    setDeleteMessage('');
    setDeleteFailed(false);
    try {
      await deleteData(currentUser, 'extra_costs', cost.id);
      setDeleteMessage(`Custo do pedido #${cost.orderNumber} excluído com sucesso.`);
      if (editingCost?.id === cost.id) { setEditingCost(null); setIsModalOpen(false); }
    } catch (error) {
      setDeleteFailed(true);
      setDeleteMessage(error instanceof Error ? error.message : 'Não foi possível excluir o custo. Tente novamente.');
    } finally {
      setDeletingId('');
    }
  };

  const generateReport = () => {
    const opened = openA4PrintWindow('Relatório de Custos Extras', buildExtraCostsReport(filtered));
    setReportMessage(opened ? 'Relatório A4 aberto para impressão ou salvamento em PDF.' : 'Permita pop-ups para abrir o relatório A4.');
    window.setTimeout(() => setReportMessage(''), 6000);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Total gasto" value={currency(total)} icon={CircleDollarSign} tone="bg-fotus-yellow/7 text-fotus-ink" />
        <Metric label="Ocorrências no filtro" value={filtered.length.toLocaleString('pt-BR')} icon={Receipt} tone="bg-fotus-blue/7 text-fotus-blue" />
        <Metric label="Custo médio" value={currency(average)} icon={BarChart3} tone="bg-fotus-yellow/7 text-fotus-ink" />
        <Metric label="Responsabilidade comercial" value={`${commercialShare}%`} icon={UserRound} tone="bg-fotus-blue/7 text-fotus-blue" />
      </div>

      <div className="fotus-glass flex flex-col gap-3 rounded-3xl p-4 sm:p-5">
        <div className="flex gap-1.5 rounded-2xl border border-fotus-neutral/90 bg-fotus-neutral/60 p-1.5">
          {(['Todos', 'Comercial', 'Cliente'] as const).map((item) => <button key={item} onClick={() => setResponsibleFilter(item)} className={`rounded-xl px-4 py-2 text-xs font-bold ${responsibleFilter === item ? 'bg-fotus-blue text-fotus-neutral shadow-sm' : 'text-fotus-ink hover:bg-fotus-neutral'}`}>{item}</button>)}
        </div>
        <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-2xl border border-fotus-neutral/90 bg-fotus-neutral/60 p-1.5">
          <button onClick={() => setMonthFilter('Todos')} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${monthFilter === 'Todos' ? 'bg-fotus-blue text-fotus-neutral shadow-sm' : 'text-fotus-ink hover:bg-fotus-neutral'}`}>Todos</button>
          <button onClick={() => setMonthFilter('Personalizado')} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${monthFilter === 'Personalizado' ? 'bg-fotus-blue text-fotus-neutral shadow-sm' : 'text-fotus-ink hover:bg-fotus-neutral'}`}>Escolher período</button>
          {monthOptions.map((month) => <button key={month} onClick={() => setMonthFilter(month)} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold capitalize ${monthFilter === month ? 'bg-fotus-blue text-fotus-neutral shadow-sm' : 'text-fotus-ink hover:bg-fotus-neutral'}`}>{month === currentMonthKey() ? 'Mês atual' : monthLabel(month)}</button>)}
        </div>
        {monthFilter === 'Personalizado' && <div className="flex flex-col gap-2 sm:flex-row"><label className="rounded-xl border border-fotus-blue/20 bg-fotus-neutral px-3 py-2 text-[10px] font-bold text-fotus-ink/80">De <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="ml-2 bg-transparent text-xs text-fotus-ink outline-none" /></label><label className="rounded-xl border border-fotus-blue/20 bg-fotus-neutral px-3 py-2 text-[10px] font-bold text-fotus-ink/80">Até <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="ml-2 bg-transparent text-xs text-fotus-ink outline-none" /></label></div>}
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 basis-full sm:min-w-64 sm:flex-1 sm:basis-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fotus-ink/80" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pedido, regional, produto, motivo..." className="w-full rounded-xl border border-fotus-blue/20 bg-fotus-neutral py-2.5 pl-9 pr-3 text-xs outline-none focus:border-fotus-blue" /></label>
          <button onClick={() => setShowInsights((current) => !current)} className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-extrabold ${showInsights ? 'border-fotus-yellow/45 bg-fotus-yellow/7 text-fotus-ink' : 'border-fotus-blue/20 bg-fotus-neutral text-fotus-blue'}`}><Sparkles className="h-4 w-4" />Insights</button>
          <button onClick={generateReport} className="flex items-center justify-center gap-2 rounded-xl border border-fotus-blue/20 bg-fotus-neutral px-4 py-2.5 text-xs font-extrabold text-fotus-blue transition-all hover:bg-fotus-blue/6"><FileText className="h-4 w-4" />Gerar relatório PDF</button>
          <button onClick={() => exportExtraCostsExcel(filtered, periodLabel)} className="flex items-center justify-center gap-2 rounded-xl border border-fotus-blue/25 bg-fotus-neutral px-4 py-2.5 text-xs font-extrabold text-fotus-blue transition-all hover:bg-fotus-blue/7"><FileSpreadsheet className="h-4 w-4" />Exportar Excel</button>
          <input ref={spreadsheetInput} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importSpreadsheet} className="hidden" />
          <button disabled={isImporting} onClick={() => spreadsheetInput.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-fotus-blue/20 bg-fotus-neutral px-4 py-2.5 text-xs font-extrabold text-fotus-blue disabled:opacity-60">{isImporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}{isImporting ? 'Importando...' : 'Importar planilha'}</button>
          <button onClick={openNew} className="flex items-center justify-center gap-2 rounded-xl bg-fotus-blue px-4 py-2.5 text-xs font-extrabold text-fotus-neutral"><Plus className="h-4 w-4" />Novo custo</button>
        </div>
      </div>

      {importMessage && <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold ${importError ? 'border-fotus-yellow/25 bg-fotus-yellow/7 text-fotus-ink' : 'border-fotus-blue/25 bg-fotus-blue/7 text-fotus-blue'}`}>{isImporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}<span>{importMessage}</span></div>}
      {reportMessage && <div className="flex items-center gap-3 rounded-2xl border border-fotus-blue/25 bg-fotus-blue/7 px-4 py-3 text-xs font-semibold text-fotus-blue"><FileText className="h-4 w-4 shrink-0" /><span>{reportMessage}</span></div>}
      {deleteMessage && <div role={deleteFailed ? 'alert' : 'status'} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold ${deleteFailed ? 'border-fotus-yellow/45 bg-fotus-yellow/7 text-fotus-ink' : 'border-fotus-blue/25 bg-fotus-blue/7 text-fotus-blue'}`}><Trash2 className="h-4 w-4 shrink-0" /><span className="flex-1">{deleteMessage}</span><button type="button" onClick={() => setDeleteMessage('')} aria-label="Fechar aviso" className="rounded-lg p-1.5 hover:bg-fotus-neutral/60"><X className="h-4 w-4" /></button></div>}

      {showInsights && (
        <section className="rounded-3xl border border-fotus-blue/10 bg-gradient-to-br from-fotus-blue/6 via-fotus-neutral to-fotus-yellow/4 p-5 shadow-sm sm:p-6">
          <div className="mb-5"><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-fotus-blue">Painel consolidado</p><h2 className="mt-1 text-xl font-extrabold text-fotus-ink">Onde os custos extras estão concentrados</h2><p className="mt-1 text-xs text-fotus-ink/80">Indicadores atualizados automaticamente com os registros do Neon.</p></div>
          {costs.length === 0 ? <div className="rounded-2xl border border-dashed border-fotus-blue/20 bg-fotus-neutral/60 p-8 text-center text-sm text-fotus-ink/80">Importe a planilha ou cadastre o primeiro custo para visualizar os insights.</div> : (
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2">
                <CostRanking title="Custo por regional" icon={Building2} items={insights.regional} grandTotal={total} />
                <CostRanking title="Custo por origem" icon={Tag} items={insights.origin} grandTotal={total} />
                <CostRanking title="Custo por responsável" icon={UserRound} items={insights.responsible} grandTotal={total} />
                <CostRanking title="Categorias do motivo" icon={BarChart3} items={insights.category} grandTotal={total} />
              </div>
              <div className="rounded-2xl border border-fotus-neutral bg-fotus-neutral/85 p-4 shadow-sm">
                <h3 className="flex items-center gap-2 text-xs font-extrabold text-fotus-ink"><CalendarDays className="h-4 w-4 text-fotus-blue" />Resumo do período selecionado</h3>
                <div className="mt-4 space-y-2"><SummaryRow label="Período" value={periodLabel} /><SummaryRow label="Registros" value={filtered.length.toLocaleString('pt-BR')} /><SummaryRow label="Total" value={currency(total)} /><SummaryRow label="Custo médio" value={currency(average)} /></div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center"><CostType label="Produto" value={filtered.reduce((sum, cost) => sum + cost.productCost, 0)} /><CostType label="Logística" value={filtered.reduce((sum, cost) => sum + cost.logisticsCost, 0)} /><CostType label="Impostos" value={filtered.reduce((sum, cost) => sum + cost.taxCost, 0)} /></div>
              </div>
            </div>
          )}
          <AnnualCostChart months={annualMonths} year={new Date().getFullYear()} />
        </section>
      )}

      {costs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-fotus-blue/20 bg-fotus-neutral/60 px-6 py-16 text-center"><CircleDollarSign className="mx-auto h-12 w-12 text-fotus-ink/50" /><h3 className="mt-4 text-base font-extrabold text-fotus-ink">Nenhum custo extra cadastrado</h3><p className="mx-auto mt-1 max-w-lg text-xs text-fotus-ink/80">Importe o histórico da planilha ou registre o primeiro gasto não previsto.</p><div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row"><button onClick={() => spreadsheetInput.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-fotus-blue/20 bg-fotus-neutral px-4 py-2.5 text-xs font-bold text-fotus-blue"><FileUp className="h-4 w-4" />Importar histórico</button><button onClick={openNew} className="rounded-xl bg-fotus-blue px-4 py-2.5 text-xs font-bold text-fotus-neutral">Cadastrar primeiro custo</button></div></div>
      ) : (
        <section className="space-y-4">
          <div className="fotus-glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4">
            <div><h2 className="text-sm font-extrabold text-fotus-blue">Registros de custos extras</h2><p className="mt-1 text-[11px] text-fotus-ink/80">{filtered.length} de {costs.length} registros exibidos · {periodLabel}</p></div>
            <span className="fotus-pill fotus-pill-blue">{currency(total)} no período</span>
          </div>
          <div className="grid items-stretch gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((cost) => (
              <article key={cost.id} className="fotus-glass-card flex min-w-0 flex-col rounded-3xl p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="fotus-pill fotus-pill-neutral"><CalendarDays className="h-3.5 w-3.5" />{displayDate(cost.date)}</span>
                  <span className={`fotus-pill ${cost.responsible === 'Comercial' ? 'fotus-pill-blue' : 'fotus-pill-yellow'}`}><UserRound className="h-3.5 w-3.5" />{cost.responsible}</span>
                </div>
                <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                  <div><p className="text-[10px] font-bold uppercase tracking-wider text-fotus-ink/80">Pedido</p><h3 className="mt-1 text-xl font-extrabold text-fotus-blue">#{cost.orderNumber}</h3></div>
                  <div className="text-right"><span className="text-[10px] font-bold uppercase tracking-wider text-fotus-ink/80">Custo total</span><strong className="mt-1 block text-xl font-extrabold tabular-nums text-fotus-ink">{currency(cost.totalCost)}</strong></div>
                </div>
                <div className="mt-5 rounded-2xl border border-fotus-blue/10 bg-fotus-neutral/40 p-4"><strong className="text-sm leading-relaxed text-fotus-ink">{cost.product}</strong>{cost.quantity > 0 && <span className="fotus-pill fotus-pill-neutral ml-2">×{cost.quantity}</span>}<div className="mt-3 flex flex-wrap gap-2"><span className="fotus-pill fotus-pill-blue"><Building2 className="h-3 w-3 shrink-0" />{cost.regional || 'Regional não informada'}</span>{cost.origin && <span className="fotus-pill fotus-pill-neutral">{cost.origin}</span>}</div></div>
                <div className="mt-4 grid grid-cols-3 gap-2"><CostType label="Produto" value={cost.productCost} /><CostType label="Logística" value={cost.logisticsCost} /><CostType label="Impostos" value={cost.taxCost} /></div>
                <div className="my-5">{cost.reasonCategory && <span className="fotus-pill fotus-pill-yellow"><Tag className="h-3 w-3 shrink-0" />{cost.reasonCategory}</span>}<p className="mt-3 text-xs leading-relaxed text-fotus-ink/80">{cost.detailedReason || 'Sem observações adicionais.'}</p></div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-fotus-blue/10 pt-4">
                  {cost.totalCost > 1000 ? <span className="fotus-pill fotus-pill-yellow">Acima de R$ 1.000</span> : <span className="text-[10px] text-fotus-ink/80">Custo registrado</span>}
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={deletingId === cost.id} onClick={() => openEdit(cost)} className="inline-flex items-center gap-1.5 rounded-xl border border-fotus-blue/15 px-3 py-2.5 text-[11px] font-bold text-fotus-blue hover:bg-fotus-blue/7 disabled:opacity-40" aria-label={`Editar custo do pedido ${cost.orderNumber}`}><Pencil className="h-3.5 w-3.5" />Editar</button>
                    {canDeleteCosts && <button type="button" disabled={Boolean(deletingId)} onClick={() => void removeCost(cost)} className="inline-flex items-center gap-1.5 rounded-xl border border-fotus-yellow/40 bg-fotus-yellow/15 px-3 py-2.5 text-[11px] font-bold text-fotus-ink hover:bg-fotus-yellow/30 disabled:opacity-40" aria-label={`Excluir custo do pedido ${cost.orderNumber}`}>{deletingId === cost.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}{deletingId === cost.id ? 'Excluindo…' : 'Excluir'}</button>}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {filtered.length === 0 && <p className="fotus-glass rounded-2xl px-5 py-10 text-center text-xs text-fotus-ink/80">Nenhum registro encontrado com esses filtros.</p>}
        </section>
      )}

      <ExtraCostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} cost={editingCost} currentUser={currentUser} />
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Receipt; tone: string }) {
  return <div className="fotus-glass-card rounded-2xl p-4"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-wider text-fotus-ink/80">{label}</p><p className="mt-1 truncate text-xl font-extrabold text-fotus-ink sm:text-2xl">{value}</p></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span></div></div>;
}

function CostRanking({ title, icon: Icon, items, grandTotal }: { title: string; icon: typeof Tag; items: Array<{ label: string; total: number; count: number }>; grandTotal: number }) {
  return <div className="rounded-2xl border border-fotus-neutral bg-fotus-neutral/85 p-4 shadow-sm"><h3 className="flex items-center gap-2 text-xs font-extrabold text-fotus-ink"><Icon className="h-4 w-4 text-fotus-blue" />{title}</h3><div className="mt-4 space-y-3">{items.map((item, index) => <div key={item.label}><div className="mb-1 flex items-center justify-between gap-2 text-[11px]"><span className="truncate font-semibold text-fotus-ink">{index + 1}. {item.label} <small className="text-fotus-ink/80">({item.count})</small></span><strong className="text-fotus-ink">{currency(item.total)}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-fotus-neutral/70"><div className="h-full rounded-full bg-fotus-blue" style={{ width: `${Math.max(5, Math.round((item.total / grandTotal) * 100))}%` }} /></div></div>)}{!items.length && <p className="text-xs text-fotus-ink/80">Sem dados suficientes</p>}</div></div>;
}

function CostType({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-fotus-neutral/40 p-2"><span className="block text-[9px] font-bold text-fotus-ink/80">{label}</span><strong className="mt-0.5 block truncate text-[10px] text-fotus-ink">{currency(value)}</strong></div>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl bg-fotus-neutral/40 px-3 py-2.5"><span className="text-[10px] font-bold uppercase tracking-wide text-fotus-ink/80">{label}</span><strong className="truncate text-xs capitalize text-fotus-ink">{value}</strong></div>;
}

function AnnualCostChart({ months, year }: { months: Array<{ month: string; total: number; count: number }>; year: number }) {
  const chartData = months.map((month) => {
    const [, monthNumber] = month.month.split('-');
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(year, Number(monthNumber) - 1, 1)).replace('.', '');
    return { key: month.month, label, value: month.total, tooltip: `${monthLabel(month.month)}: ${currency(month.total)} em ${month.count} registro(s)` };
  });
  const compactCurrency = (value: number) => value >= 1000 ? `R$ ${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : `R$ ${Math.round(value)}`;
  return (
    <div className="mt-5 rounded-2xl border border-fotus-neutral bg-fotus-neutral/85 p-4 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="flex items-center gap-2 text-xs font-extrabold text-fotus-ink"><CalendarDays className="h-4 w-4 text-fotus-blue" />Visão anual de custos · {year}</h3><p className="mt-1 text-[11px] text-fotus-ink/80">Comparativo mensal de todos os registros do ano. Passe o cursor sobre uma coluna para ver os detalhes.</p></div><span className="rounded-full bg-fotus-blue/6 px-3 py-1 text-[10px] font-extrabold text-fotus-blue">12 meses</span></div>
      <div className="mt-4"><PillBarChart data={chartData} ariaLabel={`Visão anual de custos de ${year}`} valueFormatter={compactCurrency} emptyMessage="Ainda não há custos cadastrados neste ano." /></div>
    </div>
  );
}
