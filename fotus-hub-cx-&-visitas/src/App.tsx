import { useEffect, useMemo, useState } from 'react';
import {
  ArchiveRestore,
  Building2,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  LogOut,
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

type MainTab = AppSection;

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
  estrutura: { title: 'Estrutura Organizacional', subtitle: 'Organograma em cadeia: Head, Gerente, Coordenador e Líder' },
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
    const load = async () => {
      setAccessProfileLoading(true);
      setDataError('');
      try {
        const data = await loadNeonBootstrap(user);
        if (cancelled) return;
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
    };
    void load();
    window.addEventListener('fotus:data-changed', load);
    return () => {
      cancelled = true;
      window.removeEventListener('fotus:data-changed', load);
    };
  }, [user]);

  const access = useMemo(() => {
    const email = (user?.email || '').toLowerCase();
    const isDeveloper = email === DEVELOPER_EMAIL;
    const isMasterOperator = isMasterOperatorEmail(email);
    if (isDeveloper) return { role: 'Administrador' as const, agentName: '', unitIds: organizationUnits.map((unit) => unit.id), tabs: ALL_TABS, active: true, isDeveloper, isMasterOperator };

    const profile = accessProfiles.find((item) => item.email.toLowerCase() === email);
    const inferredUnits = organizationUnits.filter((unit) => [unit.managerEmail, unit.leaderEmail, unit.coordinatorEmail || ''].some((value) => value.toLowerCase() === email));
    const organizationPerson = organizationPeople.find((person) => person.email.toLowerCase() === email);
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
    };
  }, [accessProfiles, organizationPeople, organizationUnits, user]);


  const visibleOccurrences = occurrences;
  const visibleTabs = access.tabs;
  const canView = (tab: MainTab) => visibleTabs.includes(tab);
  const visibleCosts = extraCosts;
  const visibleRaCases = raCases;
  const visibleOrganizationUnits = organizationUnits;
  const canManageAgents = access.isDeveloper || ['Administrador', 'Coordenador', 'Líder'].includes(access.role);
  const scopeLabel = access.isMasterOperator
    ? `operador mestre · ${visibleTabs.length} ${visibleTabs.length === 1 ? 'área liberada' : 'áreas liberadas'}`
    : `${visibleTabs.length} ${visibleTabs.length === 1 ? 'área liberada' : 'áreas liberadas'}`;
  const handleSignOut = async () => {
    await neonAuth.signOut();
    setUser(null);
  };

  useEffect(() => {
    if (user && !visibleTabs.includes(activeTab)) setActiveTab(visibleTabs[0] || 'visao-geral');
  }, [activeTab, user, visibleTabs.join('|')]);

  if (authLoading || (user && accessProfileLoading)) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6]"><RefreshCw className="h-8 w-8 animate-spin text-[#385041]" /></div>;
  }

  if (!user) return <Auth />;
  if (!access.active || visibleTabs.length === 0) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6] p-6"><div className="w-full max-w-md rounded-3xl border border-white bg-white p-8 text-center shadow-xl"><img src={FOTUS_LOGO} alt="Fotus" className="mx-auto h-14 w-auto object-contain" /><h1 className="mt-6 text-xl font-extrabold text-gray-950">Acesso temporariamente indisponível</h1><p className="mt-2 text-sm leading-relaxed text-gray-500">Seu perfil está desativado ou ainda não possui nenhuma aba liberada. Procure um operador mestre.</p><button type="button" onClick={() => void handleSignOut()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#385041] px-5 py-3 text-xs font-bold text-white"><LogOut className="h-4 w-4" />Sair da conta</button></div></div>;
  }

  const allNavigationTabs: Array<{ id: MainTab; label: string; icon: typeof ClipboardList; alert?: boolean }> = [
    { id: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'ocorrencias', label: 'Ocorrências', icon: ClipboardList, alert: visibleOccurrences.some((item) => item.stage !== 'Finalizada') },
    { id: 'custos', label: 'Custo Extra', icon: CircleDollarSign, alert: visibleCosts.some((item) => item.totalCost > 1000) },
    { id: 'ra', label: 'Reclame Aqui', icon: ArchiveRestore, alert: visibleRaCases.some((item) => item.status === 'Em Andamento') },
    { id: 'visitas', label: 'Visitas', icon: Building2, alert: visits.some((item) => item.status === 'Agendada') },
    { id: 'estrutura', label: 'Estrutura', icon: Network, alert: organizationPeople.length === 0 },
  ];
  const tabs = allNavigationTabs.filter((tab) => canView(tab.id));

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#f8fbf8] via-[#f2f6f3] to-[#e8efe9] font-sans text-gray-900">
      <aside className="sticky top-0 hidden h-screen w-[72px] shrink-0 flex-col border-r border-[#e2e8e3] bg-white/90 px-2 py-3 shadow-[4px_0_24px_rgba(44,64,51,0.035)] backdrop-blur-xl sm:flex">
        <div className="flex h-11 items-center justify-center"><img src={FOTUS_LOGO} alt="Fotus" className="h-auto w-10 object-contain" /></div>
        <nav className="mt-4 flex flex-col items-center gap-1.5" aria-label="Navegação principal">
          {tabs.map(({ id, label, icon: Icon, alert }) => {
            const selected = activeTab === id;
            return <button key={id} type="button" onClick={() => setActiveTab(id)} title={label} aria-label={label} aria-current={selected ? 'page' : undefined} className={cn('group relative flex h-12 w-12 items-center justify-center rounded-[15px] transition-all duration-200', selected ? 'bg-[#385041] text-white shadow-[0_8px_18px_rgba(56,80,65,0.22)]' : 'text-[#8a958c] hover:bg-[#eef4eb] hover:text-[#385041]')}>
              {id === 'ra' ? <img src={RA_LOGO} alt="" className={cn('h-7 w-7 rounded-lg object-contain', selected && 'ring-2 ring-white/70')} /> : <Icon className="h-[22px] w-[22px]" strokeWidth={selected ? 2.25 : 2} />}
              <span className="sr-only">{label}</span>
              {alert && <span className={cn('absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2', selected ? 'border-[#385041] bg-amber-300' : 'border-white bg-amber-500')} aria-label="Há itens que precisam de atenção" />}
            </button>;
          })}
        </nav>
        <button type="button" onClick={() => setIsIsaChatOpen(true)} title="Abrir ISA" aria-label="Abrir ISA" className="mt-auto flex h-11 w-full items-center justify-center rounded-xl transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#385041]/20"><img src={ISA_LOGO} alt="ISA" className="h-10 w-10 object-contain drop-shadow-sm" /></button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/80 bg-white/75 px-4 py-3.5 shadow-sm backdrop-blur-xl sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3"><img src={FOTUS_LOGO} alt="Fotus" className="h-9 w-auto object-contain sm:hidden" /><div className="min-w-0"><h1 className="truncate text-base font-extrabold tracking-tight text-gray-950 sm:text-lg">{TAB_COPY[activeTab].title}</h1><p className="hidden truncate text-xs text-gray-500 md:block">{TAB_COPY[activeTab].subtitle}</p></div></div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button type="button" onClick={() => setIsIsaChatOpen(true)} title="Falar com a ISA" className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#385041]/20"><img src={ISA_LOGO} alt="Abrir ISA" className="h-11 w-11 object-contain drop-shadow-sm" /></button>
              <div className="relative border-l border-gray-200 pl-2 sm:pl-3">
                <button type="button" onClick={() => setIsProfileMenuOpen((current) => !current)} className="flex items-center gap-2 rounded-xl p-1.5 text-left transition-colors hover:bg-gray-50" aria-expanded={isProfileMenuOpen}>
                  <div className="hidden text-right lg:block"><p className="text-xs font-bold text-gray-800">{user.displayName || user.email}</p><p className="text-[10px] text-gray-500">{access.role} · {user.email}</p></div>
                  {user.photoURL ? <img src={user.photoURL} alt="Abrir opções do perfil" className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-gray-200" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8efe0] text-xs font-bold text-[#385041] ring-1 ring-[#385041]/10">{user.email?.[0]?.toUpperCase()}</span>}
                </button>
                {isProfileMenuOpen && <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
                  <div className="rounded-xl bg-[#f4f8f2] p-3"><p className="text-xs font-extrabold text-gray-900">{user.displayName || user.email}</p><p className="mt-0.5 truncate text-[10px] text-gray-500">{user.email}</p><div className="mt-2 flex flex-wrap gap-1"><span className="rounded-full bg-[#385041] px-2 py-1 text-[8px] font-extrabold uppercase tracking-wide text-white">{access.role}</span><span className="rounded-full bg-white px-2 py-1 text-[8px] font-bold text-gray-500">{scopeLabel}</span></div></div>
                  {access.isMasterOperator && <button type="button" onClick={() => { setIsProfileMenuOpen(false); setIsAccessControlOpen(true); }} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-[#385041] hover:bg-[#eef5eb]"><Settings2 className="h-4 w-4" /><span>Gerenciar usuários<small className="mt-0.5 block text-[9px] font-normal text-gray-500">Logins, senhas, funções e equipes</small></span></button>}
                  <button type="button" onClick={() => void handleSignOut()} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Sair da conta</button>
                </div>}
              </div>
            </div>
          </div>

          <nav className="mt-3 flex gap-1.5 overflow-x-auto rounded-2xl border border-gray-200/70 bg-[#f4f7f3] p-1.5 sm:hidden" aria-label="Navegação principal">
            {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setActiveTab(id)} aria-current={activeTab === id ? 'page' : undefined} className={cn('flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-extrabold transition-all', activeTab === id ? 'bg-[#385041] text-white shadow-sm' : 'text-gray-500')}>
              {id === 'ra' ? <img src={RA_LOGO} alt="" className="h-4 w-4 rounded object-contain" /> : <Icon className="h-3.5 w-3.5" />}{label}
            </button>)}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1560px] flex-1 px-4 py-5 sm:px-8 sm:py-6">
          {dataError && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">{dataError}</div>}

          {canView('visao-geral') && <section hidden={activeTab !== 'visao-geral'}><OverviewView occurrences={visibleOccurrences} costs={visibleCosts} raCases={visibleRaCases} visits={visits} scopeLabel={scopeLabel} canViewOccurrences={canView('ocorrencias')} canViewCosts={canView('custos')} canViewRa={canView('ra')} canViewVisits={canView('visitas')} onNavigate={setActiveTab} /></section>}

          {canView('ocorrencias') && <section hidden={activeTab !== 'ocorrencias'}><OccurrencesView occurrences={visibleOccurrences} organizationUnits={visibleOrganizationUnits} currentUser={user} agents={occurrenceAgents} canManageAgents={canManageAgents} onEditAgents={() => setIsAgentManagerOpen(true)} /></section>}

          {canView('custos') && <section hidden={activeTab !== 'custos'}><ExtraCostsView costs={visibleCosts} currentUser={user} /></section>}

          {canView('ra') && <section hidden={activeTab !== 'ra'}><RaView cases={visibleRaCases} currentUser={user} onNew={() => { setRaCaseToEdit(null); setIsRaModalOpen(true); }} onEdit={(item) => { setRaCaseToEdit(item); setIsRaModalOpen(true); }} /></section>}

          {canView('visitas') && <section hidden={activeTab !== 'visitas'}><VisitsView visits={visits} currentUser={user} onNewVisit={() => { setVisitToEdit(null); setIsVisitModalOpen(true); }} onEditVisit={(visit) => { setVisitToEdit(visit); setIsVisitModalOpen(true); }} /></section>}
          {canView('estrutura') && <section hidden={activeTab !== 'estrutura'}><OrganizationView units={organizationUnits} people={organizationPeople} currentUser={user} canManage={canManageAgents} canDeleteLegacy={access.isDeveloper} /></section>}
        </main>

        <RaModal isOpen={isRaModalOpen} onClose={() => setIsRaModalOpen(false)} caseToEdit={raCaseToEdit} currentUser={user} />
        <VisitModal isOpen={isVisitModalOpen} onClose={() => setIsVisitModalOpen(false)} visitToEdit={visitToEdit} currentUser={user} />
        <AgentManagerModal isOpen={isAgentManagerOpen} onClose={() => setIsAgentManagerOpen(false)} agents={occurrenceAgents} currentUser={user} />
        <AccessControlModal isOpen={isAccessControlOpen} onClose={() => setIsAccessControlOpen(false)} profiles={accessProfiles} units={organizationUnits} agents={occurrenceAgents} currentUser={user} />
        <IsaChatModal isOpen={isIsaChatOpen} onClose={() => setIsIsaChatOpen(false)} cases={access.isDeveloper ? cases : []} raCases={visibleRaCases} visits={visits} occurrences={visibleOccurrences} extraCosts={visibleCosts} organizationUnits={visibleOrganizationUnits} organizationPeople={organizationPeople} />
      </div>
    </div>
  );
}
