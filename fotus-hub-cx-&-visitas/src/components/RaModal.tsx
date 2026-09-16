import React, { useState, useEffect } from 'react';
import { X, Save, Star, User, Phone, Mail, FileText, Check } from 'lucide-react';
import { RACase, CaseStatus } from '../types';
import { db, collection, addDoc, updateDoc, doc } from '../lib/firebase';
import { User as AuthUser } from 'firebase/auth';

interface RaModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseToEdit?: RACase | null;
  currentUser: AuthUser | null;
}

const statusOptions: { value: CaseStatus; label: string }[] = [
  { value: 'Aberto', label: 'Aberto' },
  { value: 'Em Andamento', label: 'Em Andamento' },
  { value: 'Resolvido', label: 'Resolvido' },
  { value: 'Cancelado', label: 'Cancelado' }
];

export default function RaModal({ isOpen, onClose, caseToEdit, currentUser }: RaModalProps) {
  const [raNumber, setRaNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [information, setInformation] = useState('');
  const [status, setStatus] = useState<CaseStatus>('Aberto');
  
  // Indicators
  const [indicatorIR, setIndicatorIR] = useState<number | ''>('');
  const [indicatorIS, setIndicatorIS] = useState<number | ''>('');
  const [indicatorMA, setIndicatorMA] = useState<number | ''>('');
  const [indicatorIN, setIndicatorIN] = useState<number | ''>('');

  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setSaveError('');
    if (caseToEdit) {
      setRaNumber(caseToEdit.raNumber || '');
      setCustomerName(caseToEdit.customerName || '');
      setPhone(caseToEdit.phone || '');
      setEmail(caseToEdit.email || '');
      setInformation(caseToEdit.information || '');
      setStatus(caseToEdit.status || 'Aberto');
      setIndicatorIR(caseToEdit.indicatorIR ?? '');
      setIndicatorIS(caseToEdit.indicatorIS ?? '');
      setIndicatorMA(caseToEdit.indicatorMA ?? '');
      setIndicatorIN(caseToEdit.indicatorIN ?? '');
    } else {
      setRaNumber('');
      setCustomerName('');
      setPhone('');
      setEmail('');
      setInformation('');
      setStatus('Aberto');
      setIndicatorIR('');
      setIndicatorIS('');
      setIndicatorMA('');
      setIndicatorIN('');
    }
  }, [caseToEdit, isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setLoading(true);

    try {
      let finalScore: number | null = null;
      const ir = typeof indicatorIR === 'number' ? indicatorIR : parseFloat(indicatorIR as string);
      const is = typeof indicatorIS === 'number' ? indicatorIS : parseFloat(indicatorIS as string);
      const ma = typeof indicatorMA === 'number' ? indicatorMA : parseFloat(indicatorMA as string);
      const in_ = typeof indicatorIN === 'number' ? indicatorIN : parseFloat(indicatorIN as string);

      if (!isNaN(ir) && !isNaN(is) && !isNaN(ma) && !isNaN(in_)) {
        // The form records all four indicators on a 0–10 scale. Older
        // records that used percentages (0–100) are also normalized safely.
        const indicatorOnTen = (value: number) => value > 10 ? value / 10 : value;
        finalScore = (indicatorOnTen(ir) * 0.2) + (indicatorOnTen(is) * 0.3) + (ma * 0.3) + (indicatorOnTen(in_) * 0.2);
      }

      const caseData = {
        raNumber: raNumber.trim(),
        customerName: customerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        information: information.trim(),
        status,
        indicatorIR: !isNaN(ir) ? ir : null,
        indicatorIS: !isNaN(is) ? is : null,
        indicatorMA: !isNaN(ma) ? ma : null,
        indicatorIN: !isNaN(in_) ? in_ : null,
        finalScore,
        assigneeEmail: caseToEdit?.assigneeEmail || currentUser?.email || null,
        assigneeName: caseToEdit?.assigneeName || currentUser?.displayName || null,
        createdByEmail: caseToEdit?.createdByEmail || currentUser?.email || '',
        createdByName: caseToEdit?.createdByName || currentUser?.displayName || currentUser?.email || '',
        updatedAt: Date.now(),
      };

      if (caseToEdit) {
        await updateDoc(doc(db, 'ra_cases', caseToEdit.id), caseData);
      } else {
        await addDoc(collection(db, 'ra_cases'), {
          ...caseData,
          createdAt: Date.now(),
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving RA case: ", error);
      const errorCode = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      setSaveError(errorCode.includes('permission-denied')
        ? 'Sua conta não tem permissão para editar este registro. Publique as regras atualizadas do Firestore e tente novamente.'
        : 'Não foi possível salvar o caso. Confira sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] transition-all">
        
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200">
              <img src="https://res.cloudinary.com/dsctpzqvy/image/upload/v1787843527/25-reclame_mnxv8n.png" className="w-6 h-6 object-contain" alt="RA" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                {caseToEdit ? `Editar Reclame Aqui #${caseToEdit.raNumber}` : 'Novo Caso Reclame Aqui'}
              </h2>
              <p className="text-xs text-gray-500">Gestão de reputação e indicadores de qualidade</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5">
          <form id="ra-form" onSubmit={handleSubmit} className="space-y-5">
            
            {/* Status Segmented Control */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Status da Reclamação</label>
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

            {/* RA ID & Customer Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ID / Nº da Reclamação *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: RA-984210"
                  value={raNumber}
                  onChange={(e) => setRaNumber(e.target.value)}
                  className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nome do Consumidor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Roberto Carlos Silva"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="cliente@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Information */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Relato da Reclamação & Tratativa
              </label>
              <textarea
                rows={3}
                placeholder="Descreva o motivo da queixa no RA e as providências tomadas..."
                value={information}
                onChange={(e) => setInformation(e.target.value)}
                className="w-full bg-gray-50/80 border border-gray-200 rounded-xl p-3 text-sm text-gray-800 focus:bg-white focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 outline-none transition-all resize-none"
              />
            </div>

            {/* Quality Indicators (0 a 10) */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/60 space-y-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                  Indicadores de Avaliação (0 a 10)
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Índice Resp. (IR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="0-10"
                    value={indicatorIR}
                    onChange={(e) => setIndicatorIR(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 text-xs text-gray-800 focus:border-[#385041] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Índice Solução (IS)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="0-10"
                    value={indicatorIS}
                    onChange={(e) => setIndicatorIS(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 text-xs text-gray-800 focus:border-[#385041] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Voltaria Neg. (MA)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="0-10"
                    value={indicatorMA}
                    onChange={(e) => setIndicatorMA(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 text-xs text-gray-800 focus:border-[#385041] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Nota Consumidor (IN)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="0-10"
                    value={indicatorIN}
                    onChange={(e) => setIndicatorIN(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 text-xs text-gray-800 focus:border-[#385041] outline-none"
                  />
                </div>
              </div>
            </div>

          </form>
        </div>

        {saveError && (
          <div className="mx-6 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700" role="alert">
            {saveError}
          </div>
        )}
        
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
            form="ra-form"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#385041] hover:bg-[#2c4033] text-white rounded-xl font-bold text-sm shadow-sm transition-all disabled:opacity-70 active:scale-95"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar Caso RA'}
          </button>
        </div>

      </div>
    </div>
  );
}
