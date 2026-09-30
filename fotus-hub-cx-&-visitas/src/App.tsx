import { useEffect, useMemo, useState } from 'react';
import {
  ArchiveRestore,
  Bell,
  Building2,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Network,
  RefreshCw,
  Settings2,
} from 'lucide-react';
import { isMasterOperatorEmail } from './lib/auth';
import { CurrentUser, currentUserFromNeon } from './lib/currentUser';
import { cn } from './lib/utils';
import { DEFAULT_OCCURRENCE_AGENTS } from './lib/occurrences';
import { loadNeonBootstrap } from './lib/neonData';
import { getNeonAccessToken, neonAuth } from './lib/neonAuth';
import { syncChat, type ChatSync } from './lib/chat';
import {
  CXCase,
  ExtraCost,
  IntegratorVisit,
  Occurrence,
  OrganizationUnit,
  OrganizationPerson,
  RACase,
  AppSection,
  UserAccessProfile,
} from './types';
import AccessControlModal from './components/AccessControlModal';
import Auth from './components/Auth';
import ChatView from './components/ChatView';
import AgentManagerModal from './components/AgentManagerModal';
import ExtraCostsView from './components/ExtraCostsView';
import IsaChatModal from './components/IsaChatModal';
import OccurrencesView from './components/OccurrencesView';
import OverviewView from './components/OverviewView';
import OrganizationView from './components/OrganizationView';
import RaModal from './components/RaModal';
import RaView from './components/RaView';
import VisitModal from './components/VisitModal';
import VisitsView from './components/VisitsView';

type MainTab = AppSection | 'chat';

const DEVELOPER_EMAIL = 'guilhermebarbosars@gmail.com';
const ALL_TABS: MainTab[] = ['visao-geral', 'ocorrencias', 'custos', 'ra', 'visitas', 'estrutura'];

const ISA_LOGO = 'https://res.cloudinary.com/dsctpzqvy/image/upload/v1776894141/I_matvg6.png';
const FOTUS_LOGO = 'https://res.cloudinary.com/dsctpzqvy/image/upload/v1787848825/ChatGPT_Image_27_de_ago._de_2026_13_40_18_tzgwxs.png';
const RA_LOGO = 'https://res.cloudinary.com/dsctpzqvy/image/upload/v1787843527/25-reclame_mnxv8n.png';

const TAB_COPY: Record<MainTab, { title: string; subtitle: string }> = {
  'visao-geral': { title: 'Visão Geral', subtitle: 'Resumo visual das informações que você tem permissão para acompanhar' },
  ocorrencias: { title: 'Controle de Ocorrências', subtitle: 'Acompanhamento interativo das ocorrências antes controladas por planilha' },
  custos: { title: 'Custo Extra', subtitle: 'Controle dos gastos não previstos por pedido, regional, origem e responsabilidade' },
  ra: { title: 'Painel Reclame Aqui', subtitle: 'Monitoramento das reclamações, indicadores e resolução' },
  visitas: { title: 'Visitas de Integradores', subtitle: 'Agenda, recepção e acompanhamento dos parceiros' },
  estrutura: { title: 'Estrutura Organizacional', subtitle: 'Gestores, equipes e consultores comerciais' },
  chat: { title: 'Chat da equipe', subtitle: 'Converse no grupo geral ou em particular com colegas da plataforma' },
};

