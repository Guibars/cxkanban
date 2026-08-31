import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { Check, Mail, Save, ShieldCheck, UserCog, X } from 'lucide-react';
import { db, doc, setDoc } from '../lib/firebase';
import { AppSection, OrganizationUnit, UserAccessProfile, UserAccessRole } from '../types';

interface AccessControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: UserAccessProfile[];
  units: OrganizationUnit[];
  agents: string[];
  currentUser: User;
}

const ROLE_OPTIONS: UserAccessRole[] = ['Agente', 'Gerente', 'Líder', 'Coordenador', 'Administrador'];
const TAB_OPTIONS: Array<{ id: AppSection; label: string; restricted?: boolean }> = [
  { id: 'visao-geral', label: 'Visão Geral' },
  { id: 'ocorrencias', label: 'Controle de Ocorrências' },
  { id: 'custos', label: 'Custo Extra', restricted: true },
  { id: 'ra', label: 'Painel Reclame Aqui', restricted: true },
  { id: 'visitas', label: 'Visitas' },
  { id: 'estrutura', label: 'Estrutura Organizacional', restricted: true },
];

function defaultTabs(role: UserAccessRole): AppSection[] {
  void role;
  return TAB_OPTIONS.map((tab) => tab.id);
}

const EMPTY_FORM = {
  email: '',
  displayName: '',
  role: 'Agente' as UserAccessRole,
  agentName: '',
  organizationUnitIds: [] as string[],
  visibleTabs: defaultTabs('Agente'),
  active: true,
};

