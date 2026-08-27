import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowRight, 
  ArrowLeft, 
  DollarSign, 
  Building, 
  User, 
  Truck, 
  Wrench, 
  Briefcase, 
  Compass, 
  Award, 
  Tag as TagIcon, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  MoreHorizontal,
  LayoutGrid,
  Kanban as KanbanIcon
} from 'lucide-react';
import { CXCase, CaseStatus, Department } from '../types';
import { DEPARTMENTS, DEPARTMENT_LIST } from '../lib/departments';
import { db, updateDoc, doc } from '../lib/firebase';
import { cn } from '../lib/utils';

interface CxKanbanViewProps {
  cases: CXCase[];
  onNewCase: () => void;
  onEditCase: (c: CXCase) => void;
  onSeedDemoData?: () => void;
}

const COLUMNS: { id: CaseStatus; label: string; dotColor: string; bgCol: string; borderCol: string }[] = [
  { id: 'Aberto', label: 'Aberto', dotColor: 'bg-amber-500', bgCol: 'bg-amber-50/40', borderCol: 'border-amber-200/60' },
  { id: 'Em Andamento', label: 'Em Andamento', dotColor: 'bg-blue-500', bgCol: 'bg-blue-50/40', borderCol: 'border-blue-200/60' },
  { id: 'Resolvido', label: 'Resolvido', dotColor: 'bg-emerald-500', bgCol: 'bg-emerald-50/40', borderCol: 'border-emerald-200/60' },
];

