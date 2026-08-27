import React, { useEffect, useState, useMemo } from 'react';
import { 
  LogOut, 
  Plus, 
  Search, 
  RefreshCw, 
  ArchiveRestore, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Headset, 
  Building2, 
  Sparkles,
  CalendarCheck,
  Sparkle
} from 'lucide-react';
import { auth, db, signOut, collection, onSnapshot, query, orderBy } from './lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { CXCase, RACase, IntegratorVisit } from './types';
import { cn, formatDate } from './lib/utils';
import Auth from './components/Auth';
import CaseModal from './components/CaseModal';
import RaModal from './components/RaModal';
import VisitModal from './components/VisitModal';
import IsaChatModal from './components/IsaChatModal';
import CxKanbanView from './components/CxKanbanView';
import VisitsView from './components/VisitsView';
import { seedDemoData } from './lib/seedData';

type MainTab = 'cx' | 'ra' | 'visitas';

const ISA_LOGO = "https://res.cloudinary.com/dsctpzqvy/image/upload/v1776894141/I_matvg6.png";
const FOTUS_LOGO = "https://res.cloudinary.com/dsctpzqvy/image/upload/v1787848825/ChatGPT_Image_27_de_ago._de_2026_13_40_18_tzgwxs.png";
const RA_LOGO = "https://res.cloudinary.com/dsctpzqvy/image/upload/v1787843527/25-reclame_mnxv8n.png";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<MainTab>('cx');
  
  const [cases, setCases] = useState<CXCase[]>([]);
  const [raCases, setRaCases] = useState<RACase[]>([]);
  const [visits, setVisits] = useState<IntegratorVisit[]>([]);
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [caseToEdit, setCaseToEdit] = useState<CXCase | null>(null);
  
  const [isRaModalOpen, setIsRaModalOpen] = useState(false);
  const [raCaseToEdit, setRaCaseToEdit] = useState<RACase | null>(null);

  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [visitToEdit, setVisitToEdit] = useState<IntegratorVisit | null>(null);

  const [isIsaChatOpen, setIsIsaChatOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Subscribe to CX Cases
    const qCX = query(collection(db, 'cx_cases'), orderBy('createdAt', 'desc'));
    const unsubCX = onSnapshot(qCX, (snapshot) => {
      const casesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CXCase[];
      setCases(casesData);

      // Auto seed initial demo cases if empty
      if (snapshot.empty) {
        seedDemoData();
      }
    });

    // Subscribe to RA Cases
    const qRA = query(collection(db, 'ra_cases'), orderBy('createdAt', 'desc'));
    const unsubRA = onSnapshot(qRA, (snapshot) => {
      const raData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RACase[];
      setRaCases(raData);
    });

    // Subscribe to Integrator Visits
    const qVisits = query(collection(db, 'integrator_visits'), orderBy('createdAt', 'desc'));
    const unsubVisits = onSnapshot(qVisits, (snapshot) => {
      const visitsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as IntegratorVisit[];
      setVisits(visitsData);
    });

    return () => {
      unsubCX();
      unsubRA();
      unsubVisits();
    };
  }, [user]);

  const handleLogout = () => signOut(auth);

  const handleSeedData = async () => {
    await seedDemoData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aberto': return 'bg-yellow-50 text-yellow-700 border-yellow-200/60 shadow-sm';
      case 'Em Andamento': return 'bg-blue-50 text-blue-700 border-blue-200/60 shadow-sm';
      case 'Resolvido': return 'bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm';
      case 'Cancelado': return 'bg-gray-50 text-gray-600 border-gray-200/60 shadow-sm';
      default: return 'bg-gray-50 text-gray-700 border-gray-200/60 shadow-sm';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7f6]">
        <RefreshCw className="w-8 h-8 text-[#385041] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fbf8] via-[#f2f6f3] to-[#e8efe9] flex font-sans antialiased text-gray-900">
      
      {/* Lateral Toolbar */}
      <aside className="w-20 bg-white/80 backdrop-blur-xl border-r border-gray-200/80 flex flex-col items-center py-6 gap-6 z-40 hidden sm:flex shrink-0 shadow-xs">
        <div className="mb-2">
          <img 
            src={FOTUS_LOGO} 
            alt="Fotus Logo" 
            className="w-12 h-auto object-contain"
          />
        </div>

        {/* Tab 1: Casos CX */}
        <button 
          onClick={() => setActiveTab('cx')} 
          title="Casos CX" 
          className={cn(
            "p-3 rounded-2xl transition-all relative",
            activeTab === 'cx' 
              ? 'bg-[#e8efe0] text-[#385041] shadow-xs' 
              : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
          )}
        >
          <Headset className="w-6 h-6" />
          {cases.some(c => c.status === 'Aberto') && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full" />
          )}
        </button>

        {/* Tab 2: Reclame Aqui */}
        <button 
          onClick={() => setActiveTab('ra')} 
          title="Reclame Aqui" 
          className={cn(
            "p-3 rounded-2xl transition-all",
            activeTab === 'ra' 
              ? 'bg-[#e8efe0] shadow-xs ring-1 ring-[#385041]/20' 
              : 'hover:bg-gray-50 opacity-60 hover:opacity-100'
          )}
        >
          <img src={RA_LOGO} className="w-7 h-7 object-contain" alt="RA" />
        </button>

        {/* Tab 3: Visitas de Integradores */}
        <button 
          onClick={() => setActiveTab('visitas')} 
          title="Visitas de Integradores" 
          className={cn(
            "p-3 rounded-2xl transition-all relative",
            activeTab === 'visitas' 
              ? 'bg-[#e8efe0] text-[#385041] shadow-xs ring-1 ring-[#385041]/20' 
              : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
          )}
        >
          <Building2 className="w-6 h-6" />
          {visits.some(v => v.status === 'Agendada') && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />
          )}
        </button>

        {/* Bottom Quick ISA AI Trigger in sidebar */}
        <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col items-center">
          <button
            onClick={() => setIsIsaChatOpen(true)}
            title="Abrir Assistente ISA"
            className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#385041] to-[#4e6d5b] p-1 text-white shadow-md hover:scale-105 transition-all flex items-center justify-center group"
          >
            <img src={ISA_LOGO} alt="ISA" className="w-full h-full object-contain filter drop-shadow-xs" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Topbar */}
        <header className="bg-white/70 backdrop-blur-xl border-b border-white/80 shadow-[0_4px_30px_rgba(0,0,0,0.02)] px-5 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
          
          {/* Brand & Mobile Icon */}
          <div className="flex items-center gap-3">
            <img 
              src={FOTUS_LOGO} 
              alt="Fotus" 
              className="h-9 w-auto object-contain sm:hidden"
            />
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                {activeTab === 'cx' && 'Central de Casos CX'}
                {activeTab === 'ra' && 'Painel Reclame Aqui'}
                {activeTab === 'visitas' && 'Visitas de Integradores à Empresa'}
              </h1>
              <p className="text-xs text-gray-500 hidden md:block">
                {activeTab === 'cx' && 'Fluxo Kanban com direcionamento de setores e custos extras'}
                {activeTab === 'ra' && 'Monitoramento de reputação, índices IR, IS, MA, IN e resolução'}
                {activeTab === 'visitas' && 'Recepção, pautas técnicas e acompanhamento de parceiros'}
              </p>
            </div>
          </div>

          {/* Mobile Navigation Tabs (visible on small screens) */}
          <div className="flex sm:hidden items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('cx')}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", activeTab === 'cx' ? "bg-white text-[#385041] shadow-xs" : "text-gray-500")}
            >
              CX
            </button>
            <button
              onClick={() => setActiveTab('ra')}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", activeTab === 'ra' ? "bg-white text-[#385041] shadow-xs" : "text-gray-500")}
            >
              RA
            </button>
            <button
              onClick={() => setActiveTab('visitas')}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", activeTab === 'visitas' ? "bg-white text-[#385041] shadow-xs" : "text-gray-500")}
            >
              Visitas
            </button>
          </div>
          
          {/* Right Actions: ISA Button + User Profile */}
          <div className="flex items-center gap-3">
            
            {/* Top Button to Talk with ISA AI */}
            <button
              onClick={() => setIsIsaChatOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-[#eef6ec] via-[#f7faf5] to-[#e6f3eb] hover:from-[#e4f1e1] hover:to-[#dbede2] border border-[#385041]/20 shadow-xs hover:shadow-sm transition-all group active:scale-95"
            >
              <div className="w-6 h-6 rounded-xl bg-white p-0.5 shadow-2xs border border-white flex items-center justify-center overflow-hidden shrink-0">
                <img src={ISA_LOGO} alt="ISA" className="w-full h-full object-contain" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-extrabold text-[#385041]">Falar com ISA</span>
                  <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                </div>
                <span className="text-[10px] text-gray-500 font-medium leading-none block">IA de CX & Visitas</span>
              </div>
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200">
              <div className="flex flex-col items-end hidden lg:flex">
                <span className="text-xs font-bold text-gray-800">{user.displayName || 'Guilherme Barbosa'}</span>
                <span className="text-[10px] text-gray-500">{user.email}</span>
              </div>

              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-gray-200 shadow-xs" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#e8efe0] text-[#385041] flex items-center justify-center font-bold text-xs shadow-xs border border-white">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}

              <button 
                onClick={handleLogout} 
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" 
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-6">
          
          {/* TAB 1: CASOS CX (Kanban + Minimalist Cards + Sector Forwarding + Extra Costs) */}
          {activeTab === 'cx' && (
            <CxKanbanView
              cases={cases}
              onNewCase={() => {
                setCaseToEdit(null);
                setIsModalOpen(true);
              }}
              onEditCase={(c) => {
                setCaseToEdit(c);
                setIsModalOpen(true);
              }}
              onSeedDemoData={handleSeedData}
            />
          )}

          {/* TAB 2: RECLAME AQUI */}
          {activeTab === 'ra' && (
            <div className="space-y-6">
              
              {/* RA Top Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200">
                    <img src={RA_LOGO} className="w-6 h-6 object-contain" alt="RA" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Ocorrências Reclame Aqui</h3>
                    <p className="text-xs text-gray-500">Média geral: {(raCases.filter(r => typeof r.finalScore === 'number').reduce((acc, r) => acc + (r.finalScore || 0), 0) / (raCases.filter(r => typeof r.finalScore === 'number').length || 1)).toFixed(1)} / 10</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setRaCaseToEdit(null);
                    setIsRaModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-[#385041] hover:bg-[#2c4033] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all shrink-0 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Chamado RA</span>
                </button>
              </div>

              {/* RA Cards Grid */}
              {raCases.length === 0 ? (
                <div className="bg-white/50 backdrop-blur-md rounded-3xl border border-white p-12 text-center flex flex-col items-center justify-center">
                  <ArchiveRestore className="w-12 h-12 text-gray-300 mb-3" />
                  <h3 className="text-base font-bold text-gray-800 mb-1">Nenhum chamado RA registrado</h3>
                  <p className="text-xs text-gray-500 max-w-sm mb-4">
                    Registre os chamados do Reclame Aqui para monitorar a reputação e indicadores.
                  </p>
                  <button
                    onClick={() => {
                      setRaCaseToEdit(null);
                      setIsRaModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#385041] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#2c4033] transition-all"
                  >
                    Abrir Primeiro RA
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {raCases.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setRaCaseToEdit(c);
                        setIsRaModalOpen(true);
                      }}
                      className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all p-5 flex flex-col justify-between cursor-pointer group"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border", getStatusColor(c.status))}>
                            {c.status}
                          </span>
                          {typeof c.finalScore === 'number' && (
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Nota: {c.finalScore.toFixed(1)}
                            </span>
                          )}
                        </div>

                        <div className="mb-2">
                          <p className="text-[10px] uppercase font-bold text-gray-400">ID Reclamação</p>
                          <h4 className="text-base font-bold text-gray-900 group-hover:text-[#385041] transition-colors">
                            {c.raNumber}
                          </h4>
                        </div>

                        <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 mb-3 text-xs">
                          <p className="font-bold text-gray-800">{c.customerName}</p>
                          <p className="text-gray-500 mt-0.5 truncate">{c.phone || c.email || 'Sem contato'}</p>
                        </div>

                        {c.information && (
                          <p className="text-xs text-gray-500 line-clamp-2 mb-3 italic">
                            "{c.information}"
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                        <span>{new Date(c.createdAt).toLocaleDateString('pt-BR')}</span>
                        <span className="font-medium text-gray-600 truncate max-w-[120px]">
                          {c.assigneeName || 'Fotus CX'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VISITAS DE INTEGRADORES */}
          {activeTab === 'visitas' && (
            <VisitsView
              visits={visits}
              onNewVisit={() => {
                setVisitToEdit(null);
                setIsVisitModalOpen(true);
              }}
              onEditVisit={(v) => {
                setVisitToEdit(v);
                setIsVisitModalOpen(true);
              }}
              onSeedDemoData={handleSeedData}
            />
          )}

        </main>

        {/* Modals */}
        <CaseModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          caseToEdit={caseToEdit}
          currentUser={user}
        />
        
        <RaModal
          isOpen={isRaModalOpen}
          onClose={() => setIsRaModalOpen(false)}
          caseToEdit={raCaseToEdit}
          currentUser={user}
        />

        <VisitModal
          isOpen={isVisitModalOpen}
          onClose={() => setIsVisitModalOpen(false)}
          visitToEdit={visitToEdit}
          currentUser={user}
        />

        <IsaChatModal
          isOpen={isIsaChatOpen}
          onClose={() => setIsIsaChatOpen(false)}
          cases={cases}
          raCases={raCases}
          visits={visits}
        />

      </div>
    </div>
  );
}
