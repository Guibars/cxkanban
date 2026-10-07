import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  LoaderCircle,
  MapPin,
  MessageSquareQuote,
  Plus,
  Search,
  Trash2,
  User,
  Users,
} from 'lucide-react';
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

const visitStatuses = [
  'Todas',
  'Solicitada',
  'Agendada',
  'Em Andamento',
  'Concluída',
  'Cancelada',
] as const;
const statusClass = (status: VisitStatus) =>
  status === 'Agendada'
    ? 'fotus-pill-yellow'
    : status === 'Cancelada'
      ? 'fotus-pill-neutral'
      : status === 'Concluída'
        ? 'fotus-pill-solid'
        : 'fotus-pill-blue';
const nextVisitStatus: Partial<
  Record<VisitStatus, { status: VisitStatus; label: string }>
> = {
  Solicitada: { status: 'Agendada', label: 'Confirmar' },
  Agendada: { status: 'Em Andamento', label: 'Iniciar visita' },
  'Em Andamento': { status: 'Concluída', label: 'Concluir visita' },
};

export default function VisitsView({
  visits,
  onNewVisit,
  onEditVisit,
  currentUser,
  canDeleteVisits,
}: VisitsViewProps) {
  const [statusFilter, setStatusFilter] = useState<'Todas' | VisitStatus>(
    'Todas',
  );
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const filteredVisits = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return visits.filter((visit) => {
      if (statusFilter !== 'Todas' && visit.status !== statusFilter)
        return false;
      if (!term) return true;
      return [
        visit.integratorName,
        visit.contactPerson,
        visit.cityState,
        visit.hostName,
        visit.objective,
      ].some((value) => value?.toLocaleLowerCase('pt-BR').includes(term));
    });
  }, [visits, statusFilter, search]);

  const metrics = useMemo(
    () => [
      {
        label: 'Todas as visitas',
        count: visits.length,
        status: 'Todas' as const,
        icon: Building2,
      },
      {
        label: 'Solicitadas',
        count: visits.filter((visit) => visit.status === 'Solicitada').length,
        status: 'Solicitada' as const,
        icon: Calendar,
      },
      {
        label: 'Agendadas',
        count: visits.filter((visit) => visit.status === 'Agendada').length,
        status: 'Agendada' as const,
        icon: Clock,
      },
      {
        label: 'Em andamento',
        count: visits.filter((visit) => visit.status === 'Em Andamento').length,
        status: 'Em Andamento' as const,
        icon: Users,
      },
      {
        label: 'Concluídas',
        count: visits.filter((visit) => visit.status === 'Concluída').length,
        status: 'Concluída' as const,
        icon: CheckCircle2,
      },
    ],
    [visits],
  );

  const handleQuickStatusChange = async (
    event: React.MouseEvent,
    visit: IntegratorVisit,
    newStatus: VisitStatus,
  ) => {
    event.stopPropagation();
    if (updatingId) return;
    setActionError('');
    setUpdatingId(visit.id);
    try {
      await updateData(currentUser, 'integrator_visits', visit.id, {
        ...visit,
        status: newStatus,
        updatedAt: Date.now(),
      });
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar o status da visita.',
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteVisit = async (
    event: React.MouseEvent,
    visit: IntegratorVisit,
  ) => {
    event.stopPropagation();
    if (!canDeleteVisits || deletingId) return;
    const confirmed = window.confirm(
      `Excluir definitivamente a visita de “${visit.integratorName}” em ${visit.visitDate.split('-').reverse().join('/')}? O card, o briefing e a logomarca serão removidos e não poderão ser recuperados pela plataforma.`,
    );
    if (!confirmed) return;
    setActionError('');
    setDeletingId(visit.id);
    try {
      await deleteData(currentUser, 'integrator_visits', visit.id);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir a visita.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="space-y-5">
      {actionError && (
        <div
          role="alert"
          className="rounded-2xl border border-fotus-yellow/40 bg-fotus-yellow/15 px-4 py-3 text-xs font-semibold text-fotus-ink"
        >
          {actionError}
        </div>
      )}
      <section className="fotus-glass relative overflow-hidden rounded-3xl p-4 sm:p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-20 h-60 w-60 rounded-full bg-fotus-yellow/10 blur-3xl"
        />
        <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-fotus-yellow/45 bg-fotus-yellow/20 text-fotus-blue">
              <Building2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-fotus-blue">
                Relacionamento · Fotus
              </p>
              <h2 className="mt-1 text-lg font-extrabold tracking-tight text-fotus-ink">
                Visitas de integradores
              </h2>
              <p className="mt-1 text-xs text-fotus-ink/75">
                Organize a recepção e acompanhe cada encontro.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNewVisit}
            className="fotus-action inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold"
          >
            <Plus className="h-4 w-4" /> Agendar visita
          </button>
        </div>
        <div className="relative grid grid-cols-2 gap-3 lg:grid-cols-5">
          {metrics.map(
            ({ label, count, status: metricStatus, icon: Icon }, index) => (
              <button
                key={metricStatus}
                type="button"
                onClick={() => setStatusFilter(metricStatus)}
                aria-pressed={statusFilter === metricStatus}
                className={cn(
                  'fotus-glass-inset flex min-w-0 items-center gap-3 rounded-2xl p-3 text-left transition-colors sm:p-4',
                  index === 0 && 'col-span-2 lg:col-span-1',
                  statusFilter === metricStatus && 'border-fotus-yellow/70',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    metricStatus === 'Agendada' || metricStatus === 'Todas'
                      ? 'bg-fotus-yellow/22 text-fotus-blue'
                      : 'bg-fotus-blue/6 text-fotus-blue',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold leading-snug text-fotus-ink/75">
                    {label}
                  </p>
                  <p className="mt-1 text-xl font-extrabold leading-none text-fotus-ink">
                    {count}
                  </p>
                </div>
              </button>
            ),
          )}
        </div>
      </section>

      <section
        aria-label="Filtros de visitas"
        className="fotus-glass rounded-2xl p-3 sm:p-4"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {visitStatuses.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatusFilter(option)}
                aria-pressed={statusFilter === option}
                className={cn(
                  'rounded-full px-3 py-2 text-[11px] font-bold transition-colors',
                  statusFilter === option
                    ? 'bg-fotus-yellow/85 text-fotus-ink shadow-xs'
                    : 'text-fotus-ink/80 hover:bg-fotus-neutral/65',
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <label className="relative block min-w-0 xl:w-72 xl:shrink-0">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fotus-blue"
            />
            <input
              aria-label="Buscar visitas"
              type="search"
              placeholder="Integrador, contato, anfitrião..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="field-input min-w-0 bg-fotus-neutral/45 pl-9 text-xs"
            />
          </label>
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs font-semibold text-fotus-ink/75">
          {filteredVisits.length}{' '}
          {filteredVisits.length === 1
            ? 'visita encontrada'
            : 'visitas encontradas'}
        </p>
        <span className="text-[11px] text-fotus-ink/65">
          Clique em um card para ver o briefing e editar.
        </span>
      </div>

      {filteredVisits.length === 0 ? (
        <div className="fotus-glass rounded-3xl px-5 py-12 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-fotus-yellow/20 text-fotus-blue">
            <Building2 className="h-6 w-6" />
          </span>
          <h3 className="text-base font-bold text-fotus-ink">
            Nenhuma visita encontrada
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-xs text-fotus-ink/75">
            Não há visitas com os filtros selecionados.
          </p>
          <button
            type="button"
            onClick={onNewVisit}
            className="fotus-action mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold"
          >
            <Plus className="h-4 w-4" /> Nova visita
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredVisits.map((visit) => {
            const isToday = visit.visitDate === todayKey;
            const nextAction = nextVisitStatus[visit.status];
            const isBusy = updatingId === visit.id || deletingId === visit.id;
            return (
              <article
                key={visit.id}
                onClick={() => onEditVisit(visit)}
                className="fotus-glass-card group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-3xl p-4 sm:p-5"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-fotus-yellow/8 blur-2xl"
                />
                <div className="relative mb-4 flex flex-wrap items-center justify-between gap-2">
                  <span className={cn('fotus-pill', statusClass(visit.status))}>
                    {visit.status === 'Concluída' && (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    {visit.status}
                  </span>
                  {visit.requestSource === 'conecta' && (
                    <span className="fotus-pill fotus-pill-neutral">
                      Via Conecta
                    </span>
                  )}
                </div>
                <div className="relative flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-fotus-blue/10 bg-fotus-neutral/50 text-fotus-blue">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-extrabold leading-snug text-fotus-ink transition-colors group-hover:text-fotus-blue">
                      {visit.integratorName}
                    </h3>
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-fotus-ink/75">
                      <User className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="break-words">
                        {visit.requestSource === 'conecta'
                          ? `Solicitante: ${visit.requesterName || visit.contactPerson}`
                          : visit.contactPerson}
                      </span>
                    </p>
                    {visit.cityState && (
                      <p className="mt-1 flex items-start gap-1.5 text-[11px] text-fotus-ink/70">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="break-words">{visit.cityState}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="fotus-glass-inset my-4 grid grid-cols-2 gap-3 rounded-2xl p-3">
                  <div className="min-w-0">
                    <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-fotus-ink/65">
                      <Calendar className="h-3 w-3" /> Data{' '}
                      {isToday && (
                        <span className="rounded-full bg-fotus-yellow/35 px-1.5 normal-case tracking-normal text-fotus-ink">
                          Hoje
                        </span>
                      )}
                    </p>
                    <p className="text-xs font-bold text-fotus-ink">
                      {visit.visitDate.split('-').reverse().join('/')}
                    </p>
                  </div>
                  <div className="min-w-0 border-l border-fotus-blue/10 pl-3">
                    <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-fotus-ink/65">
                      <Clock className="h-3 w-3" /> Horário
                    </p>
                    <p className="text-xs font-bold text-fotus-ink">
                      {visit.visitTime || 'Não informado'}
                      {visit.visitTime && visit.visitEndTime
                        ? `–${visit.visitEndTime}`
                        : ''}
                    </p>
                  </div>
                </div>
                <div className="mb-4 flex-1">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-fotus-blue">
                    Objetivo do encontro
                  </p>
                  <p className="line-clamp-3 break-words text-xs leading-relaxed text-fotus-ink">
                    {visit.objective}
                  </p>
                  {visit.feedback && (
                    <div className="mt-3 flex items-start gap-2 rounded-2xl border border-fotus-yellow/25 bg-fotus-yellow/7 p-3 text-xs text-fotus-ink">
                      <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-fotus-blue" />
                      <p className="line-clamp-2 break-words leading-relaxed">
                        {visit.feedback}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-t border-fotus-blue/10 pt-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-fotus-yellow/25 bg-fotus-yellow/18 text-[10px] font-extrabold text-fotus-blue">
                      {visit.hostName?.[0]?.toUpperCase() || 'F'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-fotus-ink/60">
                        Anfitrião Fotus
                      </p>
                      <p
                        className="max-w-48 truncate text-[11px] font-semibold text-fotus-ink"
                        title={visit.hostName}
                      >
                        {visit.hostName || 'Equipe Fotus'}
                      </p>
                    </div>
                  </div>
                  {!!visit.participantsCount && (
                    <span className="flex items-center gap-1.5 text-[11px] text-fotus-ink/70">
                      <Users className="h-3.5 w-3.5" />
                      {visit.participantsCount}{' '}
                      {visit.participantsCount === 1 ? 'pessoa' : 'pessoas'}
                    </span>
                  )}
                </div>
                <div
                  className="flex flex-wrap items-center justify-between gap-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onEditVisit(visit)}
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-2 text-[11px] font-bold text-fotus-blue transition-colors hover:bg-fotus-blue/6"
                    aria-label={`Ver detalhes da visita de ${visit.integratorName}`}
                  >
                    Ver detalhes <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex items-center gap-2">
                    {nextAction && (
                      <button
                        type="button"
                        disabled={isBusy || updatingId !== null}
                        onClick={(event) =>
                          void handleQuickStatusChange(
                            event,
                            visit,
                            nextAction.status,
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-full border border-fotus-yellow/40 bg-fotus-yellow/20 px-3 py-2 text-[11px] font-bold text-fotus-ink transition-colors hover:bg-fotus-yellow/35 disabled:cursor-wait disabled:opacity-50"
                      >
                        {updatingId === visit.id ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        {nextAction.label}
                      </button>
                    )}
                    {canDeleteVisits && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={(event) =>
                          void handleDeleteVisit(event, visit)
                        }
                        aria-label={`Excluir visita de ${visit.integratorName}`}
                        title="Excluir visita definitivamente"
                        className="rounded-full border border-fotus-blue/10 p-2 text-fotus-ink/65 transition-colors hover:bg-fotus-yellow/20 hover:text-fotus-ink disabled:cursor-wait disabled:opacity-40"
                      >
                        {deletingId === visit.id ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