export default function App() {
  const neonSession = neonAuth.useSession();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTab>('visao-geral');
  const [cases, setCases] = useState<CXCase[]>([]);
  const [raCases, setRaCases] = useState<RACase[]>([]);
  const [visits, setVisits] = useState<IntegratorVisit[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [extraCosts, setExtraCosts] = useState<ExtraCost[]>([]);
  const [organizationUnits, setOrganizationUnits] = useState<OrganizationUnit[]>([]);
  const [organizationPeople, setOrganizationPeople] = useState<OrganizationPerson[]>([]);
  const [occurrenceAgents, setOccurrenceAgents] = useState<string[]>(DEFAULT_OCCURRENCE_AGENTS);
  const [accessProfiles, setAccessProfiles] = useState<UserAccessProfile[]>([]);
  const [accessProfileLoading, setAccessProfileLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [chatOverview, setChatOverview] = useState<ChatSync>({ onlineUserIds: [], unread: [] });
  const [chatTarget, setChatTarget] = useState<{ conversationId: string; nonce: number } | null>(null);

  const [isRaModalOpen, setIsRaModalOpen] = useState(false);
  const [raCaseToEdit, setRaCaseToEdit] = useState<RACase | null>(null);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [visitToEdit, setVisitToEdit] = useState<IntegratorVisit | null>(null);
  const [isIsaChatOpen, setIsIsaChatOpen] = useState(false);
  const [isAgentManagerOpen, setIsAgentManagerOpen] = useState(false);
  const [isAccessControlOpen, setIsAccessControlOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    const sessionUser = neonSession.data?.user;
    if (sessionUser?.email) {
      setUser((current) => {
        if (current?.uid === sessionUser.id
          && current.email === sessionUser.email
          && current.displayName === sessionUser.name
          && current.photoURL === (sessionUser.image || null)) return current;
        return currentUserFromNeon({ ...sessionUser, email: sessionUser.email }, getNeonAccessToken);
      });
      setAuthLoading(false);
      return;
    }
    if (!neonSession.isPending) {
      setUser(null);
      setAuthLoading(false);
    }
  }, [
    neonSession.data?.user?.id,
    neonSession.data?.user?.email,
    neonSession.data?.user?.name,
    neonSession.data?.user?.image,
    neonSession.isPending,
  ]);

  useEffect(() => {
    if (!user) {
      setAccessProfiles([]);
      setAccessProfileLoading(false);
      return;
    }
    let cancelled = false;
    let loading = false;
    let refreshQueued = false;
    // O carregamento de tela inteira é necessário apenas ao entrar na conta.
    // Sincronizações posteriores mantêm as abas e os formulários montados.
    setAccessProfileLoading(true);
    const load = async () => {
      if (cancelled) return;
      if (loading) {
        // Uma alteração feita durante a consulta ainda precisa ser buscada.
        refreshQueued = true;
        return;
      }
      loading = true;
      try {
        do {
          refreshQueued = false;
          try {
            const data = await loadNeonBootstrap(user);
            if (cancelled) return;
            setDataError('');
            setAccessProfiles(data.profiles);
            setOccurrenceAgents(data.occurrenceAgents.length ? data.occurrenceAgents : DEFAULT_OCCURRENCE_AGENTS);
            setOrganizationPeople(data.organizationPeople);
            setOrganizationUnits(data.organizationUnits);
            setOccurrences(data.occurrences);
            setExtraCosts(data.extraCosts);
            setRaCases(data.raCases);
            setVisits(data.visits);
            setCases(data.cases);
          } catch (error) {
            if (!cancelled) setDataError(error instanceof Error ? error.message : 'Não foi possível carregar os dados do Neon.');
          } finally {
            if (!cancelled) setAccessProfileLoading(false);
          }
        } while (refreshQueued && !cancelled);
      } finally {
        loading = false;
      }
    };
    const onDataChanged = () => { void load(); };
    void load();
    window.addEventListener('fotus:data-changed', onDataChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('fotus:data-changed', onDataChanged);
    };
  }, [user]);

  // Pedidos chegam de outro site; atualize a agenda enquanto a aba estiver aberta.
  useEffect(() => {
    if (!user || activeTab !== 'visitas') return;
    let lastRefreshAt = 0;
    const refresh = () => {
      const now = Date.now();
      if (document.visibilityState !== 'visible' || now - lastRefreshAt < 30_000) return;
      lastRefreshAt = now;
      window.dispatchEvent(new Event('fotus:data-changed'));
    };
    refresh();
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => { window.removeEventListener('focus', refresh); window.clearInterval(timer); };
  }, [user, activeTab]);

  const access = useMemo(() => {
    const email = (user?.email || '').toLowerCase();
    const isDeveloper = email === DEVELOPER_EMAIL;
    const isMasterOperator = isMasterOperatorEmail(email);
    if (isDeveloper) return { role: 'Administrador' as const, agentName: '', unitIds: organizationUnits.map((unit) => unit.id), tabs: ALL_TABS, active: true, isDeveloper, isMasterOperator, canDeleteVisits: true, canDeleteCosts: true, structurePermissions: { canCreate: true, canEdit: true, canDelete: true } };

    const profile = accessProfiles.find((item) => item.email.toLowerCase() === email);
    const inferredUnits = organizationUnits.filter((unit) => [unit.managerEmail, unit.leaderEmail, unit.coordinatorEmail || ''].some((value) => value.toLowerCase() === email));
    const organizationPerson = organizationPeople.find((person) => person.email?.toLowerCase() === email);
    let inferredRole: UserAccessProfile['role'] = 'Agente';
    if (organizationPerson?.role === 'Head') inferredRole = 'Administrador';
    else if (organizationPerson?.role === 'Gerente') inferredRole = 'Gerente';
    else if (organizationPerson?.role === 'Coordenador') inferredRole = 'Coordenador';
    else if (organizationPerson?.role === 'Líder') inferredRole = 'Líder';
    else if (inferredUnits.some((unit) => (unit.coordinatorEmail || '').toLowerCase() === email)) inferredRole = 'Coordenador';
    else if (inferredUnits.some((unit) => unit.leaderEmail.toLowerCase() === email)) inferredRole = 'Líder';
    else if (inferredUnits.some((unit) => unit.managerEmail.toLowerCase() === email)) inferredRole = 'Gerente';
    const role = profile?.role || inferredRole;
    const unitIds = profile?.organizationUnitIds?.length ? profile.organizationUnitIds : inferredUnits.map((unit) => unit.id);
    const defaultTabs: MainTab[] = role === 'Líder' || role === 'Coordenador' || role === 'Administrador'
      ? ['visao-geral', 'ocorrencias', 'visitas', 'estrutura']
      : ['visao-geral', 'ocorrencias', 'visitas'];
    return {
      role,
      agentName: profile?.agentName || user?.displayName || '',
      unitIds,
      tabs: profile && Array.isArray(profile.visibleTabs) ? profile.visibleTabs : defaultTabs,
      active: profile?.active ?? true,
      isDeveloper,
      isMasterOperator,
      canDeleteVisits: isMasterOperator || Boolean(profile?.canDeleteVisits),
      canDeleteCosts: isMasterOperator || Boolean(profile?.canDeleteCosts),
      structurePermissions: isMasterOperator ? { canCreate: true, canEdit: true, canDelete: true }
        : profile?.structurePermissions || { canCreate: false, canEdit: false, canDelete: false },
    };
  }, [accessProfiles, organizationPeople, organizationUnits, user]);


  const visibleOccurrences = occurrences;
  const visibleTabs = access.tabs;
  const canView = (tab: MainTab) => tab === 'chat' || visibleTabs.includes(tab);
  const visibleCosts = extraCosts;
  const visibleRaCases = raCases;
  const visibleOrganizationUnits = organizationUnits;
  const chatUnreadTotal = chatOverview.unread.reduce((total, item) => total + item.count, 0);
  const canManageAgents = access.isDeveloper || ['Administrador', 'Coordenador', 'Líder'].includes(access.role);
  const scopeLabel = access.isMasterOperator
    ? `operador mestre · ${visibleTabs.length} ${visibleTabs.length === 1 ? 'área liberada' : 'áreas liberadas'}`
    : `${visibleTabs.length} ${visibleTabs.length === 1 ? 'área liberada' : 'áreas liberadas'}`;
  const handleSignOut = async () => {
    await neonAuth.signOut();
    setUser(null);
  };

  useEffect(() => {
    if (user && !canView(activeTab)) setActiveTab(visibleTabs[0] || 'visao-geral');
  }, [activeTab, user, visibleTabs.join('|')]);

  useEffect(() => {
    if (!user) { setChatOverview({ onlineUserIds: [], unread: [] }); return; }
    if (accessProfileLoading || !access.active || access.tabs.length === 0) return;
    let cancelled = false;
    let busy = false;
    let lastActivity = Date.now();
    let lastSync = 0;
    const refresh = async (force = false) => {
      const now = Date.now();
      if (cancelled || busy || document.visibilityState !== 'visible' || now - lastActivity > 5 * 60_000) return;
      if (!force && now - lastSync < 55_000) return;
      busy = true;
      lastSync = now;
      try {
        const result = await syncChat(user);
        if (!cancelled) setChatOverview(result);
      } catch {
        // The main app remains usable if chat presence is temporarily unavailable.
      } finally {
        busy = false;
      }
    };
    const onActivity = () => {
      const wasIdle = Date.now() - lastActivity > 5 * 60_000;
      lastActivity = Date.now();
      if (wasIdle) void refresh(true);
    };
    const onVisible = () => { if (document.visibilityState === 'visible') { lastActivity = Date.now(); void refresh(true); } };
    const onChatChanged = () => { lastActivity = Date.now(); void refresh(true); };
    void refresh(true);
    const timer = window.setInterval(() => void refresh(), 60_000);
    window.addEventListener('pointerdown', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('fotus:chat-changed', onChatChanged);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('fotus:chat-changed', onChatChanged);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, accessProfileLoading, access.active, access.tabs.join('|')]);

  if (authLoading || (user && accessProfileLoading)) {
    return <div className="flex min-h-screen items-center justify-center bg-fotus-neutral"><RefreshCw className="h-8 w-8 animate-spin text-fotus-blue" /></div>;
  }

  if (!user) return <Auth />;
  if (!access.active || visibleTabs.length === 0) {
    return <div className="flex min-h-screen items-center justify-center bg-fotus-neutral p-6"><div className="w-full max-w-md rounded-3xl border border-fotus-neutral bg-fotus-neutral p-8 text-center shadow-xl"><img src={FOTUS_LOGO} alt="Fotus" className="mx-auto h-14 w-auto object-contain" /><h1 className="mt-6 text-xl font-extrabold text-fotus-ink">Acesso temporariamente indisponível</h1><p className="mt-2 text-sm leading-relaxed text-fotus-ink/80">Seu perfil está desativado ou ainda não possui nenhuma aba liberada. Procure um operador mestre.</p><button type="button" onClick={() => void handleSignOut()} className="mt-6 inline-flex items-center gap-2 rounded-xl fotus-action px-5 py-3 text-xs font-bold"><LogOut className="h-4 w-4" />Sair da conta</button></div></div>;
  }

  const allNavigationTabs: Array<{ id: MainTab; label: string; icon: typeof ClipboardList; alert?: boolean }> = [
    { id: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'ocorrencias', label: 'Ocorrências', icon: ClipboardList, alert: visibleOccurrences.some((item) => item.stage !== 'Finalizada') },
    { id: 'custos', label: 'Custo Extra', icon: CircleDollarSign, alert: visibleCosts.some((item) => item.totalCost > 1000) },
    { id: 'ra', label: 'Reclame Aqui', icon: ArchiveRestore, alert: visibleRaCases.some((item) => item.status === 'Em Andamento') },
    { id: 'visitas', label: 'Visitas', icon: Building2, alert: visits.some((item) => item.status === 'Solicitada' || item.status === 'Agendada') },
    { id: 'estrutura', label: 'Estrutura', icon: Network, alert: organizationPeople.length === 0 },
    { id: 'chat', label: 'Chat', icon: MessageCircle, alert: chatUnreadTotal > 0 },
  ];
  const tabs = allNavigationTabs.filter((tab) => canView(tab.id));

  return (
    <div className="fotus-app-shell flex min-h-screen font-sans text-fotus-ink">
      <aside className="sticky top-0 hidden h-screen w-[72px] shrink-0 flex-col border-r border-fotus-neutral bg-fotus-neutral/90 px-2 py-3 shadow-[4px_0_24px_rgb(13_81_142_/_0.035)] backdrop-blur-xl sm:flex">
        <div className="flex h-11 items-center justify-center"><img src={FOTUS_LOGO} alt="Fotus" className="h-auto w-10 object-contain" /></div>
        <nav className="mt-4 flex flex-col items-center gap-1.5" aria-label="Navegação principal">
          {tabs.map(({ id, label, icon: Icon, alert }) => {
            const selected = activeTab === id;
            return <button key={id} type="button" onClick={() => setActiveTab(id)} title={label} aria-label={label} aria-current={selected ? 'page' : undefined} className={cn('group relative flex h-12 w-12 items-center justify-center rounded-[15px] transition-all duration-200', selected ? 'bg-fotus-yellow text-fotus-ink shadow-[0_8px_18px_rgb(250_181_21_/_0.25)]' : 'text-fotus-blue hover:bg-fotus-blue/6 hover:text-fotus-blue')}>
              {id === 'ra' ? <img src={RA_LOGO} alt="" className={cn('h-7 w-7 rounded-lg object-contain', selected && 'ring-2 ring-fotus-neutral/70')} /> : <Icon className="h-[22px] w-[22px]" strokeWidth={selected ? 2.25 : 2} />}
              <span className="sr-only">{label}</span>
              {id === 'chat' && chatUnreadTotal > 0 ? <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-fotus-ink/30 bg-fotus-yellow px-1 text-[9px] font-extrabold text-fotus-ink" aria-label={`${chatUnreadTotal} mensagens novas`}>{chatUnreadTotal > 9 ? '9+' : chatUnreadTotal}</span> : alert && <span className={cn('absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2', selected ? 'border-fotus-yellow bg-fotus-blue' : 'border-fotus-neutral bg-fotus-yellow')} aria-label="Há itens que precisam de atenção" />}
            </button>;
          })}
        </nav>
        <button type="button" onClick={() => setIsIsaChatOpen(true)} title="Abrir ISA" aria-label="Abrir ISA" className="mt-auto flex h-11 w-full items-center justify-center rounded-xl transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-fotus-blue/20"><img src={ISA_LOGO} alt="ISA" className="h-10 w-10 object-contain drop-shadow-sm" /></button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-fotus-neutral/80 bg-fotus-neutral/75 px-4 py-3.5 shadow-sm backdrop-blur-xl sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3"><img src={FOTUS_LOGO} alt="Fotus" className="h-9 w-auto object-contain sm:hidden" /><div className="min-w-0"><h1 className="truncate text-base font-extrabold tracking-tight text-fotus-ink sm:text-lg">{TAB_COPY[activeTab].title}</h1><p className="hidden truncate text-xs text-fotus-ink/80 md:block">{TAB_COPY[activeTab].subtitle}</p></div></div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button type="button" onClick={() => setIsIsaChatOpen(true)} title="Falar com a ISA" className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-fotus-blue/20"><img src={ISA_LOGO} alt="Abrir ISA" className="h-11 w-11 object-contain drop-shadow-sm" /></button>
              <button type="button" onClick={() => { setChatTarget({ conversationId: chatOverview.unread[0]?.conversationId || 'general', nonce: Date.now() }); setActiveTab('chat'); }} title={chatUnreadTotal ? `${chatUnreadTotal} ${chatUnreadTotal === 1 ? 'mensagem nova' : 'mensagens novas'}` : 'Abrir chat'} aria-label={chatUnreadTotal ? `Abrir ${chatUnreadTotal} ${chatUnreadTotal === 1 ? 'mensagem nova' : 'mensagens novas'} no chat` : 'Abrir chat'} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-fotus-blue hover:bg-fotus-blue/6"><Bell className="h-5 w-5" />{chatUnreadTotal > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-fotus-yellow px-1 text-[9px] font-extrabold text-fotus-ink">{chatUnreadTotal > 9 ? '9+' : chatUnreadTotal}</span>}</button>
              <div className="relative border-l border-fotus-blue/20 pl-2 sm:pl-3">
                <button type="button" onClick={() => setIsProfileMenuOpen((current) => !current)} className="flex items-center gap-2 rounded-xl p-1.5 text-left transition-colors hover:bg-fotus-neutral/40" aria-expanded={isProfileMenuOpen}>
                  <div className="hidden text-right lg:block"><p className="text-xs font-bold text-fotus-ink">{user.displayName || user.email}</p><p className="text-[10px] text-fotus-ink/80">{access.role} · {user.email}</p></div>
                  {user.photoURL ? <img src={user.photoURL} alt="Abrir opções do perfil" className="h-9 w-9 rounded-full border-2 border-fotus-neutral object-cover shadow-sm ring-1 ring-fotus-blue/20" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-fotus-blue/6 text-xs font-bold text-fotus-blue ring-1 ring-fotus-blue/10">{user.email?.[0]?.toUpperCase()}</span>}
                </button>
                {isProfileMenuOpen && <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 rounded-2xl border border-fotus-blue/20 bg-fotus-neutral p-3 shadow-xl">
                  <div className="rounded-xl bg-fotus-neutral p-3"><p className="text-xs font-extrabold text-fotus-ink">{user.displayName || user.email}</p><p className="mt-0.5 truncate text-[10px] text-fotus-ink/80">{user.email}</p><div className="mt-2 flex flex-wrap gap-1"><span className="rounded-full bg-fotus-blue px-2 py-1 text-[8px] font-extrabold uppercase tracking-wide text-fotus-neutral">{access.role}</span><span className="rounded-full bg-fotus-neutral px-2 py-1 text-[8px] font-bold text-fotus-ink/80">{scopeLabel}</span></div></div>
                  {access.isMasterOperator && <button type="button" onClick={() => { setIsProfileMenuOpen(false); setIsAccessControlOpen(true); }} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-fotus-blue hover:bg-fotus-blue/6"><Settings2 className="h-4 w-4" /><span>Gerenciar usuários<small className="mt-0.5 block text-[9px] font-normal text-fotus-ink/80">Logins, senhas, funções e equipes</small></span></button>}
                  <button type="button" onClick={() => void handleSignOut()} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-fotus-ink hover:bg-fotus-yellow/20"><LogOut className="h-4 w-4" />Sair da conta</button>
                </div>}
              </div>
            </div>
          </div>

          <nav className="mt-3 flex gap-1.5 overflow-x-auto rounded-2xl border border-fotus-blue/14 bg-fotus-neutral p-1.5 sm:hidden" aria-label="Navegação principal">
            {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setActiveTab(id)} aria-current={activeTab === id ? 'page' : undefined} className={cn('flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-extrabold transition-all', activeTab === id ? 'bg-fotus-yellow text-fotus-ink shadow-sm' : 'text-fotus-ink/80')}>
              {id === 'ra' ? <img src={RA_LOGO} alt="" className="h-4 w-4 rounded object-contain" /> : <Icon className="h-3.5 w-3.5" />}{label}{id === 'chat' && chatUnreadTotal > 0 && <span className="rounded-full bg-fotus-yellow px-1.5 py-0.5 text-[9px] text-fotus-ink">{chatUnreadTotal > 9 ? '9+' : chatUnreadTotal}</span>}
            </button>)}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1560px] flex-1 px-4 py-5 sm:px-8 sm:py-6">
          {dataError && <div className="mb-5 rounded-2xl border border-fotus-yellow/25 bg-fotus-yellow/20 p-4 text-xs font-semibold text-fotus-ink">{dataError}</div>}

          {canView('visao-geral') && <section hidden={activeTab !== 'visao-geral'}><OverviewView occurrences={visibleOccurrences} costs={visibleCosts} raCases={visibleRaCases} visits={visits} scopeLabel={scopeLabel} canViewOccurrences={canView('ocorrencias')} canViewCosts={canView('custos')} canViewRa={canView('ra')} canViewVisits={canView('visitas')} onNavigate={setActiveTab} /></section>}

          {canView('ocorrencias') && <section hidden={activeTab !== 'ocorrencias'}><OccurrencesView occurrences={visibleOccurrences} organizationUnits={visibleOrganizationUnits} currentUser={user} agents={occurrenceAgents} canManageAgents={canManageAgents} onEditAgents={() => setIsAgentManagerOpen(true)} /></section>}

          {canView('custos') && <section hidden={activeTab !== 'custos'}><ExtraCostsView costs={visibleCosts} currentUser={user} canDeleteCosts={access.canDeleteCosts} /></section>}

          {canView('ra') && <section hidden={activeTab !== 'ra'}><RaView cases={visibleRaCases} currentUser={user} onNew={() => { setRaCaseToEdit(null); setIsRaModalOpen(true); }} onEdit={(item) => { setRaCaseToEdit(item); setIsRaModalOpen(true); }} /></section>}

          {canView('visitas') && <section hidden={activeTab !== 'visitas'}><VisitsView visits={visits} currentUser={user} canDeleteVisits={access.canDeleteVisits} onNewVisit={() => { setVisitToEdit(null); setIsVisitModalOpen(true); }} onEditVisit={(visit) => { setVisitToEdit(visit); setIsVisitModalOpen(true); }} /></section>}
          {canView('estrutura') && <section hidden={activeTab !== 'estrutura'}><OrganizationView units={organizationUnits} people={organizationPeople} currentUser={user} canManage={access.structurePermissions.canEdit} canCreate={access.structurePermissions.canCreate} canDelete={access.structurePermissions.canDelete} canDeleteLegacy={access.isDeveloper} /></section>}
          <section hidden={activeTab !== 'chat'}><ChatView currentUser={user} active={activeTab === 'chat'} onlineUserIds={chatOverview.onlineUserIds} unread={chatOverview.unread} target={chatTarget} onRead={(conversationId) => setChatOverview((current) => ({ ...current, unread: current.unread.filter((item) => item.conversationId !== conversationId) }))} /></section>
        </main>

        <RaModal isOpen={isRaModalOpen} onClose={() => setIsRaModalOpen(false)} caseToEdit={raCaseToEdit} currentUser={user} />
        <VisitModal isOpen={isVisitModalOpen} onClose={() => setIsVisitModalOpen(false)} visitToEdit={visitToEdit} currentUser={user} />
        <AgentManagerModal isOpen={isAgentManagerOpen} onClose={() => setIsAgentManagerOpen(false)} agents={occurrenceAgents} currentUser={user} />
        <AccessControlModal isOpen={isAccessControlOpen} onClose={() => setIsAccessControlOpen(false)} profiles={accessProfiles} units={organizationUnits} agents={occurrenceAgents} currentUser={user} />
        <IsaChatModal currentUser={user} isOpen={isIsaChatOpen} onClose={() => setIsIsaChatOpen(false)} cases={access.isDeveloper ? cases : []} raCases={visibleRaCases} visits={visits} occurrences={visibleOccurrences} extraCosts={visibleCosts} organizationUnits={visibleOrganizationUnits} organizationPeople={organizationPeople} />
      </div>
    </div>
  );
}
