import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { CalendarDays, Check, FileText, Mail, Phone, Save, Smile, Star, X } from 'lucide-react';
import type { CurrentUser } from '../lib/currentUser';
import { createData, updateData } from '../lib/dataMutations';
import { calculateSingleRaScore, classifyRaScore, customerScoreValue, wouldDoBusinessValue, formatRaNumber } from '../lib/raReputation';
import type { RACase, RaStatus } from '../types';

interface RaModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseToEdit?: RACase | null;
  currentUser: CurrentUser | null;
}

const statusOptions: RaStatus[] = ['Em Andamento', 'Finalizado', 'Moderado', 'Desativado'];
const localDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function RaModal({ isOpen, onClose, caseToEdit, currentUser }: RaModalProps) {
  const [raNumber, setRaNumber] = useState('');
  const [complaintDate, setComplaintDate] = useState(localDate(Date.now()));
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [information, setInformation] = useState('');
  const [status, setStatus] = useState<RaStatus>('Em Andamento');
  const [resolved, setResolved] = useState<boolean | null>(null);
  const [customerScore, setCustomerScore] = useState<number | ''>('');
  const [wouldDoBusiness, setWouldDoBusiness] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const initializedRecord = useRef('');

  useEffect(() => {
    if (!isOpen) {
      initializedRecord.current = '';
      return;
    }
    const recordKey = caseToEdit?.id || 'new';
    if (initializedRecord.current === recordKey) return;
    initializedRecord.current = recordKey;
    setSaveError('');
    setRaNumber(caseToEdit?.raNumber || '');
    setComplaintDate(caseToEdit?.complaintDate || localDate(caseToEdit?.createdAt || Date.now()));
    setCustomerName(caseToEdit?.customerName || '');
    setPhone(caseToEdit?.phone || '');
    setEmail(caseToEdit?.email || '');
    setInformation(caseToEdit?.information || '');
    setStatus(caseToEdit?.status || 'Em Andamento');
    setResolved(caseToEdit?.resolved ?? null);
    setCustomerScore(caseToEdit ? customerScoreValue(caseToEdit) ?? '' : '');
    setWouldDoBusiness(caseToEdit ? wouldDoBusinessValue(caseToEdit) : null);
  }, [caseToEdit?.id, isOpen]);

  if (!isOpen) return null;

  const normalizedScore = typeof customerScore === 'number' && Number.isFinite(customerScore) ? customerScore : null;
  const previewScore = calculateSingleRaScore(status, resolved, normalizedScore, wouldDoBusiness);
  const previewClass = classifyRaScore(previewScore, status === 'Finalizado' ? 100 : 0);
  const previewTone = previewScore === null ? 'text-fotus-ink/50' : previewScore >= 8 ? 'text-emerald-700' : previewScore >= 7 ? 'text-fotus-blue' : previewScore >= 6 ? 'text-amber-700' : previewScore >= 5 ? 'text-orange-700' : 'text-red-700';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser) return setSaveError('Sessão não encontrada.');
    setLoading(true);
    setSaveError('');
    try {
      const finalScore = calculateSingleRaScore(status, resolved, normalizedScore, wouldDoBusiness);
      const readyForReputation = status === 'Finalizado' && resolved !== null && normalizedScore !== null && wouldDoBusiness !== null;
      const caseData = {
        complaintDate,
        raNumber: raNumber.trim(),
        customerName: customerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        information: information.trim(),
        status,
        resolved,
        indicatorIR: readyForReputation ? 100 : 0,
        indicatorIS: readyForReputation && resolved ? 100 : 0,
        indicatorMA: normalizedScore,
        indicatorIN: wouldDoBusiness === null ? null : wouldDoBusiness ? 100 : 0,
        finalScore,
        assigneeEmail: caseToEdit?.assigneeEmail || currentUser.email || null,
        assigneeName: caseToEdit?.assigneeName || currentUser.displayName || null,
        createdByEmail: caseToEdit?.createdByEmail || currentUser.email || '',
        createdByName: caseToEdit?.createdByName || currentUser.displayName || currentUser.email || '',
        updatedAt: Date.now(),
      };
      if (caseToEdit) await updateData(currentUser, 'ra_cases', caseToEdit.id, caseData);
      else await createData(currentUser, 'ra_cases', { ...caseData, createdAt: Date.now() });
      onClose();
    } catch (error) {
      console.error('Erro ao salvar o caso RA:', error);
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar o caso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fotus-ink/45 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-fotus-neutral bg-fotus-neutral shadow-2xl">
        <header className="flex items-center justify-between border-b border-fotus-blue/10 bg-gradient-to-r from-fotus-blue/6 to-fotus-neutral px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-fotus-blue text-fotus-neutral"><FileText className="h-5 w-5" /></span>
            <div className="min-w-0"><h2 className="truncate text-lg font-extrabold text-fotus-ink">{caseToEdit ? `Editar RA ${caseToEdit.raNumber}` : 'Novo caso Reclame Aqui'}</h2><p className="text-xs text-fotus-ink/80">A reputação será calculada automaticamente.</p></div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-fotus-ink/80 hover:bg-fotus-neutral hover:text-fotus-ink"><X className="h-5 w-5" /></button>
        </header>

        <form id="ra-form" onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <section>
            <label className="mb-2 block text-xs font-bold text-fotus-ink">Status da reclamação</label>
            <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-fotus-neutral/70 p-1.5 sm:grid-cols-4">
              {statusOptions.map((option) => <button key={option} type="button" onClick={() => setStatus(option)} className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[11px] font-extrabold transition-all ${status === option ? 'bg-fotus-yellow text-fotus-ink shadow-sm' : 'text-fotus-ink/80 hover:bg-fotus-neutral'}`}>{status === option && <Check className="h-3.5 w-3.5" />}{option}</button>)}
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ID / Nº da reclamação"><input required value={raNumber} onChange={(event) => setRaNumber(event.target.value)} placeholder="Ex.: RA-984210" className="field-input" /></Field>
            <Field label="Data da reclamação" icon={CalendarDays}><input required type="date" value={complaintDate} onChange={(event) => setComplaintDate(event.target.value)} className="field-input" /></Field>
            <Field label="Nome do consumidor"><input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nome completo" className="field-input" /></Field>
            <Field label="Telefone / WhatsApp" icon={Phone}><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(00) 00000-0000" className="field-input" /></Field>
            <Field label="E-mail" icon={Mail}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="cliente@email.com" className="field-input" /></Field>
          </div>

          <Field label="Relato da reclamação e tratativa"><textarea rows={4} value={information} onChange={(event) => setInformation(event.target.value)} placeholder="Descreva a situação e as providências tomadas..." className="field-input resize-none" /></Field>

          <section className="rounded-3xl border border-fotus-blue/15 bg-fotus-neutral p-4 sm:p-5">
            <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fotus-neutral text-fotus-blue shadow-sm"><Star className="h-4 w-4" /></span><div><h3 className="text-sm font-extrabold text-fotus-ink">Avaliação do cliente</h3><p className="mt-0.5 text-[11px] text-fotus-ink/80">Preencha somente o que o consumidor respondeu. O card entra na reputação quando estiver finalizado e com as três respostas completas.</p></div></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><span className="mb-1.5 block text-xs font-bold text-fotus-ink">Resolvido?</span><div className="grid grid-cols-2 gap-2">{[{ label: 'Sim', value: true }, { label: 'Não', value: false }].map((option) => <button key={option.label} type="button" onClick={() => setResolved(resolved === option.value ? null : option.value)} aria-pressed={resolved === option.value} className={`rounded-xl border px-4 py-3 text-xs font-extrabold transition-all ${resolved === option.value ? option.value ? 'ra-pill-success' : 'ra-pill-danger' : 'border-fotus-blue/20 bg-fotus-neutral text-fotus-ink hover:border-fotus-blue/30'}`}>{option.label}</button>)}</div></div>
              <Field label="Nota do cliente (0 a 10)"><input type="number" min="0" max="10" step="0.1" value={customerScore} onChange={(event) => setCustomerScore(event.target.value === '' ? '' : Number(event.target.value))} placeholder="Ex.: 8,5" className="field-input" /></Field>
              <div><span className="mb-1.5 block text-xs font-bold text-fotus-ink">Voltaria a fazer negócio?</span><div className="grid grid-cols-2 gap-2">{[{ label: 'Sim', value: true }, { label: 'Não', value: false }].map((option) => <button key={option.label} type="button" onClick={() => setWouldDoBusiness(wouldDoBusiness === option.value ? null : option.value)} aria-pressed={wouldDoBusiness === option.value} className={`rounded-xl border px-4 py-3 text-xs font-extrabold transition-all ${wouldDoBusiness === option.value ? option.value ? 'ra-pill-success' : 'ra-pill-danger' : 'border-fotus-blue/20 bg-fotus-neutral text-fotus-ink hover:border-fotus-blue/30'}`}>{option.label}</button>)}</div></div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-fotus-neutral bg-fotus-neutral p-3 shadow-sm"><div className="flex min-w-0 items-center gap-2"><Smile className={`h-5 w-5 shrink-0 ${previewTone}`} /><div><span className="block text-[9px] font-extrabold uppercase tracking-wide text-fotus-ink/80">Prévia automática do card</span><strong className={`text-xs ${previewTone}`}>{previewScore === null ? 'Aguardando finalização ou avaliação' : previewClass}</strong></div></div><strong className={`shrink-0 text-xl ${previewTone}`}>{previewScore === null ? '—' : formatRaNumber(previewScore)}</strong></div>
          </section>
        </form>

        {saveError && <p className="mx-5 mb-3 rounded-xl border border-fotus-yellow/25 bg-fotus-yellow/20 px-4 py-3 text-xs font-semibold text-fotus-ink">{saveError}</p>}
        <footer className="flex justify-end gap-2 border-t border-fotus-blue/10 bg-fotus-neutral/32 px-5 py-4 sm:px-6"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-fotus-ink hover:bg-fotus-neutral">Cancelar</button><button form="ra-form" type="submit" disabled={loading} className="flex items-center gap-2 rounded-xl fotus-action px-5 py-2.5 text-xs font-extrabold disabled:opacity-60"><Save className="h-4 w-4" />{loading ? 'Salvando...' : 'Salvar caso'}</button></footer>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: typeof Phone; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-fotus-ink">{Icon && <Icon className="h-3.5 w-3.5 text-fotus-ink/80" />}{label}</span>{children}</label>;
}
