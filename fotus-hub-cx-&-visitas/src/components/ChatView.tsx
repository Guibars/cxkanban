import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { MessageCircle, RefreshCw, Search, Send, Users } from 'lucide-react';
import type { CurrentUser } from '../lib/currentUser';
import { loadChatMessages, loadChatPeople, sendChatMessage, type ChatMessage, type ChatPerson } from '../lib/chat';

interface ChatViewProps {
  currentUser: CurrentUser;
  active: boolean;
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, message));
  return [...byId.values()].sort((a, b) => {
    const left = BigInt(a.id);
    const right = BigInt(b.id);
    return left < right ? -1 : left > right ? 1 : 0;
  });
}

function messageTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function ChatView({ currentUser, active }: ChatViewProps) {
  const [people, setPeople] = useState<ChatPerson[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [selected, setSelected] = useState('general');
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const latestId = useRef('0');
  const lastActivity = useRef(Date.now());
  const selectedRef = useRef(selected);
  const listRef = useRef<HTMLDivElement>(null);
  const pollBusy = useRef(false);

  const selectedPerson = people.find((person) => person.id === selected);
  const recipientId = selected === 'general' ? null : selected;
  const filteredPeople = people.filter((person) =>
    `${person.displayName} ${person.email}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')),
  );
  const touch = () => {
    lastActivity.current = Date.now();
    setPaused(false);
  };

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setPeopleLoading(true);
    void loadChatPeople(currentUser)
      .then((result) => { if (!cancelled) setPeople(result); })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Não foi possível listar as pessoas.'); })
      .finally(() => { if (!cancelled) setPeopleLoading(false); });
    return () => { cancelled = true; };
  }, [active, currentUser]);

  useEffect(() => { setDraft(''); }, [selected]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let initialized = false;
    selectedRef.current = selected;
    latestId.current = '0';
    lastActivity.current = Date.now();
    setPaused(false);
    setMessages([]);
    setHasOlder(false);
    setLoading(true);
    setError('');

    const currentRecipient = selected === 'general' ? null : selected;
    void loadChatMessages(currentUser, currentRecipient)
      .then((result) => {
        if (cancelled) return;
        setMessages(result);
        setHasOlder(result.length === 50);
        latestId.current = result.at(-1)?.id || '0';
        initialized = true;
        requestAnimationFrame(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; });
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a conversa.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    const poll = async () => {
      if (!initialized || cancelled || document.visibilityState !== 'visible' || pollBusy.current) return;
      if (Date.now() - lastActivity.current > 5 * 60_000) {
        setPaused(true);
        return;
      }
      pollBusy.current = true;
      try {
        const result = await loadChatMessages(currentUser, currentRecipient, { after: latestId.current });
        if (cancelled || !result.length) return;
        const list = listRef.current;
        const nearBottom = !list || list.scrollHeight - list.scrollTop - list.clientHeight < 100;
        latestId.current = result.at(-1)?.id || latestId.current;
        setMessages((current) => mergeMessages(current, result));
        if (nearBottom) requestAnimationFrame(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; });
        setError('');
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a conversa.');
      } finally {
        pollBusy.current = false;
      }
    };

    const onVisible = () => { if (document.visibilityState === 'visible') { lastActivity.current = Date.now(); setPaused(false); void poll(); } };
    const timer = window.setInterval(() => void poll(), 30_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [active, currentUser, selected, reload]);

  const loadOlder = async () => {
    if (!messages.length || loadingOlder) return;
    const conversation = selected;
    touch();
    const list = listRef.current;
    const oldHeight = list?.scrollHeight || 0;
    setLoadingOlder(true);
    setError('');
    try {
      const result = await loadChatMessages(currentUser, recipientId, { before: messages[0].id });
      if (selectedRef.current !== conversation) return;
      setHasOlder(result.length === 50);
      setMessages((current) => mergeMessages(current, result));
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop += listRef.current.scrollHeight - oldHeight;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar mensagens anteriores.');
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const body = draft.trim();
    if (!body || sending || body.length > 1200) return;
    const conversation = selected;
    touch();
    setSending(true);
    setError('');
    try {
      const message = await sendChatMessage(currentUser, recipientId, body);
      if (selectedRef.current !== conversation) return;
      setMessages((current) => mergeMessages(current, [message]));
      setDraft('');
      requestAnimationFrame(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  const onDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <div onPointerDown={touch} onKeyDown={touch} className="grid min-h-[620px] overflow-hidden rounded-3xl border border-white bg-white/85 shadow-sm lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-gray-100 bg-[#f7faf6] p-4 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-[#385041]" /><h2 className="text-sm font-extrabold text-gray-900">Conversas</h2></div>
        <p className="mt-1 text-[11px] text-gray-500">Mensagens disponíveis por 30 dias.</p>
        <button type="button" onClick={() => setSelected('general')} className={`mt-4 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ${selected === 'general' ? 'bg-[#385041] text-white' : 'bg-white text-gray-700 hover:bg-[#edf4eb]'}`}>
          <Users className="h-5 w-5 shrink-0" /><span className="text-xs font-extrabold">Chat geral</span>
        </button>
        <div className="mt-5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wide text-gray-500"><MessageCircle className="h-3.5 w-3.5" />Conversas privadas</div>
        <label className="relative mt-2 block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pessoa" className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#385041]" /></label>
        <div className="mt-2 max-h-48 space-y-1 overflow-y-auto lg:max-h-[450px]">
          {filteredPeople.map((person) => <button key={person.id} type="button" onClick={() => setSelected(person.id)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left ${selected === person.id ? 'bg-[#e5efe3] text-[#385041]' : 'text-gray-700 hover:bg-white'}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-extrabold text-[#385041]">{person.displayName[0]?.toUpperCase() || '?'}</span><span className="min-w-0"><strong className="block truncate text-xs">{person.displayName}</strong><small className="block truncate text-[10px] text-gray-500">{person.email}</small></span></button>)}
          {!peopleLoading && filteredPeople.length === 0 && <p className="px-3 py-3 text-[11px] text-gray-400">{people.length ? 'Ninguém encontrado.' : 'Nenhuma outra pessoa disponível.'}</p>}
        </div>
      </aside>

      <section className="flex min-h-[520px] min-w-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5"><div><h3 className="text-sm font-extrabold text-gray-900">{selectedPerson?.displayName || (selected === 'general' ? 'Chat geral' : 'Conversa privada')}</h3><p className="text-[10px] text-gray-500">{selectedPerson?.email || (selected === 'general' ? 'Todos os usuários ativos' : 'Somente vocês dois')}</p></div><button type="button" onClick={() => { touch(); setReload((value) => value + 1); }} className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-[#385041] hover:bg-[#edf4eb]" title="Buscar novas mensagens"><RefreshCw className="h-3.5 w-3.5" />{paused ? 'Retomar' : 'Atualizar'}</button></header>
        <div ref={listRef} className="h-[420px] flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
          {hasOlder && <div className="text-center"><button type="button" disabled={loadingOlder} onClick={() => void loadOlder()} className="rounded-full bg-gray-100 px-4 py-2 text-[10px] font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-50">{loadingOlder ? 'Carregando...' : 'Ver mensagens anteriores'}</button></div>}
          {loading && <div className="flex justify-center py-16 text-gray-400"><RefreshCw className="h-5 w-5 animate-spin" /></div>}
          {!loading && messages.length === 0 && <div className="py-20 text-center"><MessageCircle className="mx-auto h-9 w-9 text-gray-300" /><p className="mt-3 text-xs text-gray-500">Nenhuma mensagem nos últimos 30 dias.</p></div>}
          {messages.map((message) => <div key={message.id} className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[70%] ${message.isMine ? 'bg-[#385041] text-white' : 'bg-gray-100 text-gray-800'}`}><div className={`mb-1 text-[10px] font-extrabold ${message.isMine ? 'text-white/80' : 'text-[#385041]'}`}>{message.isMine ? 'Você' : message.senderName}</div><p className="whitespace-pre-wrap break-words text-xs leading-relaxed">{message.body}</p><span className={`mt-1 block text-right text-[9px] ${message.isMine ? 'text-white/70' : 'text-gray-400'}`}>{messageTime(message.createdAt)}</span></div></div>)}
        </div>
        {error && <p role="alert" className="mx-4 mb-2 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700 sm:mx-5">{error}</p>}
        {paused && <p className="mx-4 mb-2 text-center text-[10px] text-gray-400 sm:mx-5">Atualizações pausadas após 5 minutos sem uso para economizar o Neon.</p>}
        <form onSubmit={(event) => void send(event)} className="flex items-end gap-2 border-t border-gray-100 bg-white p-3 sm:p-4"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onDraftKeyDown} maxLength={1200} rows={2} placeholder="Escreva uma mensagem..." className="min-h-12 flex-1 resize-none rounded-xl border border-gray-200 px-3 py-3 text-xs outline-none focus:border-[#385041]" /><button type="submit" disabled={!draft.trim() || sending || loading} className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#385041] text-white disabled:opacity-50" aria-label="Enviar mensagem"><Send className="h-4 w-4" /></button></form>
      </section>
    </div>
  );
}
