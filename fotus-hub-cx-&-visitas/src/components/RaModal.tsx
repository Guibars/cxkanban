import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Check, FileText, Mail, Phone, Save, Smile, Star, X } from 'lucide-react';
import type { CurrentUser } from '../lib/currentUser';
import { createData, updateData } from '../lib/dataMutations';
import { calculateSingleRaScore, classifyRaScore, customerScoreValue, wouldDoBusinessValue } from '../lib/raReputation';
import type { CaseStatus, RACase } from '../types';

interface RaModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseToEdit?: RACase | null;
  currentUser: CurrentUser | null;
}

const statusOptions: CaseStatus[] = ['Aberto', 'Em Andamento', 'Resolvido', 'Cancelado'];

export default function RaModal({ isOpen, onClose, caseToEdit, currentUser }: RaModalProps) {
  const [raNumber, setRaNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [information, setInformation] = useState('');
  const [status, setStatus] = useState<CaseStatus>('Aberto');
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
    setCustomerName(caseToEdit?.customerName || '');
    setPhone(caseToEdit?.phone || '');
    setEmail(caseToEdit?.email || '');
    setInformation(caseToEdit?.information || '');
    setStatus(caseToEdit?.status || 'Aberto');
    setCustomerScore(caseToEdit ? customerScoreValue(caseToEdit) ?? '' : '');
    setWouldDoBusiness(caseToEdit ? wouldDoBusinessValue(caseToEdit) : null);
  }, [caseToEdit?.id, isOpen]);

  if (!isOpen) return null;

  const normalizedScore = typeof customerScore === 'number' && Number.isFinite(customerScore) ? customerScore : null;
  const previewScore = calculateSingleRaScore(status, normalizedScore, wouldDoBusiness);
  const previewClass = classifyRaScore(previewScore, status === 'Resolvido' || status === 'Cancelado' ? 100 : 0);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser) return setSaveError('Sessão não encontrada.');
    setLoading(true);
    setSaveError('');
    try {
      const finalScore = calculateSingleRaScore(status, normalizedScore, wouldDoBusiness);
      const readyForReputation = (status === 'Resolvido' || status === 'Cancelado') && normalizedScore !== null && wouldDoBusiness !== null;
      const caseData = {
        raNumber: raNumber.trim(),
        customerName: customerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        information: information.trim(),
        status,
        indicatorIR: readyForReputation ? 100 : 0,
        indicatorIS: readyForReputation && status === 'Resolvido' ? 100 : 0,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-[#eef5eb] to-white px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#385041] text-white"><FileText className="h-5 w-5" /></span>
            <div className="min-w-0"><h2 className="truncate text-lg font-extrabold text-gray-950">{caseToEdit ? `Editar RA ${caseToEdit.raNumber}` : 'Novo caso Reclame Aqui'}</h2><p className="text-xs text-gray-500">A reputação será calculada automaticamente.</p></div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-white hover:text-gray-700"><X className="h-5 w-5" /></button>
        </header>

        <form id="ra-form" onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <section>
            <label className="mb-2 block text-xs font-bold text-gray-700">Status da reclamação</label>
            <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-gray-100 p-1.5 sm:grid-cols-4">
              {statusOptions.map((option) => <button key={option} type="button" onClick={() => setStatus(option)} className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[11px] font-extrabold transition-all ${status === option ? 'bg-[#385041] text-white shadow-sm' : 'text-gray-500 hover:bg-white'}`}>{status === option && <Check className="h-3.5 w-3.5" />}{option}</button>)}
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ID / Nº da reclamação"><input required value={raNumber} onChange={(event) => setRaNumber(event.target.value)} placeholder="Ex.: RA-984210" className="field-input" /></Field>
            <Field label="Nome do consumidor"><input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nome completo" className="field-input" /></Field>
            <Field label="Telefone / WhatsApp" icon={Phone}><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(00) 00000-0000" className="field-input" /></Field>
            <Field label="E-mail" icon={Mail}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="cliente@email.com" className="field-input" /></Field>
          </div>

          <Field label="Relato da reclamação e tratativa"><textarea rows={4} value={information} onChange={(event) => setInformation(event.target.value)} placeholder="Descreva a situação e as providências tomadas..." className="field-input resize-none" /></Field>

          <section className="rounded-3xl border border-[#385041]/15 bg-[#f5f8f4] p-4 sm:p-5">
            <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#385041] shadow-sm"><Star className="h-4 w-4" /></span><div><h3 className="text-sm font-extrabold text-gray-950">Avaliação do cliente</h3><p className="mt-0.5 text-[11px] text-gray-500">Preencha somente o que o consumidor respondeu. O card entra na reputação quando estiver encerrado e com as duas respostas completas.</p></div></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nota do cliente (0 a 10)"><input type="number" min="0" max="10" step="0.1" value={customerScore} onChange={(event) => setCustomerScore(event.target.value === '' ? '' : Number(event.target.value))} placeholder="Ex.: 8,5" className="field-input" /></Field>
              <div><span className="mb-1.5 block text-xs font-bold text-gray-700">Voltaria a fazer negócio?</span><div className="grid grid-cols-2 gap-2">{[{ label: 'Sim', value: true }, { label: 'Não', value: false }].map((option) => <button key={option.label} type="button" onClick={() => setWouldDoBusiness(option.value)} className={`rounded-xl border px-4 py-3 text-xs font-extrabold transition-all ${wouldDoBusiness === option.value ? option.value ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-red-500 bg-red-500 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-[#385041]/30'}`}>{option.label}</button>)}</div></div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white bg-white p-3 shadow-sm"><div className="flex items-center gap-2"><Smile className={`h-5 w-5 ${previewScore === null ? 'text-gray-300' : previewScore >= 7 ? 'text-emerald-500' : previewScore >= 5 ? 'text-amber-500' : 'text-red-500'}`} /><div><span className="block text-[9px] font-extrabold uppercase tracking-wide text-gray-400">Prévia automática do card</span><strong className="text-xs text-gray-800">{previewScore === null ? 'Aguardando avaliação' : previewClass}</strong></div></div><strong className="text-xl text-[#385041]">{previewScore === null ? '—' : previewScore.toFixed(1)}</strong></div>
          </section>
        </form>

        {saveError && <p className="mx-5 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{saveError}</p>}
        <footer className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/80 px-5 py-4 sm:px-6"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-white">Cancelar</button><button form="ra-form" type="submit" disabled={loading} className="flex items-center gap-2 rounded-xl bg-[#385041] px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-60"><Save className="h-4 w-4" />{loading ? 'Salvando...' : 'Salvar caso'}</button></footer>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: typeof Phone; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-700">{Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}{label}</span>{children}</label>;
}
