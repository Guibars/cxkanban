import React, { useState, useEffect } from 'react';
import { X, Save, Building2, Calendar, Clock, User, Phone, Mail, MapPin, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { IntegratorVisit, VisitStatus } from '../types';
import { db, collection, addDoc, updateDoc, doc } from '../lib/firebase';
import { User as AuthUser } from 'firebase/auth';

interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitToEdit?: IntegratorVisit | null;
  currentUser: AuthUser | null;
}

const statusOptions: { value: VisitStatus; label: string; color: string }[] = [
  { value: 'Agendada', label: 'Agendada', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'Em Andamento', label: 'Em Andamento', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'Concluída', label: 'Concluída', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'Cancelada', label: 'Cancelada', color: 'bg-gray-50 text-gray-600 border-gray-200' },
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
  }, [visitToEdit, isOpen, currentUser]);

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
        objective: objective.trim(),
        participantsCount: Number(participantsCount) || 1,
        status,
        notes: notes.trim(),
        feedback: feedback.trim(),
        updatedAt: Date.now(),
      };

      if (visitToEdit) {
        await updateDoc(doc(db, 'integrator_visits', visitToEdit.id), visitData);
      } else {
        await addDoc(collection(db, 'integrator_visits'), {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] transition-all">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#f7faf6] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eef5eb] text-[#385041] flex items-center justify-center border border-[#dce8d8]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                {visitToEdit ? 'Editar Visita de Integrador' : 'Nova Visita de Integrador'}
              </h2>
              <p className="text-xs text-gray-500">Registro e acompanhamento de parceiros na Fotus</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <form id="visit-form" onSubmit={handleSubmit} className="space-y-5">
            
            {/* Status Segmented Control */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Status da Visita</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      status === opt.value
                        ? 'bg-[#385041] text-white border-[#385041] shadow-xs'
                        : 'bg-gray-50/80 text-gray-600 border-gray-200 hover:bg-gray-100'
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Empresa / Integrador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: SolarTech Engenharia"
                  value={integratorName}
                  onChange={(e) => setIntegratorName(e.target.value)}
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Pessoa de Contato *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Phone, Email & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="contato@empresa.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cidade / UF</label>
                <input
                  type="text"
                  placeholder="Ex: Campinas - SP"
                  value={cityState}
                  onChange={(e) => setCityState(e.target.value)}
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Date, Time & Participants */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Data da Visita *</label>
                <input
                  type="date"
                  required
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Horário</label>
                <input
                  type="time"
                  value={visitTime}
                  onChange={(e) => setVisitTime(e.target.value)}
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nº Participantes</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={participantsCount}
                  onChange={(e) => setParticipantsCount(parseInt(e.target.value) || 1)}
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Host & Objective */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Anfitrião / Responsável Fotus *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome real do anfitrião"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Objetivo da Visita *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Treinamento Técnico, Alinhamento Comercial"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Pauta e Observações</label>
              <textarea
                rows={3}
                placeholder="Detalhes sobre a recepção, reserva de salas, pauta..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-gray-50/70 border border-gray-200 rounded-xl p-3 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all resize-none"
              />
            </div>

            {/* Feedback / Conclusão */}
            {status === 'Concluída' && (
              <div>
                <label className="block text-xs font-semibold text-emerald-700 mb-1">
                  Feedback & Resultados da Visita
                </label>
                <textarea
                  rows={2}
                  placeholder="Como foi a visita? Quais foram os próximos passos acordados?"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl p-3 text-sm text-gray-800 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all resize-none"
                />
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200/60 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="visit-form"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#385041] hover:bg-[#2c4033] text-white rounded-xl font-bold text-sm shadow-sm transition-all disabled:opacity-70"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar Visita'}
          </button>
        </div>
      </div>
    </div>
  );
}