export default function CxKanbanView({ cases, onNewCase, onEditCase, onSeedDemoData }: CxKanbanViewProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'grid'>('kanban');
  const [search, setSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [activeSectorMenuCaseId, setActiveSectorMenuCaseId] = useState<string | null>(null);

  const getDepartmentIcon = (dept: Department) => {
    switch (dept) {
      case 'Logística': return <Truck className="w-3.5 h-3.5" />;
      case 'Financeiro': return <DollarSign className="w-3.5 h-3.5" />;
      case 'Suporte Técnico': return <Wrench className="w-3.5 h-3.5" />;
      case 'Diretoria': return <Briefcase className="w-3.5 h-3.5" />;
      case 'Coordenação': return <Compass className="w-3.5 h-3.5" />;
      case 'Liderança': return <Award className="w-3.5 h-3.5" />;
    }
  };

  const filteredCases = cases.filter(c => {
    if (selectedDeptFilter !== 'all' && c.targetDepartment !== selectedDeptFilter) {
      return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const match = 
        c.orderNumber.toLowerCase().includes(q) ||
        c.productCode.toLowerCase().includes(q) ||
        (c.targetDepartment && c.targetDepartment.toLowerCase().includes(q)) ||
        (c.departmentAssigneeName && c.departmentAssigneeName.toLowerCase().includes(q)) ||
        (c.extraCostReason && c.extraCostReason.toLowerCase().includes(q)) ||
        (c.tags && c.tags.some(t => t.toLowerCase().includes(q)));
      if (!match) return false;
    }
    return true;
  });

  const handleMoveStatus = async (e: React.MouseEvent, c: CXCase, newStatus: CaseStatus) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'cx_cases', c.id), {
        status: newStatus,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleAssignDepartment = async (e: React.MouseEvent, c: CXCase, dept: Department, memberName: string, memberEmail: string) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'cx_cases', c.id), {
        targetDepartment: dept,
        departmentAssigneeName: memberName,
        departmentAssigneeEmail: memberEmail,
        updatedAt: Date.now()
      });
      setActiveSectorMenuCaseId(null);
    } catch (err) {
      console.error('Error assigning department:', err);
    }
  };

  const totalExtraCosts = cases.reduce((acc, c) => acc + (c.totalExtraCost || 0), 0);

  return (
    <div className="space-y-5">
      
      {/* Top Header & Summary Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white/75 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total de Casos</p>
            <p className="text-xl font-extrabold text-gray-900">{cases.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
            {cases.length}
          </div>
        </div>

        <div className="bg-white/75 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Abertos</p>
            <p className="text-xl font-extrabold text-amber-900">{cases.filter(c => c.status === 'Aberto').length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/75 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Em Andamento</p>
            <p className="text-xl font-extrabold text-blue-900">{cases.filter(c => c.status === 'Em Andamento').length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/75 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Custos Extras</p>
            <p className="text-lg font-extrabold text-emerald-900">
              R$ {totalExtraCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Sector Quick Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white/60 backdrop-blur-md rounded-2xl border border-white/80 shadow-2xs overflow-x-auto max-w-full">
          <button
            onClick={() => setSelectedDeptFilter('all')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
              selectedDeptFilter === 'all'
                ? "bg-[#385041] text-white shadow-2xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
            )}
          >
            Todos os Setores
          </button>
          {DEPARTMENT_LIST.map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDeptFilter(dept)}
              className={cn(
                "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
                selectedDeptFilter === dept
                  ? `${DEPARTMENTS[dept].pillBg} ${DEPARTMENTS[dept].textColor} border ${DEPARTMENTS[dept].borderColor} shadow-2xs`
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
              )}
            >
              <span>{getDepartmentIcon(dept)}</span>
              <span>{dept}</span>
            </button>
          ))}
        </div>

        {/* View Switcher, Search & New Case */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Grid vs Kanban toggle */}
          <div className="flex items-center p-1 bg-white/70 backdrop-blur-md rounded-xl border border-gray-200/80 shadow-2xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === 'kanban' ? "bg-[#385041] text-white" : "text-gray-500 hover:text-gray-800"
              )}
              title="Visualização Kanban"
            >
              <KanbanIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === 'grid' ? "bg-[#385041] text-white" : "text-gray-500 hover:text-gray-800"
              )}
              title="Visualização em Grade"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar pedido, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white/80 border border-gray-200/80 rounded-xl text-xs focus:bg-white focus:border-[#385041] outline-none shadow-2xs"
            />
          </div>

          <button
            onClick={onNewCase}
            className="flex items-center gap-1.5 bg-[#385041] hover:bg-[#2c4033] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Caso CX</span>
          </button>
        </div>
      </div>

      {/* Render Kanban or Grid */}
      {viewMode === 'kanban' ? (
        /* KANBAN BOARD */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-start">
          {COLUMNS.map((col) => {
            const colCases = filteredCases.filter(c => c.status === col.id);
            return (
              <div 
                key={col.id}
                className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/90 shadow-[0_4px_25px_rgba(0,0,0,0.02)] p-3.5 flex flex-col min-h-[520px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`}></span>
                    <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">{col.label}</h3>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-gray-600 border border-gray-200/70 shadow-2xs">
                    {colCases.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colCases.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-xs">
                      Nenhum caso nesta coluna
                    </div>
                  ) : (
                    colCases.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => onEditCase(c)}
                        className="bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all p-3.5 flex flex-col gap-2.5 cursor-pointer relative group"
                      >
                        
                        {/* Status Transition Pills on top of card / above tags */}
                        <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-gray-50">
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {c.status !== 'Aberto' && (
                              <button
                                onClick={(e) => handleMoveStatus(e, c, 'Aberto')}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                                title="Mover para Aberto"
                              >
                                ← Aberto
                              </button>
                            )}
                            {c.status !== 'Em Andamento' && (
                              <button
                                onClick={(e) => handleMoveStatus(e, c, 'Em Andamento')}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                                title="Mover para Em Andamento"
                              >
                                {c.status === 'Aberto' ? 'Andamento →' : '← Andamento'}
                              </button>
                            )}
                            {c.status !== 'Resolvido' && (
                              <button
                                onClick={(e) => handleMoveStatus(e, c, 'Resolvido')}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                title="Mover para Resolvido"
                              >
                                Resolvido →
                              </button>
                            )}
                          </div>

                          {c.isReplacement && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                              Troca
                            </span>
                          )}
                        </div>

                        {/* Order Number & Product Code */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 block uppercase">Pedido</span>
                            <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#385041] transition-colors">
                              #{c.orderNumber}
                            </h4>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-gray-400 block uppercase">Produto</span>
                            <span className="text-xs font-semibold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                              {c.productCode} <span className="font-bold text-[#385041]">×{c.quantity}</span>
                            </span>
                          </div>
                        </div>

                        {/* Sector forwarding badge (Immersive Clickable) */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          {c.targetDepartment ? (
                            <div 
                              onClick={() => setActiveSectorMenuCaseId(activeSectorMenuCaseId === c.id ? null : c.id)}
                              className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${DEPARTMENTS[c.targetDepartment].pillBg} ${DEPARTMENTS[c.targetDepartment].borderColor}`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className={DEPARTMENTS[c.targetDepartment].textColor}>
                                  {getDepartmentIcon(c.targetDepartment)}
                                </span>
                                <span className={`font-bold ${DEPARTMENTS[c.targetDepartment].textColor} truncate`}>
                                  {c.targetDepartment}
                                </span>
                                {c.departmentAssigneeName && (
                                  <span className="text-gray-500 truncate text-[11px]">
                                    • {c.departmentAssigneeName.split(' ')[0]}
                                  </span>
                                )}
                              </div>
                              <MoreHorizontal className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            </div>
                          ) : (
                            <button
                              onClick={() => setActiveSectorMenuCaseId(activeSectorMenuCaseId === c.id ? null : c.id)}
                              className="w-full py-1.5 px-2 bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-200 rounded-xl text-[11px] font-semibold text-gray-500 flex items-center justify-center gap-1 transition-all"
                            >
                              <Building className="w-3 h-3 text-gray-400" />
                              <span>Direcionar Setor</span>
                            </button>
                          )}

                          {/* Quick Sector Reassign Popover */}
                          {activeSectorMenuCaseId === c.id && (
                            <div className="absolute left-0 top-full mt-1.5 z-30 w-64 bg-white rounded-2xl border border-gray-200 shadow-xl p-2.5 animate-in fade-in zoom-in-95 duration-150 space-y-1.5">
                              <p className="text-[10px] font-bold text-gray-400 uppercase px-1">Encaminhar para:</p>
                              {DEPARTMENT_LIST.map((dept) => {
                                const deptConf = DEPARTMENTS[dept];
                                const defaultMember = deptConf.members[0];
                                return (
                                  <button
                                    key={dept}
                                    onClick={(e) => handleAssignDepartment(e, c, dept, defaultMember.name, defaultMember.email)}
                                    className="w-full text-left p-1.5 rounded-xl hover:bg-gray-50 flex items-center justify-between text-xs transition-all"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className={`p-1 rounded-md ${deptConf.pillBg} ${deptConf.textColor}`}>
                                        {getDepartmentIcon(dept)}
                                      </span>
                                      <span className="font-semibold text-gray-800">{dept}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400">{defaultMember.name.split(' ')[0]}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Extra Costs Pill if present */}
                        {(c.totalExtraCost || 0) > 0 && (
                          <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-amber-900 truncate">
                              <DollarSign className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span className="font-semibold truncate text-[11px]">
                                {c.extraCostReason || 'Custo extra'}
                              </span>
                            </div>
                            <span className="font-extrabold text-amber-900 shrink-0 ml-1">
                              R$ {(c.totalExtraCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}

                        {/* Tags */}
                        {c.tags && c.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {c.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200/60"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Footer: Date & Assignee */}
                        <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400">
                          <span>{new Date(c.createdAt).toLocaleDateString('pt-BR')}</span>
                          {c.assigneeName && (
                            <span className="font-medium text-gray-600 truncate max-w-[120px]">
                              {c.assigneeName}
                            </span>
                          )}
                        </div>

                      </div>
                    ))
                  )}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* MINIMALIST GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map((c) => (
            <div
              key={c.id}
              onClick={() => onEditCase(c)}
              className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all p-4 flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      c.status === 'Aberto' ? 'bg-amber-500' :
                      c.status === 'Em Andamento' ? 'bg-blue-500' :
                      c.status === 'Resolvido' ? 'bg-emerald-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-xs font-bold text-gray-700">{c.status}</span>
                  </div>
                  {c.isReplacement && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      Troca
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <h4 className="text-base font-bold text-gray-900 group-hover:text-[#385041] transition-colors">
                    Pedido #{c.orderNumber}
                  </h4>
                  <span className="text-xs font-semibold text-gray-600">
                    {c.productCode} ×{c.quantity}
                  </span>
                </div>

                {c.targetDepartment && (
                  <div className={`mb-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${DEPARTMENTS[c.targetDepartment].pillBg} ${DEPARTMENTS[c.targetDepartment].textColor} ${DEPARTMENTS[c.targetDepartment].borderColor}`}>
                    {getDepartmentIcon(c.targetDepartment)}
                    <span>{c.targetDepartment}</span>
                    {c.departmentAssigneeName && (
                      <span className="font-normal opacity-80">({c.departmentAssigneeName})</span>
                    )}
                  </div>
                )}

                {(c.totalExtraCost || 0) > 0 && (
                  <div className="mb-2.5 p-2 bg-amber-50 rounded-xl border border-amber-200/80 text-xs flex justify-between items-center text-amber-900">
                    <span className="truncate">{c.extraCostReason || 'Custo extra'}</span>
                    <span className="font-bold">
                      R$ {(c.totalExtraCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {c.observations && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                    {c.observations}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span>{new Date(c.createdAt).toLocaleDateString('pt-BR')}</span>
                <span className="font-medium text-gray-600">{c.assigneeName || 'Sem responsável'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredCases.length === 0 && (
        <div className="bg-white/50 backdrop-blur-md rounded-3xl border border-white p-12 text-center flex flex-col items-center justify-center">
          <Clock className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-base font-bold text-gray-800 mb-1">Nenhum caso CX encontrado</h3>
          <p className="text-xs text-gray-500 max-w-sm mb-4">
            Crie um novo caso ou carregue os exemplos de demonstração.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onNewCase}
              className="px-4 py-2 bg-[#385041] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#2c4033] transition-all"
            >
              Novo Caso
            </button>
            {onSeedDemoData && (
              <button
                onClick={onSeedDemoData}
                className="px-4 py-2 bg-white text-[#385041] border border-[#385041]/30 text-xs font-bold rounded-xl shadow-xs hover:bg-gray-50 transition-all"
              >
                Carregar Exemplos
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
