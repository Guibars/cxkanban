import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  BarChart3,
  Building2,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  CircleDot,
  Clock3,
  FileUp,
  LineChart,
  LoaderCircle,
  MapPinned,
  Package,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trophy,
  Truck,
  UsersRound,
} from 'lucide-react';
import { db, doc, updateDoc } from '../lib/firebase';
import { readOccurrencesSpreadsheet, saveImportedOccurrences } from '../lib/occurrenceImport';
import { Occurrence, OccurrenceStage, OrganizationUnit } from '../types';
import OccurrenceModal from './OccurrenceModal';

interface OccurrencesViewProps {
  occurrences: Occurrence[];
  organizationUnits: OrganizationUnit[];
  currentUser: User;
  agents: string[];
  canManageAgents: boolean;
  onEditAgents: () => void;
}

const STAGES: Array<{ id: OccurrenceStage; color: string; dot: string }> = [
  { id: 'Recebida', color: 'border-slate-200 bg-slate-50/70', dot: 'bg-slate-500' },
  { id: 'Em Análise', color: 'border-blue-200 bg-blue-50/60', dot: 'bg-blue-500' },
  { id: 'Aguardando Retorno', color: 'border-amber-200 bg-amber-50/60', dot: 'bg-amber-500' },
  { id: 'Finalizada', color: 'border-emerald-200 bg-emerald-50/60', dot: 'bg-emerald-500' },
];

type AnalyticsDimension = 'agents' | 'carriers' | 'states';
type DatePreset = 'today' | 'week' | 'fortnight' | 'month' | 'custom' | 'all';

const DATE_PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Últimos 7 dias' },
  { id: 'fortnight', label: 'Últimos 15 dias' },
  { id: 'month', label: 'Mês atual' },
  { id: 'custom', label: 'Escolher período' },
  { id: 'all', label: 'Todo o histórico' },
];

const ANALYTICS_DIMENSIONS: Array<{ id: AnalyticsDimension; label: string }> = [
  { id: 'agents', label: 'Agentes' },
  { id: 'carriers', label: 'Transportadoras' },
  { id: 'states', label: 'Estados / UF' },
];

