import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { Building2, CalendarDays, CheckCircle2, Hash, MapPin, Package, Route, Save, Truck, UserRound, X } from 'lucide-react';
import { addDoc, collection, db, doc, updateDoc } from '../lib/firebase';
import {
  BRAZIL_STATES,
  getRegionFromState,
  OCCURRENCE_AGENTS,
  OCCURRENCE_CARRIERS,
  OCCURRENCE_PRODUCTS,
  OCCURRENCE_TYPES,
} from '../lib/occurrences';
import { Occurrence, OccurrenceApproval, OccurrenceStage, OrganizationUnit } from '../types';

interface OccurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  occurrence: Occurrence | null;
  currentUser: User;
  organizationUnits: OrganizationUnit[];
}

const STAGES: OccurrenceStage[] = ['Recebida', 'Em Análise', 'Aguardando Retorno', 'Finalizada'];
const APPROVALS: OccurrenceApproval[] = ['Pendente', 'Aprovado', 'Reprovado'];

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function OccurrenceModal({ isOpen, onClose, occurrence, currentUser, organizationUnits }: OccurrenceModalProps) {
  const [date, setDate] = useState(today());
  const [agentName, setAgentName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [state, setState] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [uniqueNumber, setUniqueNumber] = useState('');
  const [sacCode, setSacCode] = useState('');
  const [occurrenceType, setOccurrenceType] = useState('Material Avariado');
  const [product, setProduct] = useState('Módulo');
  const [quantity, setQuantity] = useState(1);
  const [stage, setStage] = useState<OccurrenceStage>('Recebida');
  const [approvalStatus, setApprovalStatus] = useState<OccurrenceApproval>('Pendente');
  const [carrier, setCarrier] = useState('');
  const [comments, setComments] = useState('');
  const [consultant, setConsultant] = useState('');
  const [organizationUnitId, setOrganizationUnitId] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const activeUnits = useMemo(() => organizationUnits.filter((unit) => unit.active), [organizationUnits]);

  useEffect(() => {
    if (!isOpen) return;
    setDate(occurrence?.date || today());
    setAgentName(occurrence?.agentName || '');
    setCompanyName(occurrence?.companyName || '');
    setState(occurrence?.state || '');
    setOrderNumber(occurrence?.orderNumber || '');
    setUniqueNumber(occurrence?.uniqueNumber || '');
    setSacCode(occurrence?.sacCode || '');
    setOccurrenceType(occurrence?.occurrenceType || 'Material Avariado');
    setProduct(occurrence?.product || 'Módulo');
    setQuantity(occurrence?.quantity || 1);
    setStage(occurrence?.stage || 'Recebida');
    setApprovalStatus(occurrence?.approvalStatus || 'Pendente');
    setCarrier(occurrence?.carrier || '');
    setComments(occurrence?.comments || '');
    setConsultant(occurrence?.consultant || '');
    setOrganizationUnitId(occurrence?.organizationUnitId || '');
    setErrorMessage('');
  }, [currentUser.displayName, isOpen, occurrence]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    const selectedUnit = activeUnits.find((unit) => unit.id === organizationUnitId);
    const now = Date.now();
    const payload = {
      date,
      agentName: agentName.trim(),
      companyName: companyName.trim(),
      state,
      region: getRegionFromState(state),
      orderNumber: orderNumber.trim(),
      uniqueNumber: uniqueNumber.trim(),
      sacCode: sacCode.trim(),
      occurrenceType: occurrenceType.trim(),
      product: product.trim(),
      quantity: Math.max(1, Math.trunc(Number(quantity) || 1)),
      stage,
      approvalStatus,
      carrier: carrier.trim(),
      comments: comments.trim(),
      consultant: consultant.trim(),
      organizationUnitId: selectedUnit?.id || null,
      routedToName: selectedUnit?.managerName || null,
      routedToEmail: selectedUnit?.managerEmail || null,
      updatedAt: now,
    };

    try {
      if (occurrence) {
        await updateDoc(doc(db, 'occurrences', occurrence.id), payload);
      } else {
        await addDoc(collection(db, 'occurrences'), {
          ...payload,
          createdByEmail: currentUser.email || '',
          createdByName: currentUser.displayName || currentUser.email || '',
          createdAt: now,
        });
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar ocorrência:', error);
      setErrorMessage('Não foi possível salvar a ocorrência. Confira as regras do Firestore.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm sm:p-6">
      <form onSubmit={handleSubmit} className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white bg-white shadow-2xl">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-xl sm:px-7">
          <div>
            <h2 className="text-lg font-extrabold text-gray-950">{occurrence ? 'Editar ocorrência' : 'Nova ocorrência'}</h2>
            <p className="text-xs text-gray-500">Fluxo digital baseado no controle operacional atual.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          {errorMessage && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{errorMessage}</p>}

          <section>
            <SectionTitle number="1" title="Identificação" description="Comece pela data, agente e empresa." />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Data" icon={CalendarDays}><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="field-input" /></Field>
              <Field label="Agente" icon={UserRound}>
                <select required value={agentName} onChange={(event) => setAgentName(event.target.value)} className="field-input">
                  <option value="">Selecione a agente</option>
                  {occurrence?.agentName && !OCCURRENCE_AGENTS.includes(occurrence.agentName) && <option value={occurrence.agentName}>{occurrence.agentName}</option>}
                  {OCCURRENCE_AGENTS.map((agent) => <option key={agent} value={agent}>{agent}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2"><Field label="Nome da empresa" icon={Building2}><input required value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="field-input" placeholder="Razão social ou nome fantasia" /></Field></div>
              <Field label="UF" icon={MapPin}><select required value={state} onChange={(event) => setState(event.target.value)} className="field-input"><option value="">Selecione</option>{BRAZIL_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}</select></Field>
              <Field label="Nº do pedido" icon={Hash}><input required value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} className="field-input" placeholder="Preserva zeros e hífens" /></Field>
              <Field label="Nº único" icon={Hash}><input value={uniqueNumber} onChange={(event) => setUniqueNumber(event.target.value)} className="field-input" /></Field>
              <Field label="Cód. SAC" icon={Hash}><input required value={sacCode} onChange={(event) => setSacCode(event.target.value)} className="field-input" /></Field>
            </div>
          </section>

          <section className="border-t border-gray-100 pt-6">
            <SectionTitle number="2" title="Ocorrência" description="Classifique o problema e o produto envolvido." />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Tipo de ocorrência" icon={Route}><select required value={occurrenceType} onChange={(event) => setOccurrenceType(event.target.value)} className="field-input">{OCCURRENCE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>
              <Field label="Produto" icon={Package}><input required list="products-list" value={product} onChange={(event) => setProduct(event.target.value)} className="field-input" /><datalist id="products-list">{OCCURRENCE_PRODUCTS.map((item) => <option key={item} value={item} />)}</datalist></Field>
              <Field label="Quantidade" icon={Package}><input required min={1} step={1} type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="field-input" /></Field>
              <Field label="Transportadora" icon={Truck}><input required list="carriers-list" value={carrier} onChange={(event) => setCarrier(event.target.value)} className="field-input" placeholder="Selecione ou digite" /><datalist id="carriers-list">{OCCURRENCE_CARRIERS.map((item) => <option key={item} value={item} />)}</datalist></Field>
            </div>
          </section>

          <section className="border-t border-gray-100 pt-6">
            <SectionTitle number="3" title="Etapa e decisão" description="O card avança conforme a tratativa do time." />
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STAGES.map((item, index) => (
                  <button key={item} type="button" onClick={() => setStage(item)} className={`rounded-xl border p-3 text-left transition-all ${stage === item ? 'border-[#385041] bg-[#e8efe0] text-[#385041] shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                    <span className="block text-[10px] font-extrabold uppercase">Etapa {index + 1}</span>
                    <span className="mt-1 block text-xs font-bold">{item}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {APPROVALS.map((item) => (
                  <button key={item} type="button" onClick={() => setApprovalStatus(item)} className={`rounded-xl border px-3 py-3 text-xs font-bold transition-all ${approvalStatus === item ? item === 'Aprovado' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : item === 'Reprovado' ? 'border-red-300 bg-red-50 text-red-800' : 'border-amber-300 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-500'}`}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="border-t border-gray-100 pt-6">
            <SectionTitle number="4" title="Responsáveis e histórico" description="Direcione e registre tudo que ajuda na continuidade." />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Consultor" icon={UserRound}><input value={consultant} onChange={(event) => setConsultant(event.target.value)} className="field-input" placeholder="Nome do consultor" /></Field>
              <Field label="Direcionar para" icon={Route}>
                <select value={organizationUnitId} onChange={(event) => setOrganizationUnitId(event.target.value)} className="field-input">
                  <option value="">Sem direcionamento automático</option>
                  {activeUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.department} • {unit.teamName} • {unit.regional} → {unit.managerName}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2"><Field label="Comentários"><textarea rows={4} value={comments} onChange={(event) => setComments(event.target.value)} className="field-input resize-y" placeholder="Fotos recebidas, ressalvas, tratativas, NF, retorno da transportadora..." /></Field></div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-xl sm:px-7">
          <span className="hidden items-center gap-1.5 text-xs text-gray-500 sm:flex"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Os campos essenciais são obrigatórios.</span>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#385041] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar ocorrência'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

function SectionTitle({ number, title, description }: { number: string; title: string; description: string }) {
  return <div className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#385041] text-xs font-extrabold text-white">{number}</span><div><h3 className="text-sm font-extrabold text-gray-900">{title}</h3><p className="text-xs text-gray-500">{description}</p></div></div>;
}

function Field({ label, icon: Icon, children }: { label: string; icon?: typeof Building2; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-700">{Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}{label}</span>{children}</label>;
}
