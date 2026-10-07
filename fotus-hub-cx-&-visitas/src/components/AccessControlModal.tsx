import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import type { CurrentUser } from '../lib/currentUser';
import { ArchiveRestore, Building2, Check, CircleDollarSign, ClipboardList, Copy, KeyRound, LayoutDashboard, LoaderCircle, Mail, MessageSquareQuote, Network, RefreshCw, Save, Search, SearchCheck, Send, ShieldCheck, Trash2, UserCog, UserPlus, X } from 'lucide-react';
import { neonAuth } from '../lib/neonAuth';
import { AppSection, OrganizationUnit, UserAccessProfile, UserAccessRole } from '../types';

interface AccessControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: UserAccessProfile[];
  units: OrganizationUnit[];
  agents: string[];
  currentUser: CurrentUser;
}

const ROLE_OPTIONS: UserAccessRole[] = ['Agente', 'Gerente', 'Líder', 'Coordenador', 'Administrador'];
const TAB_OPTIONS: Array<{ id: AppSection; label: string; description: string; icon: typeof LayoutDashboard }> = [
  { id: 'visao-geral', label: 'Visão Geral', description: 'Resumo executivo', icon: LayoutDashboard },
  { id: 'ocorrencias', label: 'Ocorrências', description: 'Cards e produtividade', icon: ClipboardList },
  { id: 'custos', label: 'Custo Extra', description: 'Valores e relatórios', icon: CircleDollarSign },
  { id: 'ra', label: 'Reclame Aqui', description: 'Casos e indicadores', icon: ArchiveRestore },
  { id: 'visitas', label: 'Visitas', description: 'Agenda de integradores', icon: Building2 },
  { id: 'estrutura', label: 'Estrutura', description: 'Times e lideranças', icon: Network },
  { id: 'atendimentos', label: 'Atendimentos', description: 'Tratativas e soluções', icon: ClipboardList },
  { id: 'voc', label: 'VoC', description: 'Voz do cliente e melhorias', icon: MessageSquareQuote },
];

function defaultTabs(role: UserAccessRole): AppSection[] {
  if (role === 'Administrador') return TAB_OPTIONS.map((tab) => tab.id);
  if (['Gerente', 'Líder', 'Coordenador'].includes(role)) return ['visao-geral', 'ocorrencias', 'visitas', 'estrutura', 'atendimentos', 'voc'];
  return ['visao-geral', 'ocorrencias', 'visitas', 'atendimentos', 'voc'];
}

const EMPTY_FORM = {
  email: '',
  displayName: '',
  role: 'Agente' as UserAccessRole,
  agentName: '',
  organizationUnitIds: [] as string[],
  visibleTabs: defaultTabs('Agente'),
  structurePermissions: { canCreate: false, canEdit: false, canDelete: false },
  active: true,
};

interface AuthAccountStatus {
  exists: boolean;
  email: string;
  displayName?: string;
  disabled?: boolean;
  emailVerified?: boolean;
  providers?: string[];
  createdAt?: string;
  lastSignInAt?: string | null;
  created?: boolean;
  resetLink?: string;
}

interface AuthAccountList {
  users: AuthAccountStatus[];
  profiles?: UserAccessProfile[];
  profileWarning?: string;
}

interface ManagedUser {
  email: string;
  displayName: string;
  profile?: UserAccessProfile;
  account?: AuthAccountStatus;
}

async function requestMasterAction<T = AuthAccountStatus>(currentUser: CurrentUser, action: 'ensure-user' | 'inspect' | 'list-users' | 'reset-link' | 'save-profile' | 'delete-profile' | 'deactivate-profile', email = '', displayName = '', profile?: Record<string, unknown>) {
  const idToken = await currentUser.getIdToken();
  const response = await fetch('/api/admin-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ action, email, displayName, ...(profile ? { profile } : {}) }),
  });
  const responseText = await response.text();
  let result = {} as T & { error?: string };
  try {
    result = responseText ? JSON.parse(responseText) as T & { error?: string } : result;
  } catch {
    // A Vercel devolve texto simples quando a função falha antes de iniciar.
  }
  if (!response.ok) {
    const fallback = response.status >= 500
      ? 'O serviço de usuários da Vercel não iniciou corretamente. Publique novamente o código atualizado.'
      : 'Não foi possível administrar esta conta.';
    throw new Error(result.error || fallback);
  }
  return result;
}