function rankBy(items: string[], limit = 5) {
  const counts = new Map<string, { label: string; count: number }>();
  items.forEach((value) => {
    const label = String(value || '').trim();
    if (!label) return;
    const key = label.toLocaleUpperCase('pt-BR');
    const existing = counts.get(key);
    counts.set(key, { label: existing?.label || label, count: (existing?.count || 0) + 1 });
  });
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

function displayDate(date: string) {
  if (!date) return 'Sem data';
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}/${month}/${year}` : date;
}

function localIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateRangeForPreset(preset: DatePreset, customStart: string, customEnd: string) {
  const today = new Date();
  const end = localIsoDate(today);
  if (preset === 'all') return { start: '', end: '' };
  if (preset === 'custom') return { start: customStart, end: customEnd };
  if (preset === 'today') return { start: end, end };
  if (preset === 'month') return { start: `${end.slice(0, 7)}-01`, end };
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (preset === 'week' ? 6 : 14));
  return { start: localIsoDate(startDate), end };
}

export default function OccurrencesView({ occurrences, organizationUnits, currentUser, agents, canManageAgents, onEditAgents }: OccurrencesViewProps) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'Todas' | OccurrenceStage>('Todas');
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showInsights, setShowInsights] = useState(false);
  const [analyticsDimension, setAnalyticsDimension] = useState<AnalyticsDimension>('agents');
  const [selectedSeries, setSelectedSeries] = useState('Todos');
  const [visibleByStage, setVisibleByStage] = useState<Record<OccurrenceStage, number>>({ Recebida: 3, 'Em Análise': 3, 'Aguardando Retorno': 3, Finalizada: 3 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOccurrence, setEditingOccurrence] = useState<Occurrence | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState(false);
  const spreadsheetInput = useRef<HTMLInputElement>(null);

  const periodRange = useMemo(() => dateRangeForPreset(datePreset, customStart, customEnd), [customEnd, customStart, datePreset]);
  const periodOccurrences = useMemo(() => occurrences.filter((occurrence) => {
    if (!occurrence.date && (periodRange.start || periodRange.end)) return false;
    if (periodRange.start && occurrence.date < periodRange.start) return false;
    if (periodRange.end && occurrence.date > periodRange.end) return false;
    return true;
  }), [occurrences, periodRange.end, periodRange.start]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return periodOccurrences.filter((occurrence) => {
      if (stageFilter !== 'Todas' && occurrence.stage !== stageFilter) return false;
      if (!query) return true;
      return [
        occurrence.companyName,
        occurrence.agentName,
        occurrence.orderNumber,
        occurrence.uniqueNumber,
        occurrence.sacCode,
        occurrence.carrier,
        occurrence.consultant,
        occurrence.product,
        occurrence.state,
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [periodOccurrences, search, stageFilter]);

  useEffect(() => {
    setVisibleByStage({ Recebida: 3, 'Em Análise': 3, 'Aguardando Retorno': 3, Finalizada: 3 });
  }, [datePreset, customStart, customEnd, search, stageFilter]);

  const insights = useMemo(() => ({
    carriers: rankBy(periodOccurrences.map((item) => item.carrier)),
    products: rankBy(periodOccurrences.map((item) => item.product)),
    regions: rankBy(periodOccurrences.map((item) => item.region)),
    types: rankBy(periodOccurrences.map((item) => item.occurrenceType)),
  }), [periodOccurrences]);

  const damageInsights = useMemo(() => {
    const damageItems = periodOccurrences.filter((item) => item.isDamage || item.occurrenceType?.toLocaleLowerCase('pt-BR').includes('avari'));
    const aggregate = (selector: (item: Occurrence) => string) => {
      const grouped = new Map<string, { label: string; total: number; count: number }>();
      damageItems.forEach((item) => {
        const label = selector(item).trim() || 'Não informado';
        const key = label.toLocaleUpperCase('pt-BR');
        const current = grouped.get(key);
        grouped.set(key, { label: current?.label || label, total: (current?.total || 0) + (item.damageAmount || 0), count: (current?.count || 0) + 1 });
      });
      return [...grouped.values()].sort((a, b) => b.total - a.total).slice(0, 8);
    };
    return {
      items: damageItems,
      total: damageItems.reduce((sum, item) => sum + (item.damageAmount || 0), 0),
      carriers: aggregate((item) => item.carrier),
      regions: aggregate((item) => item.region),
    };
  }, [periodOccurrences]);

  const finalized = periodOccurrences.filter((item) => item.stage === 'Finalizada').length;
  const open = periodOccurrences.length - finalized;
  const approved = periodOccurrences.filter((item) => item.approvalStatus === 'Aprovado').length;
  const completionRate = periodOccurrences.length ? Math.round((finalized / periodOccurrences.length) * 100) : 0;
  const futureDates = occurrences.filter((item) => item.date && item.date > new Date().toISOString().slice(0, 10)).length;

  const productivityChart = useMemo(() => {
    const year = new Date().getFullYear();
    const currentYear = occurrences.filter((item) => item.date?.startsWith(`${year}-`));
    const valueFor = (item: Occurrence) => analyticsDimension === 'agents' ? item.agentName : analyticsDimension === 'carriers' ? item.carrier : item.state;
    const seriesLimit = analyticsDimension === 'agents' ? 50 : analyticsDimension === 'states' ? 27 : 12;
    const topSeries = rankBy(currentYear.map(valueFor), seriesLimit).map((item) => item.label);
    const months = Array.from({ length: 12 }, (_, index) => {
      const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`;
      const monthItems = currentYear.filter((item) => item.date?.startsWith(`${monthKey}-`));
      return {
        key: monthKey,
        label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(year, index, 1)).replace('.', ''),
        total: monthItems.length,
        values: topSeries.map((label) => monthItems.filter((item) => String(valueFor(item) || '').trim().localeCompare(label.trim(), 'pt-BR', { sensitivity: 'base' }) === 0).length),
      };
    });
    return { year, topSeries, months };
  }, [analyticsDimension, occurrences]);

  const openNew = () => {
    setEditingOccurrence(null);
    setIsModalOpen(true);
  };

  const openEdit = (occurrence: Occurrence) => {
    setEditingOccurrence(occurrence);
    setIsModalOpen(true);
  };

  const changeAnalyticsDimension = (dimension: AnalyticsDimension) => {
    setAnalyticsDimension(dimension);
    setSelectedSeries('Todos');
  };

  const changeStage = async (occurrence: Occurrence, stage: OccurrenceStage) => {
    try {
      await updateDoc(doc(db, 'occurrences', occurrence.id), { stage, updatedAt: Date.now() });
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
    }
  };

  const importSpreadsheet = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    setImportError(false);
    setImportMessage('Lendo a planilha e preparando as ocorrências...');

    try {
      const imported = await readOccurrencesSpreadsheet(file, currentUser);
      const confirmed = window.confirm(
        `Encontramos ${imported.length} ocorrências na planilha. Deseja enviá-las agora para o Firestore?`,
      );

      if (!confirmed) {
        setImportMessage('Importação cancelada. Nenhum registro foi enviado.');
        return;
      }

      const saved = await saveImportedOccurrences(imported, (current, total) => {
        setImportMessage(`Importando ${current} de ${total} ocorrências...`);
      });
      setImportMessage(`${saved} ocorrências da planilha foram sincronizadas com sucesso. As datas foram normalizadas no padrão brasileiro.`);
    } catch (error) {
      console.error('Erro ao importar ocorrências:', error);
      setImportError(true);
      setImportMessage(error instanceof Error ? error.message : 'Não foi possível importar essa planilha.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Ocorrências no período', value: periodOccurrences.length, icon: CircleDot, tone: 'bg-gray-100 text-gray-700' },
          { label: 'Em aberto', value: open, icon: Clock3, tone: 'bg-amber-50 text-amber-700' },
          { label: 'Finalizadas', value: finalized, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Taxa de conclusão', value: `${completionRate}%`, icon: BarChart3, tone: 'bg-blue-50 text-blue-700' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-white/90 bg-white/80 p-4 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">{label}</p><p className="mt-1 text-2xl font-extrabold text-gray-950">{value}</p></div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-white/90 bg-white/75 p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex shrink-0 items-center gap-2 px-1"><CalendarRange className="h-4 w-4 text-[#385041]" /><span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Período dos cards</span></div>
          <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-xl bg-gray-100/80 p-1.5">
            {DATE_PRESETS.map((preset) => <button key={preset.id} type="button" onClick={() => setDatePreset(preset.id)} className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-extrabold transition-all ${datePreset === preset.id ? 'bg-white text-[#385041] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>{preset.label}</button>)}
          </div>
          {datePreset === 'custom' && <div className="flex flex-col gap-2 sm:flex-row"><label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[10px] font-bold text-gray-500">De <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="bg-transparent text-xs text-gray-800 outline-none" /></label><label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[10px] font-bold text-gray-500">Até <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="bg-transparent text-xs text-gray-800 outline-none" /></label></div>}
          <span className="ml-auto shrink-0 rounded-full bg-[#eef5eb] px-3 py-1.5 text-[10px] font-extrabold text-[#385041]">{periodOccurrences.length} ocorrência(s)</span>
        </div>
      </section>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/90 bg-white/60 p-1.5">
          {(['Todas', ...STAGES.map((item) => item.id)] as const).map((item) => (
            <button key={item} onClick={() => setStageFilter(item)} className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${stageFilter === item ? 'bg-[#385041] text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}>{item}</button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Empresa, pedido, SAC, transportadora..." className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#385041]" />
          </label>
          <button onClick={() => setShowInsights((current) => !current)} className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-extrabold transition-all ${showInsights ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-[#385041]/20 bg-white text-[#385041] hover:bg-[#eef5eb]'}`}>
            <Sparkles className="h-4 w-4" /> Insights Gerais
          </button>
          {canManageAgents && <button onClick={onEditAgents} className="flex items-center justify-center gap-2 rounded-xl border border-[#385041]/20 bg-white px-4 py-2.5 text-xs font-extrabold text-[#385041] transition-all hover:bg-[#eef5eb]" title="Editar agentes disponíveis">
            <UsersRound className="h-4 w-4" /> Editar agentes
          </button>}
          <input ref={spreadsheetInput} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importSpreadsheet} className="hidden" />
          {canManageAgents && <button disabled={isImporting} onClick={() => spreadsheetInput.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-[#385041]/20 bg-white px-4 py-2.5 text-xs font-extrabold text-[#385041] transition-all hover:bg-[#eef5eb] disabled:cursor-wait disabled:opacity-60">
            {isImporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} {isImporting ? 'Importando...' : 'Importar planilha'}
          </button>}
          <button onClick={openNew} className="flex items-center justify-center gap-2 rounded-xl bg-[#385041] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#2c4033]"><Plus className="h-4 w-4" /> Nova ocorrência</button>
        </div>
      </div>

      {importMessage && (
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold ${importError ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {isImporting ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" /> : <FileUp className="h-4 w-4 shrink-0" />}
          <span>{importMessage}</span>
        </div>
      )}
      {futureDates > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">{futureDates} data(s) histórica(s) parecem estar no futuro. Reimporte a planilha para aplicar a correção automática de dia e mês.</div>}

      {showInsights && (
        <section className="rounded-3xl border border-[#385041]/10 bg-gradient-to-br from-[#eef5eb] via-white to-amber-50/50 p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#385041]">Leitura instantânea</p><h2 className="mt-1 text-xl font-extrabold text-gray-950">Insights gerais das ocorrências</h2><p className="mt-1 text-xs text-gray-500">Calculados em tempo real com os cards salvos no Firestore.</p></div>
            <div className="flex gap-2 text-xs"><span className="rounded-full bg-white px-3 py-1.5 font-bold text-gray-700 shadow-sm">{open} abertas</span><span className="rounded-full bg-emerald-100 px-3 py-1.5 font-bold text-emerald-800">{approved} aprovadas</span></div>
          </div>

          {periodOccurrences.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-8 text-center text-sm text-gray-500">Os insights aparecerão assim que a primeira ocorrência for cadastrada.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Ranking title="Transportadoras mais citadas" icon={Truck} items={insights.carriers} total={periodOccurrences.length} />
              <Ranking title="Produtos com mais ocorrências" icon={Package} items={insights.products} total={periodOccurrences.length} />
              <Ranking title="Regiões com maior volume" icon={MapPinned} items={insights.regions} total={periodOccurrences.length} />
              <Ranking title="Tipos mais frequentes" icon={BarChart3} items={insights.types} total={periodOccurrences.length} />
            </div>
          )}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <DamageRanking title="Custo de avarias por transportadora" items={damageInsights.carriers} total={damageInsights.total} icon={Truck} />
            <DamageRanking title="Custo de avarias por região" items={damageInsights.regions} total={damageInsights.total} icon={MapPinned} />
          </div>
          <ProductivityChart
            year={productivityChart.year}
            dimension={analyticsDimension}
            months={productivityChart.months}
            series={productivityChart.topSeries}
            selectedSeries={selectedSeries}
            onDimensionChange={changeAnalyticsDimension}
            onSelectSeries={setSelectedSeries}
          />
        </section>
      )}

      {occurrences.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white/60 px-6 py-16 text-center">
          <CircleDot className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-base font-extrabold text-gray-800">O controle está pronto para receber dados reais</h3>
          <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-gray-500">Importe a planilha atual para trazer todo o histórico ou cadastre uma nova ocorrência manualmente.</p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            {canManageAgents && <button disabled={isImporting} onClick={() => spreadsheetInput.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-[#385041]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#385041] disabled:opacity-60"><FileUp className="h-4 w-4" />Importar histórico</button>}
            <button onClick={openNew} className="rounded-xl bg-[#385041] px-4 py-2.5 text-xs font-bold text-white">Cadastrar primeira ocorrência</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {STAGES.map((column) => {
            const columnOccurrences = filtered.filter((item) => item.stage === column.id);
            const visibleOccurrences = columnOccurrences.slice(0, visibleByStage[column.id]);
            const hiddenCount = Math.max(0, columnOccurrences.length - visibleOccurrences.length);
            return (
              <section key={column.id} className={`min-h-[420px] rounded-2xl border p-3 ${column.color}`}>
                <div className="mb-3 flex items-center justify-between border-b border-black/5 px-1 pb-3">
                  <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} /><h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800">{column.id}</h3></div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-gray-600 shadow-sm">{columnOccurrences.length}</span>
                </div>
                <div className="space-y-3">
                  {columnOccurrences.length === 0 ? <p className="py-10 text-center text-xs text-gray-400">Nenhum card nesta etapa</p> : visibleOccurrences.map((occurrence) => (
                    <article key={occurrence.id} className="rounded-2xl border border-white bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="min-w-0"><p className="text-[10px] font-extrabold uppercase text-gray-400">SAC {occurrence.sacCode}</p><h4 className="mt-0.5 truncate text-sm font-extrabold text-gray-950">{occurrence.companyName}</h4></div>
                        <button onClick={() => openEdit(occurrence)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Editar"><Pencil className="h-4 w-4" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-gray-50 p-2.5"><span className="block text-[9px] font-extrabold uppercase text-gray-400">Pedido</span><strong className="mt-0.5 block truncate text-gray-800">{occurrence.orderNumber}</strong></div>
                        <div className="rounded-xl bg-gray-50 p-2.5"><span className="block text-[9px] font-extrabold uppercase text-gray-400">Produto</span><strong className="mt-0.5 block truncate text-gray-800">{occurrence.product} ×{occurrence.quantity}</strong></div>
                      </div>
                      <div className="mt-3 space-y-2 text-[11px] text-gray-600">
                        <p className="flex items-center gap-2"><CircleDot className="h-3.5 w-3.5 text-gray-400" /><span className="truncate">{occurrence.occurrenceType}</span></p>
                        <p className="flex items-center gap-2"><Truck className="h-3.5 w-3.5 text-gray-400" /><span className="truncate">{occurrence.carrier}</span></p>
                        <p className="flex items-center gap-2"><MapPinned className="h-3.5 w-3.5 text-gray-400" />{occurrence.city ? `${occurrence.city} · ` : ''}{occurrence.state} • {occurrence.region}</p>
                        {(occurrence.isDamage || occurrence.occurrenceType?.toLocaleLowerCase('pt-BR').includes('avari')) && <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-2 py-1.5 font-bold text-amber-800"><CircleDollarSign className="h-3.5 w-3.5" />Avaria · {(occurrence.damageAmount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
                        {occurrence.routedToName && <p className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-[#385041]" /><span className="truncate font-semibold text-[#385041]">{occurrence.routedToName}</span></p>}
                      </div>
                      {occurrence.comments && <p className="mt-3 line-clamp-2 rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 text-[11px] leading-relaxed text-gray-500">{occurrence.comments}</p>}
                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                        <div><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${occurrence.approvalStatus === 'Aprovado' ? 'bg-emerald-50 text-emerald-700' : occurrence.approvalStatus === 'Reprovado' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{occurrence.approvalStatus}</span><span className="ml-2 text-[10px] text-gray-400">{displayDate(occurrence.date)}</span></div>
                        <select aria-label="Alterar etapa" value={occurrence.stage} onChange={(event) => changeStage(occurrence, event.target.value as OccurrenceStage)} className="max-w-[118px] rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-600 outline-none">
                          {STAGES.map((stage) => <option key={stage.id}>{stage.id}</option>)}
                        </select>
                      </div>
                    </article>
                  ))}
                  {hiddenCount > 0 && <button type="button" onClick={() => setVisibleByStage((current) => ({ ...current, [column.id]: columnOccurrences.length }))} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#385041]/15 bg-white/80 px-4 py-3 text-xs font-extrabold text-[#385041] shadow-sm hover:bg-white"><ChevronDown className="h-4 w-4" />Ver mais {hiddenCount} ocorrência(s)</button>}
                  {hiddenCount === 0 && columnOccurrences.length > 3 && <button type="button" onClick={() => setVisibleByStage((current) => ({ ...current, [column.id]: 3 }))} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-[10px] font-bold text-gray-500 hover:bg-white/70"><ChevronUp className="h-4 w-4" />Mostrar menos</button>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <OccurrenceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} occurrence={editingOccurrence} currentUser={currentUser} organizationUnits={organizationUnits} agents={agents} />
    </div>
  );
}

function Ranking({ title, icon: Icon, items, total }: { title: string; icon: typeof Truck; items: Array<{ label: string; count: number }>; total: number }) {
  return (
    <div className="rounded-2xl border border-white bg-white/85 p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-xs font-extrabold text-gray-800"><Icon className="h-4 w-4 text-[#385041]" />{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`}>
            <div className="mb-1 flex items-center justify-between gap-2 text-[11px]"><span className="truncate font-semibold text-gray-600">{index + 1}. {item.label}</span><strong className="text-gray-900">{item.count}</strong></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#6f8f79]" style={{ width: `${Math.max(7, Math.round((item.count / total) * 100))}%` }} /></div>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-gray-400">Sem dados suficientes</p>}
      </div>
    </div>
  );
}

function DamageRanking({ title, items, total, icon: Icon }: { title: string; items: Array<{ label: string; total: number; count: number }>; total: number; icon: typeof Truck }) {
  const highest = items[0]?.total || 1;
  return <div className="rounded-2xl border border-amber-100 bg-white/90 p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 text-xs font-extrabold text-gray-900"><Icon className="h-4 w-4 text-amber-600" />{title}</h3><p className="mt-1 text-[10px] text-gray-500">Somente cards marcados como avaria com valor informado.</p></div><strong className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-[10px] text-amber-900">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div><div className="mt-4 space-y-3">{items.map((item, index) => <div key={item.label}><div className="mb-1 flex items-center justify-between gap-3"><span className="truncate text-[11px] font-semibold text-gray-600">{index + 1}. {item.label} <small className="text-gray-400">({item.count})</small></span><strong className="shrink-0 text-[11px] text-gray-900">{item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div><div className="h-2 overflow-hidden rounded-full bg-amber-50"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.max(4, (item.total / highest) * 100)}%` }} /></div></div>)}{!items.length && <p className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-xs text-gray-400">Ainda não há valor de avaria neste período.</p>}</div></div>;
}

interface ProductivityChartProps {
  year: number;
  dimension: AnalyticsDimension;
  months: Array<{ key: string; label: string; total: number; values: number[] }>;
  series: string[];
  selectedSeries: string;
  onDimensionChange: (dimension: AnalyticsDimension) => void;
  onSelectSeries: (label: string) => void;
}

function ProductivityChart({ year, dimension, months, series, selectedSeries, onDimensionChange, onSelectSeries }: ProductivityChartProps) {
  const [focusedMonth, setFocusedMonth] = useState(`${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const dimensionTitle = dimension === 'agents' ? 'produtividade das agentes' : dimension === 'carriers' ? 'ocorrências por transportadora' : 'ocorrências por estado / UF';
  const allItemsLabel = dimension === 'agents' ? 'todas as agentes' : dimension === 'carriers' ? 'todas as transportadoras' : 'todos os estados / UF';
  const allItemsButton = dimension === 'states' ? 'Ver total de todos' : 'Ver total de todas';
  const rankingTitle = dimension === 'agents' ? 'Quem está na frente' : dimension === 'carriers' ? 'Transportadoras mais citadas' : 'Estados / UF com maior volume';
  const selectedIndex = series.indexOf(selectedSeries);
  const effectiveSeries = selectedSeries === 'Todos' || selectedIndex >= 0 ? selectedSeries : 'Todos';
  const annualRanking = series
    .map((label, seriesIndex) => ({
      label,
      total: months.reduce((sum, month) => sum + (month.values[seriesIndex] || 0), 0),
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'pt-BR'));
  const highestTotal = annualRanking[0]?.total || 0;
  const teamAverage = annualRanking.length ? annualRanking.reduce((sum, item) => sum + item.total, 0) / annualRanking.length : 0;
  const selectedAnnual = annualRanking.find((item) => item.label === effectiveSeries);
  const chartData = months.map((month) => ({
    key: month.key,
    label: month.label,
    value: effectiveSeries === 'Todos' ? month.total : month.values[selectedIndex] || 0,
    tooltip: `${month.label}/${year} · ${effectiveSeries === 'Todos' ? 'Todas as ocorrências' : effectiveSeries}: ${effectiveSeries === 'Todos' ? month.total : month.values[selectedIndex] || 0} card(s)`,
  }));
  const focusedData = chartData.find((item) => item.key === focusedMonth) || chartData[0];
  const maxChartValue = Math.max(...chartData.map((item) => item.value), 1);
  const annualDisplayed = chartData.reduce((sum, month) => sum + month.value, 0);

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-[#385041]/10 bg-white/90 shadow-sm">
      <div className="border-b border-gray-100 bg-gradient-to-r from-[#f3f8f1] via-white to-[#eef5f8] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#385041]"><LineChart className="h-4 w-4" />Performance mensal</p><h2 className="mt-1 text-lg font-extrabold text-gray-950">{dimensionTitle} · {year}</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500">As barras representam os meses. Em <strong>Todos</strong>, cada barra soma todas as ocorrências; selecione uma opção para acompanhar seu resultado individual.</p></div>
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/90 bg-white/80 p-1.5 shadow-sm">
            {ANALYTICS_DIMENSIONS.map((item) => <button key={item.id} type="button" onClick={() => onDimensionChange(item.id)} className={`rounded-xl px-3 py-2 text-[11px] font-extrabold transition-all ${dimension === item.id ? 'bg-[#385041] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>{item.label}</button>)}
          </div>
        </div>
      </div>

      {!!annualRanking.length && (
        <div className="border-b border-gray-100 bg-white px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-extrabold text-gray-900"><Trophy className="h-4 w-4 text-amber-500" />{rankingTitle} em {year}</p>
              <p className="mt-1 text-[10px] text-gray-500">A posição considera o total de cards no ano. Clique em uma linha para ver a evolução mensal.</p>
            </div>
            <button type="button" onClick={() => onSelectSeries('Todos')} className={`mt-2 w-fit rounded-full border px-3 py-1.5 text-[10px] font-extrabold transition-all sm:mt-0 ${effectiveSeries === 'Todos' ? 'border-[#385041] bg-[#385041] text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-[#385041]/30'}`}>{allItemsButton}</button>
          </div>

          <div className="mt-4 grid max-h-[360px] gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
            {annualRanking.map((item, index) => {
              const isLeader = index === 0;
              const isSelected = effectiveSeries === item.label;
              const progress = highestTotal ? Math.max(5, Math.round((item.total / highestTotal) * 100)) : 0;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onSelectSeries(item.label)}
                  aria-pressed={isSelected}
                  className={`group rounded-2xl border p-3 text-left transition-all ${isSelected ? 'border-[#385041] bg-[#f0f5ed] shadow-sm' : isLeader ? 'border-amber-200 bg-amber-50/70 hover:border-amber-300' : 'border-gray-200 bg-white hover:border-[#385041]/30 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${isLeader ? 'bg-amber-400 text-amber-950' : 'bg-gray-100 text-gray-600'}`}>{index + 1}º</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <strong className="truncate text-xs text-gray-900">{item.label}</strong>
                        {isLeader && <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-900">Líder</span>}
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-black/5"><span className={`block h-full rounded-full ${isLeader ? 'bg-amber-400' : 'bg-[#6f8f79]'}`} style={{ width: `${progress}%` }} /></span>
                    </span>
                    <span className="shrink-0 text-right"><strong className="block text-sm text-gray-950">{item.total}</strong><span className="block text-[8px] font-bold uppercase tracking-wide text-gray-400">cards</span></span>
                  </div>
                </button>
              );
            })}
          </div>
          {dimension === 'agents' && <div className="mt-4 grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 sm:grid-cols-[1fr_auto]"><div><p className="text-[10px] font-extrabold uppercase tracking-wide text-blue-700">Comparativo médio da equipe</p><p className="mt-1 text-xs text-gray-700">{effectiveSeries === 'Todos' ? <>A média anual é de <strong>{teamAverage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} cards por agente</strong>.</> : <><strong>{effectiveSeries}</strong> registrou {selectedAnnual?.total || 0} cards, diferença de <strong>{((selectedAnnual?.total || 0) - teamAverage) >= 0 ? '+' : ''}{((selectedAnnual?.total || 0) - teamAverage).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</strong> em relação à média.</>}</p><p className="mt-1 text-[9px] leading-relaxed text-gray-500">Este comparativo mede somente volume de cards. Não é uma nota de desempenho, pois cada pessoa pode exercer outras atividades no setor.</p></div><div className="flex items-center gap-2 sm:text-right"><span className="rounded-xl bg-white px-3 py-2"><small className="block text-[8px] font-bold uppercase text-gray-400">Média mensal</small><strong className="text-sm text-blue-900">{(teamAverage / 12).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</strong></span></div></div>}
        </div>
      )}

      <div className="border-b border-gray-100 bg-gray-50/70 px-5 py-3 text-[10px] text-gray-600">
        {effectiveSeries === 'Todos'
          ? <>Você está vendo o <strong className="text-gray-900">total mensal de {allItemsLabel}</strong>.</>
          : <>Você está vendo somente <strong className="text-[#385041]">{effectiveSeries}</strong>. Clique em “{allItemsButton}” para voltar.</>}
      </div>
      <div className="grid gap-4 p-3 sm:p-5 lg:grid-cols-[1fr_210px]">
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-[#f7f9f7] p-4">
          <div className="grid min-w-[720px] grid-cols-12 gap-2" role="img" aria-label={`Gráfico mensal de ${dimensionTitle} em ${year}`}>
            {chartData.map((month) => {
              const isFocused = focusedData?.key === month.key;
              const height = month.value ? Math.max(8, Math.round((month.value / maxChartValue) * 160)) : 3;
              return <button key={month.key} type="button" onClick={() => setFocusedMonth(month.key)} title={month.tooltip} aria-pressed={isFocused} className={`group flex h-[225px] flex-col items-center justify-end rounded-xl px-1 py-2 transition-all ${isFocused ? 'bg-white shadow-sm ring-1 ring-[#385041]/10' : 'hover:bg-white/70'}`}>
                <span className={`mb-2 rounded-full px-2 py-1 text-[9px] font-extrabold ${isFocused ? 'bg-[#385041] text-white' : 'text-gray-600'}`}>{month.value}</span>
                <span className="flex h-40 w-full max-w-9 items-end overflow-hidden rounded-xl bg-[#e1e7e2]"><span className={`block w-full rounded-xl transition-all ${isFocused ? 'bg-amber-400' : 'bg-[#6f8f79] group-hover:bg-[#385041]'}`} style={{ height: `${height}px` }} /></span>
                <span className={`mt-2 text-[9px] font-extrabold uppercase ${isFocused ? 'text-[#385041]' : 'text-gray-400'}`}>{month.label}</span>
              </button>;
            })}
          </div>
        </div>
        <aside className="flex flex-col justify-between rounded-2xl border border-[#385041]/10 bg-[#eef5eb] p-4">
          <div><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#385041]">Mês selecionado</p><h3 className="mt-2 text-2xl font-black uppercase text-gray-950">{focusedData?.label || '—'}</h3><strong className="mt-3 block text-3xl text-[#385041]">{focusedData?.value || 0}</strong><span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">cards</span></div>
          <div className="mt-5 border-t border-[#385041]/10 pt-4"><span className="block text-[9px] text-gray-500">Leitura atual</span><strong className="mt-1 block text-xs text-gray-900">{effectiveSeries === 'Todos' ? allItemsLabel : effectiveSeries}</strong><p className="mt-2 text-[9px] leading-relaxed text-gray-500">Clique em qualquer mês para abrir seu valor com destaque.</p></div>
        </aside>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/70 px-5 py-3 text-[10px] text-gray-500"><span>Seleção atual: <strong className="text-gray-800">{effectiveSeries}</strong></span><span>Total exibido: <strong className="text-gray-800">{annualDisplayed} cards</strong></span></div>
    </section>
  );
}
