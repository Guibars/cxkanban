import { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  CircleDot,
  Clock3,
  MapPinned,
  Package,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Truck,
} from 'lucide-react';
import { db, doc, updateDoc } from '../lib/firebase';
import { Occurrence, OccurrenceStage, OrganizationUnit } from '../types';
import OccurrenceModal from './OccurrenceModal';

interface OccurrencesViewProps {
  occurrences: Occurrence[];
  organizationUnits: OrganizationUnit[];
  currentUser: User;
}

const STAGES: Array<{ id: OccurrenceStage; color: string; dot: string }> = [
  { id: 'Recebida', color: 'border-slate-200 bg-slate-50/70', dot: 'bg-slate-500' },
  { id: 'Em Análise', color: 'border-blue-200 bg-blue-50/60', dot: 'bg-blue-500' },
  { id: 'Aguardando Retorno', color: 'border-amber-200 bg-amber-50/60', dot: 'bg-amber-500' },
  { id: 'Finalizada', color: 'border-emerald-200 bg-emerald-50/60', dot: 'bg-emerald-500' },
];

function rankBy(items: string[], limit = 5) {
  const counts = new Map<string, { label: string; count: number }>();
  items.forEach((value) => {
    const label = value.trim();
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

export default function OccurrencesView({ occurrences, organizationUnits, currentUser }: OccurrencesViewProps) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'Todas' | OccurrenceStage>('Todas');
  const [showInsights, setShowInsights] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOccurrence, setEditingOccurrence] = useState<Occurrence | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return occurrences.filter((occurrence) => {
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
  }, [occurrences, search, stageFilter]);

  const insights = useMemo(() => ({
    carriers: rankBy(occurrences.map((item) => item.carrier)),
    products: rankBy(occurrences.map((item) => item.product)),
    regions: rankBy(occurrences.map((item) => item.region)),
    types: rankBy(occurrences.map((item) => item.occurrenceType)),
  }), [occurrences]);

  const finalized = occurrences.filter((item) => item.stage === 'Finalizada').length;
  const open = occurrences.length - finalized;
  const approved = occurrences.filter((item) => item.approvalStatus === 'Aprovado').length;
  const completionRate = occurrences.length ? Math.round((finalized / occurrences.length) * 100) : 0;

  const openNew = () => {
    setEditingOccurrence(null);
    setIsModalOpen(true);
  };

  const openEdit = (occurrence: Occurrence) => {
    setEditingOccurrence(occurrence);
    setIsModalOpen(true);
  };

  const changeStage = async (occurrence: Occurrence, stage: OccurrenceStage) => {
    try {
      await updateDoc(doc(db, 'occurrences', occurrence.id), { stage, updatedAt: Date.now() });
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Ocorrências', value: occurrences.length, icon: CircleDot, tone: 'bg-gray-100 text-gray-700' },
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
          <button onClick={openNew} className="flex items-center justify-center gap-2 rounded-xl bg-[#385041] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#2c4033]"><Plus className="h-4 w-4" /> Nova ocorrência</button>
        </div>
      </div>

      {showInsights && (
        <section className="rounded-3xl border border-[#385041]/10 bg-gradient-to-br from-[#eef5eb] via-white to-amber-50/50 p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#385041]">Leitura instantânea</p><h2 className="mt-1 text-xl font-extrabold text-gray-950">Insights gerais das ocorrências</h2><p className="mt-1 text-xs text-gray-500">Calculados em tempo real com os cards salvos no Firestore.</p></div>
            <div className="flex gap-2 text-xs"><span className="rounded-full bg-white px-3 py-1.5 font-bold text-gray-700 shadow-sm">{open} abertas</span><span className="rounded-full bg-emerald-100 px-3 py-1.5 font-bold text-emerald-800">{approved} aprovadas</span></div>
          </div>

          {occurrences.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-8 text-center text-sm text-gray-500">Os insights aparecerão assim que a primeira ocorrência for cadastrada.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Ranking title="Transportadoras mais citadas" icon={Truck} items={insights.carriers} total={occurrences.length} />
              <Ranking title="Produtos com mais ocorrências" icon={Package} items={insights.products} total={occurrences.length} />
              <Ranking title="Regiões com maior volume" icon={MapPinned} items={insights.regions} total={occurrences.length} />
              <Ranking title="Tipos mais frequentes" icon={BarChart3} items={insights.types} total={occurrences.length} />
            </div>
          )}
        </section>
      )}

      {occurrences.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white/60 px-6 py-16 text-center">
          <CircleDot className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-base font-extrabold text-gray-800">O controle está pronto para receber dados reais</h3>
          <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-gray-500">Nenhum registro da planilha foi copiado automaticamente. Cadastre uma nova ocorrência ou importe o histórico em uma etapa futura.</p>
          <button onClick={openNew} className="mt-5 rounded-xl bg-[#385041] px-4 py-2.5 text-xs font-bold text-white">Cadastrar primeira ocorrência</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {STAGES.map((column) => {
            const columnOccurrences = filtered.filter((item) => item.stage === column.id);
            return (
              <section key={column.id} className={`min-h-[420px] rounded-2xl border p-3 ${column.color}`}>
                <div className="mb-3 flex items-center justify-between border-b border-black/5 px-1 pb-3">
                  <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} /><h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800">{column.id}</h3></div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-gray-600 shadow-sm">{columnOccurrences.length}</span>
                </div>
                <div className="space-y-3">
                  {columnOccurrences.length === 0 ? <p className="py-10 text-center text-xs text-gray-400">Nenhum card nesta etapa</p> : columnOccurrences.map((occurrence) => (
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
                        <p className="flex items-center gap-2"><MapPinned className="h-3.5 w-3.5 text-gray-400" />{occurrence.state} • {occurrence.region}</p>
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
                </div>
              </section>
            );
          })}
        </div>
      )}

      <OccurrenceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} occurrence={editingOccurrence} currentUser={currentUser} organizationUnits={organizationUnits} />
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
