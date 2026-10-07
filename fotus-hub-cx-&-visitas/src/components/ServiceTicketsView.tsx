import { useMemo, useState } from 'react';
import { CalendarDays, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
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
  ExperienceMetric,
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
      <header className="fotus-glass flex flex-col justify-between gap-5 rounded-3xl border-fotus-yellow/40 p-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <img
            src="/neppo-ia-icon.png"
            alt="Atendimentos"
            className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-sm"
          />
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-fotus-blue">
              Atendimentos da equipe
            </p>
            <h2 className="mt-1 text-2xl font-extrabold">
              Cada solicitação, uma solução
            </h2>
            <p className="mt-2 text-xs text-fotus-ink/80">
              Centralize as tratativas e acompanhe os próximos passos.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => edit(null)}
          className="fotus-action flex w-fit shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-xs font-extrabold"
        >
          <Plus className="h-4 w-4" />
          Novo atendimento
        </button>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <ExperienceMetric
          label="Atendimentos"
          value={available.length}
          detail="Registros compartilhados com a equipe"
          yellow
        />
        <ExperienceMetric
          label="Em tratamento"
          value={
            available.filter((item) => item.status !== 'Finalizado').length
          }
          detail="Abertos ou em andamento"
        />
        <ExperienceMetric
          label="Finalizados"
          value={
            available.filter((item) => item.status === 'Finalizado').length
          }
          detail="Tratativas encerradas"
        />
      </div>
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
