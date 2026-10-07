import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  MapPin,
  MessageSquareQuote,
  Phone,
  Save,
  User,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { IntegratorVisit, VisitStatus } from '../types';
import { createData, updateData } from '../lib/dataMutations';
import type { CurrentUser } from '../lib/currentUser';
import { cn } from '../lib/utils';

interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitToEdit?: IntegratorVisit | null;
  currentUser: CurrentUser | null;
}

const statusOptions: VisitStatus[] = [
  'Solicitada',
  'Agendada',
  'Em Andamento',
  'Concluída',
  'Cancelada',
];

function VisitField({
  label,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block min-w-0', className)}>
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-fotus-ink">
        {Icon && (
          <Icon aria-hidden="true" className="h-3.5 w-3.5 text-fotus-blue/80" />
        )}
        {label}
      </span>
      {children}
    </label>
  );
}

function BriefingValue({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="mb-1 text-[10px] font-bold uppercase tracking-wide text-fotus-ink/65">
        {label}
      </dt>
      <dd className="break-words text-xs leading-relaxed text-fotus-ink">
        {children === '' || children == null ? '—' : children}
      </dd>
    </div>
  );
}

export default function VisitModal({
  isOpen,
  onClose,
  visitToEdit,
  currentUser,
}: VisitModalProps) {
  const [integratorName, setIntegratorName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [cityState, setCityState] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [hostName, setHostName] = useState('');
  const [objective, setObjective] = useState('');
  const [participantsCount, setParticipantsCount] = useState(2);
  const [status, setStatus] = useState<VisitStatus>('Agendada');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const initializedRecord = useRef('');
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!isOpen) {
      initializedRecord.current = '';
      return;
    }
    const recordKey = visitToEdit?.id || 'new';
    if (initializedRecord.current === recordKey) return;
    initializedRecord.current = recordKey;
    setSaveError('');
    if (visitToEdit) {
      setIntegratorName(visitToEdit.integratorName || '');
      setContactPerson(visitToEdit.contactPerson || '');
      setContactPhone(visitToEdit.contactPhone || '');
      setContactEmail(visitToEdit.contactEmail || '');
      setCityState(visitToEdit.cityState || '');
      setVisitDate(visitToEdit.visitDate || '');
      setVisitTime(visitToEdit.visitTime || '');
      setHostName(visitToEdit.hostName || '');
      setObjective(visitToEdit.objective || '');
      setParticipantsCount(visitToEdit.participantsCount || 1);
      setStatus(visitToEdit.status || 'Agendada');
      setNotes(visitToEdit.notes || '');
      setFeedback(visitToEdit.feedback || '');
    } else {
      setIntegratorName('');
      setContactPerson('');
      setContactPhone('');
      setContactEmail('');
      setCityState('');
      setVisitDate(new Date().toISOString().split('T')[0]);
      setVisitTime('10:00');
      setHostName(currentUser?.displayName || 'Equipe Fotus');
      setObjective('Alinhamento Comercial & Visita às Instalações');
      setParticipantsCount(2);
      setStatus('Agendada');
      setNotes('');
      setFeedback('');
    }
  }, [isOpen, visitToEdit?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  useEffect(() => {
    setLogoUrl('');
    if (!isOpen || !visitToEdit?.hasLogo || !currentUser) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(
          `/api/neon-data?view=visit-logo&id=${encodeURIComponent(visitToEdit.id)}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
        );
        if (!response.ok) return;
        const image = (await response.json()) as {
          mime: string;
          base64: string;
        };
        if (!cancelled && ['image/png', 'image/jpeg'].includes(image.mime))
          setLogoUrl(`data:${image.mime};base64,${image.base64}`);
      } catch {
        /* O briefing continua disponível sem a imagem. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, visitToEdit?.id, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setSaveError('');
    setLoading(true);
    try {
      const visitData = {
        integratorName: integratorName.trim(),
        contactPerson: contactPerson.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        cityState: cityState.trim(),
        visitDate,
        visitTime,
        hostName: hostName.trim() || currentUser?.displayName || 'Equipe Fotus',
        hostEmail: currentUser?.email || null,
        createdByEmail: visitToEdit?.createdByEmail || currentUser?.email || '',
        createdByName:
          visitToEdit?.createdByName ||
          currentUser?.displayName ||
          currentUser?.email ||
          '',
        objective: objective.trim(),
        participantsCount: Number(participantsCount) || 1,
        status,
        notes: notes.trim(),
        feedback: feedback.trim(),
        updatedAt: Date.now(),
      };
      if (!currentUser) throw new Error('Sessão não encontrada.');
      if (visitToEdit) {
        await updateData(
          currentUser,
          'integrator_visits',
          visitToEdit.id,
          visitData,
        );
      } else {
        await createData(currentUser, 'integrator_visits', {
          ...visitData,
          createdAt: Date.now(),
        });
      }
      onClose();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar a visita.',
      );
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    if (!loading) onClose();
  };
  const hasBriefing = visitToEdit?.requestSource === 'conecta';
  const inputClass = 'field-input min-w-0 bg-fotus-neutral/40 text-xs';
  const briefingObjectives = [
    ...(visitToEdit?.objectives || []),
    visitToEdit?.objectiveOther,
  ].filter(Boolean);
  const briefingMaterials = [
    ...(visitToEdit?.materials || []),
    visitToEdit?.materialOther,
  ].filter(Boolean);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="visit-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          close();
      }}
      className={cn(
        'fotus-dialog fotus-glass fixed inset-0 m-auto flex max-h-[92dvh] w-[calc(100%_-_1.5rem)] flex-col overflow-hidden rounded-3xl p-0 text-fotus-ink shadow-2xl backdrop:bg-fotus-ink/35 backdrop:backdrop-blur-md',
        hasBriefing ? 'max-w-6xl' : 'max-w-3xl',
      )}
    >
      <header className="fotus-dialog-header flex shrink-0 items-start justify-between gap-3 border-b border-fotus-blue/10 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-fotus-yellow/35 bg-fotus-yellow/20 text-fotus-blue">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.17em] text-fotus-blue">
              Visitas de integradores
            </p>
            <h2
              id="visit-dialog-title"
              className="text-base font-extrabold tracking-tight text-fotus-ink sm:text-lg"
            >
              {visitToEdit ? 'Organizar visita' : 'Agendar uma nova visita'}
            </h2>
            <p className="mt-1 text-xs text-fotus-ink/75">
              Recepção, agenda e relacionamento em um só lugar.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          disabled={loading}
          aria-label="Fechar formulário de visita"
          className="shrink-0 rounded-full border border-fotus-blue/10 bg-fotus-neutral/40 p-2 text-fotus-ink/70 transition-colors hover:bg-fotus-yellow/20"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
        <form id="visit-form" onSubmit={handleSubmit} className="space-y-4">
          {saveError && (
            <p
              role="alert"
              className="rounded-2xl border border-fotus-yellow/40 bg-fotus-yellow/15 p-3 text-xs font-semibold"
            >
              {saveError}
            </p>
          )}
          <section
            className="fotus-glass-inset rounded-2xl p-3 sm:p-4"
            aria-labelledby="visit-status-title"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3
                id="visit-status-title"
                className="flex items-center gap-2 text-xs font-bold"
              >
                <CheckCircle2 className="h-4 w-4 text-fotus-blue" /> Etapa da
                visita
              </h3>
              <span className="text-[10px] text-fotus-ink/65">
                Escolha a etapa e salve para atualizar o card.
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {statusOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatus(option)}
                  aria-pressed={status === option}
                  className={cn(
                    'rounded-xl border px-2 py-2.5 text-[11px] font-bold transition-colors',
                    status === option
                      ? 'border-fotus-yellow/70 bg-fotus-yellow/80 text-fotus-ink shadow-xs'
                      : 'border-fotus-blue/10 bg-fotus-neutral/35 text-fotus-ink/80 hover:bg-fotus-yellow/12',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>

          <div
            className={cn(
              'grid items-start gap-4',
              hasBriefing && 'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]',
            )}
          >
            <div className="min-w-0 space-y-4">
              <section
                className="fotus-glass-inset rounded-2xl p-4 sm:p-5"
                aria-labelledby="visit-contact-title"
              >
                <h3
                  id="visit-contact-title"
                  className="mb-4 flex items-center gap-2 text-xs font-extrabold text-fotus-blue"
                >
                  <User className="h-4 w-4" /> Integrador e contato
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <VisitField label="Empresa / integrador *" icon={Building2}>
                    <input
                      type="text"
                      required
                      placeholder="Ex: SolarTech Engenharia"
                      value={integratorName}
                      onChange={(event) =>
                        setIntegratorName(event.target.value)
                      }
                      className={inputClass}
                    />
                  </VisitField>
                  <VisitField label="Pessoa de contato *" icon={User}>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Eduardo"
                      value={contactPerson}
                      onChange={(event) => setContactPerson(event.target.value)}
                      className={inputClass}
                    />
                  </VisitField>
                  <VisitField label="Telefone / WhatsApp" icon={Phone}>
                    <input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={contactPhone}
                      onChange={(event) => setContactPhone(event.target.value)}
                      className={inputClass}
                    />
                  </VisitField>
                  <VisitField label="Cidade / UF" icon={MapPin}>
                    <input
                      type="text"
                      placeholder="Ex: Campinas - SP"
                      value={cityState}
                      onChange={(event) => setCityState(event.target.value)}
                      className={inputClass}
                    />
                  </VisitField>
                  <VisitField
                    label="E-mail"
                    icon={Mail}
                    className="sm:col-span-2"
                  >
                    <input
                      type="email"
                      placeholder="contato@empresa.com"
                      value={contactEmail}
                      onChange={(event) => setContactEmail(event.target.value)}
                      className={inputClass}
                    />
                  </VisitField>
                </div>
              </section>

              <section
                className="fotus-glass-inset rounded-2xl p-4 sm:p-5"
                aria-labelledby="visit-agenda-title"
              >
                <h3
                  id="visit-agenda-title"
                  className="mb-4 flex items-center gap-2 text-xs font-extrabold text-fotus-blue"
                >
                  <Calendar className="h-4 w-4" /> Agenda do encontro
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <VisitField label="Data da visita *" icon={Calendar}>
                    <input
                      type="date"
                      required
                      value={visitDate}
                      onChange={(event) => setVisitDate(event.target.value)}
                      className={inputClass}
                    />
                  </VisitField>
                  <VisitField label="Horário" icon={Clock}>
                    <input
                      type="time"
                      value={visitTime}
                      onChange={(event) => setVisitTime(event.target.value)}
                      className={inputClass}
                    />
                  </VisitField>
                  <VisitField label="Participantes" icon={Users}>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={participantsCount}
                      onChange={(event) =>
                        setParticipantsCount(parseInt(event.target.value) || 1)
                      }
                      className={inputClass}
                    />
                  </VisitField>
                  <VisitField
                    label="Anfitrião / responsável Fotus *"
                    icon={User}
                    className="sm:col-span-3"
                  >
                    <input
                      type="text"
                      required
                      placeholder="Nome real do anfitrião"
                      value={hostName}
                      onChange={(event) => setHostName(event.target.value)}
                      className={inputClass}
                    />
                  </VisitField>
                  <VisitField
                    label="Objetivo da visita *"
                    className="sm:col-span-3"
                  >
                    <input
                      type="text"
                      required
                      placeholder="Ex: Treinamento Técnico, Alinhamento Comercial"
                      value={objective}
                      onChange={(event) => setObjective(event.target.value)}
                      className={inputClass}
                    />
                  </VisitField>
                </div>
              </section>

              <section className="fotus-glass-inset rounded-2xl p-4 sm:p-5">
                <VisitField label="Pauta e observações" icon={FileText}>
                  <textarea
                    rows={3}
                    placeholder="Recepção, reserva de salas, pauta e outros detalhes..."
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className={`${inputClass} resize-y`}
                  />
                </VisitField>
                {status === 'Concluída' && (
                  <div className="mt-4 border-t border-fotus-yellow/25 pt-4">
                    <VisitField
                      label="Feedback e resultados da visita"
                      icon={MessageSquareQuote}
                    >
                      <textarea
                        rows={3}
                        placeholder="Como foi a visita? Quais foram os próximos passos acordados?"
                        value={feedback}
                        onChange={(event) => setFeedback(event.target.value)}
                        className={`${inputClass} resize-y border-fotus-yellow/35`}
                      />
                    </VisitField>
                  </div>
                )}
              </section>
            </div>

            {hasBriefing && visitToEdit && (
              <aside
                className="fotus-glass-inset min-w-0 overflow-hidden rounded-2xl"
                aria-labelledby="visit-briefing-title"
              >
                <div className="border-b border-fotus-blue/10 bg-fotus-yellow/8 p-4 sm:p-5">
                  <span className="fotus-pill fotus-pill-yellow mb-3">
                    Recebido pelo Conecta
                  </span>
                  <h3
                    id="visit-briefing-title"
                    className="text-sm font-extrabold text-fotus-ink"
                  >
                    Briefing do integrador
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-fotus-ink/70">
                    Informações enviadas pelo solicitante para preparar a
                    visita.
                  </p>
                </div>
                <div className="space-y-4 p-4 sm:p-5">
                  {logoUrl && (
                    <figure className="rounded-2xl border border-fotus-blue/10 bg-fotus-neutral/35 p-3">
                      <figcaption className="mb-2 text-[10px] font-bold uppercase tracking-wide text-fotus-ink/65">
                        Logomarca enviada
                      </figcaption>
                      <img
                        src={logoUrl}
                        alt={`Logomarca de ${visitToEdit.integratorName}`}
                        className="mx-auto max-h-24 max-w-full rounded-lg object-contain"
                      />
                    </figure>
                  )}
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                    <BriefingValue label="CNPJ">
                      {visitToEdit.integratorCnpj}
                    </BriefingValue>
                    <BriefingValue label="Horário solicitado">{`${visitToEdit.visitTime || '—'}–${visitToEdit.visitEndTime || '—'}`}</BriefingValue>
                    <BriefingValue label="Consultor e região">
                      {visitToEdit.consultantRegion}
                    </BriefingValue>
                    <BriefingValue label="Cargos dos visitantes">
                      {[
                        ...(visitToEdit.visitorRoles || []),
                        visitToEdit.visitorRoleOther,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </BriefingValue>
                    <BriefingValue label="Brindes">
                      {visitToEdit.giftQuantity ?? '—'}
                    </BriefingValue>
                    <BriefingValue label="Almoço / jantar">
                      {visitToEdit.includeMeal ? 'Solicitado' : 'Não'}
                    </BriefingValue>
                  </dl>
                  <div className="border-t border-fotus-blue/10 pt-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-fotus-ink/65">
                      Objetivos
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {briefingObjectives.length ? (
                        briefingObjectives.map((value, index) => (
                          <span
                            key={`${value}-${index}`}
                            className="fotus-pill fotus-pill-blue text-left"
                          >
                            {value}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-fotus-ink/70">
                          Nenhum informado
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-fotus-ink/65">
                      Materiais solicitados
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {briefingMaterials.length ? (
                        briefingMaterials.map((value, index) => (
                          <span
                            key={`${value}-${index}`}
                            className="fotus-pill fotus-pill-neutral text-left"
                          >
                            {value}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-fotus-ink/70">
                          Nenhum informado
                        </p>
                      )}
                    </div>
                  </div>
                  <dl className="space-y-4 border-t border-fotus-blue/10 pt-4">
                    <BriefingValue label="Visitantes">
                      <span className="whitespace-pre-wrap">
                        {visitToEdit.visitorNames || '—'}
                      </span>
                    </BriefingValue>
                    <BriefingValue label="Histórico do relacionamento">
                      <span className="whitespace-pre-wrap">
                        {visitToEdit.relationshipHistory || '—'}
                      </span>
                    </BriefingValue>
                  </dl>
                  <div className="rounded-2xl border border-fotus-yellow/25 bg-fotus-yellow/8 p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-fotus-ink/65">
                      Enviado por
                    </p>
                    <p className="break-words text-xs font-semibold text-fotus-ink">
                      {visitToEdit.requesterName || '—'}
                    </p>
                    <p className="mt-1 break-all text-[11px] text-fotus-ink/75">
                      {visitToEdit.requesterEmail || '—'}{' '}
                      <span className="text-fotus-ink/60">
                        (não verificado)
                      </span>
                    </p>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </form>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-fotus-blue/10 bg-fotus-neutral/30 px-4 py-3 sm:px-6 sm:py-4">
        <span className="text-[10px] text-fotus-ink/65">
          * Campos obrigatórios
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={close}
            disabled={loading}
            className="rounded-full px-4 py-2.5 text-xs font-semibold text-fotus-ink transition-colors hover:bg-fotus-neutral/60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="visit-form"
            disabled={loading}
            className="fotus-action inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Salvando...' : 'Salvar visita'}
          </button>
        </div>
      </footer>
    </dialog>
  );
}