export default function AccessControlModal({ isOpen, onClose, profiles, units, agents, currentUser }: AccessControlModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authStatus, setAuthStatus] = useState<AuthAccountStatus | null>(null);
  const [authAccounts, setAuthAccounts] = useState<AuthAccountStatus[]>([]);
  const [serverProfiles, setServerProfiles] = useState<UserAccessProfile[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [resetLink, setResetLink] = useState('');
  const allProfiles = useMemo(() => {
    const byEmail = new Map<string, UserAccessProfile>();
    profiles.forEach((profile) => byEmail.set(profile.email.trim().toLowerCase(), profile));
    serverProfiles.forEach((profile) => byEmail.set(profile.email.trim().toLowerCase(), profile));
    return [...byEmail.values()];
  }, [profiles, serverProfiles]);
  const managedUsers = useMemo(() => {
    const byEmail = new Map<string, ManagedUser>();
    authAccounts.forEach((account) => {
      const email = account.email.trim().toLowerCase();
      if (!email) return;
      byEmail.set(email, { email, displayName: account.displayName?.trim() || email.split('@')[0], account });
    });
    allProfiles.forEach((profile) => {
      const email = profile.email.trim().toLowerCase();
      const current = byEmail.get(email);
      byEmail.set(email, {
        email,
        displayName: profile.displayName || current?.displayName || email.split('@')[0],
        account: current?.account,
        profile,
      });
    });
    const term = userSearch.trim().toLocaleLowerCase('pt-BR');
    return [...byEmail.values()]
      .filter((item) => !term || `${item.displayName} ${item.email} ${item.profile?.role || ''}`.toLocaleLowerCase('pt-BR').includes(term))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));
  }, [allProfiles, authAccounts, userSearch]);

  const loadAuthAccounts = async () => {
    setAccountsLoading(true);
    setAccountsError('');
    try {
      const result = await requestMasterAction<AuthAccountList>(currentUser, 'list-users');
      setAuthAccounts(result.users || []);
      setServerProfiles(result.profiles || []);
      setAccountsError(result.profileWarning || '');
    } catch (error) {
      setAccountsError(error instanceof Error ? error.message : 'Não foi possível carregar as contas do Neon.');
    } finally {
      setAccountsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage('');
    setAuthMessage('');
    setAuthStatus(null);
    setResetLink('');
    setUserSearch('');
    void loadAuthAccounts();
  }, [isOpen, currentUser.email]);

  if (!isOpen) return null;

  const selectProfile = (profile: UserAccessProfile) => {
    setEditingId(profile.id);
    setForm({
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role,
      agentName: profile.agentName || '',
      organizationUnitIds: profile.organizationUnitIds || [],
      visibleTabs: profile.visibleTabs?.length ? profile.visibleTabs : defaultTabs(profile.role),
      structurePermissions: profile.structurePermissions || {
        canCreate: profile.visibleTabs.includes('estrutura'),
        canEdit: profile.visibleTabs.includes('estrutura'),
        canDelete: profile.visibleTabs.includes('estrutura') && profile.role === 'Administrador',
      },
      active: profile.active,
    });
    setMessage('');
    setAuthMessage('');
    setAuthStatus(null);
    setResetLink('');
  };

  const selectManagedUser = (item: ManagedUser) => {
    if (item.profile) {
      selectProfile(item.profile);
      setAuthStatus(item.account || null);
      return;
    }
    setEditingId(item.email);
    setForm({
      ...EMPTY_FORM,
      email: item.email,
      displayName: item.displayName,
      active: !item.account?.disabled,
    });
    setMessage('Esta conta já existe no Neon Auth, mas ainda não possui permissões configuradas no painel. Escolha as abas e salve.');
    setAuthMessage('Conta de login encontrada. Falta configurar o perfil de acesso.');
    setAuthStatus(item.account || null);
    setResetLink('');
  };

  const newProfile = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage('');
    setAuthMessage('');
    setAuthStatus(null);
    setResetLink('');
  };

  const changeRole = (role: UserAccessRole) => {
    setForm((current) => ({ ...current, role, agentName: role === 'Agente' ? current.agentName : '' }));
  };

  const toggleTab = (tabId: AppSection) => {
    setMessage('');
    const selected = form.visibleTabs.includes(tabId);
    if (selected && form.visibleTabs.length === 1) {
      setMessage('Mantenha pelo menos uma aba liberada para este usuário.');
      return;
    }
    setForm((current) => ({
      ...current,
      visibleTabs: selected
        ? current.visibleTabs.filter((item) => item !== tabId)
        : [...current.visibleTabs, tabId],
    }));
  };

  const toggleUnit = (unitId: string) => setForm((current) => ({
    ...current,
    organizationUnitIds: current.organizationUnitIds.includes(unitId)
      ? current.organizationUnitIds.filter((item) => item !== unitId)
      : [...current.organizationUnitIds, unitId],
  }));

  const manageLogin = async (action: 'ensure-user' | 'inspect' | 'reset-link') => {
    const email = form.email.trim().toLowerCase();
    if (!email) {
      setAuthMessage('Informe o e-mail antes de verificar a conta.');
      return;
    }
    if (action === 'ensure-user' && !allProfiles.some((profile) => profile.email.trim().toLowerCase() === email && profile.active)) {
      setAuthMessage('Salve primeiro o perfil, a função e as abas liberadas. Depois gere o link de primeiro acesso.');
      return;
    }
    setAuthBusy(true);
    setAuthMessage('');
    setResetLink('');
    try {
      const account = await requestMasterAction(currentUser, action, email, form.displayName.trim());
      setAuthStatus(account);
      if (account.exists) {
        setAuthAccounts((current) => [account, ...current.filter((item) => item.email.toLowerCase() !== account.email.toLowerCase())]);
      }
      if (account.resetLink) setResetLink(account.resetLink);
      if (action === 'inspect') {
        setAuthMessage(account.exists ? 'Conta de login encontrada no Neon Auth.' : 'Este perfil ainda não criou a senha no Neon.');
      } else if (action === 'ensure-user') {
        setAuthMessage(account.created ? 'Cadastro liberado. Envie o link abaixo para a pessoa criar a própria senha no Neon.' : 'Conta Neon localizada e ativa.');
      } else {
        setAuthMessage('Link para solicitar a redefinição gerado. O envio da senha continua protegido pelo Neon.');
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Não foi possível administrar esta conta.');
    } finally {
      setAuthBusy(false);
    }
  };

  const sendAutomaticResetEmail = async () => {
    const email = form.email.trim().toLowerCase();
    if (!email) {
      setAuthMessage('Informe o e-mail antes de solicitar o envio.');
      return;
    }
    setAuthBusy(true);
    setAuthMessage('');
    try {
      const account = await requestMasterAction(currentUser, 'inspect', email, form.displayName.trim());
      setAuthStatus(account);
      if (account.exists) {
        setAuthAccounts((current) => [account, ...current.filter((item) => item.email.toLowerCase() !== account.email.toLowerCase())]);
      }
      if (!account.exists) {
        setAuthMessage('A pessoa ainda não criou a conta Neon. Salve o perfil e envie o link de primeiro acesso.');
        return;
      }
      const result = await neonAuth.requestPasswordReset({ email, redirectTo: `${window.location.origin}/?newPassword=1` });
      if (result.error) throw new Error(result.error.message || 'Não foi possível solicitar a redefinição.');
      setAuthMessage(`O Neon enviou a solicitação de redefinição para ${email}.`);
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Não foi possível solicitar o e-mail de redefinição.');
    } finally {
      setAuthBusy(false);
    }
  };

  const copyResetLink = async () => {
    try {
      await navigator.clipboard.writeText(resetLink);
      setAuthMessage('Link copiado. Agora envie-o somente para o dono desta conta.');
    } catch {
      setAuthMessage('Não foi possível copiar automaticamente. Selecione o link e copie manualmente.');
    }
  };

  const prepareResetEmail = () => {
    const subject = encodeURIComponent('Criação de senha — Fotus CX');
    const body = encodeURIComponent(`Olá, ${form.displayName.trim() || 'tudo bem'}?\n\nSeu acesso ao Fotus CX foi criado. Use o link abaixo para definir sua senha:\n\n${resetLink}\n\nPor segurança, este link é individual e não deve ser compartilhado.`);
    window.location.href = `mailto:${form.email.trim().toLowerCase()}?subject=${subject}&body=${body}`;
  };

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
    if (!form.visibleTabs.length) {
      setMessage('Selecione pelo menos uma aba para este usuário.');
      return;
    }

    setSaving(true);
    setMessage('');
    const now = Date.now();
    const existing = allProfiles.find((profile) => profile.id === editingId || profile.email.toLowerCase() === editingId?.toLowerCase());
    try {
      const payload = {
        email,
        displayName: form.displayName.trim(),
        role: form.role,
        agentName: form.role === 'Agente' ? form.agentName : '',
        organizationUnitIds: form.organizationUnitIds,
        visibleTabs: form.visibleTabs,
        structurePermissions: form.structurePermissions,
        active: form.active,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        ...(!existing ? { createdByEmail: currentUser.email || '' } : {}),
      };
      const saved = await requestMasterAction<{ profile: UserAccessProfile }>(currentUser, 'save-profile', email, form.displayName.trim(), payload);
      setServerProfiles((current) => [saved.profile, ...current.filter((profile) => profile.email.toLowerCase() !== email)]);
      window.dispatchEvent(new Event('fotus:data-changed'));
      let account: AuthAccountStatus | null = null;
      if (!existing) {
        try {
          account = await requestMasterAction(currentUser, 'ensure-user', email, form.displayName.trim());
          if (account.exists) setAuthAccounts((current) => [account!, ...current.filter((item) => item.email.toLowerCase() !== email)]);
        } catch (linkError) {
          setMessage(`Perfil e abas salvos. ${linkError instanceof Error ? linkError.message : 'Não foi possível gerar o link de primeiro acesso.'}`);
          setEditingId(email);
          return;
        }
      }
      if (account) {
        setAuthStatus(account);
        setResetLink(account.resetLink || '');
      }
      setMessage(account?.created
        ? 'Usuário liberado no Neon. Copie o link de primeiro acesso e encaminhe à pessoa para ela criar a própria senha.'
        : account
          ? 'Perfil de acesso criado para uma conta que já existia no Neon. As permissões estão salvas.'
          : 'Acesso salvo. A pessoa verá a nova configuração no próximo acesso.');
      setEditingId(email);
    } catch (error) {
      console.error('Erro ao salvar acesso:', error);
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o usuário.');
    } finally {
      setSaving(false);
    }
  };

  const removeProfile = async () => {
    const email = form.email.trim().toLowerCase();
    if (!editingId || !email || email === (currentUser.email || '').trim().toLowerCase()) return;
    if (!window.confirm(`Desativar o acesso de ${form.displayName || email} (${email})? A pessoa perderá o acesso à plataforma. A agente vinculada sairá da lista ativa e o histórico será preservado.`)) return;
    setSaving(true);
    setMessage('');
    try {
      await requestMasterAction<{ deactivated: boolean }>(currentUser, 'deactivate-profile', email);
      const profile = allProfiles.find(item => item.email.toLowerCase() === email);
      if (profile) setServerProfiles(current => [...current.filter(item => item.email.toLowerCase() !== email), { ...profile, active: false }]);
      window.dispatchEvent(new Event('fotus:data-changed'));
      setForm(current => ({ ...current, active: false }));
      setAuthStatus(null);
      setResetLink('');
      setMessage('Acesso desativado e agente vinculada retirada da lista ativa. Os cards e históricos foram preservados.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível desativar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fotus-ink/45 p-3 backdrop-blur-sm sm:p-6">
      <div className="grid max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-fotus-neutral bg-fotus-neutral shadow-2xl lg:grid-cols-[340px_1fr]">
        <aside className="flex max-h-[40vh] flex-col border-b border-fotus-blue/10 bg-fotus-neutral p-4 lg:max-h-[94vh] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-2">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-fotus-blue">Administração</p><h2 className="mt-1 text-base font-extrabold text-fotus-ink">Todos os usuários</h2></div>
            <div className="flex gap-1.5"><button type="button" onClick={() => void loadAuthAccounts()} disabled={accountsLoading} title="Atualizar usuários" className="flex h-9 w-9 items-center justify-center rounded-xl border border-fotus-blue/20 bg-fotus-neutral text-fotus-ink/80 transition-colors hover:text-fotus-blue disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${accountsLoading ? 'animate-spin' : ''}`} /></button><button type="button" onClick={newProfile} className="rounded-xl bg-fotus-blue px-3 py-2 text-[10px] font-extrabold text-fotus-neutral">Novo</button></div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-fotus-ink/80">Contas do Neon Auth e permissões do painel reunidas no mesmo lugar.</p>
          <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl border border-fotus-neutral bg-fotus-neutral/75 p-2.5"><strong className="block text-sm text-fotus-ink">{authAccounts.length}</strong><span className="text-[9px] font-bold uppercase tracking-wide text-fotus-ink/80">Contas de login</span></div><div className="rounded-xl border border-fotus-neutral bg-fotus-neutral/75 p-2.5"><strong className="block text-sm text-fotus-ink">{allProfiles.length}</strong><span className="text-[9px] font-bold uppercase tracking-wide text-fotus-ink/80">Com permissões</span></div></div>
          <label className="relative mt-3 block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fotus-ink/80" /><input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Buscar nome ou e-mail" className="w-full rounded-xl border border-fotus-blue/20 bg-fotus-neutral py-2.5 pl-9 pr-3 text-xs outline-none focus:border-fotus-blue" /></label>
          {accountsError && <p className="mt-3 rounded-xl border border-fotus-yellow/25 bg-fotus-yellow/7 p-3 text-[10px] font-semibold leading-relaxed text-fotus-ink">{accountsError} Os perfis já salvos no painel continuam listados abaixo.</p>}
          <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {accountsLoading && !managedUsers.length && <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-fotus-blue/20 p-5 text-xs text-fotus-ink/80"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando usuários...</div>}
            {managedUsers.map((item) => {
              const active = item.profile ? item.profile.active : !item.account?.disabled;
              const selected = editingId === item.email;
              return <button key={item.email} type="button" onClick={() => selectManagedUser(item)} className={`w-full rounded-2xl border p-3 text-left transition-all ${selected ? 'border-fotus-blue bg-fotus-neutral shadow-sm ring-1 ring-fotus-blue/10' : 'border-transparent bg-fotus-neutral/65 hover:border-fotus-blue/20 hover:bg-fotus-neutral'}`}>
                <span className="flex items-start justify-between gap-2"><span className="flex min-w-0 items-center gap-2"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-extrabold ${item.profile ? 'bg-fotus-blue/6 text-fotus-blue' : 'bg-fotus-yellow/7 text-fotus-ink'}`}>{item.displayName.slice(0, 2).toUpperCase()}</span><span className="min-w-0"><strong className="block truncate text-xs text-fotus-ink">{item.displayName}</strong><span className="mt-0.5 block truncate text-[9px] text-fotus-ink/80">{item.email}</span></span></span><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${active ? 'bg-fotus-blue' : 'bg-fotus-neutral'}`} /></span>
                <span className="mt-2 flex flex-wrap gap-1.5">{item.profile ? <><span className="rounded-full bg-fotus-blue/6 px-2 py-0.5 text-[8px] font-extrabold text-fotus-blue">{item.profile.role}</span><span className="rounded-full bg-fotus-neutral/70 px-2 py-0.5 text-[8px] font-bold text-fotus-ink/80">{item.profile.visibleTabs?.length || 0} abas</span></> : <span className="rounded-full bg-fotus-yellow/7 px-2 py-0.5 text-[8px] font-extrabold text-fotus-ink">Configurar permissões</span>}{item.account && <span className="rounded-full bg-fotus-blue/7 px-2 py-0.5 text-[8px] font-bold text-fotus-blue">Login Neon</span>}</span>
              </button>;
            })}
            {!accountsLoading && !managedUsers.length && <p className="rounded-2xl border border-dashed border-fotus-blue/20 p-5 text-center text-xs text-fotus-ink/80">Nenhum usuário encontrado.</p>}
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="max-h-[56vh] overflow-y-auto lg:max-h-[94vh]">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-fotus-blue/10 bg-fotus-neutral/95 px-5 py-4 backdrop-blur-xl sm:px-7">
            <div><p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-fotus-blue"><ShieldCheck className="h-4 w-4" />Controle de acesso</p><h3 className="mt-1 text-lg font-extrabold text-fotus-ink">{editingId ? 'Editar usuário' : 'Cadastrar usuário'}</h3></div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-fotus-ink/80 hover:bg-fotus-neutral/70"><X className="h-5 w-5" /></button>
          </div>

          <div className="space-y-6 p-5 sm:p-7">
            {message && <p className="rounded-xl border border-fotus-blue/25 bg-fotus-blue/7 p-3 text-xs font-semibold text-fotus-blue">{message}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo" icon={UserCog}><input required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} className="field-input" placeholder="Nome que aparecerá no perfil" /></Field>
              <Field label="E-mail de acesso" icon={Mail}><input required disabled={Boolean(editingId)} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="field-input disabled:bg-fotus-neutral/70" placeholder="nome@fotus.com.br" /></Field>
              <Field label="Função"><select value={form.role} onChange={(event) => changeRole(event.target.value as UserAccessRole)} className="field-input">{ROLE_OPTIONS.map((role) => <option key={role}>{role}</option>)}</select></Field>
              {form.role === 'Agente' && <Field label="Nome usado nos cards"><select required value={form.agentName} onChange={(event) => setForm({ ...form, agentName: event.target.value })} className="field-input"><option value="">Vincular agente</option>{agents.map((agent) => <option key={agent}>{agent}</option>)}</select></Field>}
            </div>

            <section>
              <div className="flex items-end justify-between gap-3"><div><h4 className="flex items-center gap-2 text-xs font-extrabold text-fotus-ink"><ShieldCheck className="h-4 w-4 text-fotus-blue" />Abas liberadas</h4><p className="mt-1 text-[10px] text-fotus-ink/80">Ative somente as áreas necessárias para esta pessoa.</p></div><span className="rounded-full bg-fotus-blue/6 px-2.5 py-1 text-[9px] font-extrabold text-fotus-blue">{form.visibleTabs.length} de {TAB_OPTIONS.length}</span></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {TAB_OPTIONS.map(({ id, label, description, icon: Icon }) => {
                  const selected = form.visibleTabs.includes(id);
                  return <button key={id} type="button" aria-pressed={selected} onClick={() => toggleTab(id)} className={`group relative flex min-h-20 items-center gap-3 rounded-2xl border p-3 text-left transition-all ${selected ? 'border-fotus-blue/25 bg-fotus-blue/6 shadow-sm ring-1 ring-fotus-blue/5' : 'border-fotus-blue/20 bg-fotus-neutral hover:border-fotus-blue/25 hover:bg-fotus-neutral/40'}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${selected ? 'bg-fotus-blue text-fotus-neutral' : 'bg-fotus-neutral/70 text-fotus-ink/80 group-hover:text-fotus-blue'}`}><Icon className="h-5 w-5" /></span><span className="min-w-0"><strong className="block truncate text-xs text-fotus-ink">{label}</strong><small className="mt-0.5 block truncate text-[9px] text-fotus-ink/80">{description}</small></span><span className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border ${selected ? 'border-fotus-blue bg-fotus-blue text-fotus-neutral' : 'border-fotus-blue/20 bg-fotus-neutral text-transparent'}`}><Check className="h-3 w-3" /></span></button>;
                })}
              </div>
            </section>

            {form.visibleTabs.includes('estrutura') && <section className="rounded-2xl border border-fotus-blue/15 bg-fotus-neutral p-4">
              <h4 className="flex items-center gap-2 text-xs font-extrabold text-fotus-ink"><Network className="h-4 w-4 text-fotus-blue" />Ações na Estrutura</h4>
              <p className="mt-1 text-xs text-fotus-ink">Escolha o que esta pessoa pode fazer nos kanbans de Head, Gerência, Coordenadores e Líderes.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {([{ key: 'canCreate', label: 'Cadastrar pessoas' }, { key: 'canEdit', label: 'Editar e mover cards' }, { key: 'canDelete', label: 'Excluir cards' }] as const).map(({ key, label }) => <label key={key} className="flex items-center gap-2 rounded-xl border border-fotus-blue/20 bg-fotus-neutral p-3 text-xs font-bold text-fotus-ink"><input type="checkbox" checked={form.structurePermissions[key]} onChange={(event) => setForm((current) => ({ ...current, structurePermissions: { ...current.structurePermissions, [key]: event.target.checked } }))} className="h-4 w-4 accent-fotus-blue" />{label}</label>)}
              </div>
            </section>}

            <section className="rounded-2xl border border-fotus-blue/25 bg-fotus-blue/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><h4 className="flex items-center gap-2 text-xs font-extrabold text-fotus-blue"><KeyRound className="h-4 w-4" />Login e criação da primeira senha</h4><p className="mt-1 max-w-xl text-[10px] leading-relaxed text-fotus-blue">{editingId ? 'O perfil libera o e-mail no Neon. Se a pessoa ainda não entrou, envie o link de primeiro acesso.' : 'Ao salvar, o e-mail será liberado e você receberá um link para a pessoa criar a própria senha no Neon.'}</p></div>
                {authBusy && <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-fotus-blue" />}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-fotus-blue/12 bg-fotus-neutral/80 p-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-fotus-blue text-[10px] font-extrabold text-fotus-neutral">1</span><strong className="mt-2 block text-[10px] text-fotus-blue">Salve as permissões</strong><p className="mt-0.5 text-[9px] leading-relaxed text-fotus-blue">O perfil e as abas precisam ser salvos antes da criação da senha.</p></div>
                <div className="rounded-xl border border-fotus-blue/12 bg-fotus-neutral/80 p-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-fotus-blue text-[10px] font-extrabold text-fotus-neutral">2</span><strong className="mt-2 block text-[10px] text-fotus-blue">Envie o acesso</strong><p className="mt-0.5 text-[9px] leading-relaxed text-fotus-blue">Use o e-mail automático ou copie o link direto.</p></div>
                <div className="rounded-xl border border-fotus-blue/12 bg-fotus-neutral/80 p-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-fotus-blue text-[10px] font-extrabold text-fotus-neutral">3</span><strong className="mt-2 block text-[10px] text-fotus-blue">A pessoa cria a senha</strong><p className="mt-0.5 text-[9px] leading-relaxed text-fotus-blue">Ela abre o link, escolhe a senha e entra normalmente.</p></div>
              </div>

              {editingId && <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={authBusy} onClick={() => manageLogin('inspect')} className="flex items-center gap-2 rounded-xl border border-fotus-blue/25 bg-fotus-neutral px-3 py-2 text-[10px] font-extrabold text-fotus-blue disabled:opacity-50"><SearchCheck className="h-4 w-4" />Verificar conta</button>
                <button type="button" disabled={authBusy} onClick={() => manageLogin('ensure-user')} className="flex items-center gap-2 rounded-xl bg-fotus-blue px-3 py-2 text-[10px] font-extrabold text-fotus-neutral disabled:opacity-50"><UserPlus className="h-4 w-4" />Gerar primeiro acesso</button>
                <button type="button" disabled={authBusy} onClick={sendAutomaticResetEmail} className="flex items-center gap-2 rounded-xl border border-fotus-blue/25 bg-fotus-neutral px-3 py-2 text-[10px] font-extrabold text-fotus-blue disabled:opacity-50"><Send className="h-4 w-4" />Enviar e-mail automático</button>
                <button type="button" disabled={authBusy} onClick={() => manageLogin('reset-link')} className="flex items-center gap-2 rounded-xl border border-fotus-blue/25 bg-fotus-neutral px-3 py-2 text-[10px] font-extrabold text-fotus-blue disabled:opacity-50"><KeyRound className="h-4 w-4" />Gerar link direto</button>
              </div>}

              {authStatus && <div className={`mt-3 rounded-xl border px-3 py-2.5 text-[10px] font-semibold ${authStatus.exists && !authStatus.disabled ? 'border-fotus-blue/25 bg-fotus-blue/7 text-fotus-blue' : 'border-fotus-yellow/25 bg-fotus-yellow/7 text-fotus-ink'}`}>
                {authStatus.exists ? <><strong className="block">{authStatus.disabled ? 'Conta desativada' : 'Conta ativa'}</strong><span>{authStatus.providers?.length ? `Métodos: ${authStatus.providers.map((provider) => provider === 'password' ? 'e-mail e senha' : provider === 'google.com' ? 'Google' : provider).join(', ')}` : 'Senha ainda não definida'}{authStatus.lastSignInAt ? ` · Último acesso: ${new Date(authStatus.lastSignInAt).toLocaleString('pt-BR')}` : ' · Nunca acessou'}</span></> : <strong>Conta de login não encontrada.</strong>}
              </div>}
              {authMessage && <p className="mt-3 rounded-xl bg-fotus-neutral px-3 py-2.5 text-[10px] font-semibold text-fotus-blue">{authMessage}</p>}
              {resetLink && <div className="mt-3 rounded-2xl border border-fotus-blue/25 bg-fotus-blue/7 p-3"><div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-fotus-blue" /><div><strong className="block text-[11px] text-fotus-blue">Link pronto para criar a senha</strong><p className="mt-0.5 text-[9px] leading-relaxed text-fotus-blue">Envie somente para <strong>{form.email.trim().toLowerCase()}</strong>. A pessoa abrirá este endereço e escolherá a própria senha.</p></div></div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input readOnly value={resetLink} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-xl border border-fotus-blue/25 bg-fotus-neutral px-3 py-2 text-[10px] text-fotus-ink outline-none" aria-label="Link de criação ou redefinição de senha" /><button type="button" onClick={copyResetLink} className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-fotus-blue px-3 py-2 text-[10px] font-extrabold text-fotus-neutral"><Copy className="h-3.5 w-3.5" />Copiar link</button><button type="button" onClick={prepareResetEmail} className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-fotus-blue/45 bg-fotus-neutral px-3 py-2 text-[10px] font-extrabold text-fotus-blue"><Mail className="h-3.5 w-3.5" />Preparar e-mail</button></div></div>}
            </section>

            <section>
                <h4 className="text-xs font-extrabold text-fotus-ink">{form.role === 'Agente' ? 'Time ao qual esta agente pertence' : 'Times que esta liderança acompanha'}</h4>
                <p className="mt-1 text-[10px] text-fotus-ink/80">{form.role === 'Agente' ? 'Esse vínculo permite que gerente, líder e coordenação enxerguem os cards corretos da equipe.' : 'Os indicadores gerais serão calculados somente com as agentes vinculadas a estes times.'}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {units.map((unit) => {
                    const checked = form.organizationUnitIds.includes(unit.id);
                    return <button key={unit.id} type="button" onClick={() => toggleUnit(unit.id)} className={`rounded-xl border p-3 text-left transition-all ${checked ? 'border-fotus-blue bg-fotus-blue/6' : 'border-fotus-blue/20 bg-fotus-neutral'}`}><span className="flex items-center justify-between gap-2"><strong className="truncate text-xs text-fotus-ink">{unit.teamName}</strong>{checked && <Check className="h-4 w-4 shrink-0 text-fotus-blue" />}</span><span className="mt-1 block text-[10px] text-fotus-ink/80">{unit.department} · {unit.regional}</span></button>;
                  })}
                  {!units.length && <p className="rounded-xl border border-dashed border-fotus-blue/20 p-4 text-xs text-fotus-ink/80">Cadastre os times na aba Estrutura para vinculá-los aqui.</p>}
                </div>
              </section>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-fotus-blue/20 p-4">
              <span><strong className="block text-xs text-fotus-ink">Perfil ativo</strong><small className="mt-0.5 block text-[10px] text-fotus-ink/80">Ao desativar e salvar, a pessoa perde acesso aos dados e a agente vinculada sai da lista ativa. O histórico é preservado. Para voltar à produtividade após reativar, adicione-a novamente em Gerenciar agentes.</small></span>
              <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-5 w-5 accent-fotus-blue" />
            </label>
          </div>

          <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-fotus-blue/10 bg-fotus-neutral/95 px-5 py-4 backdrop-blur-xl sm:px-7">
            {editingId && form.active && form.email.trim().toLowerCase() !== (currentUser.email || '').trim().toLowerCase() && <button type="button" onClick={() => void removeProfile()} disabled={saving || !allProfiles.some(profile => profile.email.toLowerCase() === form.email.trim().toLowerCase())} className="mr-auto flex items-center gap-2 rounded-xl border border-fotus-yellow/50 bg-fotus-yellow/20 px-4 py-2.5 text-xs font-bold text-fotus-ink disabled:opacity-50"><Trash2 className="h-4 w-4" />Desativar acesso</button>}
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-fotus-ink hover:bg-fotus-neutral/70">Fechar</button>
            <button type="submit" disabled={saving} className="fotus-action flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar acesso'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: typeof Mail; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-fotus-ink">{Icon && <Icon className="h-3.5 w-3.5 text-fotus-ink/80" />}{label}</span>{children}</label>;
}
