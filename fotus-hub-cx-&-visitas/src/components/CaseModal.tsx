import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Check, ArrowRight, UserCheck, DollarSign, Building, Truck, Wrench, Briefcase, Compass, Award, Tag } from 'lucide-react';
import { CXCase, CaseStatus, Department, ExtraCostItem } from '../types';
import { db, collection, addDoc, updateDoc, doc } from '../lib/firebase';
import { DEPARTMENTS, DEPARTMENT_LIST } from '../lib/departments';
import { User } from 'firebase/auth';

interface CaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseToEdit?: CXCase | null;
  currentUser: User | null;
}

const statusOptions: { value: CaseStatus; label: string }[] = [
  { value: 'Aberto', label: 'Aberto' },
  { value: 'Em Andamento', label: 'Em Andamento' },
  { value: 'Resolvido', label: 'Resolvido' },
  { value: 'Cancelado', label: 'Cancelado' }
];

export default function CaseModal({ isOpen, onClose, caseToEdit, currentUser }: CaseModalProps) {
  const [orderNumber, setOrderNumber] = useState('');
  const [productCode, setProductCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isReplacement, setIsReplacement] = useState(false);
  const [status, setStatus] = useState<CaseStatus>('Aberto');
  const [observations, setObservations] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [assignToMe, setAssignToMe] = useState(false);
  
  // New Sector Forwarding State
  const [targetDepartment, setTargetDepartment] = useState<Department | null>(null);
  const [departmentAssigneeName, setDepartmentAssigneeName] = useState<string | null>(null);
  const [departmentAssigneeEmail, setDepartmentAssigneeEmail] = useState<string | null>(null);

  // New Extra Costs State
  const [extraCosts, setExtraCosts] = useState<ExtraCostItem[]>([]);
  const [newCostDesc, setNewCostDesc] = useState('');
  const [newCostAmount, setNewCostAmount] = useState('');
  const [extraCostReason, setExtraCostReason] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (caseToEdit) {
      setOrderNumber(caseToEdit.orderNumber || '');
      setProductCode(caseToEdit.productCode || '');
      setQuantity(caseToEdit.quantity || 1);
      setIsReplacement(caseToEdit.isReplacement || false);
      setStatus(caseToEdit.status || 'Aberto');
      setObservations(caseToEdit.observations || '');
      setTagsInput(caseToEdit.tags?.join(', ') || '');
      setAssignToMe(caseToEdit.assigneeEmail === currentUser?.email);
      setTargetDepartment(caseToEdit.targetDepartment || null);
      setDepartmentAssigneeName(caseToEdit.departmentAssigneeName || null);
      setDepartmentAssigneeEmail(caseToEdit.departmentAssigneeEmail || null);
      setExtraCosts(caseToEdit.extraCosts || []);
      setExtraCostReason(caseToEdit.extraCostReason || '');
    } else {
      setOrderNumber('');
      setProductCode('');
      setQuantity(1);
      setIsReplacement(false);
      setStatus('Aberto');
      setObservations('');
      setTagsInput('');
      setAssignToMe(true);
      setTargetDepartment(null);
      setDepartmentAssigneeName(null);
      setDepartmentAssigneeEmail(null);
      setExtraCosts([]);
      setExtraCostReason('');
    }
    setNewCostDesc('');
    setNewCostAmount('');
  }, [caseToEdit, isOpen, currentUser]);

  if (!isOpen) return null;

  const totalExtraCost = extraCosts.reduce((acc, item) => acc + item.amount, 0);

  const handleAddCost = () => {
    if (!newCostDesc.trim()) return;
    const cleanAmount = parseFloat(newCostAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (cleanAmount <= 0) return;

    const newItem: ExtraCostItem = {
      id: Date.now().toString(),
      description: newCostDesc.trim(),
      amount: cleanAmount
    };

    setExtraCosts(prev => [...prev, newItem]);
    setNewCostDesc('');
    setNewCostAmount('');
  };

  const handleRemoveCost = (id: string) => {
    setExtraCosts(prev => prev.filter(c => c.id !== id));
  };

  const handleSelectDepartment = (dept: Department) => {
    if (targetDepartment === dept) {
      setTargetDepartment(null);
      setDepartmentAssigneeName(null);
      setDepartmentAssigneeEmail(null);
    } else {
      setTargetDepartment(dept);
      // Automatically select first member as default or let user pick
      const defaultMember = DEPARTMENTS[dept].members[0];
      setDepartmentAssigneeName(defaultMember.name);
      setDepartmentAssigneeEmail(defaultMember.email);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const caseData = {
        orderNumber: orderNumber.trim(),
        productCode: productCode.trim(),
        quantity: Number(quantity) || 1,
        isReplacement,
        status,
        observations: observations.trim(),
        tags: tagsInput.split(',').map(t => t.trim()).filter(t => t),
        assigneeEmail: assignToMe ? currentUser?.email || null : (caseToEdit?.assigneeEmail || null),
        assigneeName: assignToMe ? currentUser?.displayName || null : (caseToEdit?.assigneeName || null),
        targetDepartment: targetDepartment || null,
        departmentAssigneeName: departmentAssigneeName || null,
        departmentAssigneeEmail: departmentAssigneeEmail || null,
        extraCosts,
        totalExtraCost,
        extraCostReason: extraCostReason.trim() || (extraCosts.length > 0 ? extraCosts[0].description : ''),
        updatedAt: Date.now(),
      };

      if (caseToEdit) {
        await updateDoc(doc(db, 'cx_cases', caseToEdit.id), caseData);
      } else {
        await addDoc(collection(db, 'cx_cases'), {
          ...caseData,
          createdAt: Date.now(),
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving document: ", error);
      alert('Erro ao salvar o caso CX.');
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentIcon = (dept: Department) => {
    switch (dept) {
      case 'Logística': return <Truck className="w-4 h-4" />;
      case 'Financeiro': return <DollarSign className="w-4 h-4" />;
      case 'Suporte Técnico': return <Wrench className="w-4 h-4" />;
      case 'Diretoria': return <Briefcase className="w-4 h-4" />;
      case 'Coordenação': return <Compass className="w-4 h-4" />;
      case 'Liderança': return <Award className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] transition-all">
        
        {/* Sleek Minimalist Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                {caseToEdit ? `Editar Caso CX #${caseToEdit.orderNumber}` : 'Novo Caso CX'}
              </h2>
              {isReplacement && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Substituição
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Acompanhamento e direcionamento operacional</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          <form id="case-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Status Segmented Switcher (Clean, Modern, Space-efficient) */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Status do Atendimento</label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-gray-100/90 rounded-2xl">
                {statusOptions.map((s) => {
                  const isSelected = status === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStatus(s.value)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                        isSelected 
                          ? s.value === 'Cancelado'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-[#385041] text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span className="truncate">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Basic Info: Order & Product */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nº do Pedido *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 192716-98"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Cód. do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: MOD-CAN-550W"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Quantidade *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* SEÇÃO: DIRECIONAR SETOR (Imersivo) */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-gray-50/90 to-white border border-gray-200/90 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#e8efe0] text-[#385041]">
                    <Building className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Direcionar Setor</h4>
                    <p className="text-[11px] text-gray-500">Selecione a equipe responsável por dar andamento neste caso</p>
                  </div>
                </div>
                {targetDepartment && (
                  <button
                    type="button"
                    onClick={() => {
                      setTargetDepartment(null);
                      setDepartmentAssigneeName(null);
                      setDepartmentAssigneeEmail(null);
                    }}
                    className="text-[11px] text-red-600 hover:underline font-semibold"
                  >
                    Limpar setor
                  </button>
                )}
              </div>

              {/* 6 Sectors Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEPARTMENT_LIST.map((dept) => {
                  const isSelected = targetDepartment === dept;
                  const config = DEPARTMENTS[dept];
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => handleSelectDepartment(dept)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                        isSelected 
                          ? `${config.pillBg} ${config.textColor} ${config.borderColor} ring-2 ring-offset-1 ring-[#385041]/30 shadow-xs` 
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <span className={isSelected ? config.textColor : 'text-gray-400'}>
                        {getDepartmentIcon(dept)}
                      </span>
                      <span className="truncate">{dept}</span>
                    </button>
                  );
                })}
              </div>

              {/* Immersive Members Selection for the active sector */}
              {targetDepartment && (
                <div className="mt-3 pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                      Membros em {targetDepartment}:
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {DEPARTMENTS[targetDepartment].description}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {DEPARTMENTS[targetDepartment].members.map((member) => {
                      const isMemberSelected = departmentAssigneeName === member.name;
                      return (
                        <button
                          key={member.email}
                          type="button"
                          onClick={() => {
                            setDepartmentAssigneeName(member.name);
                            setDepartmentAssigneeEmail(member.email);
                          }}
                          className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                            isMemberSelected
                              ? 'bg-white border-[#385041] shadow-xs ring-1 ring-[#385041]'
                              : 'bg-gray-50/60 border-gray-200/80 hover:bg-white text-gray-700'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            isMemberSelected ? 'bg-[#385041] text-white' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {member.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 truncate">{member.name}</p>
                            <p className="text-[10px] text-gray-500 truncate leading-tight">{member.role}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO: CUSTOS EXTRAS */}
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                    <DollarSign className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">Custos Extras do Caso</h4>
                    <p className="text-[11px] text-amber-700/80">Registre avarias, fretes dedicados ou despesas adicionais</p>
                  </div>
                </div>
                {totalExtraCost > 0 && (
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
                    Total: R$ {totalExtraCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>

              {/* Added Extra Costs List */}
              {extraCosts.length > 0 && (
                <div className="space-y-1.5">
                  {extraCosts.map((cost) => (
                    <div 
                      key={cost.id} 
                      className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-amber-200/80 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-gray-800 truncate">{cost.description}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className="font-bold text-amber-800">
                          R$ {cost.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCost(cost.id)}
                          className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                          title="Remover custo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Extra Cost Row */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Ex: Módulo avariado em trânsito"
                  value={newCostDesc}
                  onChange={(e) => setNewCostDesc(e.target.value)}
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:border-[#385041] focus:ring-1 focus:ring-[#385041] outline-none"
                />
                <input
                  type="text"
                  placeholder="Valor (R$ 1.215,00)"
                  value={newCostAmount}
                  onChange={(e) => setNewCostAmount(e.target.value)}
                  className="w-full sm:w-36 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:border-[#385041] focus:ring-1 focus:ring-[#385041] outline-none font-semibold"
                />
                <button
                  type="button"
                  onClick={handleAddCost}
                  className="px-3 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all shrink-0 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>

            {/* Tags & Quick Options */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tags (separadas por vírgula)
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ex: Avaria, Frete, Garantia, Urgente"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full bg-gray-50/80 border border-gray-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-[#385041] focus:ring-[#385041]"
                    checked={isReplacement}
                    onChange={(e) => setIsReplacement(e.target.checked)}
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">Substituição / Troca</span>
                    <span className="text-[10px] text-gray-500 block">Marque se envolve reposição de equipamento</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-[#385041] focus:ring-[#385041]"
                    checked={assignToMe}
                    onChange={(e) => setAssignToMe(e.target.checked)}
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">Atribuir a Mim</span>
                    <span className="text-[10px] text-gray-500 block">Assumir como responsável no CX</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Observations */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Observações e Histórico do Atendimento
              </label>
              <textarea
                rows={3}
                placeholder="Descreva detalhes, tratativas com cliente/integrador, notas técnicas..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full bg-gray-50/80 border border-gray-200 rounded-xl p-3 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all resize-none"
              />
            </div>

          </form>
        </div>
        
        {/* Minimal Footer */}
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
            form="case-form"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#385041] hover:bg-[#2c4033] text-white rounded-xl font-bold text-sm shadow-sm transition-all disabled:opacity-70 active:scale-95"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar Caso CX'}
          </button>
        </div>

      </div>
    </div>
  );
}
