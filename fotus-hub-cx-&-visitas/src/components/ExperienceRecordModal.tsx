import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import type { CurrentUser } from '../lib/currentUser';
import { createData, updateData } from '../lib/dataMutations';
import {
  experienceToday,
  SERVICE_CATEGORIES,
  SERVICE_STATUSES,
  VOC_AREAS,
  VOC_KINDS,
  VOC_PRIORITIES,
  VOC_SOURCES,
  VOC_STATUSES,
  VOC_THEMES,
} from '../lib/serviceDesk';
import type { ServiceCategory, ServiceTicket, VocFeedback } from '../types';
import { ExperienceDialog, ExperienceField } from './ExperienceUi';

export default function ExperienceRecordModal({
  mode,
  record,
  agents,
  currentUser,
  onClose,
}: {
  mode: 'ticket' | 'voc';
  record: ServiceTicket | VocFeedback | null;
  agents: string[];
  currentUser: CurrentUser;
  onClose: () => void;
}) {
  const ticket = mode === 'ticket';
  const service = record as ServiceTicket | null;
  const feedback = record as VocFeedback | null;
  const [draft, setDraft] = useState(() => ({
    date: record?.date || experienceToday(),
    title: record?.title || '',
    customerName: record?.customerName || '',
    orderNumber: record?.orderNumber || '',
    description: record?.description || '',
    assigneeName:
      record?.assigneeName ||
      currentUser.displayName ||
      currentUser.email ||
      '',
    status: record?.status || (ticket ? 'Aberto' : 'Novo'),
    categories: ticket
      ? service?.categories || ([] as ServiceCategory[])
      : ([] as ServiceCategory[]),
    resolution: ticket ? service?.resolution || '' : '',
    kind: ticket ? 'Reclamação' : feedback?.kind || 'Reclamação',
    theme: ticket ? '' : feedback?.theme || '',
    responsibleArea: ticket ? '' : feedback?.responsibleArea || '',
    source: ticket ? 'WhatsApp' : feedback?.source || 'WhatsApp',
    priority: ticket ? 'Média' : feedback?.priority || 'Média',
    actionPlan: ticket ? '' : feedback?.actionPlan || '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const change = (field: keyof typeof draft, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));
  const close = () => {
    if (!saving) onClose();
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (ticket && !draft.categories.length) {
      setError('Selecione pelo menos uma categoria para o atendimento.');
      return;
    }
    setSaving(true);
    setError('');
    const common = {
      date: draft.date,
      title: draft.title,
      customerName: draft.customerName,
      orderNumber: draft.orderNumber,
      description: draft.description,
      assigneeName: draft.assigneeName,
      status: draft.status,
    };
    const data = ticket
      ? {
          ...common,
          categories: draft.categories,
          resolution: draft.resolution,
        }
      : {
          ...common,
          kind: draft.kind,
          theme: draft.theme,
          responsibleArea: draft.responsibleArea,
          source: draft.source,
          priority: draft.priority,
          actionPlan: draft.actionPlan,
        };
    try {
      const resource = ticket ? 'service_tickets' : 'voc_feedback';
      if (record) await updateData(currentUser, resource, record.id, data);
      else await createData(currentUser, resource, data);
      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar o registro.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ExperienceDialog
      title={`${record ? 'Editar' : 'Novo'} ${ticket ? 'atendimento' : 'feedback'}`}
      subtitle={
        ticket
          ? 'Registre a solicitação e acompanhe a solução.'
          : 'Transforme o relato do cliente em uma ação de melhoria.'
      }
      onClose={close}
      footer={
        <>
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="rounded-xl px-4 py-2.5 text-xs font-bold disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="experience-record-form"
            disabled={saving}
            className="fotus-action flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar registro'}
          </button>
        </>
      }
    >
      <form id="experience-record-form" onSubmit={save} className="space-y-5">
        <fieldset disabled={saving} className="space-y-5 disabled:opacity-70">
          {ticket && (
            <fieldset className="rounded-2xl border border-fotus-yellow/50 bg-fotus-yellow/10 p-4">
              <legend className="px-1 text-xs font-extrabold">
                Categorias do atendimento
              </legend>
              <p className="mb-3 text-xs text-fotus-ink/80">
                Selecione uma ou mais pílulas.
              </p>
              <div className="flex flex-wrap gap-2">
                {SERVICE_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={draft.categories.includes(category)}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        categories: current.categories.includes(category)
                          ? current.categories.filter(
                              (value) => value !== category,
                            )
                          : [...current.categories, category],
                      }))
                    }
                    className={`fotus-pill px-3 py-2 ${draft.categories.includes(category) ? 'fotus-pill-yellow ring-1 ring-fotus-yellow' : 'fotus-pill-neutral hover:border-fotus-yellow'}`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {!ticket && (
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Tipo do feedback"
            >
              {VOC_KINDS.map((kind) => (
                <button
                  type="button"
                  key={kind}
                  aria-pressed={draft.kind === kind}
                  onClick={() => change('kind', kind)}
                  className={`fotus-pill px-4 py-2 ${draft.kind === kind ? 'fotus-pill-yellow ring-1 ring-fotus-yellow' : 'fotus-pill-neutral hover:border-fotus-yellow'}`}
                >
                  {kind}
                </button>
              ))}
            </div>
          )}
          <ExperienceField label="Título">
            <input
              autoFocus
              required
              maxLength={180}
              value={draft.title}
              onChange={(event) => change('title', event.target.value)}
              placeholder={
                ticket
                  ? 'Qual solicitação precisa ser tratada?'
                  : 'Resuma a voz do cliente'
              }
              className="field-input"
            />
          </ExperienceField>
          <div className="grid gap-4 sm:grid-cols-2">
            <ExperienceField label="Data do registro">
              <input
                required
                type="date"
                value={draft.date}
                onChange={(event) => change('date', event.target.value)}
                className="field-input"
              />
            </ExperienceField>
            <ExperienceField label="Status">
              <select
                value={draft.status}
                onChange={(event) => change('status', event.target.value)}
                className="field-input"
              >
                {(ticket ? SERVICE_STATUSES : VOC_STATUSES).map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </ExperienceField>
            <ExperienceField label="Cliente / contato (opcional)">
              <input
                maxLength={150}
                value={draft.customerName}
                onChange={(event) => change('customerName', event.target.value)}
                className="field-input"
              />
            </ExperienceField>
            <ExperienceField label="Pedido / referência (opcional)">
              <input
                maxLength={80}
                value={draft.orderNumber}
                onChange={(event) => change('orderNumber', event.target.value)}
                className="field-input"
              />
            </ExperienceField>
            <ExperienceField label="Responsável pelo acompanhamento">
              <input
                required
                maxLength={150}
                list="experience-agent-options"
                value={draft.assigneeName}
                onChange={(event) => change('assigneeName', event.target.value)}
                className="field-input"
              />
              <datalist id="experience-agent-options">
                {agents.map((agent) => (
                  <option key={agent} value={agent} />
                ))}
              </datalist>
            </ExperienceField>
            {!ticket && (
              <ExperienceField label="Prioridade">
                <select
                  value={draft.priority}
                  onChange={(event) => change('priority', event.target.value)}
                  className="field-input"
                >
                  {VOC_PRIORITIES.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </ExperienceField>
            )}
          </div>
          {!ticket && (
            <div className="grid gap-4 sm:grid-cols-2">
              <ExperienceField label="Tema">
                <input
                  required
                  maxLength={120}
                  list="voc-theme-options"
                  value={draft.theme}
                  onChange={(event) => change('theme', event.target.value)}
                  placeholder="Escolha ou escreva um tema"
                  className="field-input"
                />
                <datalist id="voc-theme-options">
                  {VOC_THEMES.map((theme) => (
                    <option key={theme} value={theme} />
                  ))}
                </datalist>
              </ExperienceField>
              <ExperienceField label="Área responsável">
                <input
                  required
                  maxLength={120}
                  list="voc-area-options"
                  value={draft.responsibleArea}
                  onChange={(event) =>
                    change('responsibleArea', event.target.value)
                  }
                  placeholder="Escolha ou escreva uma área"
                  className="field-input"
                />
                <datalist id="voc-area-options">
                  {VOC_AREAS.map((area) => (
                    <option key={area} value={area} />
                  ))}
                </datalist>
              </ExperienceField>
              <ExperienceField label="Origem do feedback">
                <input
                  required
                  maxLength={80}
                  list="voc-source-options"
                  value={draft.source}
                  onChange={(event) => change('source', event.target.value)}
                  className="field-input"
                />
                <datalist id="voc-source-options">
                  {VOC_SOURCES.map((source) => (
                    <option key={source} value={source} />
                  ))}
                </datalist>
              </ExperienceField>
            </div>
          )}
          <ExperienceField
            label={ticket ? 'Descrição do atendimento' : 'Relato do cliente'}
          >
            <textarea
              required
              rows={5}
              maxLength={8000}
              value={draft.description}
              onChange={(event) => change('description', event.target.value)}
              placeholder="Registre o contexto e os detalhes para a equipe."
              className="field-input resize-y"
            />
          </ExperienceField>
          <ExperienceField
            label={
              ticket
                ? 'Solução / encaminhamento'
                : 'Plano de ação / oportunidade de melhoria'
            }
          >
            <textarea
              rows={3}
              maxLength={4000}
              value={ticket ? draft.resolution : draft.actionPlan}
              onChange={(event) =>
                change(ticket ? 'resolution' : 'actionPlan', event.target.value)
              }
              placeholder={
                ticket
                  ? 'Como foi tratado ou qual será o próximo passo?'
                  : 'O que podemos mudar, quem acompanha e qual é o próximo passo?'
              }
              className="field-input resize-y"
            />
          </ExperienceField>
        </fieldset>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-fotus-yellow/50 bg-fotus-yellow/15 p-3 text-xs font-semibold"
          >
            {error}
          </p>
        )}
      </form>
    </ExperienceDialog>
  );
}
