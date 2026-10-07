import { useMemo, useState } from 'react';
import {
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  SlidersHorizontal,
  MessageSquareQuote,
  Pencil,
  Plus,
  RotateCcw,
  Target,
  Trash2,
} from 'lucide-react';
import type { CurrentUser } from '../lib/currentUser';
import { deleteData } from '../lib/dataMutations';
import {
  experienceDate,
  experienceToday,
  normalizedTopic,
  rankFeedback,
  vocOpportunities,
  VOC_KINDS,
  VOC_STATUSES,
} from '../lib/serviceDesk';
import type { VocFeedback } from '../types';
import ExperienceRecordModal from './ExperienceRecordModal';
import {
  ExperienceDialog,
  ExperienceField,
  ExperienceMetric,
  ExperiencePagination,
  ExperienceRanking,
  ExperienceSearch,
} from './ExperienceUi';

export default function VocView({
  feedback,
  currentUser,
  agents,
  canDelete,
}: {
  feedback: VocFeedback[];
  currentUser: CurrentUser;
  agents: string[];
  canDelete: boolean;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('Todos');
  const [theme, setTheme] = useState('Todos');
  const [area, setArea] = useState('Todas');
  const [status, setStatus] = useState('Todos');
  const [start, setStart] = useState(`${experienceToday().slice(0, 7)}-01`);
  const [end, setEnd] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VocFeedback | null>(null);
  const [selected, setSelected] = useState<VocFeedback | null>(null);
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState('');
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const available = useMemo(
    () => feedback.filter((item) => !deletedIds.has(item.id)),
    [feedback, deletedIds],
  );
  const filtered = useMemo(() => {
    const term = normalizedTopic(search);
    return available.filter(
      (item) =>
        (kind === 'Todos' || item.kind === kind) &&
        (theme === 'Todos' ||
          normalizedTopic(item.theme) === normalizedTopic(theme)) &&
        (area === 'Todas' ||
          normalizedTopic(item.responsibleArea) === normalizedTopic(area)) &&
        (status === 'Todos' || item.status === status) &&
        (!start || item.date >= start) &&
        (!end || item.date <= end) &&
        (!term ||
          normalizedTopic(
            [
              item.title,
              item.customerName,
              item.orderNumber,
              item.description,
              item.theme,
              item.responsibleArea,
              item.assigneeName,
              item.actionPlan,
            ].join(' '),
          ).includes(term)),
    );
  }, [available, search, kind, theme, area, status, start, end]);
  const themes = rankFeedback(filtered, 'theme');
  const areas = rankFeedback(filtered, 'responsibleArea');
  const recurringThemes = themes.filter((item) => item.count > 1);
  const opportunities = vocOpportunities(filtered);
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pages);
  const canonicalFilter = (field: 'theme' | 'responsibleArea', value: string) =>
    rankFeedback(available, field).find(
      (item) => normalizedTopic(item.label) === normalizedTopic(value),
    )?.label || value;
  const edit = (item: VocFeedback | null) => {
    setSelected(null);
    setEditing(item);
    setFormOpen(true);
  };
  const reset = () => {
    setSearch('');
    setKind('Todos');
    setTheme('Todos');
    setArea('Todas');
    setStatus('Todos');
    setStart('');
    setEnd('');
    setPage(1);
  };
  const remove = async (item: VocFeedback) => {
    if (
      !canDelete ||
      deleting ||
      !window.confirm(
        `Excluir o feedback “${item.title}” e removê-lo dos indicadores?`,
      )
    )
      return;
    setDeleting(item.id);
    setMessage('');
    try {
      await deleteData(currentUser, 'voc_feedback', item.id);
      setDeletedIds((current) => new Set([...current, item.id]));
      setSelected(null);
      setMessage('Feedback excluído.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir o feedback.',
      );
    } finally {
      setDeleting('');
    }
  };
  const actions = (item: VocFeedback) => (
    <>
      <button
        type="button"
        disabled={Boolean(deleting)}
        onClick={() => edit(item)}
        className="fotus-glass-inset inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-fotus-blue disabled:opacity-40"
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar / tratar
      </button>
      {canDelete && (
        <button
          type="button"
          disabled={Boolean(deleting)}
          onClick={() => void remove(item)}
          className="inline-flex items-center gap-1.5 rounded-full border border-fotus-yellow/50 bg-fotus-yellow/15 px-3 py-2 text-xs font-bold disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {deleting === item.id ? 'Excluindo...' : 'Excluir'}
        </button>
      )}
    </>
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="fotus-glass flex flex-col justify-between gap-5 rounded-3xl border-fotus-yellow/40 p-6 sm:flex-row sm:items-center">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-fotus-blue">
            <MessageSquareQuote className="h-4 w-4" />
            VoC · Voz do Cliente
          </p>
          <h2 className="mt-2 text-2xl font-extrabold">
            Ouvir, entender e melhorar
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-fotus-ink/80">
            Reclamações, sugestões, elogios e dores em um só lugar. Identifique
            padrões e acompanhe as ações de cada área.
          </p>
        </div>
        <button
          type="button"
          onClick={() => edit(null)}
          className="fotus-action flex w-fit shrink-0 items-center gap-2 rounded-full px-5 py-3 text-xs font-extrabold"
        >
          <Plus className="h-4 w-4" />
          Novo feedback
        </button>
      </header>

      <section className="fotus-glass space-y-4 rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-controls="voc-filters"
              className="fotus-action inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              <ChevronDown
                className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <span className="text-xs text-fotus-ink/80">
              {filtered.length} feedback(s) ·{' '}
              {start || end
                ? `${start ? experienceDate(start) : 'Início'} até ${end ? experienceDate(end) : 'sem data final'}`
                : 'Todo o histórico'}
            </span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-fotus-blue hover:bg-fotus-yellow/20"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpar filtros / todo o histórico
          </button>
        </div>
        <div id="voc-filters" hidden={!filtersOpen} className="space-y-4">
          <ExperienceSearch
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Buscar relato, cliente, pedido, responsável ou ação"
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <ExperienceField label="Tipo">
              <select
                value={kind}
                onChange={(event) => {
                  setKind(event.target.value);
                  setPage(1);
                }}
                className="field-input"
              >
                <option>Todos</option>
                {VOC_KINDS.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </ExperienceField>
            <ExperienceField label="Tema">
              <select
                value={theme}
                onChange={(event) => {
                  setTheme(event.target.value);
                  setPage(1);
                }}
                className="field-input"
              >
                <option>Todos</option>
                {rankFeedback(available, 'theme').map((item) => (
                  <option key={item.label}>{item.label}</option>
                ))}
              </select>
            </ExperienceField>
            <ExperienceField label="Área responsável">
              <select
                value={area}
                onChange={(event) => {
                  setArea(event.target.value);
                  setPage(1);
                }}
                className="field-input"
              >
                <option>Todas</option>
                {rankFeedback(available, 'responsibleArea').map((item) => (
                  <option key={item.label}>{item.label}</option>
                ))}
              </select>
            </ExperienceField>
            <ExperienceField label="Status">
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="field-input"
              >
                <option>Todos</option>
                {VOC_STATUSES.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </ExperienceField>
            <ExperienceField label="De">
              <input
                type="date"
                value={start}
                onChange={(event) => {
                  setStart(event.target.value);
                  setPage(1);
                }}
                className="field-input"
              />
            </ExperienceField>
            <ExperienceField label="Até">
              <input
                type="date"
                value={end}
                min={start || undefined}
                onChange={(event) => {
                  setEnd(event.target.value);
                  setPage(1);
                }}
                className="field-input"
              />
            </ExperienceField>
          </div>
          {start && end && end < start && (
            <p role="alert" className="text-xs font-bold">
              A data final precisa ser igual ou posterior à inicial.
            </p>
          )}
        </div>
        {!filtersOpen &&
          (search ||
            kind !== 'Todos' ||
            theme !== 'Todos' ||
            area !== 'Todas' ||
            status !== 'Todos') && (
            <div className="flex flex-wrap gap-2">
              {[
                search && `Busca: ${search}`,
                kind !== 'Todos' && kind,
                theme !== 'Todos' && theme,
                area !== 'Todas' && area,
                status !== 'Todos' && status,
              ]
                .filter(Boolean)
                .map((label, index) => (
                  <span key={index} className="fotus-pill fotus-pill-yellow">
                    {label}
                  </span>
                ))}
            </div>
          )}
      </section>

      <section
        aria-label="Dashboard dos feedbacks filtrados"
        className="fotus-glass rounded-3xl p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setDashboardOpen((open) => !open)}
              aria-expanded={dashboardOpen}
              aria-controls="voc-dashboard"
              className="fotus-action inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold"
            >
              <ChartNoAxesCombined className="h-4 w-4" />
              Dashboard do filtro
              <ChevronDown
                className={`h-4 w-4 transition-transform ${dashboardOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <span className="text-xs text-fotus-ink/80">
              {filtered.length} feedback(s) · {opportunities.length}{' '}
              oportunidade(s)
            </span>
          </div>
          {dashboardOpen && (
            <span className="fotus-pill fotus-pill-yellow">
              Explore os temas e áreas
            </span>
          )}
        </div>
        <div
          id="voc-dashboard"
          hidden={!dashboardOpen}
          className="mt-5 space-y-5"
        >
          <div className="fotus-bento-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ExperienceMetric
              label="Feedbacks"
              value={filtered.length}
              detail={`${filtered.filter((item) => item.kind === 'Elogio').length} elogios · ${filtered.filter((item) => item.kind === 'Sugestão').length} sugestões`}
              yellow
            />
            <ExperienceMetric
              label="Em acompanhamento"
              value={
                filtered.filter((item) => item.status !== 'Concluído').length
              }
              detail={`${filtered.filter((item) => item.priority === 'Alta' && item.status !== 'Concluído').length} com prioridade alta`}
            />
            <ExperienceMetric
              label="Temas recorrentes"
              value={recurringThemes.length}
              detail={`${recurringThemes.reduce((sum, item) => sum + item.count, 0)} relatos em temas com 2 ou mais registros`}
              yellow
            />
            <ExperienceMetric
              label="Reclamações e dores"
              value={
                filtered.filter(
                  (item) => item.kind === 'Reclamação' || item.kind === 'Dor',
                ).length
              }
              detail={`${filtered.filter((item) => item.status === 'Concluído').length} feedbacks concluídos no filtro`}
            />
          </div>
          <div className="fotus-bento-grid grid gap-5 lg:grid-cols-3">
            <ExperienceRanking
              title="Principais temas e motivos"
              items={themes}
              total={filtered.length}
              selected={theme}
              onSelect={(value) => {
                setTheme(
                  normalizedTopic(theme) === normalizedTopic(value)
                    ? 'Todos'
                    : canonicalFilter('theme', value),
                );
                setPage(1);
              }}
            />
            <ExperienceRanking
              title="Áreas responsáveis"
              items={areas}
              total={filtered.length}
              selected={area}
              onSelect={(value) => {
                setArea(
                  normalizedTopic(area) === normalizedTopic(value)
                    ? 'Todas'
                    : canonicalFilter('responsibleArea', value),
                );
                setPage(1);
              }}
            />
            <ExperienceRanking
              title="Distribuição dos feedbacks"
              items={rankFeedback(filtered, 'kind')}
              total={filtered.length}
              selected={kind}
              onSelect={(value) => {
                setKind(kind === value ? 'Todos' : value);
                setPage(1);
              }}
            />
          </div>
          <section className="fotus-glass-inset rounded-3xl p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-sm font-extrabold">
              <Target className="h-4 w-4 text-fotus-blue" />
              Oportunidades de melhoria
            </h3>
            <p className="mt-1 text-xs text-fotus-ink/80">
              Reclamações, dores e sugestões ainda em acompanhamento, agrupadas
              por tema e área. Prioridades altas aparecem primeiro.
            </p>
            <div className="fotus-bento-grid mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {opportunities.slice(0, 6).map((item) => (
                <button
                  key={JSON.stringify([item.theme, item.area])}
                  type="button"
                  onClick={() => {
                    setTheme(canonicalFilter('theme', item.theme));
                    setArea(canonicalFilter('responsibleArea', item.area));
                    setPage(1);
                  }}
                  className="fotus-glass-card rounded-2xl border-fotus-yellow/35 p-4 text-left hover:bg-fotus-yellow/15"
                >
                  <span className="fotus-pill fotus-pill-yellow">
                    {item.count} relato(s) em aberto
                  </span>
                  <strong className="mt-3 block break-words text-sm">
                    {item.theme}
                  </strong>
                  <p className="mt-1 text-xs text-fotus-ink/80">{item.area}</p>
                  <p className="mt-3 text-[10px] text-fotus-ink/80">
                    {item.complaints} reclamações / dores · {item.suggestions}{' '}
                    sugestões
                    {item.highPriority > 0
                      ? ` · ${item.highPriority} prioridade alta`
                      : ''}
                  </p>
                  <span className="mt-2 block text-[10px] font-bold text-fotus-blue">
                    Ver relatos e planos de ação →
                  </span>
                </button>
              ))}
            </div>
            {!opportunities.length && (
              <p className="fotus-glass-inset mt-4 rounded-2xl p-4 text-xs text-fotus-ink/80">
                Nenhuma oportunidade pendente identificada nos registros deste
                filtro.
              </p>
            )}
          </section>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-extrabold">Registros dos clientes</h3>
        <span className="fotus-pill fotus-pill-neutral">
          {filtered.length} feedback(s)
        </span>
      </div>
      {message && (
        <p
          role="status"
          className="rounded-xl border border-fotus-yellow/50 bg-fotus-yellow/20 p-3 text-xs font-semibold"
        >
          {message}
        </p>
      )}
      <div className="fotus-bento-grid grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {filtered
          .slice((currentPage - 1) * 12, currentPage * 12)
          .map((item) => (
            <article
              key={item.id}
              className="fotus-glass-card flex min-w-0 flex-col rounded-[26px] p-4 sm:p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="fotus-glass-inset inline-flex h-10 w-10 items-center justify-center rounded-2xl text-fotus-blue">
                  <MessageSquareQuote className="h-5 w-5" />
                </span>
                <span className="fotus-pill fotus-pill-blue">
                  {item.status}
                </span>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="fotus-pill fotus-pill-yellow">
                  {item.kind}
                </span>
                {item.priority === 'Alta' && (
                  <span className="fotus-pill fotus-pill-yellow">
                    Prioridade alta
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="min-w-0 text-left"
              >
                <h4 className="break-words text-base font-extrabold leading-snug">
                  {item.title}
                </h4>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-fotus-ink/80">
                  {item.description}
                </p>
                <span className="mt-3 inline-block text-[10px] font-extrabold text-fotus-blue">
                  Abrir relato →
                </span>
              </button>
              <dl className="fotus-glass-inset mt-4 grid gap-3 rounded-2xl p-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-[9px] font-bold uppercase tracking-wide text-fotus-ink/70">
                    Tema
                  </dt>
                  <dd className="mt-1 break-words text-xs font-bold">
                    {item.theme}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[9px] font-bold uppercase tracking-wide text-fotus-ink/70">
                    Área responsável
                  </dt>
                  <dd className="mt-1 break-words text-xs font-bold">
                    {item.responsibleArea}
                  </dd>
                </div>
              </dl>
              {item.actionPlan && (
                <p className="mt-3 line-clamp-2 border-l-2 border-fotus-yellow/80 pl-3 text-xs leading-relaxed text-fotus-ink/80">
                  <strong>Ação:</strong> {item.actionPlan}
                </p>
              )}
              <div className="my-4 grid gap-2 text-[10px] text-fotus-ink/80 sm:grid-cols-[auto_1fr]">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {experienceDate(item.date)}
                </span>
                <span className="min-w-0 break-words sm:text-right">
                  {item.customerName || 'Cliente não informado'} · {item.source}
                </span>
              </div>
              <footer className="mt-auto flex flex-wrap justify-end gap-2 border-t border-fotus-blue/10 pt-4">
                {actions(item)}
              </footer>
            </article>
          ))}
      </div>
      {!filtered.length && (
        <div className="rounded-3xl border border-dashed border-fotus-blue/20 p-10 text-center">
          <h3 className="font-extrabold">Nenhum feedback neste filtro</h3>
          <p className="mt-2 text-xs text-fotus-ink/80">
            Registre a voz do cliente ou escolha outro período.
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
          key={editing?.id || 'new-voc'}
          mode="voc"
          record={editing}
          agents={agents}
          currentUser={currentUser}
          onClose={() => setFormOpen(false)}
        />
      )}
      {selected && (
        <ExperienceDialog
          title={selected.title}
          subtitle={`${experienceDate(selected.date)} · ${selected.source} · ${selected.assigneeName}`}
          onClose={() => {
            if (!deleting) setSelected(null);
          }}
          footer={actions(selected)}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <span className="fotus-pill fotus-pill-yellow">
                {selected.kind}
              </span>
              <span className="fotus-pill fotus-pill-blue">
                {selected.status}
              </span>
              <span className="fotus-pill fotus-pill-neutral">
                Prioridade {selected.priority.toLowerCase()}
              </span>
            </div>
            <dl className="fotus-glass-inset grid gap-4 rounded-2xl p-4 text-xs sm:grid-cols-2">
              {[
                ['Tema', selected.theme],
                ['Área responsável', selected.responsibleArea],
                ['Cliente', selected.customerName || 'Não informado'],
                [
                  'Pedido / referência',
                  selected.orderNumber || 'Não informado',
                ],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="font-extrabold">{label}</dt>
                  <dd className="mt-1 break-words">{value}</dd>
                </div>
              ))}
            </dl>
            <section className="fotus-glass-inset rounded-2xl p-4">
              <h3 className="text-xs font-extrabold">Relato do cliente</h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                {selected.description}
              </p>
            </section>
            <section className="fotus-glass-inset rounded-2xl border-fotus-yellow/40 p-4">
              <h3 className="text-xs font-extrabold">
                Plano de ação / oportunidade de melhoria
              </h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                {selected.actionPlan ||
                  'Nenhum plano de ação registrado ainda.'}
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
