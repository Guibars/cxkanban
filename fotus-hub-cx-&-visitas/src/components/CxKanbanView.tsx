import { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  LayoutGrid,
  MapPinned,
  Package,
  Plus,
  Search,
  Tags,
  UserRoundCheck,
} from 'lucide-react';
import { db, doc, updateDoc } from '../lib/firebase';
import { CaseStatus, CXCase, OrganizationUnit } from '../types';

interface CxKanbanViewProps {
  cases: CXCase[];
  organizationUnits: OrganizationUnit[];
  onNewCase: () => void;
  onEditCase: (caseItem: CXCase) => void;
}

const COLUMNS: Array<{ id: CaseStatus; dot: string; panel: string }> = [
  { id: 'Aberto', dot: 'bg-amber-500', panel: 'border-amber-200 bg-amber-50/50' },
  { id: 'Em Andamento', dot: 'bg-blue-500', panel: 'border-blue-200 bg-blue-50/50' },
  { id: 'Resolvido', dot: 'bg-emerald-500', panel: 'border-emerald-200 bg-emerald-50/50' },
  { id: 'Cancelado', dot: 'bg-gray-400', panel: 'border-gray-200 bg-gray-50/60' },
];

export default function CxKanbanView({ cases, organizationUnits, onNewCase, onEditCase }: CxKanbanViewProps) {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('Todos');

  const activeUnits = useMemo(() => organizationUnits.filter((unit) => unit.active), [organizationUnits]);
  const departments = useMemo(() => [...new Set([
    ...activeUnits.map((unit) => unit.department),
    ...cases.map((item) => item.targetDepartment || '').filter(Boolean),
  ])].sort(), [activeUnits, cases]);

  const filteredCases = useMemo(() => {
    const query = search.trim().toLowerCase();
    return cases.filter((caseItem) => {
      if (departmentFilter !== 'Todos' && caseItem.targetDepartment !== departmentFilter) return false;
      if (!query) return true;
      return [
        caseItem.orderNumber,
        caseItem.productCode,
        caseItem.targetDepartment,
        caseItem.targetTeam,
        caseItem.targetRegional,
        caseItem.departmentAssigneeName,
        caseItem.observations,
        ...(caseItem.tags || []),
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [cases, departmentFilter, search]);

  const totalExtraCosts = cases.reduce((total, caseItem) => total + (caseItem.totalExtraCost || 0), 0);

  const changeStatus = async (caseItem: CXCase, status: CaseStatus) => {
    try {
      await updateDoc(doc(db, 'cx_cases', caseItem.id), { status, updatedAt: Date.now() });
    } catch (error) {
      console.error('Erro ao atualizar status do caso:', error);
    }
  };

  const assignUnit = async (caseItem: CXCase, unitId: string) => {
    const unit = activeUnits.find((item) => item.id === unitId);
    try {
      await updateDoc(doc(db, 'cx_cases', caseItem.id), {
        organizationUnitId: unit?.id || null,
        targetDepartment: unit?.department || null,
        targetTeam: unit?.teamName || null,
        targetRegional: unit?.regional || null,
        departmentAssigneeName: unit?.managerName || null,
        departmentAssigneeEmail: unit?.managerEmail || null,
        escalationLeaderName: unit?.leaderName || null,
        escalationLeaderEmail: unit?.leaderEmail || null,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Erro ao direcionar caso:', error);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total de casos', value: cases.length, icon: LayoutGrid, tone: 'bg-gray-100 text-gray-700' },
          { label: 'Abertos', value: cases.filter((item) => item.status === 'Aberto').length, icon: Clock3, tone: 'bg-amber-50 text-amber-700' },
          { label: 'Resolvidos', value: cases.filter((item) => item.status === 'Resolvido').length, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Custos confirmados', value: totalExtraCosts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: CircleDollarSign, tone: 'bg-blue-50 text-blue-700' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-white/90 bg-white/80 p-4 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">{label}</p><p className="mt-1 text-xl font-extrabold text-gray-950">{value}</p></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span></div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap gap-1.5 rounded-2xl border border-white/90 bg-white/60 p-1.5">
          <button onClick={() => setDepartmentFilter('Todos')} className={`rounded-xl px-3 py-2 text-xs font-bold ${departmentFilter === 'Todos' ? 'bg-[#385041] text-white' : 'text-gray-600 hover:bg-white'}`}>Todos</button>
          {departments.map((department) => <button key={department} onClick={() => setDepartmentFilter(department)} className={`rounded-xl px-3 py-2 text-xs font-bold ${departmentFilter === department ? 'bg-[#385041] text-white' : 'text-gray-600 hover:bg-white'}`}>{department}</button>)}
        </div>
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1 sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pedido, produto, time..." className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#385041]" /></label>
          <button onClick={onNewCase} className="flex shrink-0 items-center gap-2 rounded-xl bg-[#385041] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#2c4033]"><Plus className="h-4 w-4" />Novo caso</button>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white/60 px-6 py-16 text-center">
          <LayoutGrid className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-base font-extrabold text-gray-800">Nenhum caso CX cadastrado</h3>
          <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-gray-500">Os exemplos automáticos foram removidos. Novos cards serão criados apenas com dados reais e poderão usar a estrutura de direcionamento.</p>
          <button onClick={onNewCase} className="mt-5 rounded-xl bg-[#385041] px-4 py-2.5 text-xs font-bold text-white">Criar primeiro caso</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {COLUMNS.map((column) => {
            const columnCases = filteredCases.filter((caseItem) => caseItem.status === column.id);
            return (
              <section key={column.id} className={`min-h-[440px] rounded-2xl border p-3 ${column.panel}`}>
                <div className="mb-3 flex items-center justify-between border-b border-black/5 px-1 pb-3"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} /><h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800">{column.id}</h3></div><span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-gray-600 shadow-sm">{columnCases.length}</span></div>
                <div className="space-y-3">
                  {columnCases.length === 0 ? <p className="py-10 text-center text-xs text-gray-400">Nenhum card nesta etapa</p> : columnCases.map((caseItem) => (
                    <article key={caseItem.id} onClick={() => onEditCase(caseItem)} className="cursor-pointer rounded-2xl border border-white bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-extrabold uppercase text-gray-400">Pedido</p><h4 className="text-sm font-extrabold text-gray-950">#{caseItem.orderNumber}</h4></div>{caseItem.isReplacement && <span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-extrabold uppercase text-violet-700">Troca</span>}</div>
                      <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 p-2.5 text-xs font-semibold text-gray-700"><Package className="h-4 w-4 text-gray-400" /><span className="truncate">{caseItem.productCode}</span><strong className="ml-auto text-[#385041]">×{caseItem.quantity}</strong></div>

                      <div className="mt-3" onClick={(event) => event.stopPropagation()}>
                        <select aria-label="Direcionar caso" value={caseItem.organizationUnitId || ''} onChange={(event) => assignUnit(caseItem, event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-gray-600 outline-none focus:border-[#385041]">
                          <option value="">Sem direcionamento</option>
                          {activeUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.teamName} • {unit.regional} → {unit.managerName}</option>)}
                        </select>
                      </div>

                      {caseItem.targetDepartment && <div className="mt-3 space-y-1.5 rounded-xl border border-[#385041]/10 bg-[#f5f8f4] p-2.5 text-[11px]"><p className="flex items-center gap-2 font-bold text-[#385041]"><Building2 className="h-3.5 w-3.5" />{caseItem.targetDepartment} • {caseItem.targetTeam}</p>{caseItem.targetRegional && <p className="flex items-center gap-2 text-gray-500"><MapPinned className="h-3.5 w-3.5" />{caseItem.targetRegional}</p>}{caseItem.departmentAssigneeName && <p className="flex items-center gap-2 text-gray-600"><UserRoundCheck className="h-3.5 w-3.5" />{caseItem.departmentAssigneeName}</p>}</div>}

                      {caseItem.tags && caseItem.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1"><Tags className="mr-1 h-3.5 w-3.5 text-gray-400" />{caseItem.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold text-gray-600">{tag}</span>)}</div>}
                      {caseItem.observations && <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-gray-500">{caseItem.observations}</p>}
                      {(caseItem.totalExtraCost || 0) > 0 && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2 text-[11px] font-bold text-amber-800">{(caseItem.totalExtraCost || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em custos extras</p>}

                      <div className="mt-3 border-t border-gray-100 pt-3" onClick={(event) => event.stopPropagation()}>
                        <select aria-label="Alterar status" value={caseItem.status} onChange={(event) => changeStatus(caseItem, event.target.value as CaseStatus)} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-600 outline-none">{COLUMNS.map((item) => <option key={item.id}>{item.id}</option>)}</select>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
