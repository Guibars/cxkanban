import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { ArchiveRestore, Building2, Check, CircleDollarSign, ClipboardList, Copy, KeyRound, LayoutDashboard, LoaderCircle, Mail, Network, RefreshCw, Save, Search, SearchCheck, Send, ShieldCheck, UserCog, UserPlus, X } from 'lucide-react';
import { auth, sendPasswordResetEmail } from '../lib/firebase';
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
const TAB_OPTIONS: Array<{ id: AppSection; label: string; description: string; icon: typeof LayoutDashboard }> = [
  { id: 'visao-geral', label: 'Visão Geral', description: 'Resumo executivo', icon: LayoutDashboard },
  { id: 'ocorrencias', label: 'Ocorrências', description: 'Cards e produtividade', icon: ClipboardList },
  { id: 'custos', label: 'Custo Extra', description: 'Valores e relatórios', icon: CircleDollarSign },
  { id: 'ra', label: 'Reclame Aqui', description: 'Casos e indicadores', icon: ArchiveRestore },
  { id: 'visitas', label: 'Visitas', description: 'Agenda de integradores', icon: Building2 },
  { id: 'estrutura', label: 'Estrutura', description: 'Times e lideranças', icon: Network },
];

function defaultTabs(role: UserAccessRole): AppSection[] {
  if (role === 'Administrador') return TAB_OPTIONS.map((tab) => tab.id);
  if (['Gerente', 'Líder', 'Coordenador'].includes(role)) return ['visao-geral', 'ocorrencias', 'visitas', 'estrutura'];
  return ['visao-geral', 'ocorrencias', 'visitas'];
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

async function requestMasterAction<T = AuthAccountStatus>(currentUser: User, action: 'ensure-user' | 'inspect' | 'list-users' | 'reset-link' | 'save-profile', email = '', displayName = '', profile?: Record<string, unknown>) {
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
    serverProfiles.forEach((profile) => byEmail.set(profile.email.trim().toLowerCase(), profile));
    profiles.forEach((profile) => byEmail.set(profile.email.trim().toLowerCase(), profile));
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
      setAccountsError(error instanceof Error ? error.message : 'Não foi possível carregar as contas do Firebase.');
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
  }, [isOpen, currentUser]);

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
    setMessage('Esta conta já existe no Firebase, mas ainda não possui permissões configuradas no painel. Escolha as abas e salve.');
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
        setAuthMessage(account.exists ? 'Conta de login encontrada no Firebase.' : 'Este perfil ainda não possui uma conta de login.');
      } else if (action === 'ensure-user') {
        setAuthMessage(account.created ? 'Conta criada. Agora envie o link direto exibido abaixo para a pessoa definir a primeira senha.' : 'Conta localizada e liberada. O link direto abaixo permite criar uma nova senha.');
      } else {
        setAuthMessage('Link direto gerado. O Firebase não envia este link sozinho: copie e encaminhe para a pessoa.');
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
        setAuthMessage('A conta ainda não existe no Firebase. Clique primeiro em “Criar ou liberar login”.');
        return;
      }
      auth.languageCode = 'pt-BR';
      await sendPasswordResetEmail(auth, email);
      setAuthMessage(`O Firebase recebeu a solicitação para enviar o e-mail a ${email}. Se não chegar, gere o link direto e envie por outro canal.`);
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
      let account: AuthAccountStatus | null = null;
      let automaticEmailRequested = false;
      if (!existing) {
        account = await requestMasterAction(currentUser, 'ensure-user', email, form.displayName.trim());
        setAuthAccounts((current) => [account!, ...current.filter((item) => item.email.toLowerCase() !== email)]);
        if (account.created) {
          try {
            auth.languageCode = 'pt-BR';
            await sendPasswordResetEmail(auth, email);
            automaticEmailRequested = true;
          } catch (emailError) {
            console.error('Erro ao solicitar e-mail inicial de senha:', emailError);
          }
        }
      }
      const payload = {
        email,
        displayName: form.displayName.trim(),
        role: form.role,
        agentName: form.role === 'Agente' ? form.agentName : '',
        organizationUnitIds: form.organizationUnitIds,
        visibleTabs: form.visibleTabs,
        active: form.active,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        ...(!existing ? { createdByEmail: currentUser.email || '' } : {}),
      };
      const saved = await requestMasterAction<{ profile: UserAccessProfile }>(currentUser, 'save-profile', email, form.displayName.trim(), payload);
      setServerProfiles((current) => [saved.profile, ...current.filter((profile) => profile.email.toLowerCase() !== email)]);
      if (account) {
        setAuthStatus(account);
        setResetLink(account.resetLink || '');
      }
      setMessage(account?.created
        ? `Usuário e perfil criados. ${automaticEmailRequested ? 'O envio automático foi solicitado ao Firebase.' : 'O envio automático não foi confirmado.'} Para garantir o acesso, copie o link de criação de senha exibido abaixo e encaminhe à pessoa.`
        : account
          ? 'Perfil de acesso criado para uma conta que já existia no Firebase. As permissões estão salvas.'
          : 'Acesso salvo. A pessoa verá a nova configuração no próximo acesso.');
      setEditingId(email);
    } catch (error) {
      console.error('Erro ao salvar acesso:', error);
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o usuário.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm sm:p-6">
      <div className="grid max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-white bg-white shadow-2xl lg:grid-cols-[340px_1fr]">
        <aside className="flex max-h-[40vh] flex-col border-b border-gray-100 bg-[#f5f8f4] p-4 lg:max-h-[94vh] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-2">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#385041]">Administração</p><h2 className="mt-1 text-base font-extrabold text-gray-950">Todos os usuários</h2></div>
            <div className="flex gap-1.5"><button type="button" onClick={() => void loadAuthAccounts()} disabled={accountsLoading} title="Atualizar usuários" className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:text-[#385041] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${accountsLoading ? 'animate-spin' : ''}`} /></button><button type="button" onClick={newProfile} className="rounded-xl bg-[#385041] px-3 py-2 text-[10px] font-extrabold text-white">Novo</button></div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500">Contas do Firebase e perfis do painel reunidos no mesmo lugar.</p>
          <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl border border-white bg-white/75 p-2.5"><strong className="block text-sm text-gray-950">{authAccounts.length}</strong><span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Contas de login</span></div><div className="rounded-xl border border-white bg-white/75 p-2.5"><strong className="block text-sm text-gray-950">{allProfiles.length}</strong><span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Com permissões</span></div></div>
          <label className="relative mt-3 block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Buscar nome ou e-mail" className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#385041]" /></label>
          {accountsError && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-semibold leading-relaxed text-amber-800">{accountsError} Os perfis já salvos no painel continuam listados abaixo.</p>}
          <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {accountsLoading && !managedUsers.length && <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 p-5 text-xs text-gray-500"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando usuários...</div>}
            {managedUsers.map((item) => {
              const active = item.profile ? item.profile.active : !item.account?.disabled;
              const selected = editingId === item.email;
              return <button key={item.email} type="button" onClick={() => selectManagedUser(item)} className={`w-full rounded-2xl border p-3 text-left transition-all ${selected ? 'border-[#385041] bg-white shadow-sm ring-1 ring-[#385041]/10' : 'border-transparent bg-white/65 hover:border-[#385041]/20 hover:bg-white'}`}>
                <span className="flex items-start justify-between gap-2"><span className="flex min-w-0 items-center gap-2"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-extrabold ${item.profile ? 'bg-[#e8efe0] text-[#385041]' : 'bg-amber-50 text-amber-700'}`}>{item.displayName.slice(0, 2).toUpperCase()}</span><span className="min-w-0"><strong className="block truncate text-xs text-gray-900">{item.displayName}</strong><span className="mt-0.5 block truncate text-[9px] text-gray-500">{item.email}</span></span></span><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-300'}`} /></span>
                <span className="mt-2 flex flex-wrap gap-1.5">{item.profile ? <><span className="rounded-full bg-[#e8efe0] px-2 py-0.5 text-[8px] font-extrabold text-[#385041]">{item.profile.role}</span><span className="rounded-full bg-gray-100 px-2 py-0.5 text-[8px] font-bold text-gray-500">{item.profile.visibleTabs?.length || 0} abas</span></> : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-extrabold text-amber-700">Configurar permissões</span>}{item.account && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[8px] font-bold text-blue-700">Login Firebase</span>}</span>
              </button>;
            })}
            {!accountsLoading && !managedUsers.length && <p className="rounded-2xl border border-dashed border-gray-300 p-5 text-center text-xs text-gray-500">Nenhum usuário encontrado.</p>}
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

            <section>
              <div className="flex items-end justify-between gap-3"><div><h4 className="flex items-center gap-2 text-xs font-extrabold text-gray-950"><ShieldCheck className="h-4 w-4 text-[#385041]" />Abas liberadas</h4><p className="mt-1 text-[10px] text-gray-500">Ative somente as áreas necessárias para esta pessoa.</p></div><span className="rounded-full bg-[#e8efe0] px-2.5 py-1 text-[9px] font-extrabold text-[#385041]">{form.visibleTabs.length} de {TAB_OPTIONS.length}</span></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {TAB_OPTIONS.map(({ id, label, description, icon: Icon }) => {
                  const selected = form.visibleTabs.includes(id);
                  return <button key={id} type="button" aria-pressed={selected} onClick={() => toggleTab(id)} className={`group relative flex min-h-20 items-center gap-3 rounded-2xl border p-3 text-left transition-all ${selected ? 'border-[#385041]/25 bg-[#eef5eb] shadow-sm ring-1 ring-[#385041]/5' : 'border-gray-200 bg-white hover:border-[#385041]/25 hover:bg-gray-50'}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${selected ? 'bg-[#385041] text-white' : 'bg-gray-100 text-gray-400 group-hover:text-[#385041]'}`}><Icon className="h-5 w-5" /></span><span className="min-w-0"><strong className="block truncate text-xs text-gray-900">{label}</strong><small className="mt-0.5 block truncate text-[9px] text-gray-500">{description}</small></span><span className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border ${selected ? 'border-[#385041] bg-[#385041] text-white' : 'border-gray-300 bg-white text-transparent'}`}><Check className="h-3 w-3" /></span></button>;
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><h4 className="flex items-center gap-2 text-xs font-extrabold text-blue-950"><KeyRound className="h-4 w-4" />Login e criação da primeira senha</h4><p className="mt-1 max-w-xl text-[10px] leading-relaxed text-blue-800">{editingId ? 'A conta precisa existir no Firebase. Depois, envie o e-mail automático ou gere um link direto para a pessoa criar a senha.' : 'Ao salvar, criaremos a conta, solicitaremos o e-mail automático e também mostraremos um link direto como alternativa segura.'}</p></div>
                {authBusy && <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-blue-700" />}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-blue-100 bg-white/80 p-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-700 text-[10px] font-extrabold text-white">1</span><strong className="mt-2 block text-[10px] text-blue-950">Crie o login</strong><p className="mt-0.5 text-[9px] leading-relaxed text-blue-700">Salve o usuário ou use “Criar ou liberar login”.</p></div>
                <div className="rounded-xl border border-blue-100 bg-white/80 p-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-700 text-[10px] font-extrabold text-white">2</span><strong className="mt-2 block text-[10px] text-blue-950">Envie o acesso</strong><p className="mt-0.5 text-[9px] leading-relaxed text-blue-700">Use o e-mail automático ou copie o link direto.</p></div>
                <div className="rounded-xl border border-blue-100 bg-white/80 p-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-700 text-[10px] font-extrabold text-white">3</span><strong className="mt-2 block text-[10px] text-blue-950">A pessoa cria a senha</strong><p className="mt-0.5 text-[9px] leading-relaxed text-blue-700">Ela abre o link, escolhe a senha e entra normalmente.</p></div>
              </div>

              {editingId && <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={authBusy} onClick={() => manageLogin('inspect')} className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-[10px] font-extrabold text-blue-800 disabled:opacity-50"><SearchCheck className="h-4 w-4" />Verificar conta</button>
                <button type="button" disabled={authBusy} onClick={() => manageLogin('ensure-user')} className="flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-50"><UserPlus className="h-4 w-4" />Criar ou liberar login</button>
                <button type="button" disabled={authBusy} onClick={sendAutomaticResetEmail} className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-[10px] font-extrabold text-blue-800 disabled:opacity-50"><Send className="h-4 w-4" />Enviar e-mail automático</button>
                <button type="button" disabled={authBusy} onClick={() => manageLogin('reset-link')} className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-[10px] font-extrabold text-blue-800 disabled:opacity-50"><KeyRound className="h-4 w-4" />Gerar link direto</button>
              </div>}

              {authStatus && <div className={`mt-3 rounded-xl border px-3 py-2.5 text-[10px] font-semibold ${authStatus.exists && !authStatus.disabled ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                {authStatus.exists ? <><strong className="block">{authStatus.disabled ? 'Conta desativada' : 'Conta ativa'}</strong><span>{authStatus.providers?.length ? `Métodos: ${authStatus.providers.map((provider) => provider === 'password' ? 'e-mail e senha' : provider === 'google.com' ? 'Google' : provider).join(', ')}` : 'Senha ainda não definida'}{authStatus.lastSignInAt ? ` · Último acesso: ${new Date(authStatus.lastSignInAt).toLocaleString('pt-BR')}` : ' · Nunca acessou'}</span></> : <strong>Conta de login não encontrada.</strong>}
              </div>}
              {authMessage && <p className="mt-3 rounded-xl bg-white px-3 py-2.5 text-[10px] font-semibold text-blue-900">{authMessage}</p>}
              {resetLink && <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3"><div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><div><strong className="block text-[11px] text-emerald-950">Link pronto para criar a senha</strong><p className="mt-0.5 text-[9px] leading-relaxed text-emerald-800">Envie somente para <strong>{form.email.trim().toLowerCase()}</strong>. A pessoa abrirá este endereço e escolherá a própria senha.</p></div></div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input readOnly value={resetLink} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-[10px] text-gray-600 outline-none" aria-label="Link de criação ou redefinição de senha" /><button type="button" onClick={copyResetLink} className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#385041] px-3 py-2 text-[10px] font-extrabold text-white"><Copy className="h-3.5 w-3.5" />Copiar link</button><button type="button" onClick={prepareResetEmail} className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-[10px] font-extrabold text-emerald-800"><Mail className="h-3.5 w-3.5" />Preparar e-mail</button></div></div>}
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
              <span><strong className="block text-xs text-gray-900">Perfil ativo</strong><small className="mt-0.5 block text-[10px] text-gray-500">Ao desativar, a pessoa continua com o login existente, mas perde o acesso aos dados do sistema.</small></span>
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
