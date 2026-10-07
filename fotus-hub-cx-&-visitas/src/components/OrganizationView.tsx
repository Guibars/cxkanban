import { FormEvent, useMemo, useState } from 'react';
import type { CurrentUser } from '../lib/currentUser';
import {
  BriefcaseBusiness,
  Building2,
  ImagePlus,
  Mail,
  MapPinned,
  Network,
  Phone,
  Save,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { createData, deleteData, reorderOrganizationPeople, updateData } from '../lib/dataMutations';
import { ORGANIZATION_ROLES, ORGANIZATION_SUPERVISORS } from '../lib/organization';
import { OrganizationPerson, OrganizationRole, OrganizationUnit } from '../types';
import OrganizationDirectory from './OrganizationDirectory';

interface OrganizationViewProps {
  units: OrganizationUnit[];
  people: OrganizationPerson[];
  currentUser: CurrentUser;
  canManage: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canDeleteLegacy: boolean;
}

const REGIONAL_SUGGESTIONS = ['Nacional', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];
const ROLE_ORDER = ORGANIZATION_ROLES;
const supervisorLabel = (role: OrganizationRole) => ORGANIZATION_SUPERVISORS[role]?.join(' / ') || '';

const emptyForm: {
  name: string;
  email: string;
  jobTitle: string;
  phone: string;
  photoUrl: string;
  role: OrganizationRole;
  reportsToId: string;
  department: string;
  regional: string;
  teamName: string;
  active: boolean;
} = {
  name: '',
  email: '',
  jobTitle: '',
  phone: '',
  photoUrl: '',
  role: 'Gerente',
  reportsToId: '',
  department: '',
  regional: '',
  teamName: '',
  active: true,
};

export default function OrganizationView({ units, people, currentUser, canManage, canCreate, canDelete, canDeleteLegacy }: OrganizationViewProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<OrganizationPerson | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [moving, setMoving] = useState(false);
  const personById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);

  const supervisorOptions = people.filter((person) => person.active && ORGANIZATION_SUPERVISORS[form.role]?.includes(person.role) && person.id !== editingPerson?.id);
  const chooseSupervisor = (id: string) => {
    const supervisor = personById.get(id);
    setForm((current) => ({
      ...current, reportsToId: id,
      ...(current.role === 'Consultor' && supervisor && current.reportsToId !== id ? {
        teamName: supervisor.role === 'Líder' ? supervisor.teamName || '' : '',
        regional: supervisor.regional || current.regional,
        department: supervisor.department || current.department,
      } : {}),
    }));
  };

  const openCreateForm = (role: OrganizationRole = 'Gerente') => {
    if (!canCreate) return;
    setEditingPerson(null);
    setForm({ ...emptyForm, role });
    setErrorMessage('');
    setIsFormOpen(true);
  };

  const openEditForm = (person: OrganizationPerson) => {
    if (!canManage) return;
    setEditingPerson(person);
    setForm({
      name: person.name,
      email: person.email || '',
      jobTitle: person.jobTitle || '',
      phone: person.phone || '',
      photoUrl: person.photoUrl || '',
      role: person.role,
      reportsToId: person.reportsToId || '',
      department: person.department || '',
      regional: person.regional || '',
      teamName: person.teamName || '',
      active: person.active,
    });
    setErrorMessage('');
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (editingPerson && (form.role !== editingPerson.role || !form.active)) {
      const dependents = people.filter((person) => person.reportsToId === editingPerson.id);
      if (dependents.length) {
        setErrorMessage(`Reatribua as ${dependents.length} pessoa(s) que respondem a ${editingPerson.name} antes de mudar a função ou desativar este card.`);
        return;
      }
    }
    const supervisor = form.role === 'Head' || !form.reportsToId ? null : personById.get(form.reportsToId);
    if (form.reportsToId && !supervisor) return setErrorMessage('Selecione um responsável válido.');

    setSaving(true);
    setErrorMessage('');
    const now = Date.now();
    const payload = {
      name: form.name.replace(/\s+/g, ' ').trim(),
      email: form.email.trim().toLowerCase(),
      jobTitle: form.jobTitle.trim(),
      phone: form.phone.trim(),
      photoUrl: form.photoUrl,
      role: form.role,
      reportsToId: supervisor?.id || null,
      reportsToName: supervisor?.name || null,
      department: form.department.replace(/\s+/g, ' ').trim(),
      regional: form.regional.trim(),
      teamName: form.teamName.trim(),
      active: form.active,
      sortOrder: editingPerson?.sortOrder ?? people.filter((person) => person.role === form.role).length + 1,
      updatedAt: now,
    };

    try {
      if (editingPerson) {
        await updateData(currentUser, 'organization_people', editingPerson.id, payload);
      } else {
        await createData(currentUser, 'organization_people', {
          ...payload,
          createdByEmail: currentUser.email || '',
          createdAt: now,
        });
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error('Erro ao salvar pessoa na estrutura:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível salvar a pessoa. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const onPhotoSelected = async (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5_000_000) {
      setErrorMessage('Escolha uma imagem JPG, PNG ou WebP de até 5 MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const picture = new Image();
      await new Promise<void>((resolve, reject) => {
        picture.onload = () => resolve();
        picture.onerror = () => reject(new Error('Não foi possível abrir a foto.'));
        picture.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Não foi possível preparar a foto.');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, 128, 128);
      const scale = Math.max(128 / picture.width, 128 / picture.height);
      context.drawImage(picture, (128 - picture.width * scale) / 2, (128 - picture.height * scale) / 2, picture.width * scale, picture.height * scale);
      const photoUrl = canvas.toDataURL('image/jpeg', 0.7);
      if (photoUrl.length > 50_000) throw new Error('A foto ficou muito grande. Escolha outra imagem.');
      setForm((current) => ({ ...current, photoUrl }));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível preparar a foto.');
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const moveCard = async (sourceId: string, targetId: string) => {
    const source = personById.get(sourceId);
    const target = personById.get(targetId);
    if (!canManage || moving || !source || !target || source.id === target.id || source.reportsToId === target.id) return;
    setMoving(true);
    try {
      if (source.role === target.role) {
        const ordered = people.filter((person) => person.role === source.role)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, 'pt-BR'));
        const withoutSource = ordered.filter((person) => person.id !== source.id);
        const targetIndex = withoutSource.findIndex((person) => person.id === target.id);
        withoutSource.splice(targetIndex, 0, source);
        await reorderOrganizationPeople(currentUser, withoutSource.map((person) => person.id));
      } else if (ORGANIZATION_SUPERVISORS[source.role]?.includes(target.role) && target.active) {
        await updateData(currentUser, 'organization_people', source.id, {
          ...source, reportsToId: target.id, reportsToName: target.name, updatedAt: Date.now(),
          ...(source.role === 'Consultor' ? {
            teamName: target.role === 'Líder' ? target.teamName || '' : '',
            regional: target.regional || source.regional,
            department: target.department || source.department,
          } : {}),
        });
      } else {
        window.alert('Solte o card sobre outro da mesma função para ordenar, ou sobre um responsável do nível acima para mudar o vínculo.');
      }
    } catch (error) {
      console.error('Erro ao mover card:', error);
      window.alert(error instanceof Error ? error.message : 'Não foi possível mover o card.');
    } finally {
      setMoving(false);
    }
  };

  const removePerson = async (person: OrganizationPerson) => {
    if (!canDelete) return;
    const dependents = people.filter((item) => item.reportsToId === person.id);
    if (dependents.length) {
      window.alert(`${person.name} possui ${dependents.length} pessoa(s) vinculada(s). Reatribua essas pessoas antes de excluir o card.`);
      return;
    }
    if (!window.confirm(`Deseja excluir o card de ${person.name}?`)) return;

    try {
      await deleteData(currentUser, 'organization_people', person.id);
    } catch (error) {
      console.error('Erro ao excluir pessoa:', error);
      window.alert(error instanceof Error ? error.message : 'Não foi possível excluir este card.');
    }
  };

  const removeLegacyUnit = async (unit: OrganizationUnit) => {
    if (!window.confirm(`Excluir definitivamente o cadastro antigo “${unit.teamName}”?`)) return;
    try {
      await deleteData(currentUser, 'organization_units', unit.id);
    } catch (error) {
      console.error('Erro ao excluir cadastro antigo:', error);
      window.alert('Não foi possível excluir este cadastro. Apenas o administrador principal pode remover cadastros antigos.');
    }
  };

  return (
    <div className="space-y-6">
      <OrganizationDirectory
        people={people}
        canManage={canManage}
        canCreate={canCreate}
        canDelete={canDelete}
        moving={moving}
        onCreate={openCreateForm}
        onEdit={openEditForm}
        onDelete={(person) => void removePerson(person)}
        onMove={moveCard}
      />

      {!!units.length && <details className="fotus-glass group rounded-3xl">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fotus-neutral/40 text-fotus-ink/80"><Network className="h-5 w-5" /></span><span className="flex-1"><strong className="block text-xs text-fotus-ink">Cadastros do modelo anterior</strong><span className="mt-1 block text-[11px] text-fotus-ink/80">{units.length} cadastros · clique para consultar</span></span><span className="text-lg text-fotus-ink/80 group-open:rotate-45">+</span></summary>
        <div className="fotus-bento-grid grid gap-4 border-t border-fotus-blue/10 p-5 md:grid-cols-2 xl:grid-cols-3">{units.map((unit) => <article key={unit.id} className="fotus-glass-card min-w-0 rounded-3xl p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block break-words text-xs text-fotus-ink">{unit.teamName}</strong><span className="mt-1 block text-[11px] text-fotus-ink/80">{unit.department} · {unit.regional}</span></div>{canDeleteLegacy && <button type="button" onClick={() => removeLegacyUnit(unit)} title="Excluir cadastro antigo" aria-label={`Excluir cadastro antigo ${unit.teamName}`} className="rounded-lg p-2 text-fotus-ink/80 hover:bg-fotus-yellow/20 hover:text-fotus-ink"><Trash2 className="h-4 w-4" /></button>}</div><div className="fotus-glass-inset mt-4 grid gap-2 rounded-2xl p-3 text-[11px] text-fotus-ink"><span>Gerente: <strong>{unit.managerName}</strong></span><span>Liderança: <strong>{unit.leaderName}</strong></span>{unit.coordinatorName && <span>Coordenação: <strong>{unit.coordinatorName}</strong></span>}</div></article>)}</div>
      </details>}

      {isFormOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-fotus-ink/45 p-4 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="fotus-glass max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-fotus-blue/10 bg-fotus-neutral/85 px-6 py-5 backdrop-blur-xl"><div><h3 className="text-lg font-extrabold text-fotus-ink">{editingPerson ? 'Editar pessoa' : 'Cadastrar pessoa'}</h3><p className="text-xs text-fotus-ink/80">Atualize os dados e escolha a quem esta pessoa responde.</p></div><button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl p-2 text-fotus-ink/80 hover:bg-fotus-neutral/70" aria-label="Fechar cadastro de pessoa"><X className="h-5 w-5" /></button></div>
          <div className="space-y-5 p-6">
            {errorMessage && <p className="rounded-xl border border-fotus-yellow/25 bg-fotus-yellow/20 p-3 text-xs text-fotus-ink">{errorMessage}</p>}
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Nome completo" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Nome real" icon={Users} /><Field label="E-mail (opcional)" value={form.email} onChange={(value) => setForm({ ...form, email: value })} placeholder="nome@fotus.com.br" type="email" icon={Mail} required={false} /></div>
            <Field label="Cargo / função exibida" value={form.jobTitle} onChange={(value) => setForm({ ...form, jobTitle: value })} placeholder="Ex.: Líder Comercial" icon={BriefcaseBusiness} required={false} />
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Telefone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} placeholder="(27) 99999-9999" type="tel" icon={Phone} required={false} /><div className="flex items-end gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-fotus-blue/6 text-fotus-blue">{form.photoUrl ? <img src={form.photoUrl} alt="Prévia da foto" className="h-full w-full object-cover" /> : <Users className="h-5 w-5" />}</span><label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-fotus-blue/20 px-3 text-xs font-bold text-fotus-ink hover:bg-fotus-neutral/40"><ImagePlus className="h-4 w-4" />Escolher foto<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { void onPhotoSelected(event.target.files?.[0]); event.target.value = ''; }} /></label>{form.photoUrl && <button type="button" onClick={() => setForm({ ...form, photoUrl: '' })} className="min-h-11 rounded-xl px-2 text-xs font-bold text-fotus-ink hover:bg-fotus-yellow/20">Remover</button>}</div></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1.5 block text-xs font-bold text-fotus-ink">Função no organograma</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as OrganizationRole, reportsToId: '' })} className="field-input">{ROLE_ORDER.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
              {form.role === 'Head' ? <div className="rounded-xl border border-fotus-blue/12 bg-fotus-blue/7 px-4 py-3"><small className="block text-[9px] font-extrabold uppercase tracking-wide text-fotus-blue">Topo da estrutura</small><strong className="mt-1 block text-xs text-fotus-blue">Head não responde a outro card</strong></div> : <label className="block"><span className="mb-1.5 block text-xs font-bold text-fotus-ink">Responde para ({supervisorLabel(form.role)})</span><select value={form.reportsToId} onChange={(event) => chooseSupervisor(event.target.value)} className="field-input"><option value="">Sem responsável definido</option>{supervisorOptions.map((person) => <option key={person.id} value={person.id}>{person.name}{person.email ? ` · ${person.email}` : ''}</option>)}</select><small className="mt-1.5 block text-[9px] text-fotus-ink/80">{form.role === 'Consultor' ? 'Se a equipe não tem líder, o consultor pode responder diretamente ao coordenador.' : 'Você pode definir o responsável quando essa informação estiver disponível.'}</small></label>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Setor" value={form.department} onChange={(value) => setForm({ ...form, department: value })} placeholder="Ex.: CX" icon={Building2} required={false} /><div><Field label="Regional" value={form.regional} onChange={(value) => setForm({ ...form, regional: value })} placeholder="Nacional ou regional" icon={MapPinned} list="organization-regional-options" required={false} /><datalist id="organization-regional-options">{REGIONAL_SUGGESTIONS.map((regional) => <option key={regional} value={regional} />)}</datalist></div></div>
            <Field label="Equipe / time" value={form.teamName} onChange={(value) => setForm({ ...form, teamName: value })} placeholder="Ex.: RG 001 - NORTE - TIME 001" icon={Users} required={false} />
            <label className="flex items-center gap-3 rounded-xl border border-fotus-blue/20 p-3 text-sm font-semibold text-fotus-ink"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-4 w-4 accent-fotus-blue" />Pessoa ativa na estrutura</label>
          </div>
          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-fotus-blue/10 bg-fotus-neutral/85 px-6 py-4 backdrop-blur-xl"><button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl px-4 py-2.5 text-xs font-bold text-fotus-ink hover:bg-fotus-neutral/70">Cancelar</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl fotus-action px-5 py-2.5 text-xs font-bold disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar card'}</button></div>
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
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-fotus-ink">{label}</span><span className="relative block">{Icon && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fotus-ink/80" />}<input required={required} type={type} list={list} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`w-full rounded-xl border border-fotus-blue/20 bg-fotus-neutral py-2.5 pr-3 text-sm outline-none focus:border-fotus-blue focus:ring-2 focus:ring-fotus-blue/10 ${Icon ? 'pl-9' : 'pl-3'}`} /></span></label>;
}
