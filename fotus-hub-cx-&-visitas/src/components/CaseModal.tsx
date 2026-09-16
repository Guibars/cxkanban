import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { DollarSign, Hash, Package, Plus, Route, Save, Tag, Trash2, UserRound, X } from 'lucide-react';
import { addDoc, collection, db, doc, updateDoc } from '../lib/firebase';
import { CaseStatus, CXCase, ExtraCostItem, OrganizationUnit } from '../types';

interface CaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseToEdit: CXCase | null;
  currentUser: User;
  organizationUnits: OrganizationUnit[];
}

const CASE_STATUSES: CaseStatus[] = ['Aberto', 'Em Andamento', 'Resolvido', 'Cancelado'];

export default function CaseModal({ isOpen, onClose, caseToEdit, currentUser, organizationUnits }: CaseModalProps) {
  const [orderNumber, setOrderNumber] = useState('');
  const [productCode, setProductCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<CaseStatus>('Aberto');
  const [isReplacement, setIsReplacement] = useState(false);
  const [assignToMe, setAssignToMe] = useState(true);
  const [organizationUnitId, setOrganizationUnitId] = useState('');
  const [observations, setObservations] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [extraCosts, setExtraCosts] = useState<ExtraCostItem[]>([]);
  const [extraCostReason, setExtraCostReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const activeUnits = useMemo(() => organizationUnits.filter((unit) => unit.active), [organizationUnits]);

  useEffect(() => {
    if (!isOpen) return;
    setOrderNumber(caseToEdit?.orderNumber || '');
    setProductCode(caseToEdit?.productCode || '');
    setQuantity(caseToEdit?.quantity || 1);
    setStatus(caseToEdit?.status || 'Aberto');
    setIsReplacement(caseToEdit?.isReplacement || false);
    setAssignToMe(caseToEdit ? caseToEdit.assigneeEmail === currentUser.email : true);
    setOrganizationUnitId(caseToEdit?.organizationUnitId || '');
    setObservations(caseToEdit?.observations || '');
    setTagsInput(caseToEdit?.tags?.join(', ') || '');
    setExtraCosts(caseToEdit?.extraCosts || []);
    setExtraCostReason(caseToEdit?.extraCostReason || '');
    setErrorMessage('');
  }, [caseToEdit, currentUser.email, isOpen]);

  if (!isOpen) return null;

  const addCost = () => {
    setExtraCosts((current) => [...current, { id: `${Date.now()}-${current.length}`, description: '', amount: 0 }]);
  };

  const updateCost = (id: string, field: 'description' | 'amount', value: string | number) => {
    setExtraCosts((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeCost = (id: string) => setExtraCosts((current) => current.filter((item) => item.id !== id));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    const selectedUnit = activeUnits.find((unit) => unit.id === organizationUnitId);
    const normalizedCosts = extraCosts
      .map((item) => ({ ...item, description: item.description.trim(), amount: Number(item.amount) || 0 }))
      .filter((item) => item.description || item.amount > 0);
    const now = Date.now();
    const payload = {
      orderNumber: orderNumber.trim(),
      productCode: productCode.trim(),
      quantity: Math.max(1, Math.trunc(Number(quantity) || 1)),
      isReplacement,
      status,
      assigneeEmail: assignToMe ? currentUser.email : caseToEdit?.assigneeEmail || null,
      assigneeName: assignToMe ? currentUser.displayName || currentUser.email : caseToEdit?.assigneeName || null,
      organizationUnitId: selectedUnit?.id || null,
      targetDepartment: selectedUnit?.department || null,
      targetTeam: selectedUnit?.teamName || null,
      targetRegional: selectedUnit?.regional || null,
      departmentAssigneeName: selectedUnit?.managerName || null,
      departmentAssigneeEmail: selectedUnit?.managerEmail || null,
      escalationLeaderName: selectedUnit?.leaderName || null,
      escalationLeaderEmail: selectedUnit?.leaderEmail || null,
      observations: observations.trim(),
      tags: tagsInput.split(',').map((tag) => tag.trim()).filter(Boolean),
      extraCosts: normalizedCosts,
      totalExtraCost: normalizedCosts.reduce((total, item) => total + item.amount, 0),
      extraCostReason: extraCostReason.trim(),
      updatedAt: now,
    };

    try {
      if (caseToEdit) {
        await updateDoc(doc(db, 'cx_cases', caseToEdit.id), payload);
      } else {
        await addDoc(collection(db, 'cx_cases'), { ...payload, createdAt: now });
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar caso CX:', error);
      setErrorMessage('Não foi possível salvar o caso. Confira as regras do Firestore.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm sm:p-6">
      <form onSubmit={handleSubmit} className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white bg-white shadow-2xl">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-xl sm:px-7">
          <div><h2 className="text-lg font-extrabold text-gray-950">{caseToEdit ? 'Editar caso CX' : 'Novo caso CX'}</h2><p className="text-xs text-gray-500">O direcionamento usa somente a estrutura cadastrada.</p></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          {errorMessage && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{errorMessage}</p>}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Número do pedido" icon={Hash}><input required value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} className="field-input" /></Field>
            <Field label="Código ou produto" icon={Package}><input required value={productCode} onChange={(event) => setProductCode(event.target.value)} className="field-input" /></Field>
            <Field label="Quantidade" icon={Package}><input required min={1} step={1} type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="field-input" /></Field>
            <Field label="Status"><select value={status} onChange={(event) => setStatus(event.target.value as CaseStatus)} className="field-input">{CASE_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3 text-xs font-bold text-gray-700"><input type="checkbox" checked={isReplacement} onChange={(event) => setIsReplacement(event.target.checked)} className="h-4 w-4 accent-[#385041]" />Envolve substituição ou troca</label>
            <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3 text-xs font-bold text-gray-700"><input type="checkbox" checked={assignToMe} onChange={(event) => setAssignToMe(event.target.checked)} className="h-4 w-4 accent-[#385041]" />Atribuir a mim no CX</label>
          </section>

          <section className="border-t border-gray-100 pt-6">
            <div className="mb-4 flex items-start gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e8efe0] text-[#385041]"><Route className="h-4 w-4" /></span><div><h3 className="text-sm font-extrabold text-gray-900">Direcionamento organizacional</h3><p className="text-xs text-gray-500">O gerente recebe o card e a liderança fica registrada para escalonamento.</p></div></div>
            <select value={organizationUnitId} onChange={(event) => setOrganizationUnitId(event.target.value)} className="field-input">
              <option value="">Não direcionar agora</option>
              {activeUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.department} • {unit.teamName} • {unit.regional} → {unit.managerName}</option>)}
            </select>
            {activeUnits.length === 0 && <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Cadastre um time na aba Estrutura antes de direcionar cards.</p>}
            {organizationUnitId && (() => {
              const unit = activeUnits.find((item) => item.id === organizationUnitId);
              return unit ? <div className="mt-3 grid gap-3 rounded-2xl border border-[#385041]/10 bg-[#f5f8f4] p-4 sm:grid-cols-2"><div><p className="text-[10px] font-extrabold uppercase text-gray-400">Gerente responsável</p><p className="mt-1 text-sm font-bold text-gray-900">{unit.managerName}</p><p className="text-xs text-gray-500">{unit.managerEmail}</p></div><div><p className="text-[10px] font-extrabold uppercase text-gray-400">Escalonamento</p><p className="mt-1 text-sm font-bold text-gray-900">{unit.leaderName}</p><p className="text-xs text-gray-500">{unit.leaderEmail}</p></div></div> : null;
            })()}
          </section>

          <section className="border-t border-gray-100 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tags separadas por vírgula" icon={Tag}><input value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} className="field-input" placeholder="urgente, avaria, retorno" /></Field>
              <Field label="Motivo principal do custo" icon={DollarSign}><input value={extraCostReason} onChange={(event) => setExtraCostReason(event.target.value)} className="field-input" placeholder="Se houver custo extra" /></Field>
              <div className="sm:col-span-2"><Field label="Observações"><textarea required rows={4} value={observations} onChange={(event) => setObservations(event.target.value)} className="field-input resize-y" placeholder="Contexto, tratativas e próximos passos" /></Field></div>
            </div>
          </section>

          <section className="border-t border-gray-100 pt-6">
            <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-extrabold text-gray-900">Custos extras</h3><p className="text-xs text-gray-500">Inclua somente valores realmente confirmados.</p></div><button type="button" onClick={addCost} className="flex items-center gap-1.5 rounded-xl border border-[#385041]/20 px-3 py-2 text-xs font-bold text-[#385041] hover:bg-[#eef5eb]"><Plus className="h-4 w-4" />Adicionar</button></div>
            <div className="space-y-2">
              {extraCosts.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_130px_38px] gap-2"><input value={item.description} onChange={(event) => updateCost(item.id, 'description', event.target.value)} className="field-input" placeholder="Descrição" /><input min={0} step="0.01" type="number" value={item.amount} onChange={(event) => updateCost(item.id, 'amount', Number(event.target.value))} className="field-input" /><button type="button" onClick={() => removeCost(item.id)} className="flex items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>
              ))}
              {extraCosts.length === 0 && <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">Nenhum custo extra registrado.</p>}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-xl sm:px-7">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#385041] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar caso'}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: typeof UserRound; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-700">{Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}{label}</span>{children}</label>;
}
