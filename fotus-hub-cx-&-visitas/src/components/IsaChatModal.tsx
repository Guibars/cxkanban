import { useEffect, useRef, useState } from 'react';
import { ArrowRight, RefreshCw, Send, Sparkles, X } from 'lucide-react';
import { CXCase, ExtraCost, IntegratorVisit, Occurrence, OrganizationUnit, RACase } from '../types';

interface IsaChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: CXCase[];
  raCases: RACase[];
  visits: IntegratorVisit[];
  occurrences: Occurrence[];
  extraCosts: ExtraCost[];
  organizationUnits: OrganizationUnit[];
}

interface Message {
  id: string;
  sender: 'user' | 'isa';
  text: string;
  suggestions?: string[];
}

const ISA_LOGO = 'https://res.cloudinary.com/dsctpzqvy/image/upload/v1776894141/I_matvg6.png';

function rank(items: string[], limit = 3) {
  const counts = new Map<string, { label: string; count: number }>();
  items.forEach((value) => {
    const label = value?.trim();
    if (!label) return;
    const key = label.toLocaleUpperCase('pt-BR');
    const current = counts.get(key);
    counts.set(key, { label: current?.label || label, count: (current?.count || 0) + 1 });
  });
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

function rankingText(title: string, items: Array<{ label: string; count: number }>) {
  if (!items.length) return `${title}: sem dados cadastrados.`;
  return `${title}:\n${items.map((item, index) => `• ${index + 1}º ${item.label} — ${item.count}`).join('\n')}`;
}

function costRankingText(title: string, costs: ExtraCost[], selector: (cost: ExtraCost) => string) {
  const grouped = new Map<string, { label: string; total: number; count: number }>();
  costs.forEach((cost) => {
    const label = selector(cost).trim();
    if (!label) return;
    const key = label.toLocaleUpperCase('pt-BR');
    const current = grouped.get(key);
    grouped.set(key, { label: current?.label || label, total: (current?.total || 0) + cost.totalCost, count: (current?.count || 0) + 1 });
  });
  const ranked = [...grouped.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  if (!ranked.length) return `${title}: sem dados cadastrados.`;
  return `${title}:\n${ranked.map((item, index) => `• ${index + 1}º ${item.label} — ${item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${item.count})`).join('\n')}`;
}

export default function IsaChatModal({ isOpen, onClose, cases, raCases, visits, occurrences, extraCosts, organizationUnits }: IsaChatModalProps) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'isa',
      text: 'Olá! Sou a ISA. Posso consolidar os dados reais de Casos CX, Controle de Ocorrências, Custo Extra, Reclame Aqui, Visitas e Estrutura Organizacional. O que você quer analisar?',
      suggestions: ['Relatório de custos extras', 'Relatório geral de ocorrências', 'Resumo de todas as abas', 'Como estão os direcionamentos?'],
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, messages, isTyping]);

  if (!isOpen) return null;

  const occurrencesReport = () => {
    const finalized = occurrences.filter((item) => item.stage === 'Finalizada').length;
    const open = occurrences.length - finalized;
    const approved = occurrences.filter((item) => item.approvalStatus === 'Aprovado').length;
    const rejected = occurrences.filter((item) => item.approvalStatus === 'Reprovado').length;
    const pending = occurrences.filter((item) => item.approvalStatus === 'Pendente').length;
    const completionRate = occurrences.length ? Math.round((finalized / occurrences.length) * 100) : 0;
    return `📊 Relatório do Controle de Ocorrências\n\n` +
      `• Total de cards: ${occurrences.length}\n` +
      `• Em aberto: ${open}\n` +
      `• Finalizados: ${finalized} (${completionRate}%)\n` +
      `• Aprovados: ${approved}\n` +
      `• Reprovados: ${rejected}\n` +
      `• Aguardando decisão: ${pending}\n\n` +
      `${rankingText('Transportadoras mais citadas', rank(occurrences.map((item) => item.carrier)))}\n\n` +
      `${rankingText('Produtos com maior volume', rank(occurrences.map((item) => item.product)))}\n\n` +
      `${rankingText('Regiões com mais ocorrências', rank(occurrences.map((item) => item.region)))}`;
  };

  const generateResponse = (question: string) => {
    const query = question.toLocaleLowerCase('pt-BR');

    if (query.includes('transportadora')) {
      return {
        text: `🚚 Análise de transportadoras\n\n${rankingText('Mais citadas nos cards', rank(occurrences.map((item) => item.carrier), 5))}\n\nBase analisada: ${occurrences.length} ocorrências cadastradas.`,
        suggestions: ['Relatório geral de ocorrências', 'Produtos mais citados', 'Regiões com mais ocorrências'],
      };
    }

    if (query.includes('produto') && !query.includes('custo')) {
      return {
        text: `📦 Análise de produtos\n\n${rankingText('Produtos com mais ocorrências', rank(occurrences.map((item) => item.product), 5))}\n\n${rankingText('Tipos de ocorrência', rank(occurrences.map((item) => item.occurrenceType), 5))}`,
        suggestions: ['Transportadoras mais citadas', 'Relatório geral de ocorrências'],
      };
    }

    if ((query.includes('região') || query.includes('regiao') || query.includes('uf')) && !query.includes('custo')) {
      return {
        text: `🗺️ Distribuição geográfica\n\n${rankingText('Regiões com mais ocorrências', rank(occurrences.map((item) => item.region), 5))}\n\n${rankingText('Estados mais citados', rank(occurrences.map((item) => item.state), 8))}`,
        suggestions: ['Relatório geral de ocorrências', 'Transportadoras mais citadas'],
      };
    }

    if (query.includes('ocorrência') || query.includes('ocorrencia') || ((query.includes('relatório') || query.includes('relatorio')) && !query.includes('custo'))) {
      return {
        text: occurrencesReport(),
        suggestions: ['Transportadoras mais citadas', 'Produtos mais citados', 'Resumo de todas as abas'],
      };
    }

    if ((query.includes('estrutura') || query.includes('direcionamento') || query.includes('gerente') || query.includes('liderança') || query.includes('lideranca') || query.includes('regional')) && !query.includes('custo')) {
      const activeUnits = organizationUnits.filter((unit) => unit.active);
      const routedCases = cases.filter((item) => item.organizationUnitId).length;
      const routedOccurrences = occurrences.filter((item) => item.organizationUnitId).length;
      return {
        text: `🧭 Estrutura e direcionamentos\n\n` +
          `• Times ativos: ${activeUnits.length}\n` +
          `• Regionais cadastradas: ${new Set(activeUnits.map((item) => item.regional)).size}\n` +
          `• Casos CX direcionados: ${routedCases} de ${cases.length}\n` +
          `• Ocorrências direcionadas: ${routedOccurrences} de ${occurrences.length}\n\n` +
          (activeUnits.length ? activeUnits.slice(0, 8).map((unit) => `• ${unit.department} / ${unit.teamName} / ${unit.regional}: ${unit.managerName} → liderança ${unit.leaderName}`).join('\n') : 'Nenhum time foi cadastrado ainda.'),
        suggestions: ['Resumo de todas as abas', 'Casos CX em aberto'],
      };
    }

    if (query.includes('custo') || query.includes('financeiro') || query.includes('prejuízo') || query.includes('prejuizo')) {
      const total = extraCosts.reduce((sum, item) => sum + item.totalCost, 0);
      const average = extraCosts.length ? total / extraCosts.length : 0;
      const commercial = extraCosts.filter((item) => item.responsible === 'Comercial').reduce((sum, item) => sum + item.totalCost, 0);
      const customer = extraCosts.filter((item) => item.responsible === 'Cliente').reduce((sum, item) => sum + item.totalCost, 0);
      return {
        text: `💰 Relatório de Custos Extras\n\n` +
          `• Total gasto: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n` +
          `• Registros: ${extraCosts.length}\n` +
          `• Custo médio: ${average.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n` +
          `• Responsabilidade Comercial: ${commercial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n` +
          `• Responsabilidade Cliente: ${customer.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n\n` +
          `${costRankingText('Regionais com maior custo', extraCosts, (item) => item.regional)}\n\n` +
          `${costRankingText('Origens com maior custo', extraCosts, (item) => item.origin)}\n\n` +
          `${costRankingText('Categorias com maior custo', extraCosts, (item) => item.reasonCategory)}`,
        suggestions: ['Resumo de todas as abas', 'Relatório geral de ocorrências'],
      };
    }

    if (query.includes('caso') || query.includes('cx')) {
      const open = cases.filter((item) => item.status === 'Aberto').length;
      const progress = cases.filter((item) => item.status === 'Em Andamento').length;
      const resolved = cases.filter((item) => item.status === 'Resolvido').length;
      return { text: `🎧 Casos CX\n\n• Total: ${cases.length}\n• Abertos: ${open}\n• Em andamento: ${progress}\n• Resolvidos: ${resolved}\n• Sem direcionamento: ${cases.filter((item) => !item.organizationUnitId).length}`, suggestions: ['Custos extras', 'Como estão os direcionamentos?', 'Resumo de todas as abas'] };
    }

    if (query.includes('reclame') || query.includes('ra')) {
      const open = raCases.filter((item) => item.status === 'Aberto' || item.status === 'Em Andamento').length;
      const scored = raCases.filter((item) => typeof item.finalScore === 'number');
      const average = scored.length ? (scored.reduce((sum, item) => sum + (item.finalScore || 0), 0) / scored.length).toFixed(1) : 'sem notas';
      return { text: `⭐ Reclame Aqui\n\n• Registros: ${raCases.length}\n• Em aberto ou andamento: ${open}\n• Média dos registros avaliados: ${average}${scored.length ? ' / 10' : ''}`, suggestions: ['Resumo de todas as abas', 'Relatório geral de ocorrências'] };
    }

    if (query.includes('visita') || query.includes('integrador')) {
      const active = visits.filter((item) => item.status === 'Agendada' || item.status === 'Em Andamento');
      return { text: `🏢 Visitas de integradores\n\n• Total cadastrado: ${visits.length}\n• Agendadas ou em andamento: ${active.length}\n\n${active.slice(0, 6).map((item) => `• ${item.visitDate}${item.visitTime ? ` às ${item.visitTime}` : ''} — ${item.integratorName} (${item.status})`).join('\n') || 'Nenhuma visita ativa.'}`, suggestions: ['Resumo de todas as abas', 'Como estão os direcionamentos?'] };
    }

    return {
      text: `✨ Resumo de todas as abas\n\n` +
        `• Casos CX: ${cases.length}\n` +
        `• Controle de Ocorrências: ${occurrences.length}\n` +
        `• Custos Extras: ${extraCosts.length} (${extraCosts.reduce((sum, item) => sum + item.totalCost, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})\n` +
        `• Reclame Aqui: ${raCases.length}\n` +
        `• Visitas: ${visits.length}\n` +
        `• Times na estrutura: ${organizationUnits.filter((item) => item.active).length}\n\n` +
        `Posso detalhar ocorrências, transportadoras, produtos, regiões, custos extras, direcionamentos, RA ou visitas.`,
      suggestions: ['Relatório de custos extras', 'Relatório geral de ocorrências', 'Como estão os direcionamentos?'],
    };
  };

  const handleSend = (suggestion?: string) => {
    const question = (suggestion || input).trim();
    if (!question) return;
    setMessages((current) => [...current, { id: `${Date.now()}-user`, sender: 'user', text: question }]);
    if (!suggestion) setInput('');
    setIsTyping(true);
    window.setTimeout(() => {
      const response = generateResponse(question);
      setMessages((current) => [...current, { id: `${Date.now()}-isa`, sender: 'isa', ...response }]);
      setIsTyping(false);
    }, 450);
  };

  const resetMessages = () => setMessages([{ id: 'welcome-reset', sender: 'isa', text: 'Conversa reiniciada. Qual análise você quer fazer com os dados atuais?', suggestions: ['Relatório geral de ocorrências', 'Resumo de todas as abas'] }]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-md sm:p-6">
      <div className="flex h-[88vh] max-h-[780px] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white bg-white/95 shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-[#eef5eb] via-white to-[#e7f3ec] px-5 py-4">
          <div className="flex items-center gap-3"><div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1 shadow-sm"><img src={ISA_LOGO} alt="ISA" className="h-full w-full object-contain" /><span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" /></div><div><div className="flex items-center gap-2"><h2 className="font-extrabold text-gray-950">ISA</h2><span className="rounded-full bg-[#385041] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">Dados do Hub</span></div><p className="text-xs text-gray-500">Análises em tempo real das abas conectadas</p></div></div>
          <div className="flex gap-1"><button onClick={resetMessages} className="rounded-xl p-2 text-gray-400 hover:bg-white hover:text-gray-700" title="Limpar conversa"><RefreshCw className="h-4 w-4" /></button><button onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-white hover:text-gray-700" title="Fechar"><X className="h-5 w-5" /></button></div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white p-5 sm:p-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[88%] whitespace-pre-line rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${message.sender === 'user' ? 'rounded-br-sm bg-[#385041] font-medium text-white' : 'rounded-bl-sm border border-gray-200 bg-white text-gray-700'}`}>{message.text}</div>
              {message.suggestions && <div className="mt-2 flex max-w-[90%] flex-wrap gap-1.5">{message.suggestions.map((suggestion) => <button key={suggestion} onClick={() => handleSend(suggestion)} className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:border-[#385041]/30 hover:bg-[#eef5eb] hover:text-[#385041]">{suggestion}<ArrowRight className="h-3 w-3" /></button>)}</div>}
            </div>
          ))}
          {isTyping && <div className="inline-flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm"><Sparkles className="h-4 w-4 animate-pulse text-[#385041]" /><span className="h-2 w-2 animate-bounce rounded-full bg-[#385041]" /><span className="h-2 w-2 animate-bounce rounded-full bg-[#385041] [animation-delay:0.15s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-[#385041] [animation-delay:0.3s]" /></div>}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={(event) => { event.preventDefault(); handleSend(); }} className="border-t border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1.5 focus-within:border-[#385041] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#385041]/10"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Peça um relatório ou faça uma pergunta sobre os dados..." className="flex-1 bg-transparent px-3 py-2 text-sm outline-none" /><button type="submit" disabled={!input.trim() || isTyping} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#385041] text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></div>
        </form>
      </div>
    </div>
  );
}
