import { FormEvent, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Building2,
  Mail,
  MapPinned,
  Network,
  Pencil,
  Plus,
  Power,
  Save,
  Search,
  UserRoundCog,
  Users,
  X,
} from 'lucide-react';
import { addDoc, collection, db, doc, updateDoc } from '../lib/firebase';
import { OrganizationUnit } from '../types';

interface OrganizationViewProps {
  units: OrganizationUnit[];
  currentUser: User;
}

const REGIONAL_SUGGESTIONS = ['Nacional', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

const emptyForm = {
  department: '',
  teamName: '',
  regional: '',
  managerName: '',
  managerEmail: '',
  leaderName: '',
  leaderEmail: '',
  coordinatorName: '',
  coordinatorEmail: '',
  active: true,
};

export default function OrganizationView({ units, currentUser }: OrganizationViewProps) {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<OrganizationUnit | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const filteredUnits = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return units;
    return units.filter((unit) => [
      unit.department,
      unit.teamName,
      unit.regional,
      unit.managerName,
      unit.managerEmail,
      unit.leaderName,
      unit.leaderEmail,
      unit.coordinatorName || '',
      unit.coordinatorEmail || '',
    ].some((value) => value.toLowerCase().includes(query)));
  }, [search, units]);

  const regionsCount = new Set(units.filter((unit) => unit.active).map((unit) => unit.regional)).size;
  const managersCount = new Set(units.filter((unit) => unit.active).map((unit) => unit.managerEmail.toLowerCase())).size;
  const leadersCount = new Set(units.filter((unit) => unit.active).map((unit) => unit.leaderEmail.toLowerCase())).size;
  const coordinatorsCount = new Set(units.filter((unit) => unit.active && unit.coordinatorEmail).map((unit) => (unit.coordinatorEmail || '').toLowerCase())).size;

  const openCreateForm = () => {
    setEditingUnit(null);
    setForm(emptyForm);
    setErrorMessage('');
    setIsFormOpen(true);
  };

  const openEditForm = (unit: OrganizationUnit) => {
    setEditingUnit(unit);
    setForm({
      department: unit.department,
      teamName: unit.teamName,
      regional: unit.regional,
      managerName: unit.managerName,
      managerEmail: unit.managerEmail,
      leaderName: unit.leaderName,
      leaderEmail: unit.leaderEmail,
      coordinatorName: unit.coordinatorName || '',
      coordinatorEmail: unit.coordinatorEmail || '',
      active: unit.active,
    });
    setErrorMessage('');
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    const now = Date.now();
    const payload = {
      department: form.department.trim(),
      teamName: form.teamName.trim(),
      regional: form.regional.trim(),
      managerName: form.managerName.trim(),
      managerEmail: form.managerEmail.trim().toLowerCase(),
      leaderName: form.leaderName.trim(),
      leaderEmail: form.leaderEmail.trim().toLowerCase(),
      coordinatorName: form.coordinatorName.trim(),
      coordinatorEmail: form.coordinatorEmail.trim().toLowerCase(),
      active: form.active,
      updatedAt: now,
    };

    try {
      if (editingUnit) {
        await updateDoc(doc(db, 'organization_units', editingUnit.id), payload);
      } else {
        await addDoc(collection(db, 'organization_units'), {
          ...payload,
          createdByEmail: currentUser.email || '',
          createdAt: now,
        });
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error('Erro ao salvar estrutura:', error);
      setErrorMessage('Não foi possível salvar. Confira as regras do Firestore e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const toggleUnit = async (unit: OrganizationUnit) => {
    try {
      await updateDoc(doc(db, 'organization_units', unit.id), {
        active: !unit.active,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Erro ao atualizar estrutura:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'Times cadastrados', value: units.length, icon: Network, color: 'text-[#385041] bg-[#e8efe0]' },
          { label: 'Regionais ativas', value: regionsCount, icon: MapPinned, color: 'text-blue-700 bg-blue-50' },
          { label: 'Gerentes ativos', value: managersCount, icon: UserRoundCog, color: 'text-violet-700 bg-violet-50' },
          { label: 'Lideranças', value: leadersCount, icon: Users, color: 'text-amber-700 bg-amber-50' },
          { label: 'Coordenação', value: coordinatorsCount, icon: UserRoundCog, color: 'text-violet-700 bg-violet-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">{label}</p>
                <p className="mt-1 text-2xl font-extrabold text-gray-950">{value}</p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-gray-950">Estrutura de direcionamento</h2>
          <p className="text-xs text-gray-500">Cada card pode ser encaminhado ao gerente correto e escalado para sua liderança.</p>
        </div>
        <div className="flex gap-2">
          <label className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar time ou regional" className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#385041]" />
          </label>
          <button onClick={openCreateForm} className="flex shrink-0 items-center gap-2 rounded-xl bg-[#385041] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#2c4033]">
            <Plus className="h-4 w-4" /> Novo time
          </button>
        </div>
      </div>

      {filteredUnits.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white/60 px-6 py-16 text-center">
          <Network className="mx-auto h-11 w-11 text-gray-300" />
          <h3 className="mt-4 text-base font-bold text-gray-800">Nenhuma estrutura cadastrada</h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-gray-500">Cadastre o primeiro time com regional, gerente e liderança. Nenhuma pessoa é criada automaticamente.</p>
          <button onClick={openCreateForm} className="mt-5 rounded-xl bg-[#385041] px-4 py-2.5 text-xs font-bold text-white">Cadastrar primeiro time</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredUnits.map((unit) => (
            <article key={unit.id} className={`rounded-2xl border bg-white/85 p-5 shadow-sm transition-all ${unit.active ? 'border-white/90' : 'border-gray-200 opacity-60'}`}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${unit.active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <h3 className="truncate text-sm font-extrabold text-gray-950">{unit.teamName}</h3>
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-[#385041]">{unit.department}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleUnit(unit)} title={unit.active ? 'Desativar' : 'Ativar'} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><Power className="h-4 w-4" /></button>
                  <button onClick={() => openEditForm(unit)} title="Editar" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><Pencil className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs font-bold text-blue-800">
                <MapPinned className="h-4 w-4" /> {unit.regional}
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Gerente do time</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">{unit.managerName}</p>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-gray-500"><Mail className="h-3 w-3" />{unit.managerEmail}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700/70">Liderança do gerente</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">{unit.leaderName}</p>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-gray-500"><Mail className="h-3 w-3" />{unit.leaderEmail}</p>
                </div>
                {(unit.coordinatorName || unit.coordinatorEmail) && <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-violet-700/70">Coordenação do setor</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">{unit.coordinatorName || 'Não informado'}</p>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-gray-500"><Mail className="h-3 w-3" />{unit.coordinatorEmail || 'Sem e-mail'}</p>
                </div>}
              </div>
            </article>
          ))}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5">
              <div>
                <h3 className="text-lg font-extrabold text-gray-950">{editingUnit ? 'Editar estrutura' : 'Cadastrar time'}</h3>
                <p className="text-xs text-gray-500">Use somente nomes e e-mails reais da empresa.</p>
              </div>
              <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-5 p-6">
              {errorMessage && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{errorMessage}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Setor" value={form.department} onChange={(value) => setForm({ ...form, department: value })} placeholder="Ex.: Logística" icon={Building2} />
                <Field label="Nome do time" value={form.teamName} onChange={(value) => setForm({ ...form, teamName: value })} placeholder="Ex.: Pós-vendas" icon={Users} />
              </div>
              <div>
                <Field label="Regional" value={form.regional} onChange={(value) => setForm({ ...form, regional: value })} placeholder="Digite ou selecione uma regional" icon={MapPinned} list="regional-options" />
                <datalist id="regional-options">{REGIONAL_SUGGESTIONS.map((regional) => <option key={regional} value={regional} />)}</datalist>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-gray-500">Gerente do time</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nome completo" value={form.managerName} onChange={(value) => setForm({ ...form, managerName: value })} placeholder="Nome real" />
                  <Field label="E-mail corporativo" value={form.managerEmail} onChange={(value) => setForm({ ...form, managerEmail: value })} placeholder="nome@fotus.com.br" type="email" icon={Mail} />
                </div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-amber-800">Liderança do gerente</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nome completo" value={form.leaderName} onChange={(value) => setForm({ ...form, leaderName: value })} placeholder="Nome real" />
                  <Field label="E-mail corporativo" value={form.leaderEmail} onChange={(value) => setForm({ ...form, leaderEmail: value })} placeholder="nome@fotus.com.br" type="email" icon={Mail} />
                </div>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-violet-800">Coordenação do setor</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nome completo" value={form.coordinatorName} onChange={(value) => setForm({ ...form, coordinatorName: value })} placeholder="Nome real" />
                  <Field label="E-mail corporativo" value={form.coordinatorEmail} onChange={(value) => setForm({ ...form, coordinatorEmail: value })} placeholder="nome@fotus.com.br" type="email" icon={Mail} />
                </div>
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm font-semibold text-gray-700">
                <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-4 w-4 accent-[#385041]" />
                Disponível para novos direcionamentos
              </label>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4">
              <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#385041] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar estrutura'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  icon?: typeof Building2;
  list?: string;
}

function Field({ label, value, onChange, placeholder, type = 'text', icon: Icon, list }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-gray-700">{label}</span>
      <span className="relative block">
        {Icon && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />}
        <input required type={type} list={list} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-3 text-sm outline-none focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 ${Icon ? 'pl-9' : 'pl-3'}`} />
      </span>
    </label>
  );
}
