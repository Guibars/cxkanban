import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { Building2, CalendarDays, FileText, Hash, Package, Receipt, Save, Tag, UserRound, X } from 'lucide-react';
import { addDoc, collection, db, doc, updateDoc } from '../lib/firebase';
import { EXTRA_COST_ORIGINS, EXTRA_COST_REASON_CATEGORIES, EXTRA_COST_REGIONALS, monthYearFromDate, totalExtraCost } from '../lib/extraCosts';
import { ExtraCost, ExtraCostResponsible } from '../types';

interface ExtraCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  cost: ExtraCost | null;
  currentUser: User;
}

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const currency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ExtraCostModal({ isOpen, onClose, cost, currentUser }: ExtraCostModalProps) {
  const [date, setDate] = useState(today());
  const [orderNumber, setOrderNumber] = useState('');
  const [regional, setRegional] = useState('');
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [origin, setOrigin] = useState('');
  const [productCost, setProductCost] = useState(0);
  const [logisticsCost, setLogisticsCost] = useState(0);
  const [taxCost, setTaxCost] = useState(0);
  const [responsible, setResponsible] = useState<ExtraCostResponsible>('Comercial');
  const [reasonCategory, setReasonCategory] = useState('');
  const [detailedReason, setDetailedReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const total = useMemo(() => totalExtraCost(productCost, logisticsCost, taxCost), [logisticsCost, productCost, taxCost]);

  useEffect(() => {
    if (!isOpen) return;
    setDate(cost?.date || today());
    setOrderNumber(cost?.orderNumber || '');
    setRegional(cost?.regional || '');
    setProduct(cost?.product || '');
    setQuantity(cost?.quantity ?? 1);
    setOrigin(cost?.origin || '');
    setProductCost(cost?.productCost || 0);
    setLogisticsCost(cost?.logisticsCost || 0);
    setTaxCost(cost?.taxCost || 0);
    setResponsible(cost?.responsible || 'Comercial');
    setReasonCategory(cost?.reasonCategory || '');
    setDetailedReason(cost?.detailedReason || '');
    setErrorMessage('');
  }, [cost, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    const now = Date.now();
    const payload = {
      date,
      orderNumber: orderNumber.trim(),
      regional: regional.trim(),
      product: product.trim(),
      quantity: Math.max(0, Math.trunc(Number(quantity) || 0)),
      origin: origin.trim(),
      productCost: Number((Number(productCost) || 0).toFixed(2)),
      logisticsCost: Number((Number(logisticsCost) || 0).toFixed(2)),
      taxCost: Number((Number(taxCost) || 0).toFixed(2)),
      totalCost: total,
      responsible,
      reasonCategory: reasonCategory.trim(),
      detailedReason: detailedReason.trim(),
      monthYear: monthYearFromDate(date),
      updatedAt: now,
    };

    try {
      if (cost) {
        await updateDoc(doc(db, 'extra_costs', cost.id), payload);
      } else {
        await addDoc(collection(db, 'extra_costs'), {
          ...payload,
          createdByEmail: currentUser.email || '',
          createdByName: currentUser.displayName || currentUser.email || '',
          createdAt: now,
        });
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar custo extra:', error);
      setErrorMessage('Não foi possível salvar. Publique as novas regras do Firestore e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm sm:p-6">
      <form onSubmit={handleSubmit} className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white bg-white shadow-2xl">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-xl sm:px-7">
          <div><h2 className="text-lg font-extrabold text-gray-950">{cost ? 'Editar custo extra' : 'Novo custo extra'}</h2><p className="text-xs text-gray-500">Registro de gastos não previstos baseado na planilha da Fotus.</p></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </header>

        <div className="space-y-6 p-5 sm:p-7">
          {errorMessage && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{errorMessage}</p>}

          <section>
            <SectionTitle number="1" title="Identificação" description="Informe o pedido, regional e produto relacionado." />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Data" icon={CalendarDays}><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="field-input" /></Field>
              <Field label="Pedido" icon={Hash}><input required value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} className="field-input" placeholder="Ex.: 1414764-98" /></Field>
              <Field label="Regional" icon={Building2}><input required list="extra-cost-regionals" value={regional} onChange={(event) => setRegional(event.target.value)} className="field-input" placeholder="Selecione ou digite" /><datalist id="extra-cost-regionals">{EXTRA_COST_REGIONALS.map((item) => <option key={item} value={item} />)}</datalist></Field>
              <Field label="Origem" icon={Tag}><input required list="extra-cost-origins" value={origin} onChange={(event) => setOrigin(event.target.value)} className="field-input" placeholder="Selecione ou digite" /><datalist id="extra-cost-origins">{EXTRA_COST_ORIGINS.map((item) => <option key={item} value={item} />)}</datalist></Field>
              <div className="sm:col-span-2 lg:col-span-3"><Field label="Produto" icon={Package}><input required value={product} onChange={(event) => setProduct(event.target.value)} className="field-input" placeholder="Produto, serviço ou material" /></Field></div>
              <Field label="Quantidade" icon={Package}><input required min={0} step={1} type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="field-input" /></Field>
            </div>
          </section>

          <section className="border-t border-gray-100 pt-6">
            <SectionTitle number="2" title="Composição do custo" description="O total é calculado automaticamente." />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MoneyField label="Custo do produto" value={productCost} onChange={setProductCost} />
              <MoneyField label="Custo logístico" value={logisticsCost} onChange={setLogisticsCost} />
              <MoneyField label="Impostos" value={taxCost} onChange={setTaxCost} />
              <div className="rounded-2xl border border-[#385041]/15 bg-[#eef5eb] p-4"><span className="text-[10px] font-extrabold uppercase tracking-wider text-[#385041]">Custo total</span><strong className="mt-1 block text-xl text-gray-950">{currency(total)}</strong><span className="text-[10px] text-gray-500">Produto + logística + impostos</span></div>
            </div>
          </section>

          <section className="border-t border-gray-100 pt-6">
            <SectionTitle number="3" title="Responsabilidade e motivo" description="Classifique a origem para manter os insights padronizados." />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Responsável pelo custo" icon={UserRound}><select value={responsible} onChange={(event) => setResponsible(event.target.value as ExtraCostResponsible)} className="field-input"><option>Comercial</option><option>Cliente</option></select></Field>
              <Field label="Categoria do motivo" icon={Tag}><input required list="extra-cost-reasons" value={reasonCategory} onChange={(event) => setReasonCategory(event.target.value)} className="field-input" placeholder="Selecione ou digite" /><datalist id="extra-cost-reasons">{EXTRA_COST_REASON_CATEGORIES.map((item) => <option key={item} value={item} />)}</datalist></Field>
              <div className="sm:col-span-2"><Field label="Motivo detalhado" icon={FileText}><textarea required rows={5} value={detailedReason} onChange={(event) => setDetailedReason(event.target.value)} className="field-input resize-y" placeholder="Descreva o que aconteceu, a decisão tomada e por que o custo foi necessário." /></Field></div>
            </div>
          </section>
        </div>

        <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-xl sm:px-7">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#385041] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar custo'}</button>
        </footer>
      </form>
    </div>
  );
}

function MoneyField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <Field label={label} icon={Receipt}><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">R$</span><input min={0} step="0.01" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="field-input pl-10 text-right" /></div></Field>;
}

function SectionTitle({ number, title, description }: { number: string; title: string; description: string }) {
  return <div className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#385041] text-xs font-extrabold text-white">{number}</span><div><h3 className="text-sm font-extrabold text-gray-900">{title}</h3><p className="text-xs text-gray-500">{description}</p></div></div>;
}

function Field({ label, icon: Icon, children }: { label: string; icon?: typeof Receipt; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-700">{Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}{label}</span>{children}</label>;
}
