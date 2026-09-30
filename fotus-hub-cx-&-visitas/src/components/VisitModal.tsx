import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Building2, Calendar, Clock, User, Phone, Mail, MapPin, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { IntegratorVisit, VisitStatus } from '../types';
import { createData, updateData } from '../lib/dataMutations';
import type { CurrentUser } from '../lib/currentUser';

interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitToEdit?: IntegratorVisit | null;
  currentUser: CurrentUser | null;
}

const statusOptions: { value: VisitStatus; label: string; color: string }[] = [
  { value: 'Solicitada', label: 'Solicitada', color: 'bg-fotus-blue/7 text-fotus-blue border-fotus-blue/25' },
  { value: 'Agendada', label: 'Agendada', color: 'bg-fotus-yellow/7 text-fotus-ink border-fotus-yellow/25' },
  { value: 'Em Andamento', label: 'Em Andamento', color: 'bg-fotus-blue/7 text-fotus-blue border-fotus-blue/25' },
  { value: 'Concluída', label: 'Concluída', color: 'bg-fotus-blue/7 text-fotus-blue border-fotus-blue/25' },
  { value: 'Cancelada', label: 'Cancelada', color: 'bg-fotus-neutral/40 text-fotus-ink border-fotus-blue/20' },
];

export default function VisitModal({ isOpen, onClose, visitToEdit, currentUser }: VisitModalProps) {
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
  const initializedRecord = useRef('');

  useEffect(() => {
    if (!isOpen) {
      initializedRecord.current = '';
      return;
    }
    const recordKey = visitToEdit?.id || 'new';
    if (initializedRecord.current === recordKey) return;
    initializedRecord.current = recordKey;
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
    if (!isOpen || !visitToEdit?.hasLogo || !currentUser) { setLogoUrl(''); return; }
    let cancelled = false;
    void (async () => {
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`/api/neon-data?view=visit-logo&id=${encodeURIComponent(visitToEdit.id)}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (!response.ok) return;
        const image = await response.json() as { mime: string; base64: string };
        if (!cancelled && ['image/png', 'image/jpeg'].includes(image.mime)) setLogoUrl(`data:${image.mime};base64,${image.base64}`);
      } catch { /* O briefing continua disponível sem a imagem. */ }
    })();
    return () => { cancelled = true; };
  }, [isOpen, visitToEdit?.id, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        createdByName: visitToEdit?.createdByName || currentUser?.displayName || currentUser?.email || '',
        objective: objective.trim(),
        participantsCount: Number(participantsCount) || 1,
        status,
        notes: notes.trim(),
        feedback: feedback.trim(),
        updatedAt: Date.now(),
      };

      if (visitToEdit) {
        if (!currentUser) throw new Error('Sessão não encontrada.');
        await updateData(currentUser, 'integrator_visits', visitToEdit.id, visitData);
      } else {
        if (!currentUser) throw new Error('Sessão não encontrada.');
        await createData(currentUser, 'integrator_visits', {
          ...visitData,
          createdAt: Date.now(),
        });
      }
      onClose();
    } catch (error) {
      console.error('Error saving visit:', error);
      alert('Erro ao salvar visita.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fotus-ink/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-fotus-neutral rounded-3xl border border-fotus-blue/16 shadow-[0_20px_50px_rgb(69_68_68_/_0.15)] w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] transition-all">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-fotus-blue/10 flex items-center justify-between bg-gradient-to-r from-fotus-neutral to-fotus-neutral">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-fotus-blue/6 text-fotus-blue flex items-center justify-center border border-fotus-blue/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-fotus-ink tracking-tight">
                {visitToEdit ? 'Editar Visita de Integrador' : 'Nova Visita de Integrador'}
              </h2>
              <p className="text-xs text-fotus-ink/80">Registro e acompanhamento de parceiros na Fotus</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-fotus-ink/80 hover:text-fotus-ink hover:bg-fotus-neutral/70 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <form id="visit-form" onSubmit={handleSubmit} className="space-y-5">
            {visitToEdit?.requestSource === 'conecta' && <section className="rounded-2xl border border-fotus-blue/25 bg-fotus-blue/5 p-4 text-sm text-fotus-ink space-y-3">
              <div className="flex items-center justify-between gap-3"><strong className="text-fotus-blue">Briefing recebido do Conecta</strong><span className="text-xs text-fotus-blue">Dados informados pelo solicitante</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2">
                <p><b>CNPJ:</b> {visitToEdit.integratorCnpj || '—'}</p>
                <p><b>Horário:</b> {visitToEdit.visitTime || '—'}–{visitToEdit.visitEndTime || '—'}</p>
                <p><b>Objetivos:</b> {[...(visitToEdit.objectives || []), visitToEdit.objectiveOther].filter(Boolean).join(', ') || '—'}</p>
                <p><b>Cargos:</b> {[...(visitToEdit.visitorRoles || []), visitToEdit.visitorRoleOther].filter(Boolean).join(', ') || '—'}</p>
                <p><b>Consultor e região:</b> {visitToEdit.consultantRegion || '—'}</p>
                <p><b>Brindes:</b> {visitToEdit.giftQuantity ?? '—'}</p>
                <p><b>Materiais:</b> {[...(visitToEdit.materials || []), visitToEdit.materialOther].filter(Boolean).join(', ') || 'Nenhum informado'}</p>
                <p><b>Almoço/jantar:</b> {visitToEdit.includeMeal ? 'Solicitado' : 'Não'}</p>
                <p className="sm:col-span-2 whitespace-pre-wrap"><b>Visitantes:</b> {visitToEdit.visitorNames || '—'}</p>
                <p className="sm:col-span-2 whitespace-pre-wrap"><b>Histórico:</b> {visitToEdit.relationshipHistory || '—'}</p>
                <p className="sm:col-span-2"><b>Enviado por:</b> {visitToEdit.requesterName || '—'} · {visitToEdit.requesterEmail || '—'} (não verificado)</p>
              </div>
              {logoUrl && <div><p className="font-semibold mb-2">Logomarca enviada</p><img src={logoUrl} alt={`Logomarca de ${visitToEdit.integratorName}`} className="max-h-36 max-w-full rounded-lg bg-fotus-neutral object-contain p-2" /></div>}
            </section>}
            
            {/* Status Segmented Control */}
            <div>
              <label className="block text-xs font-semibold text-fotus-ink mb-2">Status da Visita</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      status === opt.value
                        ? 'bg-fotus-blue text-fotus-neutral border-fotus-blue shadow-xs'
                        : 'bg-fotus-neutral/32 text-fotus-ink border-fotus-blue/20 hover:bg-fotus-neutral/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Integrator & Contact Person */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-fotus-ink mb-1">
                  Empresa / Integrador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: SolarTech Engenharia"
                  value={integratorName}
                  onChange={(e) => setIntegratorName(e.target.value)}
                  className="w-full bg-fotus-neutral/28 border border-fotus-blue/20 rounded-xl px-3.5 py-2.5 text-sm text-fotus-ink focus:bg-fotus-neutral focus:border-fotus-blue focus:ring-2 focus:ring-fotus-blue/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fotus-ink mb-1">
                  Pessoa de Contato *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full bg-fotus-neutral/28 border border-fotus-blue/20 rounded-xl px-3.5 py-2.5 text-sm text-fotus-ink focus:bg-fotus-neutral focus:border-fotus-blue focus:ring-2 focus:ring-fotus-blue/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Phone, Email & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-fotus-ink mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full bg-fotus-neutral/28 border border-fotus-blue/20 rounded-xl px-3.5 py-2.5 text-sm text-fotus-ink focus:bg-fotus-neutral focus:border-fotus-blue focus:ring-2 focus:ring-fotus-blue/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fotus-ink mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="contato@empresa.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full bg-fotus-neutral/28 border border-fotus-blue/20 rounded-xl px-3.5 py-2.5 text-sm text-fotus-ink focus:bg-fotus-neutral focus:border-fotus-blue focus:ring-2 focus:ring-fotus-blue/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fotus-ink mb-1">Cidade / UF</label>
                <input
                  type="text"
                  placeholder="Ex: Campinas - SP"
                  value={cityState}
                  onChange={(e) => setCityState(e.target.value)}
                  className="w-full bg-fotus-neutral/28 border border-fotus-blue/20 rounded-xl px-3.5 py-2.5 text-sm text-fotus-ink focus:bg-fotus-neutral focus:border-fotus-blue focus:ring-2 focus:ring-fotus-blue/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Date, Time & Participants */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-fotus-ink mb-1">Data da Visita *</label>
                <input
                  type="date"
                  required
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full bg-fotus-neutral/28 border border-fotus-blue/20 rounded-xl px-3.5 py-2.5 text-sm text-fotus-ink focus:bg-fotus-neutral focus:border-fotus-blue focus:ring-2 focus:ring-fotus-blue/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fotus-ink mb-1">Horário</label>
                <input
                  type="time"
                  value={visitTime}
                  onChange={(e) => setVisitTime(e.target.value)}
                  className="w-full bg-fotus-neutral/28 border border-fotus-blue/20 rounded-xl px-3.5 py-2.5 text-sm text-fotus-ink focus:bg-fotus-neutral focus:border-fotus-blue focus:ring-2 focus:ring-fotus-blue/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fotus-ink mb-1">Nº Participantes</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={participantsCount}
                  onChange={(e) => setParticipantsCount(parseInt(e.target.value) || 1)}
                  className="w-full bg-fotus-neutral/28 border border-fotus-blue/20 rounded-xl px-3.5 py-2.5 text-sm text-fotus-ink focus:bg-fotus-neutral focus:border-fotus-blue focus:ring-2 focus:ring-fotus-blue/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Host & Objective */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-fotus-ink mb-1">Anfitrião / Responsável Fotus *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome real do anfitrião"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="w-full bg-fotus-neutral/28 border border-fotus-blue/20 rounded-xl px-3.5 py-2.5 text-sm text-fotus-ink focus:bg-fotus-neutral focus:border-fotus-blue focus:ring-2 focus:ring-fotus-blue/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fotus-ink mb-1">Objetivo da Visita *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Treinamento Técnico, Alinhamento Comercial"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full bg-fotus-neutral/28 border border-fotus-blue/20 rounded-xl px-3.5 py-2.5 text-sm text-fotus-ink focus:bg-fotus-neutral focus:border-fotus-blue focus:ring-2 focus:ring-fotus-blue/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-fotus-ink mb-1">Pauta e Observações</label>
              <textarea
                rows={3}
                placeholder="Detalhes sobre a recepção, reserva de salas, pauta..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-fotus-neutral/28 border border-fotus-blue/20 rounded-xl p-3 text-sm text-fotus-ink focus:bg-fotus-neutral focus:border-fotus-blue focus:ring-2 focus:ring-fotus-blue/10 outline-none transition-all resize-none"
              />
            </div>

            {/* Feedback / Conclusão */}
            {status === 'Concluída' && (
              <div>
                <label className="block text-xs font-semibold text-fotus-blue mb-1">
                  Feedback & Resultados da Visita
                </label>
                <textarea
                  rows={2}
                  placeholder="Como foi a visita? Quais foram os próximos passos acordados?"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full bg-fotus-blue/3 border border-fotus-blue/25 rounded-xl p-3 text-sm text-fotus-ink focus:bg-fotus-neutral focus:border-fotus-blue focus:ring-2 focus:ring-fotus-blue/10 outline-none transition-all resize-none"
                />
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-fotus-blue/10 bg-fotus-neutral/32 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-fotus-ink hover:bg-fotus-neutral/60 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="visit-form"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-fotus-blue hover:bg-fotus-blue text-fotus-neutral rounded-xl font-bold text-sm shadow-sm transition-all disabled:opacity-70"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar Visita'}
          </button>
        </div>
      </div>
    </div>
  );
}
