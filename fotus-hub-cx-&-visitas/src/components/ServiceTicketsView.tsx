import { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react';
import type { CurrentUser } from '../lib/currentUser';
import { deleteData } from '../lib/dataMutations';
import {
  experienceDate,
  normalizedTopic,
  SERVICE_CATEGORIES,
  SERVICE_STATUSES,
} from '../lib/serviceDesk';
import type { ServiceTicket } from '../types';
import ExperienceRecordModal from './ExperienceRecordModal';
import {
  ExperienceDialog,
  ExperiencePagination,
  ExperienceSearch,
} from './ExperienceUi';

export default function ServiceTicketsView({
  tickets,
  currentUser,
  agents,
}: {
  tickets: ServiceTicket[];
  currentUser: CurrentUser;
  agents: string[];
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [status, setStatus] = useState('Todos');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceTicket | null>(null);
  const [selected, setSelected] = useState<ServiceTicket | null>(null);
  const [deleting, setDeleting] = useState('');
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const available = tickets.filter((ticket) => !deletedIds.has(ticket.id));
  const finalized = available.filter(
    (ticket) => ticket.status === 'Finalizado',
  ).length;
  const inTreatment = available.length - finalized;
  const opened = available.filter(
    (ticket) => ticket.status === 'Aberto',
  ).length;
  const inProgress = available.filter(
    (ticket) => ticket.status === 'Em Andamento',
  ).length;
  const completionRate = available.length
    ? (finalized / available.length) * 100
    : 0;

  const filtered = useMemo(() => {
    const term = normalizedTopic(search);
    return tickets.filter(
      (ticket) =>
        !deletedIds.has(ticket.id) &&
        (category === 'Todas' ||
          ticket.categories.includes(
            category as ServiceTicket['categories'][number],
          )) &&
        (status === 'Todos' || ticket.status === status) &&
        (!term ||
          normalizedTopic(
            [
              ticket.title,
              ticket.customerName,
              ticket.orderNumber,
              ticket.description,
              ticket.assigneeName,
              ticket.categories.join(' '),
            ].join(' '),
          ).includes(term)),
    );
  }, [tickets, search, category, status, deletedIds]);
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pages);
  const edit = (ticket: ServiceTicket | null) => {
    setSelected(null);
    setEditing(ticket);
    setFormOpen(true);
  };
  const remove = async (ticket: ServiceTicket) => {
    if (
      deleting ||
      !window.confirm(
        `Excluir o atendimento “${ticket.title}” para toda a equipe?`,
      )
    )
      return;
    setDeleting(ticket.id);
    setMessage('');
    try {
      await deleteData(currentUser, 'service_tickets', ticket.id);
      setDeletedIds((current) => new Set([...current, ticket.id]));
      setSelected(null);
      setMessage('Atendimento excluído.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir o atendimento.',
      );
    } finally {
      setDeleting('');
    }
  };
  const actions = (ticket: ServiceTicket) => (
    <>
      <button
        type="button"
        onClick={() => edit(ticket)}
        disabled={Boolean(deleting)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-fotus-blue/20 px-3 py-2 text-xs font-bold text-fotus-blue disabled:opacity-40"
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </button>
      <button
        type="button"
        onClick={() => void remove(ticket)}
        disabled={Boolean(deleting)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-fotus-yellow/50 bg-fotus-yellow/20 px-3 py-2 text-xs font-bold disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {deleting === ticket.id ? 'Excluindo...' : 'Excluir'}
      </button>
    </>
  );

  return (
    <div className="space-y-6">
      <section
        aria-label="Resumo dos atendimentos Neppo"
        className="overflow-hidden rounded-[30px] border border-fotus-neutral bg-fotus-neutral/80 pb-5 shadow-sm sm:pb-6"
      >
        <div className="relative overflow-hidden bg-fotus-blue">
          <img
            src="/neppo-banner.png"
            alt="Fotus e Neppo — ao seu lado, em cada projeto"
            className="block h-24 w-full object-cover object-[60%_center] sm:h-auto"
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-fotus-blue/20 to-transparent" />
        </div>
        <div className="relative z-10 mx-3 -mt-4 grid gap-5 rounded-[26px] border border-fotus-neutral/90 bg-fotus-neutral p-5 shadow-[0_18px_45px_rgb(13_81_142_/_0.12)] sm:mx-6 sm:-mt-6 lg:grid-cols-[1.1fr_1fr] lg:p-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <img
                src="/neppo-ia-icon.png"
                alt=""
                className="h-11 w-11 shrink-0 rounded-2xl object-cover shadow-sm"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-fotus-blue">
                  Neppo · Atendimentos da equipe
                </p>
                <h2 className="text-xl font-extrabold text-fotus-ink">
                  Cada solicitação, uma solução
                </h2>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-xs leading-relaxed text-fotus-ink/80">
              Centralize as tratativas e acompanhe a evolução dos atendimentos.
            </p>
            <dl className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
              {[
                {
                  label: 'Atendimentos',
                  value: available.length,
                  detail: 'Total registrado',
                },
                {
                  label: 'Em tratamento',
                  value: inTreatment,
                  detail: 'Abertos ou em andamento',
                },
                {
                  label: 'Finalizados',
                  value: finalized,
                  detail: 'Tratativas encerradas',
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="min-w-0 rounded-2xl border border-fotus-blue/10 bg-fotus-neutral/40 p-3"
                >
                  <dt className="break-words text-[9px] font-extrabold uppercase tracking-wide text-fotus-ink/80">
                    {metric.label}
                  </dt>
                  <dd className="mt-1 text-2xl font-extrabold text-fotus-blue">
                    {metric.value.toLocaleString('pt-BR')}
                  </dd>
                  <p className="mt-1 text-[10px] leading-relaxed text-fotus-ink/80">
                    {metric.detail}
                  </p>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[10px] font-bold text-fotus-blue">
              Visão geral · Todo o histórico de atendimentos
            </p>
          </div>
          <div className="fotus-glass flex min-w-0 flex-col justify-center rounded-3xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-fotus-yellow/25">
                  <CheckCircle2 className="h-6 w-6 text-fotus-blue" />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-fotus-ink/80">
                    Taxa de finalização
                  </p>
                  <h3 className="mt-1 text-sm font-extrabold text-fotus-blue">
                    Tratativas concluídas
                  </h3>
                </div>
              </div>
              <strong className="shrink-0 text-2xl font-extrabold text-fotus-blue">
                {completionRate.toLocaleString('pt-BR', {
                  maximumFractionDigits: 1,
                })}
                %
              </strong>
            </div>
            <div
              role="progressbar"
              aria-label="Percentual de atendimentos finalizados"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completionRate}
              className="mt-5 h-3 overflow-hidden rounded-full bg-fotus-yellow/40"
            >
              <span
                className="block h-full rounded-full bg-fotus-blue transition-[width] duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-fotus-ink/80">
              <span className="flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5 text-fotus-blue" />
                {opened} aberto(s) · {inProgress} em andamento
              </span>
              <span>
                {finalized} de {available.length} finalizados
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-fotus-blue/10 pt-3">
              <p className="text-[10px] text-fotus-ink/80">
                {available.length
                  ? 'Acompanhe cada etapa da operação.'
                  : 'Cadastre o primeiro atendimento.'}
              </p>
              <button
                type="button"
                onClick={() => edit(null)}
                className="fotus-action inline-flex w-fit shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-xs font-extrabold"
              >
                <Plus className="h-4 w-4" />
                Novo atendimento
              </button>
            </div>
          </div>
        </div>
      </section>
      <section className="fotus-glass space-y-4 rounded-2xl p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={category === 'Todas'}
            onClick={() => {
              setCategory('Todas');
              setPage(1);
            }}
            className={`fotus-pill ${category === 'Todas' ? 'fotus-pill-yellow' : 'fotus-pill-neutral'}`}
          >
            Todas as categorias
          </button>
          {SERVICE_CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => {
                setCategory(item);
                setPage(1);
              }}
              className={`fotus-pill ${category === item ? 'fotus-pill-yellow' : 'fotus-pill-neutral'}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <ExperienceSearch
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Buscar atendimento, cliente, pedido ou responsável"
          />
          <select
            aria-label="Filtrar status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="field-input"
          >
            <option>Todos</option>
            {SERVICE_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </section>
      {message && (
        <p
          role="status"
          className="rounded-xl border border-fotus-yellow/50 bg-fotus-yellow/20 p-3 text-xs font-semibold"
        >
          {message}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {filtered
          .slice((currentPage - 1) * 12, currentPage * 12)
          .map((ticket) => (
            <article
              key={ticket.id}
              className="fotus-glass-card flex min-w-0 flex-col rounded-3xl p-5"
            >
              <div className="mb-4 flex flex-wrap gap-2">
                {ticket.categories.map((item) => (
                  <span key={item} className="fotus-pill fotus-pill-yellow">
                    {item}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSelected(ticket)}
                className="min-w-0 text-left"
              >
                <span
                  className={`fotus-pill ${ticket.status === 'Finalizado' ? 'fotus-pill-neutral' : 'fotus-pill-blue'}`}
                >
                  {ticket.status}
                </span>
                <h3 className="mt-3 break-words text-lg font-extrabold text-fotus-ink">
                  {ticket.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-fotus-ink/80">
                  {ticket.description}
                </p>
                <span className="mt-3 inline-block text-[10px] font-extrabold text-fotus-blue">
                  Abrir atendimento →
                </span>
              </button>
              {ticket.customerName && (
                <p className="mt-4 break-words text-xs font-bold">
                  {ticket.customerName}
                </p>
              )}
              {ticket.orderNumber && (
                <p className="mt-1 text-xs text-fotus-ink/80">
                  Referência: {ticket.orderNumber}
                </p>
              )}
              <div className="my-4 flex flex-wrap gap-3 text-[10px] text-fotus-ink/80">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {experienceDate(ticket.date)}
                </span>
                <span className="flex min-w-0 items-center gap-1">
                  <UserRound className="h-3.5 w-3.5 shrink-0" />
                  {ticket.assigneeName}
                </span>
              </div>
              <footer className="mt-auto flex flex-wrap justify-end gap-2 border-t border-fotus-blue/10 pt-4">
                {actions(ticket)}
              </footer>
            </article>
          ))}
      </div>
      {!filtered.length && (
        <div className="rounded-3xl border border-dashed border-fotus-blue/20 p-10 text-center">
          <h3 className="font-extrabold">Nenhum atendimento encontrado</h3>
          <p className="mt-2 text-xs text-fotus-ink/80">
            Registre um atendimento ou ajuste os filtros.
          </p>
        </div>
      )}
      {filtered.length > 0 && (
        <ExperiencePagination
          page={currentPage}
          pages={pages}
          count={filtered.length}
          onChange={setPage}
        />
      )}
      {formOpen && (
        <ExperienceRecordModal
          key={editing?.id || 'new-ticket'}
          mode="ticket"
          record={editing}
          agents={agents}
          currentUser={currentUser}
          onClose={() => setFormOpen(false)}
        />
      )}
      {selected && (
        <ExperienceDialog
          title={selected.title}
          subtitle={`Atendimento de ${experienceDate(selected.date)} · ${selected.assigneeName}`}
          onClose={() => {
            if (!deleting) setSelected(null);
          }}
          footer={actions(selected)}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {selected.categories.map((category) => (
                <span key={category} className="fotus-pill fotus-pill-yellow">
                  {category}
                </span>
              ))}
              <span className="fotus-pill fotus-pill-blue">
                {selected.status}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <p className="break-words text-xs">
                <strong>Cliente / contato:</strong>{' '}
                {selected.customerName || 'Não informado'}
              </p>
              <p className="break-words text-xs">
                <strong>Pedido / referência:</strong>{' '}
                {selected.orderNumber || 'Não informado'}
              </p>
            </div>
            <section>
              <h3 className="text-xs font-extrabold">Descrição</h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                {selected.description}
              </p>
            </section>
            <section className="rounded-2xl border border-fotus-yellow/40 bg-fotus-yellow/10 p-4">
              <h3 className="text-xs font-extrabold">
                Solução / encaminhamento
              </h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                {selected.resolution || 'Nenhuma solução registrada ainda.'}
              </p>
            </section>
            <p className="text-[10px] text-fotus-ink/80">
              Criado por {selected.createdByName || selected.createdByEmail}
            </p>
          </div>
        </ExperienceDialog>
      )}
    </div>
  );
}
