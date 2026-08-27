import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot, User as UserIcon, RefreshCw, ArrowRight, Zap, TrendingDown, Clock, Building2 } from 'lucide-react';
import { CXCase, RACase, IntegratorVisit } from '../types';

interface IsaChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: CXCase[];
  raCases: RACase[];
  visits: IntegratorVisit[];
}

interface Message {
  id: string;
  sender: 'user' | 'isa';
  text: string;
  timestamp: Date;
  suggestions?: string[];
}

const ISA_LOGO = "https://res.cloudinary.com/dsctpzqvy/image/upload/v1776894141/I_matvg6.png";

export default function IsaChatModal({ isOpen, onClose, cases, raCases, visits }: IsaChatModalProps) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'isa',
      text: 'Olá! Sou a **ISA**, a inteligência artificial do setor de **CX, Reclame Aqui & Visitas da Fotus**. Estou aqui para analisar casos, calcular impactos de custos extras, verificar encaminhamentos de setores e acompanhar as visitas dos nossos integradores. Como posso te ajudar agora?',
      timestamp: new Date(),
      suggestions: [
        '📊 Resumo dos custos extras do CX',
        '🚚 Casos pendentes na Logística',
        '🏢 Próximas visitas de integradores',
        '⭐ Visão geral do Reclame Aqui'
      ]
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 150);
    }
  }, [isOpen, messages, isTyping]);

  if (!isOpen) return null;

  // Contextual Analytics Engine
  const generateIsaResponse = (query: string): { text: string; suggestions?: string[] } => {
    const q = query.toLowerCase();

    // 1. Custos extras
    if (q.includes('custo') || q.includes('extra') || q.includes('gasto') || q.includes('prejuízo') || q.includes('financeiro')) {
      const totalExtra = cases.reduce((acc, c) => acc + (c.totalExtraCost || 0), 0);
      const casesWithCost = cases.filter(c => (c.totalExtraCost || 0) > 0);
      
      let breakdown = casesWithCost.slice(0, 3).map(c => 
        `• **Pedido ${c.orderNumber}** (${c.productCode}): R$ ${(c.totalExtraCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - _${c.extraCostReason || 'Custos diversos'}_ [Setor: ${c.targetDepartment || 'Não definido'}]`
      ).join('\n');

      return {
        text: `💰 **Diagnóstico de Custos Extras no CX Fotus:**\n\n` +
          `• **Total Acumulado:** **R$ ${totalExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**\n` +
          `• **Casos com Custo Extra:** ${casesWithCost.length} de ${cases.length} casos\n\n` +
          `**Principais casos recentes com impacto financeiro:**\n${breakdown || 'Nenhum custo extra crítico registrado no momento.'}\n\n` +
          `💡 *Recomendação:* Recomendo acionar o setor **Financeiro** e **Liderança** para acelerar o ressarcimento junto às transportadoras nos casos de avaria de módulos.`,
        suggestions: ['Casos da Liderança', 'Ver visitas de integradores', 'Quais casos estão abertos?']
      };
    }

    // 2. Logística
    if (q.includes('logística') || q.includes('logistica') || q.includes('frete') || q.includes('transporte') || q.includes('rastreio')) {
      const logCases = cases.filter(c => c.targetDepartment === 'Logística');
      const openLog = logCases.filter(c => c.status !== 'Resolvido' && c.status !== 'Cancelado');

      return {
        text: `🚚 **Panorama do Setor de Logística:**\n\n` +
          `• **Total de casos direcionados:** ${logCases.length}\n` +
          `• **Casos em aberto/andamento:** ${openLog.length}\n` +
          `• **Responsáveis de contato:** Rafael Lima, Amanda Castro e Thiago Fretes\n\n` +
          `${openLog.length > 0 ? `**Casos prioritários:**\n` + openLog.map(c => `• Pedido **${c.orderNumber}** (${c.status}) - ${c.productCode} (Qtd: ${c.quantity})`).join('\n') : '✅ Não há pendências críticas na fila da Logística no momento.'}`,
        suggestions: ['Resumo dos custos extras', 'Casos do Suporte Técnico', 'Listar todos os casos abertos']
      };
    }

    // 3. Suporte Técnico / Engenharia
    if (q.includes('suporte') || q.includes('técnico') || q.includes('tecnico') || q.includes('inversor') || q.includes('garantia') || q.includes('engenharia')) {
      const techCases = cases.filter(c => c.targetDepartment === 'Suporte Técnico');
      return {
        text: `🔧 **Panorama do Suporte Técnico & Garantias:**\n\n` +
          `• **Casos sob análise técnica:** ${techCases.length}\n` +
          `• **Especialistas responsáveis:** Diego Ramos (Aplicação Solar) e Larissa Matos (Inversores Híbridos)\n\n` +
          `Os protocolos envolvem testes em bancada, análise de logs de inversores (Deye, Hoymiles, Growatt) e homologação de trocas em garantia.`,
        suggestions: ['Casos da Diretoria', 'Próximas visitas', 'Custos extras']
      };
    }

    // 4. Visitas de Integradores
    if (q.includes('visita') || q.includes('integrador') || q.includes('visitas') || q.includes('fábrica') || q.includes('empresa') || q.includes('agenda')) {
      const upcoming = visits.filter(v => v.status === 'Agendada' || v.status === 'Em Andamento');
      return {
        text: `🏢 **Agenda de Visitas de Integradores à Fotus:**\n\n` +
          `• **Visitas ativas no radar:** ${upcoming.length} de ${visits.length} cadastradas\n\n` +
          upcoming.map(v => 
            `📅 **${v.visitDate} ${v.visitTime ? `às ${v.visitTime}` : ''}** - **${v.integratorName}**\n` +
            `• Contato: ${v.contactPerson} (${v.cityState || 'Brasil'})\n` +
            `• Anfitrião Fotus: **${v.hostName}** | Status: **${v.status}**\n` +
            `• Objetivo: _${v.objective}_\n`
          ).join('\n') || 'Nenhuma visita agendada para os próximos dias.',
        suggestions: ['Como cadastrar uma visita?', 'Casos do Reclame Aqui', 'Resumo de custos extras']
      };
    }

    // 5. Reclame Aqui
    if (q.includes('reclame') || q.includes('ra') || q.includes('nota') || q.includes('reputação') || q.includes('reputacao')) {
      const openRa = raCases.filter(r => r.status === 'Aberto' || r.status === 'Em Andamento');
      const scored = raCases.filter(r => typeof r.finalScore === 'number');
      const avgScore = scored.length ? (scored.reduce((acc, r) => acc + (r.finalScore || 0), 0) / scored.length).toFixed(1) : '8.5';

      return {
        text: `⭐ **Status do Reclame Aqui Fotus:**\n\n` +
          `• **Total de chamados RA:** ${raCases.length}\n` +
          `• **Chamados em aberto:** ${openRa.length}\n` +
          `• **Média da Nota Final:** **${avgScore} / 10**\n\n` +
          `💡 *Fórmula da Nota RA:* \`Nota = (Índice de Resposta × 2) + (Índice de Solução × 3) + (Voltaria a Fazer Negócio × 3) + (Nota do Consumidor × 2)\`.\n` +
          `Priorize responder casos abertos em menos de 2 horas para garantir selo RA1000!`,
        suggestions: ['Casos abertos de CX', 'Custos extras', 'Visitas de integradores']
      };
    }

    // 6. Setores em geral
    if (q.includes('setor') || q.includes('setores') || q.includes('direcionar') || q.includes('liderança') || q.includes('coordenação') || q.includes('diretoria')) {
      return {
        text: `🏢 **Mapeamento de Setores no Fotus Hub:**\n\n` +
          `1. **Logística:** Fretes, extravios e reposições físicas (Rafael Lima, Amanda Castro)\n` +
          `2. **Financeiro:** Estornos, NFs e faturamento (Carla Mendes, Bruno Torres)\n` +
          `3. **Suporte Técnico:** Análise de inversores e garantias (Diego Ramos, Larissa Matos)\n` +
          `4. **Diretoria:** Casos estratégicos e contas VIP (Marcelo Fotus, Patricia Rocha)\n` +
          `5. **Coordenação:** SLAs e fluxos de atendimento (Juliana Neves, Rodrigo Martins)\n` +
          `6. **Liderança:** Supervisão de qualidade e mediações (Fernanda Souza, Thiago Silva)\n\n` +
          `Você pode encaminhar qualquer caso CX diretamente no card ou abrindo o formulário!`,
        suggestions: ['Casos da Logística', 'Custos extras do CX', 'Próximas visitas']
      };
    }

    // Default intelligent response
    const openCount = cases.filter(c => c.status === 'Aberto').length;
    const progressCount = cases.filter(c => c.status === 'Em Andamento').length;
    const solvedCount = cases.filter(c => c.status === 'Resolvido').length;

    return {
      text: `Entendido! Analisando o panorama atual da Fotus:\n\n` +
        `• **Casos CX Ativos:** ${cases.length} (${openCount} abertos, ${progressCount} em andamento, ${solvedCount} resolvidos)\n` +
        `• **Reclame Aqui:** ${raCases.length} registros monitorados\n` +
        `• **Visitas de Integradores:** ${visits.length} visitas na base\n\n` +
        `Posso realizar triagens automáticas, detalhar custos de avaria, orientar sobre encaminhamento de setores ou consolidar relatórios. O que você gostaria de explorar?`,
      suggestions: [
        'Resumo dos custos extras',
        'Casos pendentes na Logística',
        'Próximas visitas de integradores',
        'Como funciona o encaminhamento?'
      ]
    };
  };

  const handleSend = (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    // Simulate fast realistic AI reasoning
    setTimeout(() => {
      const { text, suggestions } = generateIsaResponse(queryText);
      const isaMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'isa',
        text,
        timestamp: new Date(),
        suggestions
      };
      setMessages(prev => [...prev, isaMessage]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-2xl rounded-[2rem] border border-white/80 shadow-[0_20px_60px_rgba(0,0,0,0.18)] w-full max-w-2xl h-[88vh] max-h-[780px] overflow-hidden flex flex-col transition-all">
        
        {/* Soft, Pure Minimalist Gradient Header */}
        <div className="relative px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[#eef5eb] via-[#f8fbf6] to-[#e7f3ec] flex items-center justify-between overflow-hidden shrink-0">
          <div className="flex items-center gap-4 relative z-10">
            <div className="relative">
              <div className="w-13 h-13 rounded-2xl bg-white p-1 shadow-[0_4px_16px_rgba(56,80,65,0.12)] border border-white flex items-center justify-center overflow-hidden">
                <img 
                  src={ISA_LOGO} 
                  alt="ISA AI" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">ISA</h3>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-[#385041] text-white tracking-wider">
                  IA de CX & Visitas
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">Inteligência Operacional Fotus • Online</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMessages([{
                id: 'welcome',
                sender: 'isa',
                text: 'Olá! Conversa reiniciada. Em que posso te ajudar agora no Fotus Hub?',
                timestamp: new Date(),
                suggestions: [
                  '📊 Resumo dos custos extras do CX',
                  '🚚 Casos pendentes na Logística',
                  '🏢 Próximas visitas de integradores'
                ]
              }])}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white/60 rounded-xl transition-colors"
              title="Limpar conversa"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-700 hover:bg-white/60 rounded-xl p-2 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-gradient-to-b from-gray-50/50 via-white to-gray-50/30">
          {messages.map((m) => (
            <div 
              key={m.id} 
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} gap-1.5`}
            >
              <div className="flex items-end gap-2 max-w-[88%] sm:max-w-[80%]">
                {m.sender === 'isa' && (
                  <img 
                    src={ISA_LOGO} 
                    alt="ISA" 
                    className="w-7 h-7 rounded-xl object-contain bg-white shadow-xs border border-gray-100 shrink-0 mb-1" 
                  />
                )}
                
                <div 
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    m.sender === 'user' 
                      ? 'bg-[#385041] text-white rounded-br-xs shadow-sm font-medium' 
                      : 'bg-white border border-gray-200/70 text-gray-800 rounded-bl-xs shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-line break-words">
                    {m.text.split('\n').map((line, i) => {
                      if (line.startsWith('• ')) {
                        return <div key={i} className="ml-2 mb-1 flex items-start gap-1.5"><span>•</span><span>{line.substring(2)}</span></div>;
                      }
                      return <p key={i} className={line === '' ? 'h-2' : 'mb-1'}>{line}</p>;
                    })}
                  </div>
                </div>
              </div>

              {/* Suggestions chips if any */}
              {m.suggestions && m.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 ml-9 mt-1">
                  {m.suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(s)}
                      className="text-xs bg-white hover:bg-[#eef5eb] text-gray-700 hover:text-[#385041] border border-gray-200 hover:border-[#385041]/30 px-3 py-1.5 rounded-full transition-all flex items-center gap-1 shadow-2xs active:scale-95"
                    >
                      <span>{s}</span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2">
              <img 
                src={ISA_LOGO} 
                alt="ISA" 
                className="w-7 h-7 rounded-xl object-contain bg-white shadow-xs border border-gray-100 shrink-0" 
              />
              <div className="bg-white border border-gray-200/80 px-4 py-3 rounded-2xl rounded-bl-xs flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#385041] animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-[#385041] animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-[#385041] animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-gray-100 bg-white shrink-0">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 bg-gray-50 border border-gray-200/80 rounded-2xl p-1.5 focus-within:bg-white focus-within:border-[#385041] focus-within:ring-2 focus-within:ring-[#385041]/10 transition-all shadow-inner"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte à ISA sobre casos CX, custos extras, setores ou visitas..."
              className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 rounded-xl bg-[#385041] hover:bg-[#2c4033] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shadow-sm shrink-0 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
