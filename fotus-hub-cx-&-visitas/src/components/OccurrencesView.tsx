import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { CurrentUser } from '../lib/currentUser';
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
  FileSpreadsheet,
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
import { updateData } from '../lib/dataMutations';
import { exportOccurrencesExcel } from '../lib/excelExport';
import { onlyNewImportedOccurrences, readOccurrencesSpreadsheet, saveImportedOccurrences } from '../lib/occurrenceImport';
import { occurrenceProducts, occurrenceProductsLabel } from '../lib/occurrenceProducts';
import { activeAgentRecords, agentKey } from '../lib/occurrences';
import { Occurrence, OccurrenceStage, OrganizationUnit } from '../types';
import OccurrenceModal from './OccurrenceModal';
import OccurrenceMap from './OccurrenceMap';
import { DISTRIBUTION_CENTERS, distributionCenterName, isDistributionCenterCode, type DistributionCenterCode } from '../lib/distributionCenters';
import PillBarChart from './PillBarChart';

interface OccurrencesViewProps {
  occurrences: Occurrence[];
  organizationUnits: OrganizationUnit[];
  currentUser: CurrentUser;
  agents: string[];
  canManageAgents: boolean;
  onEditAgents: () => void;
}

const STAGES: Array<{ id: OccurrenceStage; color: string; dot: string }> = [
  { id: 'Recebida', color: 'border-fotus-blue/20 bg-fotus-neutral/28', dot: 'bg-fotus-ink' },
  { id: 'Em Análise', color: 'border-fotus-blue/25 bg-fotus-blue/4', dot: 'bg-fotus-blue' },
  { id: 'Aguardando Retorno', color: 'border-fotus-yellow/25 bg-fotus-yellow/4', dot: 'bg-fotus-yellow' },
  { id: 'Finalizada', color: 'border-fotus-blue/25 bg-fotus-blue/4', dot: 'bg-fotus-blue' },
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
  const [mapOpen, setMapOpen] = useState(false);
  const [centerFilter, setCenterFilter] = useState<DistributionCenterCode | 'Todos' | 'missing'>('Todos');
  const [savingCenter, setSavingCenter] = useState('');
  const [centerMessage, setCenterMessage] = useState('');
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
  const periodLabel = datePreset === 'all'
    ? 'Todo o histórico'
    : datePreset === 'month'
      ? 'Mês atual'
      : datePreset === 'today'
        ? 'Hoje'
        : datePreset === 'week'
          ? 'Últimos 7 dias'
          : datePreset === 'fortnight'
            ? 'Últimos 15 dias'
            : `${customStart ? displayDate(customStart) : 'início'} a ${customEnd ? displayDate(customEnd) : 'hoje'}`;
  const periodOccurrences = useMemo(() => occurrences.filter((occurrence) => {
    if (!occurrence.date && (periodRange.start || periodRange.end)) return false;
    if (periodRange.start && occurrence.date < periodRange.start) return false;
    if (periodRange.end && occurrence.date > periodRange.end) return false;
    return true;
  }), [occurrences, periodRange.end, periodRange.start]);

  const matchingOccurrences = useMemo(() => {
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
        occurrenceProductsLabel(occurrence),
        occurrence.state,
        distributionCenterName(occurrence.distributionCenter),
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [periodOccurrences, search, stageFilter]);
  const filtered = useMemo(() => matchingOccurrences.filter((item) => centerFilter === 'Todos' || (centerFilter === 'missing' ? !isDistributionCenterCode(item.distributionCenter) : item.distributionCenter === centerFilter)), [matchingOccurrences, centerFilter]);

  useEffect(() => {
    setVisibleByStage({ Recebida: 3, 'Em Análise': 3, 'Aguardando Retorno': 3, Finalizada: 3 });
  }, [datePreset, customStart, customEnd, search, stageFilter, centerFilter]);

  const insights = useMemo(() => ({
    carriers: rankBy(periodOccurrences.map((item) => item.carrier)),
    products: rankBy(periodOccurrences.flatMap((item) => occurrenceProducts(item).map((entry) => entry.product))),
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
    const eligible = analyticsDimension === 'agents' ? activeAgentRecords(occurrences, agents) : occurrences;
    const currentYear = eligible.filter((item) => item.date?.startsWith(`${year}-`));
    const valueFor = (item: Occurrence) => analyticsDimension === 'agents' ? item.agentName : analyticsDimension === 'carriers' ? item.carrier : item.state;
    const seriesLimit = analyticsDimension === 'agents' ? 50 : analyticsDimension === 'states' ? 27 : 12;
    const topSeries = analyticsDimension === 'agents'
      ? [...agents].sort((a, b) => currentYear.filter(item => agentKey(item.agentName) === agentKey(b)).length
        - currentYear.filter(item => agentKey(item.agentName) === agentKey(a)).length || a.localeCompare(b, 'pt-BR'))
      : rankBy(currentYear.map(valueFor), seriesLimit).map((item) => item.label);
    const months = Array.from({ length: 12 }, (_, index) => {
      const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`;
      const monthItems = currentYear.filter((item) => item.date?.startsWith(`${monthKey}-`));
      return {
        key: monthKey,
        label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(year, index, 1)).replace('.', ''),
        total: monthItems.length,
        values: topSeries.map((label) => monthItems.filter((item) => analyticsDimension === 'agents'
          ? agentKey(item.agentName) === agentKey(label)
          : String(valueFor(item) || '').trim().localeCompare(label.trim(), 'pt-BR', { sensitivity: 'base' }) === 0).length),
      };
    });
    return { year, topSeries, months };
  }, [analyticsDimension, occurrences, agents]);

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
      await updateData(currentUser, 'occurrences', occurrence.id, { ...occurrence, stage, updatedAt: Date.now() });
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
    }
  };

  const changeDistributionCenter = async (occurrence: Occurrence, code: DistributionCenterCode | '') => {
    setSavingCenter(occurrence.id);
    setCenterMessage('');
    try {
      await updateData(currentUser, 'occurrences', occurrence.id, { ...occurrence, distributionCenter: code || null, updatedAt: Date.now() });
    } catch (error) {
      setCenterMessage(error instanceof Error ? error.message : 'Não foi possível salvar o CD. Tente novamente.');
    } finally {
      setSavingCenter('');
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
      const { newItems, ignored } = onlyNewImportedOccurrences(imported, occurrences);
      if (!newItems.length) {
        setImportMessage(`Nenhum registro novo encontrado. As ${ignored} ocorrência(s) da planilha já estavam cadastradas e foram ignoradas.`);
        return;
      }
      const confirmed = window.confirm(
        `Encontramos ${newItems.length} ocorrência(s) nova(s). ${ignored} registro(s) já cadastrado(s) serão ignorados. Deseja importar somente os novos?`,
      );

      if (!confirmed) {
        setImportMessage('Importação cancelada. Nenhum registro foi enviado.');
        return;
      }

      const result = await saveImportedOccurrences(newItems, currentUser, (current, total) => {
        setImportMessage(`Importando ${current} de ${total} ocorrências...`);
      });
      const totalIgnored = ignored + result.skipped;
      setImportMessage(`${result.inserted} ocorrência(s) nova(s) importada(s). ${totalIgnored} registro(s) repetido(s) foram ignorados.`);
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
          { label: 'Ocorrências no período', value: periodOccurrences.length, icon: CircleDot, tone: 'bg-fotus-neutral/70 text-fotus-ink' },
          { label: 'Em aberto', value: open, icon: Clock3, tone: 'bg-fotus-yellow/20 text-fotus-ink' },
          { label: 'Finalizadas', value: finalized, icon: CheckCircle2, tone: 'bg-fotus-blue/7 text-fotus-blue' },
          { label: 'Taxa de conclusão', value: `${completionRate}%`, icon: BarChart3, tone: 'bg-fotus-blue/7 text-fotus-blue' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-fotus-neutral/90 bg-fotus-neutral/80 p-4 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[10px] font-extrabold uppercase tracking-wider text-fotus-ink/80">{label}</p><p className="mt-1 text-2xl font-extrabold text-fotus-ink">{value}</p></div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-fotus-neutral/90 bg-fotus-neutral/75 p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex shrink-0 items-center gap-2 px-1"><CalendarRange className="h-4 w-4 text-fotus-blue" /><span className="text-[10px] font-extrabold uppercase tracking-wider text-fotus-ink/80">Período dos cards</span></div>
          <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-xl bg-fotus-neutral/56 p-1.5">
            {DATE_PRESETS.map((preset) => <button key={preset.id} type="button" onClick={() => setDatePreset(preset.id)} className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-extrabold transition-all ${datePreset === preset.id ? 'bg-fotus-neutral text-fotus-blue shadow-sm' : 'text-fotus-ink/80 hover:text-fotus-ink'}`}>{preset.label}</button>)}
          </div>
          {datePreset === 'custom' && <div className="flex flex-col gap-2 sm:flex-row"><label className="flex items-center gap-2 rounded-xl border border-fotus-blue/20 bg-fotus-neutral px-3 py-2 text-[10px] font-bold text-fotus-ink/80">De <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="bg-transparent text-xs text-fotus-ink outline-none" /></label><label className="flex items-center gap-2 rounded-xl border border-fotus-blue/20 bg-fotus-neutral px-3 py-2 text-[10px] font-bold text-fotus-ink/80">Até <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="bg-transparent text-xs text-fotus-ink outline-none" /></label></div>}
          <span className="ml-auto shrink-0 rounded-full bg-fotus-blue/6 px-3 py-1.5 text-[10px] font-extrabold text-fotus-blue">{periodOccurrences.length} ocorrência(s)</span>
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-fotus-neutral/90 bg-fotus-neutral/60 p-1.5">
          {(['Todas', ...STAGES.map((item) => item.id)] as const).map((item) => (
            <button key={item} onClick={() => setStageFilter(item)} className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${stageFilter === item ? 'bg-fotus-yellow text-fotus-ink shadow-sm' : 'text-fotus-ink hover:bg-fotus-neutral'}`}>{item}</button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 basis-full sm:basis-64 sm:grow">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fotus-ink/80" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Empresa, pedido, SAC, transportadora..." className="w-full rounded-xl border border-fotus-blue/20 bg-fotus-neutral py-2.5 pl-9 pr-3 text-xs outline-none focus:border-fotus-blue" />
          </label>
          <label className="flex items-center gap-2 rounded-full border border-fotus-blue/20 bg-fotus-neutral px-3 py-2 text-xs font-bold"><Truck className="h-4 w-4 text-fotus-blue" />CD<select aria-label="Filtrar CD de origem" value={centerFilter} onChange={(event) => setCenterFilter(event.target.value as typeof centerFilter)} className="max-w-48 bg-transparent text-xs outline-none"><option value="Todos">Todos os CDs</option><option value="missing">CD não informado</option>{DISTRIBUTION_CENTERS.map((center) => <option key={center.code} value={center.code}>{center.name}</option>)}</select></label>
          <button type="button" onClick={() => setMapOpen(true)} className="fotus-action inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-extrabold"><MapPinned className="h-4 w-4" />Mapa</button>
          <button onClick={() => setShowInsights((current) => !current)} className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-extrabold transition-all ${showInsights ? 'border-fotus-yellow/45 bg-fotus-yellow/20 text-fotus-ink' : 'border-fotus-blue/20 bg-fotus-neutral text-fotus-blue hover:bg-fotus-blue/6'}`}>
            <Sparkles className="h-4 w-4" /> Insights Gerais
          </button>
          <button onClick={() => exportOccurrencesExcel(filtered, periodLabel)} className="flex items-center justify-center gap-2 rounded-xl border border-fotus-blue/25 bg-fotus-neutral px-4 py-2.5 text-xs font-extrabold text-fotus-blue transition-all hover:bg-fotus-blue/7"><FileSpreadsheet className="h-4 w-4" />Exportar Excel</button>
          {canManageAgents && <button onClick={onEditAgents} className="flex items-center justify-center gap-2 rounded-xl border border-fotus-blue/20 bg-fotus-neutral px-4 py-2.5 text-xs font-extrabold text-fotus-blue transition-all hover:bg-fotus-blue/6" title="Editar agentes disponíveis">
            <UsersRound className="h-4 w-4" /> Editar agentes
          </button>}
          <input ref={spreadsheetInput} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importSpreadsheet} className="hidden" />
          {canManageAgents && <button disabled={isImporting} onClick={() => spreadsheetInput.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-fotus-blue/20 bg-fotus-neutral px-4 py-2.5 text-xs font-extrabold text-fotus-blue transition-all hover:bg-fotus-blue/6 disabled:cursor-wait disabled:opacity-60">
            {isImporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} {isImporting ? 'Importando...' : 'Importar planilha'}
          </button>}
          <button onClick={openNew} className="flex items-center justify-center gap-2 rounded-xl fotus-action px-4 py-2.5 text-xs font-extrabold shadow-sm"><Plus className="h-4 w-4" /> Nova ocorrência</button>
        </div>
      </div>

      {centerMessage && <p role="alert" className="rounded-2xl border border-fotus-yellow/40 bg-fotus-yellow/20 p-3 text-xs font-bold">{centerMessage}</p>}
      {centerFilter !== 'Todos' && <div className="flex flex-wrap items-center gap-2 text-xs"><span className="fotus-pill fotus-pill-yellow">{centerFilter === 'missing' ? 'CD não informado' : distributionCenterName(centerFilter)} · {filtered.length} card(s)</span><button type="button" onClick={() => setCenterFilter('Todos')} className="rounded-full px-3 py-1.5 font-bold text-fotus-blue hover:bg-fotus-yellow/20">Mostrar todos os CDs</button></div>}
      {importMessage && (
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold ${importError ? 'border-fotus-yellow/25 bg-fotus-yellow/20 text-fotus-ink' : 'border-fotus-blue/25 bg-fotus-blue/7 text-fotus-blue'}`}>
          {isImporting ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" /> : <FileUp className="h-4 w-4 shrink-0" />}
          <span>{importMessage}</span>
        </div>
      )}
      {futureDates > 0 && <div className="rounded-2xl border border-fotus-yellow/25 bg-fotus-yellow/20 px-4 py-3 text-xs font-semibold text-fotus-ink">{futureDates} data(s) histórica(s) parecem estar no futuro. Reimporte a planilha para aplicar a correção automática de dia e mês.</div>}

      {showInsights && (
        <section className="rounded-3xl border border-fotus-blue/10 bg-gradient-to-br from-fotus-blue/6 via-fotus-neutral to-fotus-yellow/4 p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-fotus-blue">Leitura instantânea</p><h2 className="mt-1 text-xl font-extrabold text-fotus-ink">Insights gerais das ocorrências</h2><p className="mt-1 text-xs text-fotus-ink/80">Calculados em tempo real com os cards salvos no Neon.</p></div>
            <div className="flex gap-2 text-xs"><span className="rounded-full bg-fotus-neutral px-3 py-1.5 font-bold text-fotus-ink shadow-sm">{open} abertas</span><span className="rounded-full bg-fotus-blue/12 px-3 py-1.5 font-bold text-fotus-blue">{approved} aprovadas</span></div>
          </div>

          {periodOccurrences.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-fotus-blue/20 bg-fotus-neutral/60 p-8 text-center text-sm text-fotus-ink/80">Os insights aparecerão assim que a primeira ocorrência for cadastrada.</div>
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
        <div className="rounded-3xl border border-dashed border-fotus-blue/20 bg-fotus-neutral/60 px-6 py-16 text-center">
          <CircleDot className="mx-auto h-12 w-12 text-fotus-ink/50" />
          <h3 className="mt-4 text-base font-extrabold text-fotus-ink">O controle está pronto para receber dados reais</h3>
          <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-fotus-ink/80">Importe a planilha atual para trazer todo o histórico ou cadastre uma nova ocorrência manualmente.</p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            {canManageAgents && <button disabled={isImporting} onClick={() => spreadsheetInput.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-fotus-blue/20 bg-fotus-neutral px-4 py-2.5 text-xs font-bold text-fotus-blue disabled:opacity-60"><FileUp className="h-4 w-4" />Importar histórico</button>}
            <button onClick={openNew} className="rounded-xl fotus-action px-4 py-2.5 text-xs font-bold">Cadastrar primeira ocorrência</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((column) => {
            const columnOccurrences = filtered.filter((item) => item.stage === column.id);
            const visibleOccurrences = columnOccurrences.slice(0, visibleByStage[column.id]);
            const hiddenCount = Math.max(0, columnOccurrences.length - visibleOccurrences.length);
            return (
              <section key={column.id} className={`min-h-[420px] rounded-2xl border p-3 ${column.color}`}>
                <div className="mb-3 flex items-center justify-between border-b border-fotus-ink/5 px-1 pb-3">
                  <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} /><h3 className="text-xs font-extrabold uppercase tracking-wider text-fotus-ink">{column.id}</h3></div>
                  <span className="rounded-full bg-fotus-neutral px-2 py-0.5 text-xs font-bold text-fotus-ink shadow-sm">{columnOccurrences.length}</span>
                </div>
                <div className="space-y-3">
                  {columnOccurrences.length === 0 ? <p className="py-10 text-center text-xs text-fotus-ink/80">Nenhum card nesta etapa</p> : visibleOccurrences.map((occurrence) => (
                    <article key={occurrence.id} className="fotus-glass-card rounded-2xl p-4">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="min-w-0"><p className="text-[10px] font-extrabold uppercase text-fotus-ink/80">SAC {occurrence.sacCode}</p><h4 className="mt-0.5 truncate text-sm font-extrabold text-fotus-ink">{occurrence.companyName}</h4></div>
                        <button onClick={() => openEdit(occurrence)} className="rounded-lg p-1.5 text-fotus-ink/80 hover:bg-fotus-neutral/70 hover:text-fotus-ink" title="Editar"><Pencil className="h-4 w-4" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-fotus-neutral/40 p-2.5"><span className="block text-[9px] font-extrabold uppercase text-fotus-ink/80">Pedido</span><strong className="mt-0.5 block truncate text-fotus-ink">{occurrence.orderNumber}</strong></div>
                        <div className="rounded-xl bg-fotus-neutral/40 p-2.5"><span className="block text-[9px] font-extrabold uppercase text-fotus-ink/80">Produtos</span><strong className="mt-0.5 block line-clamp-2 text-fotus-ink">{occurrenceProductsLabel(occurrence) || 'Não informado'}</strong></div>
                      </div>
                      <label className="mt-3 block rounded-xl border border-fotus-yellow/30 bg-fotus-yellow/10 px-3 py-2"><span className="mb-1 flex items-center gap-1.5 text-[9px] font-extrabold uppercase text-fotus-blue"><Truck className="h-3.5 w-3.5" />CD de origem{savingCenter === occurrence.id && <LoaderCircle className="h-3 w-3 animate-spin" />}</span><select aria-label={`CD de origem do pedido ${occurrence.orderNumber}`} value={occurrence.distributionCenter || ''} disabled={Boolean(savingCenter)} onChange={(event) => void changeDistributionCenter(occurrence, event.target.value as DistributionCenterCode | '')} className="w-full min-w-0 bg-transparent text-xs font-bold text-fotus-ink outline-none disabled:opacity-50"><option value="">Não informado</option>{DISTRIBUTION_CENTERS.map((center) => <option key={center.code} value={center.code}>{center.name} ({center.code})</option>)}</select></label>
                      <div className="mt-3 space-y-2 text-[11px] text-fotus-ink">
                        <p className="flex items-center gap-2"><CircleDot className="h-3.5 w-3.5 text-fotus-ink/80" /><span className="truncate">{occurrence.occurrenceType}</span></p>
                        <p className="flex items-center gap-2"><Truck className="h-3.5 w-3.5 text-fotus-ink/80" /><span className="truncate">{occurrence.carrier}</span></p>
                        <p className="flex items-center gap-2"><MapPinned className="h-3.5 w-3.5 text-fotus-ink/80" />{occurrence.city ? `${occurrence.city} · ` : ''}{occurrence.state} • {occurrence.region}</p>
                        {(occurrence.isDamage || occurrence.occurrenceType?.toLocaleLowerCase('pt-BR').includes('avari')) && <p className="flex items-center gap-2 rounded-lg bg-fotus-yellow/20 px-2 py-1.5 font-bold text-fotus-ink"><CircleDollarSign className="h-3.5 w-3.5" />Avaria · {(occurrence.damageAmount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
                        {occurrence.routedToName && <p className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-fotus-blue" /><span className="truncate font-semibold text-fotus-blue">{occurrence.routedToName}</span></p>}
                      </div>
                      {occurrence.comments && <p className="mt-3 line-clamp-2 rounded-xl border border-fotus-blue/10 bg-fotus-neutral/28 p-2.5 text-[11px] leading-relaxed text-fotus-ink/80">{occurrence.comments}</p>}
                      <div className="mt-3 flex items-center justify-between border-t border-fotus-blue/10 pt-3">
                        <div><span className={`fotus-pill ${occurrence.approvalStatus === 'Aprovado' ? 'fotus-pill-blue' : occurrence.approvalStatus === 'Reprovado' ? 'fotus-pill-yellow' : 'fotus-pill-neutral'}`}>{occurrence.approvalStatus}</span><span className="ml-2 text-[10px] text-fotus-ink/80">{displayDate(occurrence.date)}</span></div>
                        <select aria-label="Alterar etapa" value={occurrence.stage} onChange={(event) => changeStage(occurrence, event.target.value as OccurrenceStage)} className="max-w-[118px] rounded-lg border border-fotus-blue/20 bg-fotus-neutral px-2 py-1 text-[10px] font-bold text-fotus-ink outline-none">
                          {STAGES.map((stage) => <option key={stage.id}>{stage.id}</option>)}
                        </select>
                      </div>
                    </article>
                  ))}
                  {hiddenCount > 0 && <button type="button" onClick={() => setVisibleByStage((current) => ({ ...current, [column.id]: columnOccurrences.length }))} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-fotus-blue/15 bg-fotus-neutral/80 px-4 py-3 text-xs font-extrabold text-fotus-blue shadow-sm hover:bg-fotus-neutral"><ChevronDown className="h-4 w-4" />Ver mais {hiddenCount} ocorrência(s)</button>}
                  {hiddenCount === 0 && columnOccurrences.length > 3 && <button type="button" onClick={() => setVisibleByStage((current) => ({ ...current, [column.id]: 3 }))} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-[10px] font-bold text-fotus-ink/80 hover:bg-fotus-neutral/70"><ChevronUp className="h-4 w-4" />Mostrar menos</button>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {mapOpen && <OccurrenceMap occurrences={matchingOccurrences} period={periodLabel} onClose={() => setMapOpen(false)} onFilter={(code) => { setCenterFilter(code); setMapOpen(false); }} />}
      <OccurrenceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} occurrence={editingOccurrence} currentUser={currentUser} organizationUnits={organizationUnits} agents={agents} />
    </div>
  );
}

function Ranking({ title, icon: Icon, items, total }: { title: string; icon: typeof Truck; items: Array<{ label: string; count: number }>; total: number }) {
  return (
    <div className="rounded-2xl border border-fotus-neutral bg-fotus-neutral/85 p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-xs font-extrabold text-fotus-ink"><Icon className="h-4 w-4 text-fotus-blue" />{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`}>
            <div className="mb-1 flex items-center justify-between gap-2 text-[11px]"><span className="truncate font-semibold text-fotus-ink">{index + 1}. {item.label}</span><strong className="text-fotus-ink">{item.count}</strong></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-fotus-neutral/70"><div className="h-full rounded-full bg-fotus-blue" style={{ width: `${Math.max(7, Math.round((item.count / total) * 100))}%` }} /></div>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-fotus-ink/80">Sem dados suficientes</p>}
      </div>
    </div>
  );
}

function DamageRanking({ title, items, total, icon: Icon }: { title: string; items: Array<{ label: string; total: number; count: number }>; total: number; icon: typeof Truck }) {
  const highest = items[0]?.total || 1;
  return <div className="rounded-2xl border border-fotus-yellow/12 bg-fotus-neutral/90 p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 text-xs font-extrabold text-fotus-ink"><Icon className="h-4 w-4 text-fotus-ink" />{title}</h3><p className="mt-1 text-[10px] text-fotus-ink/80">Somente cards marcados como avaria com valor informado.</p></div><strong className="shrink-0 rounded-full bg-fotus-yellow/12 px-3 py-1 text-[10px] text-fotus-ink">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div><div className="mt-4 space-y-3">{items.map((item, index) => <div key={item.label}><div className="mb-1 flex items-center justify-between gap-3"><span className="truncate text-[11px] font-semibold text-fotus-ink">{index + 1}. {item.label} <small className="text-fotus-ink/80">({item.count})</small></span><strong className="shrink-0 text-[11px] text-fotus-ink">{item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div><div className="h-2 overflow-hidden rounded-full bg-fotus-yellow/20"><div className="h-full rounded-full bg-fotus-yellow" style={{ width: `${Math.max(4, (item.total / highest) * 100)}%` }} /></div></div>)}{!items.length && <p className="rounded-xl border border-dashed border-fotus-blue/20 p-5 text-center text-xs text-fotus-ink/80">Ainda não há valor de avaria neste período.</p>}</div></div>;
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
  const annualDisplayed = chartData.reduce((sum, month) => sum + month.value, 0);

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-fotus-blue/10 bg-fotus-neutral/90 shadow-sm">
      <div className="border-b border-fotus-blue/10 bg-gradient-to-r from-fotus-neutral via-fotus-neutral to-fotus-blue/6 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-fotus-blue"><LineChart className="h-4 w-4" />Performance mensal</p><h2 className="mt-1 text-lg font-extrabold text-fotus-ink">{dimensionTitle} · {year}</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-fotus-ink/80">As barras representam os meses. Em <strong>Todos</strong>, cada barra soma todas as ocorrências; selecione uma opção para acompanhar seu resultado individual.</p></div>
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-fotus-neutral/90 bg-fotus-neutral/80 p-1.5 shadow-sm">
            {ANALYTICS_DIMENSIONS.map((item) => <button key={item.id} type="button" onClick={() => onDimensionChange(item.id)} className={`rounded-xl px-3 py-2 text-[11px] font-extrabold transition-all ${dimension === item.id ? 'bg-fotus-yellow text-fotus-ink shadow-sm' : 'text-fotus-ink hover:bg-fotus-neutral/40'}`}>{item.label}</button>)}
          </div>
        </div>
      </div>

      {!!annualRanking.length && (
        <div className="border-b border-fotus-blue/10 bg-fotus-neutral px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-extrabold text-fotus-ink"><Trophy className="h-4 w-4 text-fotus-yellow" />{rankingTitle} em {year}</p>
              <p className="mt-1 text-[10px] text-fotus-ink/80">A posição considera o total de cards no ano. Clique em uma linha para ver a evolução mensal.</p>
            </div>
            <button type="button" onClick={() => onSelectSeries('Todos')} className={`mt-2 w-fit rounded-full border px-3 py-1.5 text-[10px] font-extrabold transition-all sm:mt-0 ${effectiveSeries === 'Todos' ? 'border-fotus-yellow bg-fotus-yellow text-fotus-ink shadow-sm' : 'border-fotus-blue/20 bg-fotus-neutral text-fotus-ink hover:border-fotus-blue/30'}`}>{allItemsButton}</button>
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
                  className={`group rounded-2xl border p-3 text-left transition-all ${isSelected ? 'border-fotus-blue bg-fotus-blue/6 shadow-sm' : isLeader ? 'border-fotus-yellow/25 bg-fotus-yellow/5 hover:border-fotus-yellow/45' : 'border-fotus-blue/20 bg-fotus-neutral hover:border-fotus-blue/30 hover:bg-fotus-neutral/40'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${isLeader ? 'bg-fotus-yellow text-fotus-ink' : 'bg-fotus-neutral/70 text-fotus-ink'}`}>{index + 1}º</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <strong className="truncate text-xs text-fotus-ink">{item.label}</strong>
                        {isLeader && <span className="rounded-full bg-fotus-yellow/25 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-fotus-ink">Líder</span>}
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-fotus-ink/5"><span className={`block h-full rounded-full ${isLeader ? 'bg-fotus-yellow' : 'bg-fotus-blue'}`} style={{ width: `${progress}%` }} /></span>
                    </span>
                    <span className="shrink-0 text-right"><strong className="block text-sm text-fotus-ink">{item.total}</strong><span className="block text-[8px] font-bold uppercase tracking-wide text-fotus-ink/80">cards</span></span>
                  </div>
                </button>
              );
            })}
          </div>
          {dimension === 'agents' && <div className="mt-4 grid gap-2 rounded-2xl border border-fotus-blue/12 bg-fotus-blue/4 p-3 sm:grid-cols-[1fr_auto]"><div><p className="text-[10px] font-extrabold uppercase tracking-wide text-fotus-blue">Comparativo médio da equipe</p><p className="mt-1 text-xs text-fotus-ink">{effectiveSeries === 'Todos' ? <>A média anual é de <strong>{teamAverage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} cards por agente</strong>.</> : <><strong>{effectiveSeries}</strong> registrou {selectedAnnual?.total || 0} cards, diferença de <strong>{((selectedAnnual?.total || 0) - teamAverage) >= 0 ? '+' : ''}{((selectedAnnual?.total || 0) - teamAverage).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</strong> em relação à média.</>}</p><p className="mt-1 text-[9px] leading-relaxed text-fotus-ink/80">Este comparativo mede somente volume de cards. Não é uma nota de desempenho, pois cada pessoa pode exercer outras atividades no setor.</p></div><div className="flex items-center gap-2 sm:text-right"><span className="rounded-xl bg-fotus-neutral px-3 py-2"><small className="block text-[8px] font-bold uppercase text-fotus-ink/80">Média mensal</small><strong className="text-sm text-fotus-blue">{(teamAverage / 12).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</strong></span></div></div>}
        </div>
      )}

      <div className="border-b border-fotus-blue/10 bg-fotus-neutral/28 px-5 py-3 text-[10px] text-fotus-ink">
        {effectiveSeries === 'Todos'
          ? <>Você está vendo o <strong className="text-fotus-ink">total mensal de {allItemsLabel}</strong>.</>
          : <>Você está vendo somente <strong className="text-fotus-blue">{effectiveSeries}</strong>. Clique em “{allItemsButton}” para voltar.</>}
      </div>
      <div className="p-3 sm:p-5"><PillBarChart data={chartData} ariaLabel={`Gráfico mensal de ${dimensionTitle} em ${year}`} valueFormatter={(value) => `${value} cards`} primaryLabel={effectiveSeries === 'Todos' ? allItemsLabel : effectiveSeries} emptyMessage="Ainda não há ocorrências para montar o gráfico deste ano." /></div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-fotus-blue/10 bg-fotus-neutral/28 px-5 py-3 text-[10px] text-fotus-ink/80"><span>Seleção atual: <strong className="text-fotus-ink">{effectiveSeries}</strong></span><span>Total exibido: <strong className="text-fotus-ink">{annualDisplayed} cards</strong></span></div>
    </section>
  );
}
