import { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  ArchiveRestore,
  Building2,
  CircleDollarSign,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Network,
  Plus,
  RefreshCw,
  Settings2,
  Sparkles,
} from 'lucide-react';
import {
  auth,
  collection,
  db,
  doc,
  onAuthStateChanged,
  onSnapshot,
  orderBy,
  query,
  signOut,
} from './lib/firebase';
import { isAuthorizedEmail } from './lib/auth';
import { cn } from './lib/utils';
import { DEFAULT_OCCURRENCE_AGENTS } from './lib/occurrences';
import { buildRaReport, openA4PrintWindow } from './lib/reportPrint';
import {
  CXCase,
  ExtraCost,
  IntegratorVisit,
  Occurrence,
  OrganizationUnit,
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
import VisitModal from './components/VisitModal';
import VisitsView from './components/VisitsView';

type MainTab = AppSection;

const DEVELOPER_EMAIL = 'guilhermebarbosars@gmail.com';
const ALL_TABS: MainTab[] = ['visao-geral', 'ocorrencias', 'custos', 'ra', 'visitas', 'estrutura'];

const ISA_LOGO = 'https://res.cloudinary.com/dsctpzqvy/image/upload/v1776894141/I_matvg6.png';
const FOTUS_LOGO = 'https://res.cloudinary.com/dsctpzqvy/image/upload/v1787848825/ChatGPT_Image_27_de_ago._de_2026_13_40_18_tzgwxs.png';
const RA_LOGO = 'https://res.cloudinary.com/dsctpzqvy/image/upload/v1787843527/25-reclame_mnxv8n.png';

function raScoreOnTen(value: number) {
  return value > 10 ? value / 10 : value;
}

function isLegacyDemoCase(caseItem: CXCase) {
  const content = [
    caseItem.orderNumber,
    caseItem.productCode,
    caseItem.assigneeName,
    caseItem.departmentAssigneeName,
    caseItem.observations,
  ].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');

  return [
    '197010-88',
    '192716-98',
    'batt-lfp-5.12kwh',
    'mod-can-550w',
    'marcelo fotus',
    'fernanda souza',
    'teste1',
  ].some((marker) => content.includes(marker));
}

const TAB_COPY: Record<MainTab, { title: string; subtitle: string }> = {
  'visao-geral': { title: 'Visão Geral', subtitle: 'Resumo visual das informações que você tem permissão para acompanhar' },
  ocorrencias: { title: 'Controle de Ocorrências', subtitle: 'Acompanhamento interativo das ocorrências antes controladas por planilha' },
  custos: { title: 'Custo Extra', subtitle: 'Controle dos gastos não previstos por pedido, regional, origem e responsabilidade' },
  ra: { title: 'Painel Reclame Aqui', subtitle: 'Monitoramento das reclamações, indicadores e resolução' },
  visitas: { title: 'Visitas de Integradores', subtitle: 'Agenda, recepção e acompanhamento dos parceiros' },
  estrutura: { title: 'Estrutura Organizacional', subtitle: 'Cadastro dos times, regionais, gerentes e lideranças responsáveis' },
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTab>('visao-geral');
  const [cases, setCases] = useState<CXCase[]>([]);
  const [raCases, setRaCases] = useState<RACase[]>([]);
  const [visits, setVisits] = useState<IntegratorVisit[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [extraCosts, setExtraCosts] = useState<ExtraCost[]>([]);
  const [organizationUnits, setOrganizationUnits] = useState<OrganizationUnit[]>([]);
  const [occurrenceAgents, setOccurrenceAgents] = useState<string[]>(DEFAULT_OCCURRENCE_AGENTS);
  const [accessProfiles, setAccessProfiles] = useState<UserAccessProfile[]>([]);
  const [dataError, setDataError] = useState('');

  const [isRaModalOpen, setIsRaModalOpen] = useState(false);
  const [raCaseToEdit, setRaCaseToEdit] = useState<RACase | null>(null);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [visitToEdit, setVisitToEdit] = useState<IntegratorVisit | null>(null);
  const [isIsaChatOpen, setIsIsaChatOpen] = useState(false);
  const [isAgentManagerOpen, setIsAgentManagerOpen] = useState(false);
  const [isAccessControlOpen, setIsAccessControlOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [raReportMessage, setRaReportMessage] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && !isAuthorizedEmail(currentUser.email)) {
        await signOut(auth);
        setUser(null);
      } else {
        setUser(currentUser);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setDataError('');
    const handleSnapshotError = (error: unknown) => {
      console.error('Erro ao ler dados do Firestore:', error);
      setDataError('Não foi possível ler todos os dados. Publique as regras atualizadas do Firestore e recarregue a página.');
    };

    const unsubVisits = onSnapshot(query(collection(db, 'integrator_visits'), orderBy('createdAt', 'desc')), (snapshot) => {
      const stored = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as IntegratorVisit[];
      setVisits(stored.filter((item) => Boolean(item.createdByEmail)));
    }, handleSnapshotError);

    const unsubOccurrences = onSnapshot(query(collection(db, 'occurrences'), orderBy('createdAt', 'desc')), (snapshot) => {
      setOccurrences(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as Occurrence[]);
    }, handleSnapshotError);

    const unsubOrganization = onSnapshot(query(collection(db, 'organization_units'), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrganizationUnits(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as OrganizationUnit[]);
    }, handleSnapshotError);

    const unsubAgents = onSnapshot(doc(db, 'app_settings', 'occurrence_agents'), (snapshot) => {
      const names = snapshot.exists() ? snapshot.data().names : null;
      const cleanNames = Array.isArray(names)
        ? names.map((name) => String(name).replace(/\s+/g, ' ').trim()).filter(Boolean)
        : [];
      setOccurrenceAgents(cleanNames.length ? [...new Set(cleanNames)] : DEFAULT_OCCURRENCE_AGENTS);
    }, handleSnapshotError);

    const unsubAccess = onSnapshot(collection(db, 'user_access'), (snapshot) => {
      setAccessProfiles(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as UserAccessProfile[]);
    }, handleSnapshotError);

    return () => {
      unsubVisits();
      unsubOccurrences();
      unsubOrganization();
      unsubAgents();
      unsubAccess();
    };
  }, [user]);

  const access = useMemo(() => {
    const email = (user?.email || '').toLowerCase();
    const isDeveloper = email === DEVELOPER_EMAIL;
    if (isDeveloper) return { role: 'Administrador' as const, agentName: '', unitIds: organizationUnits.map((unit) => unit.id), tabs: ALL_TABS, active: true, isDeveloper };

    const profile = accessProfiles.find((item) => item.email.toLowerCase() === email);
    const inferredUnits = organizationUnits.filter((unit) => [unit.managerEmail, unit.leaderEmail, unit.coordinatorEmail || ''].some((value) => value.toLowerCase() === email));
    const inferredRole = inferredUnits.some((unit) => (unit.coordinatorEmail || '').toLowerCase() === email)
      ? 'Coordenador'
      : inferredUnits.some((unit) => unit.leaderEmail.toLowerCase() === email)
        ? 'Líder'
        : inferredUnits.some((unit) => unit.managerEmail.toLowerCase() === email)
          ? 'Gerente'
          : 'Agente';
    const role = profile?.role || inferredRole;
    const unitIds = profile?.organizationUnitIds?.length ? profile.organizationUnitIds : inferredUnits.map((unit) => unit.id);
    const defaultTabs: MainTab[] = role === 'Líder' || role === 'Coordenador' || role === 'Administrador'
      ? ['visao-geral', 'ocorrencias', 'visitas', 'estrutura']
      : ['visao-geral', 'ocorrencias', 'visitas'];
    return {
      role,
      agentName: profile?.agentName || user?.displayName || '',
      unitIds,
      tabs: profile?.visibleTabs?.length ? profile.visibleTabs : defaultTabs,
      active: profile?.active ?? true,
      isDeveloper,
    };
  }, [accessProfiles, organizationUnits, user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribers: Array<() => void> = [];
    const handleRestrictedError = (error: unknown) => {
      console.error('Erro ao ler área restrita:', error);
      setDataError('Não foi possível ler uma área liberada. Publique as regras atualizadas do Firestore e recarregue a página.');
    };

    if (access.isDeveloper) {
      unsubscribers.push(onSnapshot(query(collection(db, 'cx_cases'), orderBy('createdAt', 'desc')), (snapshot) => {
        const storedCases = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as CXCase[];
        setCases(storedCases.filter((caseItem) => !isLegacyDemoCase(caseItem)));
      }, handleRestrictedError));
    } else {
      setCases([]);
    }

    if (access.active && access.tabs.includes('ra')) {
      unsubscribers.push(onSnapshot(query(collection(db, 'ra_cases'), orderBy('createdAt', 'desc')), (snapshot) => {
        const stored = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as RACase[];
        setRaCases(stored.filter((item) => Boolean(item.createdByEmail)));
      }, handleRestrictedError));
    } else {
      setRaCases([]);
    }

    if (access.active && access.tabs.includes('custos')) {
      unsubscribers.push(onSnapshot(query(collection(db, 'extra_costs'), orderBy('createdAt', 'desc')), (snapshot) => {
        setExtraCosts(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as ExtraCost[]);
      }, handleRestrictedError));
    } else {
      setExtraCosts([]);
    }

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [access.active, access.isDeveloper, access.tabs.join('|'), user]);

  const accessibleAgentNames = useMemo(() => accessProfiles
    .filter((profile) => profile.active && profile.role === 'Agente' && (profile.organizationUnitIds || []).some((unitId) => access.unitIds.includes(unitId)))
    .map((profile) => profile.agentName || profile.displayName)
    .filter(Boolean), [access.unitIds, accessProfiles]);

  const visibleOccurrences = useMemo(() => {
    if (!access.active) return [];
    if (access.isDeveloper || access.role === 'Administrador') return occurrences;
    const email = (user?.email || '').toLowerCase();
    if (access.role === 'Agente') return occurrences.filter((item) => item.createdByEmail?.toLowerCase() === email || item.agentName?.localeCompare(access.agentName, 'pt-BR', { sensitivity: 'base' }) === 0);
    return occurrences.filter((item) => (item.organizationUnitId && access.unitIds.includes(item.organizationUnitId)) || accessibleAgentNames.some((name) => item.agentName?.localeCompare(name, 'pt-BR', { sensitivity: 'base' }) === 0));
  }, [access, accessibleAgentNames, occurrences, user?.email]);

  const visibleTabs = access.active ? access.tabs : ['visao-geral'] as MainTab[];
  const canView = (tab: MainTab) => visibleTabs.includes(tab);
  const visibleCosts = canView('custos') ? extraCosts : [];
  const visibleRaCases = canView('ra') ? raCases : [];
  const visibleOrganizationUnits = access.isDeveloper || access.role === 'Administrador' ? organizationUnits : organizationUnits.filter((unit) => access.unitIds.includes(unit.id));
  const canManageAgents = access.isDeveloper || ['Administrador', 'Coordenador', 'Líder'].includes(access.role);
  const scopeLabel = access.isDeveloper || access.role === 'Administrador' ? 'toda a empresa' : access.role === 'Agente' ? `somente ${access.agentName || 'seus próprios cards'}` : `times sob responsabilidade (${access.unitIds.length})`;

  useEffect(() => {
    if (user && !visibleTabs.includes(activeTab)) setActiveTab(visibleTabs[0] || 'visao-geral');
  }, [activeTab, user, visibleTabs.join('|')]);

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6]"><RefreshCw className="h-8 w-8 animate-spin text-[#385041]" /></div>;
  }

  if (!user) return <Auth />;

  const tabs: Array<{ id: MainTab; label: string; icon: typeof ClipboardList; alert?: boolean }> = [
    { id: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'ocorrencias', label: 'Ocorrências', icon: ClipboardList, alert: visibleOccurrences.some((item) => item.stage !== 'Finalizada') },
    { id: 'custos', label: 'Custo Extra', icon: CircleDollarSign, alert: visibleCosts.some((item) => item.totalCost > 1000) },
    { id: 'ra', label: 'Reclame Aqui', icon: ArchiveRestore, alert: visibleRaCases.some((item) => item.status === 'Aberto') },
    { id: 'visitas', label: 'Visitas', icon: Building2, alert: visits.some((item) => item.status === 'Agendada') },
    { id: 'estrutura', label: 'Estrutura', icon: Network, alert: organizationUnits.length === 0 },
  ].filter((tab) => canView(tab.id));

  const scoreCases = visibleRaCases.filter((item) => typeof item.finalScore === 'number');
  const averageRaScore = scoreCases.length ? (scoreCases.reduce((sum, item) => sum + raScoreOnTen(item.finalScore || 0), 0) / scoreCases.length).toFixed(1) : null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#f8fbf8] via-[#f2f6f3] to-[#e8efe9] font-sans text-gray-900">
      <aside className="hidden w-20 shrink-0 flex-col items-center gap-5 border-r border-gray-200/80 bg-white/80 py-6 shadow-sm backdrop-blur-xl sm:flex">
        <img src={FOTUS_LOGO} alt="Fotus" className="mb-2 h-auto w-12 object-contain" />
        {tabs.map(({ id, label, icon: Icon, alert }) => (
          <button key={id} onClick={() => setActiveTab(id)} title={label} className={cn('relative rounded-2xl p-3 transition-all', activeTab === id ? 'bg-[#e8efe0] text-[#385041] shadow-sm ring-1 ring-[#385041]/10' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700')}>
            {id === 'ra' ? <img src={RA_LOGO} alt="Reclame Aqui" className="h-6 w-6 object-contain" /> : <Icon className="h-6 w-6" />}
            {alert && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500" />}
          </button>
        ))}
        <button onClick={() => setIsIsaChatOpen(true)} title="Abrir ISA" className="mt-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#385041] to-[#4e6d5b] p-1 text-white shadow-md transition-transform hover:scale-105"><img src={ISA_LOGO} alt="ISA" className="h-full w-full object-contain" /></button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/80 bg-white/75 px-4 py-3.5 shadow-sm backdrop-blur-xl sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3"><img src={FOTUS_LOGO} alt="Fotus" className="h-9 w-auto object-contain sm:hidden" /><div className="min-w-0"><h1 className="truncate text-base font-extrabold tracking-tight text-gray-950 sm:text-lg">{TAB_COPY[activeTab].title}</h1><p className="hidden truncate text-xs text-gray-500 md:block">{TAB_COPY[activeTab].subtitle}</p></div></div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => setIsIsaChatOpen(true)} className="flex items-center gap-2 rounded-2xl border border-[#385041]/20 bg-gradient-to-r from-[#eef6ec] to-[#e6f3eb] px-3 py-2 shadow-sm transition-all hover:shadow-md"><img src={ISA_LOGO} alt="ISA" className="h-6 w-6 object-contain" /><span className="hidden text-left sm:block"><strong className="block text-xs text-[#385041]">Falar com ISA</strong><small className="block text-[9px] text-gray-500">Relatórios do Hub</small></span><Sparkles className="hidden h-3.5 w-3.5 text-amber-500 sm:block" /></button>
              <div className="relative border-l border-gray-200 pl-2 sm:pl-3">
                <button type="button" onClick={() => setIsProfileMenuOpen((current) => !current)} className="flex items-center gap-2 rounded-xl p-1.5 text-left transition-colors hover:bg-gray-50" aria-expanded={isProfileMenuOpen}>
                  <div className="hidden text-right lg:block"><p className="text-xs font-bold text-gray-800">{user.displayName || user.email}</p><p className="text-[10px] text-gray-500">{access.role} · {user.email}</p></div>
                  {user.photoURL ? <img src={user.photoURL} alt="Abrir opções do perfil" className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-gray-200" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8efe0] text-xs font-bold text-[#385041] ring-1 ring-[#385041]/10">{user.email?.[0]?.toUpperCase()}</span>}
                </button>
                {isProfileMenuOpen && <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
                  <div className="rounded-xl bg-[#f4f8f2] p-3"><p className="text-xs font-extrabold text-gray-900">{user.displayName || user.email}</p><p className="mt-0.5 truncate text-[10px] text-gray-500">{user.email}</p><div className="mt-2 flex flex-wrap gap-1"><span className="rounded-full bg-[#385041] px-2 py-1 text-[8px] font-extrabold uppercase tracking-wide text-white">{access.role}</span><span className="rounded-full bg-white px-2 py-1 text-[8px] font-bold text-gray-500">{scopeLabel}</span></div></div>
                  {access.isDeveloper && <button type="button" onClick={() => { setIsProfileMenuOpen(false); setIsAccessControlOpen(true); }} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-[#385041] hover:bg-[#eef5eb]"><Settings2 className="h-4 w-4" /><span>Gerenciar visibilidade<small className="mt-0.5 block text-[9px] font-normal text-gray-500">Abas, funções, agentes e equipes</small></span></button>}
                  <button type="button" onClick={() => signOut(auth)} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Sair da conta</button>
                </div>}
              </div>
            </div>
          </div>

          <nav className="mt-3 flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 sm:hidden">
            {tabs.map(({ id, label }) => <button key={id} onClick={() => setActiveTab(id)} className={cn('shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold', activeTab === id ? 'bg-white text-[#385041] shadow-sm' : 'text-gray-500')}>{label}</button>)}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1560px] flex-1 px-4 py-5 sm:px-8 sm:py-6">
          {dataError && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">{dataError}</div>}

          {activeTab === 'visao-geral' && <OverviewView occurrences={visibleOccurrences} costs={visibleCosts} raCases={visibleRaCases} visits={access.active ? visits : []} scopeLabel={scopeLabel} canViewCosts={canView('custos')} canViewRa={canView('ra')} onNavigate={setActiveTab} />}

          {activeTab === 'ocorrencias' && <OccurrencesView occurrences={visibleOccurrences} organizationUnits={visibleOrganizationUnits} currentUser={user} agents={access.role === 'Agente' && access.agentName ? [access.agentName] : occurrenceAgents} canManageAgents={canManageAgents} onEditAgents={() => setIsAgentManagerOpen(true)} />}

          {activeTab === 'custos' && <ExtraCostsView costs={visibleCosts} currentUser={user} />}

          {activeTab === 'ra' && (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-100"><img src={RA_LOGO} alt="RA" className="h-7 w-7 object-contain" /></span><div><h2 className="text-base font-extrabold text-gray-950">Ocorrências Reclame Aqui</h2><p className="text-xs text-gray-500">{averageRaScore ? `Média dos casos avaliados: ${averageRaScore} / 10` : 'Nenhum caso avaliado ainda'}</p></div></div><div className="flex flex-col gap-2 sm:flex-row"><button onClick={() => { const opened = openA4PrintWindow('Relatório Estratégico RA', buildRaReport(visibleRaCases)); setRaReportMessage(opened ? 'Relatório A4 aberto para impressão ou salvamento em PDF.' : 'Permita pop-ups para abrir o relatório A4.'); window.setTimeout(() => setRaReportMessage(''), 6000); }} className="flex items-center justify-center gap-2 rounded-xl border border-[#123e5b]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#123e5b] hover:bg-[#eff5f8]"><FileText className="h-4 w-4" />Gerar relatório PDF</button><button onClick={() => { setRaCaseToEdit(null); setIsRaModalOpen(true); }} className="flex items-center justify-center gap-2 rounded-xl bg-[#385041] px-4 py-2.5 text-xs font-bold text-white"><Plus className="h-4 w-4" />Novo chamado RA</button></div></div>
              {raReportMessage && <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800"><FileText className="h-4 w-4 shrink-0" /><span>{raReportMessage}</span></div>}
              {visibleRaCases.length === 0 ? <EmptyState icon={ArchiveRestore} title="Nenhum chamado RA registrado" description="Os exemplos foram removidos. Registre o primeiro chamado real quando necessário." action="Abrir primeiro chamado" onAction={() => { setRaCaseToEdit(null); setIsRaModalOpen(true); }} /> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleRaCases.map((caseItem) => <article key={caseItem.id} onClick={() => { setRaCaseToEdit(caseItem); setIsRaModalOpen(true); }} className="cursor-pointer rounded-2xl border border-white/90 bg-white/80 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"><div className="mb-3 flex items-center justify-between"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold text-gray-700">{caseItem.status}</span>{typeof caseItem.finalScore === 'number' && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">Nota {raScoreOnTen(caseItem.finalScore).toFixed(1)}</span>}</div><p className="text-[10px] font-bold uppercase text-gray-400">ID Reclamação</p><h3 className="text-base font-extrabold text-gray-950">{caseItem.raNumber}</h3><div className="mt-3 rounded-xl bg-gray-50 p-3"><p className="text-xs font-bold text-gray-800">{caseItem.customerName}</p><p className="mt-0.5 truncate text-[11px] text-gray-500">{caseItem.phone || caseItem.email || 'Sem contato informado'}</p></div>{caseItem.information && <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-gray-500">{caseItem.information}</p>}</article>)}</div>}
            </div>
          )}

          {activeTab === 'visitas' && <VisitsView visits={access.active ? visits : []} onNewVisit={() => { setVisitToEdit(null); setIsVisitModalOpen(true); }} onEditVisit={(visit) => { setVisitToEdit(visit); setIsVisitModalOpen(true); }} />}
          {activeTab === 'estrutura' && <OrganizationView units={organizationUnits} currentUser={user} />}
        </main>

        <RaModal isOpen={isRaModalOpen} onClose={() => setIsRaModalOpen(false)} caseToEdit={raCaseToEdit} currentUser={user} />
        <VisitModal isOpen={isVisitModalOpen} onClose={() => setIsVisitModalOpen(false)} visitToEdit={visitToEdit} currentUser={user} />
        <AgentManagerModal isOpen={isAgentManagerOpen} onClose={() => setIsAgentManagerOpen(false)} agents={occurrenceAgents} currentUser={user} />
        <AccessControlModal isOpen={isAccessControlOpen} onClose={() => setIsAccessControlOpen(false)} profiles={accessProfiles} units={organizationUnits} agents={occurrenceAgents} currentUser={user} />
        <IsaChatModal isOpen={isIsaChatOpen} onClose={() => setIsIsaChatOpen(false)} cases={access.isDeveloper ? cases : []} raCases={visibleRaCases} visits={access.active ? visits : []} occurrences={visibleOccurrences} extraCosts={visibleCosts} organizationUnits={visibleOrganizationUnits} />
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action, onAction }: { icon: typeof ArchiveRestore; title: string; description: string; action: string; onAction: () => void }) {
  return <div className="rounded-3xl border border-dashed border-gray-300 bg-white/60 px-6 py-16 text-center"><Icon className="mx-auto h-12 w-12 text-gray-300" /><h3 className="mt-4 text-base font-extrabold text-gray-800">{title}</h3><p className="mx-auto mt-1 max-w-lg text-xs text-gray-500">{description}</p><button onClick={onAction} className="mt-5 rounded-xl bg-[#385041] px-4 py-2.5 text-xs font-bold text-white">{action}</button></div>;
}
