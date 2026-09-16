import { FormEvent, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  ArrowDown,
  BriefcaseBusiness,
  Building2,
  Crown,
  Mail,
  MapPinned,
  Network,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { addDoc, collection, db, deleteDoc, doc, updateDoc } from '../lib/firebase';
import { OrganizationPerson, OrganizationRole, OrganizationUnit } from '../types';

interface OrganizationViewProps {
  units: OrganizationUnit[];
  people: OrganizationPerson[];
  currentUser: User;
  canManage: boolean;
  canDeleteLegacy: boolean;
}

const REGIONAL_SUGGESTIONS = ['Nacional', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];
const ROLE_ORDER: OrganizationRole[] = ['Head', 'Gerente', 'Coordenador', 'Líder'];
const SUPERVISOR_ROLE: Partial<Record<OrganizationRole, OrganizationRole>> = {
  Gerente: 'Head',
  Coordenador: 'Gerente',
  Líder: 'Coordenador',
};
const ROLE_STYLE: Record<OrganizationRole, { title: string; description: string; icon: typeof Crown; accent: string; soft: string; line: string }> = {
  Head: { title: 'Kanban Head', description: 'Responsáveis pela gestão executiva', icon: Crown, accent: 'text-violet-700', soft: 'bg-violet-50', line: 'border-violet-200' },
  Gerente: { title: 'Kanban Gerência', description: 'Gerentes vinculados a um Head', icon: BriefcaseBusiness, accent: 'text-blue-700', soft: 'bg-blue-50', line: 'border-blue-200' },
  Coordenador: { title: 'Kanban Coordenadores', description: 'Coordenadores vinculados a um gerente', icon: UserCog, accent: 'text-amber-700', soft: 'bg-amber-50', line: 'border-amber-200' },
  Líder: { title: 'Kanban Líderes', description: 'Líderes vinculados a um coordenador', icon: Users, accent: 'text-emerald-700', soft: 'bg-emerald-50', line: 'border-emerald-200' },
};

const emptyForm: {
  name: string;
  email: string;
  role: OrganizationRole;
  reportsToId: string;
  department: string;
  regional: string;
  active: boolean;
} = {
  name: '',
  email: '',
  role: 'Head',
  reportsToId: '',
  department: '',
  regional: '',
  active: true,
};

export default function OrganizationView({ units, people, currentUser, canManage, canDeleteLegacy }: OrganizationViewProps) {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<OrganizationPerson | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const filteredPeople = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    if (!query) return people;
    return people.filter((person) => [person.name, person.email, person.role, person.department || '', person.regional || '', person.reportsToName || '']
      .some((value) => value.toLocaleLowerCase('pt-BR').includes(query)));
  }, [people, search]);

  const personById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const supervisorOptions = people.filter((person) => person.active && person.role === SUPERVISOR_ROLE[form.role] && person.id !== editingPerson?.id);

  const openCreateForm = (role: OrganizationRole = 'Head') => {
    setEditingPerson(null);
    setForm({ ...emptyForm, role });
    setErrorMessage('');
    setIsFormOpen(true);
  };

  const openEditForm = (person: OrganizationPerson) => {
    setEditingPerson(person);
    setForm({
      name: person.name,
      email: person.email,
      role: person.role,
      reportsToId: person.reportsToId || '',
      department: person.department || '',
      regional: person.regional || '',
      active: person.active,
    });
    setErrorMessage('');
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const supervisor = form.role === 'Head' ? null : personById.get(form.reportsToId);
    if (form.role !== 'Head' && !supervisor) {
      setErrorMessage(`Selecione para qual ${SUPERVISOR_ROLE[form.role]?.toLocaleLowerCase('pt-BR')} esta pessoa responde.`);
      return;
    }

    setSaving(true);
    setErrorMessage('');
    const now = Date.now();
    const payload = {
      name: form.name.replace(/\s+/g, ' ').trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      reportsToId: supervisor?.id || null,
      reportsToName: supervisor?.name || null,
      department: form.department.replace(/\s+/g, ' ').trim(),
      regional: form.regional.trim(),
      active: form.active,
      updatedAt: now,
    };

    try {
      if (editingPerson) {
        await updateDoc(doc(db, 'organization_people', editingPerson.id), payload);
      } else {
        await addDoc(collection(db, 'organization_people'), {
          ...payload,
          createdByEmail: currentUser.email || '',
          createdAt: now,
        });
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error('Erro ao salvar pessoa na estrutura:', error);
      setErrorMessage('Não foi possível salvar. Publique as regras atualizadas do Firestore e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const removePerson = async (person: OrganizationPerson) => {
    const dependents = people.filter((item) => item.reportsToId === person.id);
    const warning = dependents.length
      ? `${person.name} possui ${dependents.length} pessoa(s) vinculada(s). Elas ficarão sem responsável até serem editadas. Deseja excluir mesmo assim?`
      : `Deseja excluir o card de ${person.name}?`;
    if (!window.confirm(warning)) return;

    try {
      await Promise.all(dependents.map((item) => updateDoc(doc(db, 'organization_people', item.id), {
        reportsToId: null,
        reportsToName: null,
        updatedAt: Date.now(),
      })));
      await deleteDoc(doc(db, 'organization_people', person.id));
    } catch (error) {
      console.error('Erro ao excluir pessoa:', error);
      window.alert('Não foi possível excluir este card. Confira as regras publicadas do Firestore.');
    }
  };

  const removeLegacyUnit = async (unit: OrganizationUnit) => {
    if (!window.confirm(`Excluir definitivamente o cadastro antigo “${unit.teamName}”?`)) return;
    try {
      await deleteDoc(doc(db, 'organization_units', unit.id));
    } catch (error) {
      console.error('Erro ao excluir cadastro antigo:', error);
      window.alert('Não foi possível excluir este cadastro. Apenas o administrador principal pode remover cadastros antigos.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-[#385041]/10 bg-white/85 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 bg-[#f4f8f2] p-5 lg:flex-row lg:items-end lg:justify-between sm:p-6">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#385041]"><Network className="h-4 w-4" />Cadeia de liderança</p>
            <h2 className="mt-1 text-xl font-extrabold text-gray-950">Head → Gerente → Coordenador → Líder</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500">Cada card mostra a função e para quem aquela pessoa responde. O vínculo fica salvo no Firestore.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, e-mail ou regional" className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#385041]" />
            </label>
            {canManage && <button onClick={() => openCreateForm()} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#385041] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#2c4033]"><Plus className="h-4 w-4" />Cadastrar pessoa</button>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-gray-100 lg:grid-cols-4">
          {ROLE_ORDER.map((role) => {
            const config = ROLE_STYLE[role];
            const Icon = config.icon;
            const count = people.filter((person) => person.role === role && person.active).length;
            return <div key={role} className="bg-white p-4"><div className="flex items-center justify-between gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.soft} ${config.accent}`}><Icon className="h-5 w-5" /></span><strong className="text-2xl text-gray-950">{count}</strong></div><p className="mt-3 text-[10px] font-extrabold uppercase tracking-wide text-gray-500">{role}s ativos</p></div>;
          })}
        </div>
      </section>

      <section className="overflow-x-auto pb-2">
        <div className="grid min-w-[1120px] grid-cols-4 gap-4">
          {ROLE_ORDER.map((role, roleIndex) => {
            const config = ROLE_STYLE[role];
            const Icon = config.icon;
            const rolePeople = filteredPeople.filter((person) => person.role === role);
            return (
              <div key={role} className={`relative min-h-[420px] rounded-3xl border bg-white/65 p-3 shadow-sm ${config.line}`}>
                {roleIndex < ROLE_ORDER.length - 1 && <span className="absolute -right-3 top-10 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm"><ArrowDown className="h-3.5 w-3.5 -rotate-90" /></span>}
                <div className="flex items-center justify-between gap-2 px-1 py-2">
                  <div className="flex min-w-0 items-center gap-2.5"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${config.soft} ${config.accent}`}><Icon className="h-4 w-4" /></span><span className="min-w-0"><strong className="block truncate text-xs text-gray-950">{config.title}</strong><small className="block truncate text-[9px] text-gray-500">{config.description}</small></span></div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold text-gray-600">{rolePeople.length}</span>
                </div>

                <div className="mt-2 space-y-3">
                  {rolePeople.map((person) => {
                    const supervisor = person.reportsToId ? personById.get(person.reportsToId) : null;
                    return <article key={person.id} className={`rounded-2xl border bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${person.active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${person.active ? 'bg-emerald-500' : 'bg-gray-300'}`} /><h3 className="truncate text-sm font-extrabold text-gray-950">{person.name}</h3></div><p className="mt-1 flex items-center gap-1.5 truncate text-[10px] text-gray-500"><Mail className="h-3 w-3" />{person.email}</p></div>
                        {canManage && <div className="flex shrink-0 gap-0.5"><button onClick={() => openEditForm(person)} title="Editar card" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => removePerson(person)} title="Excluir card" className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></div>}
                      </div>
                      {(person.department || person.regional) && <div className="mt-3 flex flex-wrap gap-1.5">{person.department && <span className="rounded-full bg-gray-100 px-2 py-1 text-[9px] font-bold text-gray-600">{person.department}</span>}{person.regional && <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700"><MapPinned className="h-2.5 w-2.5" />{person.regional}</span>}</div>}
                      {role !== 'Head' && <div className={`mt-3 rounded-xl border px-3 py-2.5 ${supervisor ? `${config.soft} ${config.line}` : 'border-red-100 bg-red-50'}`}><small className="block text-[8px] font-extrabold uppercase tracking-wide text-gray-400">Responde para</small><strong className={`mt-0.5 block truncate text-[11px] ${supervisor ? 'text-gray-800' : 'text-red-700'}`}>{supervisor?.name || person.reportsToName || 'Responsável não definido'}</strong><span className="mt-0.5 block text-[9px] text-gray-500">{SUPERVISOR_ROLE[role]}</span></div>}
                    </article>;
                  })}
                  {!rolePeople.length && <div className="rounded-2xl border border-dashed border-gray-200 bg-white/50 px-4 py-10 text-center"><Icon className="mx-auto h-7 w-7 text-gray-300" /><p className="mt-2 text-[10px] font-semibold text-gray-400">Nenhum {role.toLocaleLowerCase('pt-BR')} cadastrado</p>{canManage && <button onClick={() => openCreateForm(role)} className="mt-3 text-[10px] font-extrabold text-[#385041]">+ Adicionar</button>}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {!!units.length && <section className="rounded-3xl border border-amber-200 bg-amber-50/55 p-5 shadow-sm">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700"><Network className="h-5 w-5" /></span><div><h3 className="text-sm font-extrabold text-gray-950">Cadastros do modelo anterior</h3><p className="mt-1 text-[10px] leading-relaxed text-gray-600">Esses cards foram criados antes da nova hierarquia. Você pode conferir e apagar os que não serão mais utilizados.</p></div></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{units.map((unit) => <article key={unit.id} className="rounded-2xl border border-amber-100 bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-xs text-gray-900">{unit.teamName}</strong><span className="mt-1 block truncate text-[10px] text-gray-500">{unit.department} · {unit.regional}</span></div>{canDeleteLegacy && <button onClick={() => removeLegacyUnit(unit)} title="Excluir cadastro antigo" className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}</div><div className="mt-3 grid gap-1 text-[10px] text-gray-600"><span>Gerente: <strong>{unit.managerName}</strong></span><span>Liderança: <strong>{unit.leaderName}</strong></span>{unit.coordinatorName && <span>Coordenação: <strong>{unit.coordinatorName}</strong></span>}</div></article>)}</div>
      </section>}

      {isFormOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white bg-white shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5"><div><h3 className="text-lg font-extrabold text-gray-950">{editingPerson ? 'Editar pessoa' : 'Cadastrar pessoa'}</h3><p className="text-xs text-gray-500">Monte a cadeia informando a função e o responsável direto.</p></div><button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button></div>
          <div className="space-y-5 p-6">
            {errorMessage && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{errorMessage}</p>}
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Nome completo" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Nome real" icon={Users} /><Field label="E-mail corporativo" value={form.email} onChange={(value) => setForm({ ...form, email: value })} placeholder="nome@fotus.com.br" type="email" icon={Mail} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1.5 block text-xs font-bold text-gray-700">Função no organograma</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as OrganizationRole, reportsToId: '' })} className="field-input">{ROLE_ORDER.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
              {form.role === 'Head' ? <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3"><small className="block text-[9px] font-extrabold uppercase tracking-wide text-violet-600">Topo da estrutura</small><strong className="mt-1 block text-xs text-violet-950">Head não responde a outro card</strong></div> : <label className="block"><span className="mb-1.5 block text-xs font-bold text-gray-700">Responde para ({SUPERVISOR_ROLE[form.role]})</span><select required value={form.reportsToId} onChange={(event) => setForm({ ...form, reportsToId: event.target.value })} className="field-input"><option value="">Selecione o responsável direto</option>{supervisorOptions.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.email}</option>)}</select>{!supervisorOptions.length && <small className="mt-1.5 block text-[9px] text-amber-700">Cadastre primeiro um {SUPERVISOR_ROLE[form.role]?.toLocaleLowerCase('pt-BR')} ativo.</small>}</label>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Setor" value={form.department} onChange={(value) => setForm({ ...form, department: value })} placeholder="Ex.: CX" icon={Building2} required={false} /><div><Field label="Regional" value={form.regional} onChange={(value) => setForm({ ...form, regional: value })} placeholder="Nacional ou regional" icon={MapPinned} list="organization-regional-options" required={false} /><datalist id="organization-regional-options">{REGIONAL_SUGGESTIONS.map((regional) => <option key={regional} value={regional} />)}</datalist></div></div>
            <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm font-semibold text-gray-700"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-4 w-4 accent-[#385041]" />Pessoa ativa na estrutura</label>
          </div>
          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4"><button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100">Cancelar</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#385041] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar card'}</button></div>
        </form>
      </div>}
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
  required?: boolean;
}

function Field({ label, value, onChange, placeholder, type = 'text', icon: Icon, list, required = true }: FieldProps) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-gray-700">{label}</span><span className="relative block">{Icon && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />}<input required={required} type={type} list={list} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-3 text-sm outline-none focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10 ${Icon ? 'pl-9' : 'pl-3'}`} /></span></label>;
}