export default function AccessControlModal({ isOpen, onClose, profiles, units, agents, currentUser }: AccessControlModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const sortedProfiles = useMemo(() => [...profiles].sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR')), [profiles]);

  useEffect(() => {
    if (!isOpen) return;
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage('');
  }, [isOpen]);

  if (!isOpen) return null;

  const selectProfile = (profile: UserAccessProfile) => {
    setEditingId(profile.id);
    setForm({
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role,
      agentName: profile.agentName || '',
      organizationUnitIds: profile.organizationUnitIds || [],
      visibleTabs: defaultTabs(profile.role),
      active: profile.active,
    });
    setMessage('');
  };

  const newProfile = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage('');
  };

  const changeRole = (role: UserAccessRole) => {
    setForm((current) => ({ ...current, role, visibleTabs: defaultTabs(role), agentName: role === 'Agente' ? current.agentName : '' }));
  };

  const toggleUnit = (unitId: string) => setForm((current) => ({
    ...current,
    organizationUnitIds: current.organizationUnitIds.includes(unitId)
      ? current.organizationUnitIds.filter((item) => item !== unitId)
      : [...current.organizationUnitIds, unitId],
  }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!email || !form.displayName.trim()) {
      setMessage('Preencha nome e e-mail.');
      return;
    }
    if (form.role === 'Agente' && !form.agentName) {
      setMessage('Vincule o e-mail ao nome da agente usado nos cards.');
      return;
    }

    setSaving(true);
    setMessage('');
    const now = Date.now();
    const existing = profiles.find((profile) => profile.id === editingId);
    try {
      const payload = {
        email,
        displayName: form.displayName.trim(),
        role: form.role,
        agentName: form.role === 'Agente' ? form.agentName : '',
        organizationUnitIds: form.organizationUnitIds,
        visibleTabs: defaultTabs(form.role),
        active: form.active,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        ...(!existing ? { createdByEmail: currentUser.email || '' } : {}),
      };
      await setDoc(doc(db, 'user_access', email), payload, { merge: true });
      setMessage('Acesso salvo. A pessoa verá a nova configuração no próximo acesso.');
      setEditingId(email);
    } catch (error) {
      console.error('Erro ao salvar acesso:', error);
      setMessage('Não foi possível salvar. Publique as regras atualizadas do Firestore.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm sm:p-6">
      <div className="grid max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-white bg-white shadow-2xl lg:grid-cols-[320px_1fr]">
        <aside className="max-h-[38vh] overflow-y-auto border-b border-gray-100 bg-[#f5f8f4] p-4 lg:max-h-[94vh] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-2">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#385041]">Administração</p><h2 className="mt-1 text-base font-extrabold text-gray-950">Perfis e equipes</h2></div>
            <button type="button" onClick={newProfile} className="rounded-xl bg-[#385041] px-3 py-2 text-[10px] font-extrabold text-white">Novo</button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500">Todas as telas estão liberadas. Aqui você organiza somente a função, a agente e a equipe de cada pessoa.</p>
          <div className="mt-4 space-y-2">
            {sortedProfiles.map((profile) => (
              <button key={profile.id} type="button" onClick={() => selectProfile(profile)} className={`w-full rounded-2xl border p-3 text-left transition-all ${editingId === profile.id ? 'border-[#385041] bg-white shadow-sm' : 'border-transparent bg-white/60 hover:border-[#385041]/20'}`}>
                <span className="flex items-start justify-between gap-2"><strong className="truncate text-xs text-gray-900">{profile.displayName}</strong><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${profile.active ? 'bg-emerald-500' : 'bg-gray-300'}`} /></span>
                <span className="mt-1 block truncate text-[10px] text-gray-500">{profile.email}</span>
                <span className="mt-2 inline-flex rounded-full bg-[#e8efe0] px-2 py-0.5 text-[9px] font-extrabold text-[#385041]">{profile.role}</span>
              </button>
            ))}
            {!sortedProfiles.length && <p className="rounded-2xl border border-dashed border-gray-300 p-5 text-center text-xs text-gray-500">Nenhum acesso personalizado cadastrado.</p>}
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="max-h-[56vh] overflow-y-auto lg:max-h-[94vh]">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-xl sm:px-7">
            <div><p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#385041]"><ShieldCheck className="h-4 w-4" />Controle de acesso</p><h3 className="mt-1 text-lg font-extrabold text-gray-950">{editingId ? 'Editar usuário' : 'Cadastrar usuário'}</h3></div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
          </div>

          <div className="space-y-6 p-5 sm:p-7">
            {message && <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-800">{message}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo" icon={UserCog}><input required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} className="field-input" placeholder="Nome que aparecerá no perfil" /></Field>
              <Field label="E-mail de acesso" icon={Mail}><input required disabled={Boolean(editingId)} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="field-input disabled:bg-gray-100" placeholder="nome@fotus.com.br" /></Field>
              <Field label="Função"><select value={form.role} onChange={(event) => changeRole(event.target.value as UserAccessRole)} className="field-input">{ROLE_OPTIONS.map((role) => <option key={role}>{role}</option>)}</select></Field>
              {form.role === 'Agente' && <Field label="Nome usado nos cards"><select required value={form.agentName} onChange={(event) => setForm({ ...form, agentName: event.target.value })} className="field-input"><option value="">Vincular agente</option>{agents.map((agent) => <option key={agent}>{agent}</option>)}</select></Field>}
            </div>

            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <h4 className="flex items-center gap-2 text-xs font-extrabold text-emerald-900"><ShieldCheck className="h-4 w-4" />Acesso geral liberado</h4>
              <p className="mt-1 text-[10px] leading-relaxed text-emerald-800">Usuários autenticados visualizam Visão Geral, Ocorrências, Custo Extra, Reclame Aqui, Visitas e Estrutura.</p>
            </section>

            <section>
                <h4 className="text-xs font-extrabold text-gray-900">{form.role === 'Agente' ? 'Time ao qual esta agente pertence' : 'Times que esta liderança acompanha'}</h4>
                <p className="mt-1 text-[10px] text-gray-500">{form.role === 'Agente' ? 'Esse vínculo permite que gerente, líder e coordenação enxerguem os cards corretos da equipe.' : 'Os indicadores gerais serão calculados somente com as agentes vinculadas a estes times.'}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {units.map((unit) => {
                    const checked = form.organizationUnitIds.includes(unit.id);
                    return <button key={unit.id} type="button" onClick={() => toggleUnit(unit.id)} className={`rounded-xl border p-3 text-left transition-all ${checked ? 'border-[#385041] bg-[#eef5eb]' : 'border-gray-200 bg-white'}`}><span className="flex items-center justify-between gap-2"><strong className="truncate text-xs text-gray-900">{unit.teamName}</strong>{checked && <Check className="h-4 w-4 shrink-0 text-[#385041]" />}</span><span className="mt-1 block text-[10px] text-gray-500">{unit.department} · {unit.regional}</span></button>;
                  })}
                  {!units.length && <p className="rounded-xl border border-dashed border-gray-300 p-4 text-xs text-gray-500">Cadastre os times na aba Estrutura para vinculá-los aqui.</p>}
                </div>
              </section>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 p-4">
              <span><strong className="block text-xs text-gray-900">Perfil ativo</strong><small className="mt-0.5 block text-[10px] text-gray-500">Use apenas para organizar vínculos de função e equipe; isso não bloqueia as telas.</small></span>
              <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-5 w-5 accent-[#385041]" />
            </label>
          </div>

          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-xl sm:px-7">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100">Fechar</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#385041] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar acesso'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: typeof Mail; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-700">{Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}{label}</span>{children}</label>;
}
