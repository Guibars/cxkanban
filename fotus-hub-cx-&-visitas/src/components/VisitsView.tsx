import React, { useState, useMemo } from 'react';
import { Building2, Calendar, Clock, MapPin, User, Users, Plus, Search, Filter, CheckCircle2, AlertCircle, ArrowRight, MessageSquareQuote, Trash2 } from 'lucide-react';
import { IntegratorVisit, VisitStatus } from '../types';
import type { CurrentUser } from '../lib/currentUser';
import { deleteData, updateData } from '../lib/dataMutations';
import { cn } from '../lib/utils';

interface VisitsViewProps {
  visits: IntegratorVisit[];
  onNewVisit: () => void;
  onEditVisit: (visit: IntegratorVisit) => void;
  currentUser: CurrentUser;
  canDeleteVisits: boolean;
}

export default function VisitsView({ visits, onNewVisit, onEditVisit, currentUser, canDeleteVisits }: VisitsViewProps) {
  const [statusFilter, setStatusFilter] = useState<'Todas' | VisitStatus>('Todas');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

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
      solicitadas: visits.filter(v => v.status === 'Solicitada').length,
      agendadas: visits.filter(v => v.status === 'Agendada').length,
      emAndamento: visits.filter(v => v.status === 'Em Andamento').length,
      concluidas: visits.filter(v => v.status === 'Concluída').length,
    };
  }, [visits]);

  const handleQuickStatusChange = async (e: React.MouseEvent, visit: IntegratorVisit, newStatus: VisitStatus) => {
    e.stopPropagation();
    try {
      await updateData(currentUser, 'integrator_visits', visit.id, {
        ...visit,
        status: newStatus,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error('Error updating visit status:', err);
    }
  };

  const handleDeleteVisit = async (event: React.MouseEvent, visit: IntegratorVisit) => {
    event.stopPropagation();
    if (!canDeleteVisits || deletingId) return;
    const confirmed = window.confirm(`Excluir definitivamente a visita de “${visit.integratorName}” em ${visit.visitDate.split('-').reverse().join('/')}? O card, o briefing e a logomarca serão removidos e não poderão ser recuperados pela plataforma.`);
    if (!confirmed) return;
    setDeleteError('');
    setDeletingId(visit.id);
    try {
      await deleteData(currentUser, 'integrator_visits', visit.id);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Não foi possível excluir a visita.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {deleteError && <div role="alert" className="rounded-xl border border-fotus-yellow/25 bg-fotus-yellow/7 px-4 py-3 text-xs font-semibold text-fotus-ink">{deleteError}</div>}
      
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-fotus-neutral/70 backdrop-blur-md p-4 rounded-2xl border border-fotus-blue/25 shadow-[0_4px_20px_rgb(69_68_68_/_0.02)] flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-fotus-blue/7 text-fotus-blue flex items-center justify-center"><Calendar className="w-5 h-5" /></div>
          <div><p className="text-[11px] font-bold text-fotus-blue uppercase tracking-wider">Solicitadas</p><p className="text-xl font-extrabold text-fotus-ink">{stats.solicitadas}</p></div>
        </div>

        <div className="bg-fotus-neutral/70 backdrop-blur-md p-4 rounded-2xl border border-fotus-neutral/80 shadow-[0_4px_20px_rgb(69_68_68_/_0.02)] flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-fotus-neutral/70 text-fotus-ink flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-fotus-ink/80 uppercase tracking-wider">Total de Visitas</p>
            <p className="text-xl font-extrabold text-fotus-ink">{stats.total}</p>
          </div>
        </div>

        <div className="bg-fotus-neutral/70 backdrop-blur-md p-4 rounded-2xl border border-fotus-neutral/80 shadow-[0_4px_20px_rgb(69_68_68_/_0.02)] flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-fotus-yellow/7 text-fotus-ink flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-fotus-ink uppercase tracking-wider">Agendadas</p>
            <p className="text-xl font-extrabold text-fotus-ink">{stats.agendadas}</p>
          </div>
        </div>

        <div className="bg-fotus-neutral/70 backdrop-blur-md p-4 rounded-2xl border border-fotus-neutral/80 shadow-[0_4px_20px_rgb(69_68_68_/_0.02)] flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-fotus-blue/7 text-fotus-blue flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-fotus-blue uppercase tracking-wider">Em Andamento</p>
            <p className="text-xl font-extrabold text-fotus-ink">{stats.emAndamento}</p>
          </div>
        </div>

        <div className="bg-fotus-neutral/70 backdrop-blur-md p-4 rounded-2xl border border-fotus-neutral/80 shadow-[0_4px_20px_rgb(69_68_68_/_0.02)] flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-fotus-blue/7 text-fotus-blue flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-fotus-blue uppercase tracking-wider">Concluídas</p>
            <p className="text-xl font-extrabold text-fotus-ink">{stats.concluidas}</p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-fotus-neutral/60 backdrop-blur-md rounded-2xl border border-fotus-neutral/80 shadow-xs">
          {(['Todas', 'Solicitada', 'Agendada', 'Em Andamento', 'Concluída', 'Cancelada'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                statusFilter === st 
                  ? "bg-fotus-blue text-fotus-neutral shadow-2xs" 
                  : "text-fotus-ink hover:text-fotus-ink hover:bg-fotus-neutral/60"
              )}
            >
              {st === 'Todas' ? 'Todas as Visitas' : st}
            </button>
          ))}
        </div>

        {/* Search & New Visit */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fotus-ink/80" />
            <input
              type="text"
              placeholder="Buscar integrador, anfitrião..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-fotus-neutral/70 border border-fotus-blue/14 rounded-xl text-xs focus:bg-fotus-neutral focus:border-fotus-blue outline-none transition-all shadow-2xs"
            />
          </div>

          <button
            onClick={onNewVisit}
            className="flex items-center gap-2 bg-fotus-blue hover:bg-fotus-blue text-fotus-neutral px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar Visita</span>
          </button>
        </div>
      </div>

      {/* Visits List / Grid */}
      {filteredVisits.length === 0 ? (
        <div className="bg-fotus-neutral/50 backdrop-blur-md rounded-3xl border border-fotus-neutral p-12 text-center flex flex-col items-center justify-center">
          <Building2 className="w-12 h-12 text-fotus-ink/50 mb-3" />
          <h3 className="text-base font-bold text-fotus-ink mb-1">Nenhuma visita encontrada</h3>
          <p className="text-xs text-fotus-ink/80 max-w-sm mb-4">
            Não há visitas cadastradas com os filtros selecionados.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onNewVisit}
              className="px-4 py-2 bg-fotus-blue text-fotus-neutral text-xs font-bold rounded-xl shadow-xs hover:bg-fotus-blue transition-all"
            >
              Nova Visita
            </button>
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
                className="fotus-glass-card rounded-3xl p-5 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
              >
                {/* Status Bar Top Line */}
                <div className={`h-1.5 w-full absolute top-0 left-0 ${
                  visit.status === 'Solicitada' ? 'bg-fotus-blue' :
                  visit.status === 'Agendada' ? 'bg-fotus-yellow' :
                  visit.status === 'Em Andamento' ? 'bg-fotus-blue' :
                  visit.status === 'Concluída' ? 'bg-fotus-blue' : 'bg-fotus-neutral'
                }`} />

                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`fotus-pill ${visit.status === 'Concluída' ? 'fotus-pill-solid' : visit.status === 'Agendada' ? 'fotus-pill-yellow' : visit.status === 'Cancelada' ? 'fotus-pill-neutral' : 'fotus-pill-blue'}`}>
                      {visit.status}
                    </span>

                    <div className="flex items-center gap-1.5 text-xs text-fotus-ink bg-fotus-neutral/40 px-2.5 py-0.5 rounded-full border border-fotus-blue/12 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-fotus-ink/80" />
                      <span>{visit.visitDate.split('-').reverse().join('/')}</span>
                      {visit.visitTime && <span className="text-fotus-ink/80">• {visit.visitTime}</span>}
                    </div>
                  </div>

                  {/* Integrator & Contact */}
                  <div className="mb-3">
                    <h3 className="text-base font-bold text-fotus-ink group-hover:text-fotus-blue transition-colors leading-snug">
                      {visit.integratorName}
                    </h3>
                    <p className="text-xs text-fotus-ink/80 flex items-center gap-1 mt-0.5">
                      <User className="w-3.5 h-3.5 text-fotus-ink/80" />
                      <span>{visit.requestSource === 'conecta' ? `Solicitante: ${visit.requesterName || visit.contactPerson}` : visit.contactPerson}</span>
                      {visit.cityState && <span className="text-fotus-ink/80">• {visit.cityState}</span>}
                    </p>
                  </div>

                  {/* Objective */}
                  <div className="p-3 bg-fotus-neutral/32 rounded-xl border border-fotus-blue/10 mb-3 text-xs">
                    <p className="font-semibold text-fotus-ink line-clamp-2">{visit.objective}</p>
                  </div>

                  {/* Feedback preview if present */}
                  {visit.feedback && (
                    <div className="p-2.5 bg-fotus-blue/4 rounded-xl border border-fotus-blue/15 mb-3 text-[11px] text-fotus-blue flex items-start gap-1.5">
                      <MessageSquareQuote className="w-3.5 h-3.5 text-fotus-blue shrink-0 mt-0.5" />
                      <p className="line-clamp-2 italic">"{visit.feedback}"</p>
                    </div>
                  )}
                </div>

                {/* Footer & Fast Actions */}
                <div className="pt-3 border-t border-fotus-blue/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-fotus-blue/6 text-fotus-blue flex items-center justify-center font-bold text-[10px]">
                      {visit.hostName?.[0]?.toUpperCase() || 'F'}
                    </div>
                    <span className="text-fotus-ink font-medium truncate max-w-[110px]" title={visit.hostName}>
                      {visit.hostName}
                    </span>
                  </div>

                  {/* Quick Status Pill Advancer */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {visit.status === 'Solicitada' && <button onClick={(e) => handleQuickStatusChange(e, visit, 'Agendada')} className="px-2 py-1 bg-fotus-blue/7 text-fotus-blue hover:bg-fotus-blue/12 border border-fotus-blue/25 rounded-lg text-[10px] font-bold transition-all">Confirmar</button>}
                    {visit.status === 'Agendada' && (
                      <button
                        onClick={(e) => handleQuickStatusChange(e, visit, 'Em Andamento')}
                        className="px-2 py-1 bg-fotus-blue/7 text-fotus-blue hover:bg-fotus-blue/12 border border-fotus-blue/25 rounded-lg text-[10px] font-bold transition-all"
                      >
                        Iniciar
                      </button>
                    )}
                    {visit.status === 'Em Andamento' && (
                      <button
                        onClick={(e) => handleQuickStatusChange(e, visit, 'Concluída')}
                        className="px-2 py-1 bg-fotus-blue/7 text-fotus-blue hover:bg-fotus-blue/12 border border-fotus-blue/25 rounded-lg text-[10px] font-bold transition-all"
                      >
                        Concluir
                      </button>
                    )}
                    {canDeleteVisits && <button
                      type="button"
                      onClick={(event) => void handleDeleteVisit(event, visit)}
                      disabled={deletingId === visit.id}
                      aria-label={`Excluir visita de ${visit.integratorName}`}
                      title="Excluir visita definitivamente"
                      className="ml-1 rounded-lg p-1.5 text-fotus-ink/80 transition-colors hover:bg-fotus-yellow/7 hover:text-fotus-ink focus-visible:outline-2 focus-visible:outline-fotus-yellow disabled:cursor-wait disabled:opacity-40"
                    ><Trash2 className="h-4 w-4" /></button>}
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
