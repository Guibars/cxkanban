import React, { useState, useMemo } from 'react';
import { Building2, Calendar, Clock, MapPin, User, Users, Plus, Search, Filter, CheckCircle2, AlertCircle, ArrowRight, MessageSquareQuote } from 'lucide-react';
import { IntegratorVisit, VisitStatus } from '../types';
import { db, updateDoc, doc } from '../lib/firebase';
import { cn } from '../lib/utils';

interface VisitsViewProps {
  visits: IntegratorVisit[];
  onNewVisit: () => void;
  onEditVisit: (visit: IntegratorVisit) => void;
  onSeedDemoData?: () => void;
}

export default function VisitsView({ visits, onNewVisit, onEditVisit, onSeedDemoData }: VisitsViewProps) {
  const [statusFilter, setStatusFilter] = useState<'Todas' | VisitStatus>('Todas');
  const [search, setSearch] = useState('');

  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      if (statusFilter !== 'Todas' && v.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const matches = 
          v.integratorName.toLowerCase().includes(s) ||
          v.contactPerson.toLowerCase().includes(s) ||
          (v.cityState && v.cityState.toLowerCase().includes(s)) ||
          v.hostName.toLowerCase().includes(s) ||
          v.objective.toLowerCase().includes(s);
        if (!matches) return false;
      }
      return true;
    });
  }, [visits, statusFilter, search]);

  const stats = useMemo(() => {
    return {
      total: visits.length,
      agendadas: visits.filter(v => v.status === 'Agendada').length,
      emAndamento: visits.filter(v => v.status === 'Em Andamento').length,
      concluidas: visits.filter(v => v.status === 'Concluída').length,
    };
  }, [visits]);

  const handleQuickStatusChange = async (e: React.MouseEvent, visit: IntegratorVisit, newStatus: VisitStatus) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'integrator_visits', visit.id), {
        status: newStatus,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error('Error updating visit status:', err);
    }
  };

  const getStatusBadge = (status: VisitStatus) => {
    switch (status) {
      case 'Agendada':
        return 'bg-amber-50 text-amber-800 border-amber-200/80';
      case 'Em Andamento':
        return 'bg-blue-50 text-blue-800 border-blue-200/80';
      case 'Concluída':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
      case 'Cancelada':
        return 'bg-gray-50 text-gray-600 border-gray-200/80';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total de Visitas</p>
            <p className="text-xl font-extrabold text-gray-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Agendadas</p>
            <p className="text-xl font-extrabold text-gray-900">{stats.agendadas}</p>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Em Andamento</p>
            <p className="text-xl font-extrabold text-gray-900">{stats.emAndamento}</p>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Concluídas</p>
            <p className="text-xl font-extrabold text-gray-900">{stats.concluidas}</p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-white/60 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs">
          {(['Todas', 'Agendada', 'Em Andamento', 'Concluída', 'Cancelada'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                statusFilter === st 
                  ? "bg-[#385041] text-white shadow-2xs" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
              )}
            >
              {st === 'Todas' ? 'Todas as Visitas' : st}
            </button>
          ))}
        </div>

        {/* Search & New Visit */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar integrador, anfitrião..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/70 border border-gray-200/70 rounded-xl text-xs focus:bg-white focus:border-[#385041] outline-none transition-all shadow-2xs"
            />
          </div>

          <button
            onClick={onNewVisit}
            className="flex items-center gap-2 bg-[#385041] hover:bg-[#2c4033] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar Visita</span>
          </button>
        </div>
      </div>

      {/* Visits List / Grid */}
      {filteredVisits.length === 0 ? (
        <div className="bg-white/50 backdrop-blur-md rounded-3xl border border-white p-12 text-center flex flex-col items-center justify-center">
          <Building2 className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-base font-bold text-gray-800 mb-1">Nenhuma visita encontrada</h3>
          <p className="text-xs text-gray-500 max-w-sm mb-4">
            Não há visitas cadastradas com os filtros selecionados.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onNewVisit}
              className="px-4 py-2 bg-[#385041] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#2c4033] transition-all"
            >
              Nova Visita
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredVisits.map((visit) => {
            const isToday = visit.visitDate === new Date().toISOString().split('T')[0];
            return (
              <div
                key={visit.id}
                onClick={() => onEditVisit(visit)}
                className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all p-5 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
              >
                {/* Status Bar Top Line */}
                <div className={`h-1.5 w-full absolute top-0 left-0 ${
                  visit.status === 'Agendada' ? 'bg-amber-400' :
                  visit.status === 'Em Andamento' ? 'bg-blue-500' :
                  visit.status === 'Concluída' ? 'bg-emerald-500' : 'bg-gray-400'
                }`} />

                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border", getStatusBadge(visit.status))}>
                      {visit.status}
                    </span>

                    <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-200/60 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      <span>{visit.visitDate.split('-').reverse().join('/')}</span>
                      {visit.visitTime && <span className="text-gray-400">• {visit.visitTime}</span>}
                    </div>
                  </div>

                  {/* Integrator & Contact */}
                  <div className="mb-3">
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-[#385041] transition-colors leading-snug">
                      {visit.integratorName}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span>{visit.contactPerson}</span>
                      {visit.cityState && <span className="text-gray-400">• {visit.cityState}</span>}
                    </p>
                  </div>

                  {/* Objective */}
                  <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 mb-3 text-xs">
                    <p className="font-semibold text-gray-800 line-clamp-2">{visit.objective}</p>
                  </div>

                  {/* Feedback preview if present */}
                  {visit.feedback && (
                    <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200/60 mb-3 text-[11px] text-emerald-900 flex items-start gap-1.5">
                      <MessageSquareQuote className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                      <p className="line-clamp-2 italic">"{visit.feedback}"</p>
                    </div>
                  )}
                </div>

                {/* Footer & Fast Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#e8efe0] text-[#385041] flex items-center justify-center font-bold text-[10px]">
                      {visit.hostName?.[0]?.toUpperCase() || 'F'}
                    </div>
                    <span className="text-gray-600 font-medium truncate max-w-[110px]" title={visit.hostName}>
                      {visit.hostName}
                    </span>
                  </div>

                  {/* Quick Status Pill Advancer */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {visit.status === 'Agendada' && (
                      <button
                        onClick={(e) => handleQuickStatusChange(e, visit, 'Em Andamento')}
                        className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-[10px] font-bold transition-all"
                      >
                        Iniciar
                      </button>
                    )}
                    {visit.status === 'Em Andamento' && (
                      <button
                        onClick={(e) => handleQuickStatusChange(e, visit, 'Concluída')}
                        className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-bold transition-all"
                      >
                        Concluir
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
