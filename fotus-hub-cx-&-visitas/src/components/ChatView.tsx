import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { Camera, Check, ImagePlus, MessageCircle, RefreshCw, Search, Send, Sparkles, Users, X } from 'lucide-react';
import type { CurrentUser } from '../lib/currentUser';
import {
  askIsaInChat, loadChatMessages, loadChatPeople, markChatRead,
  saveChatAvatar, sendChatMessage, type ChatMessage, type ChatPerson, type ChatUnread,
} from '../lib/chat';

const GROUP_NAME = 'Experiência que Gera Resultado - CX';
const GROUP_IMAGE = '/cx-chat-group.png';
const ISA_IMAGE = 'https://res.cloudinary.com/dsctpzqvy/image/upload/v1776894141/I_matvg6.png';

interface ChatViewProps {
  currentUser: CurrentUser;
  active: boolean;
  onlineUserIds: string[];
  unread: ChatUnread[];
  target: { conversationId: string; nonce: number } | null;
  onRead: (conversationId: string) => void;
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

function Avatar({ name, src, online = false, size = 'md' }: { name: string; src?: string | null; online?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  return <span className={`relative flex ${dimensions} shrink-0 items-center justify-center rounded-2xl bg-[#dfeadf] text-xs font-black text-[#385041] ring-2 ring-white`}>
    {src ? <img src={src} alt={name} className="h-full w-full rounded-2xl object-cover" /> : name.slice(0, 1).toUpperCase()}
    {online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" aria-label="Online" />}
  </span>;
}

async function compressedAvatar(file: File) {
  if (!file.type.startsWith('image/') || file.size > 5_000_000) throw new Error('Escolha uma imagem de até 5 MB.');
  const url = URL.createObjectURL(file);
  try {
    const picture = new Image();
    await new Promise<void>((resolve, reject) => {
      picture.onload = () => resolve();
      picture.onerror = () => reject(new Error('Não foi possível abrir essa imagem.'));
      picture.src = url;
    });
    const render = (size: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Não foi possível preparar a foto.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, size, size);
      const scale = Math.max(size / picture.width, size / picture.height);
      const width = picture.width * scale;
      const height = picture.height * scale;
      context.drawImage(picture, (size - width) / 2, (size - height) / 2, width, height);
      return canvas.toDataURL('image/jpeg', 0.72);
    };
    const image = render(128);
    const result = image.length <= 50_000 ? image : render(96);
    if (result.length > 50_000) throw new Error('A foto ficou muito grande. Escolha outra imagem.');
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ChatView({ currentUser, active, onlineUserIds, unread, target, onRead }: ChatViewProps) {
  const [people, setPeople] = useState<ChatPerson[]>([]);
  const [selfId, setSelfId] = useState('');
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [selected, setSelected] = useState('general');
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isaThinking, setIsaThinking] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const [photoManagerOpen, setPhotoManagerOpen] = useState(false);
  const [photoSaving, setPhotoSaving] = useState('');
  const [photoError, setPhotoError] = useState('');
  const latestId = useRef('0');
  const readId = useRef('0');
  const readingId = useRef('0');
  const lastActivity = useRef(Date.now());
  const selectedRef = useRef(selected);
  const onReadRef = useRef(onRead);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoTargetRef = useRef('');
  onReadRef.current = onRead;

  const online = new Set(onlineUserIds);
  const unreadById = new Map(unread.map((item) => [item.conversationId, item.count]));
  const selectedPerson = people.find((person) => person.id === selected);
  const recipientId = selected === 'general' ? null : selected;
  const privatePeople = people.filter((person) => person.id !== selfId && `${person.displayName} ${person.email}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')));
  const isPhotoAdmin = currentUser.email?.toLowerCase() === 'guilhermebarbosars@gmail.com';

  const touch = () => { lastActivity.current = Date.now(); setPaused(false); };
  const scrollToBottom = () => requestAnimationFrame(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; });
  const refreshPeople = async () => {
    const result = await loadChatPeople(currentUser);
    setPeople(result.people);
    setSelfId(result.selfId);
  };
  const markVisibleRead = async (id: string, conversation: string, personId: string | null) => {
    if (id === '0' || BigInt(id) <= BigInt(readId.current) || BigInt(id) <= BigInt(readingId.current)) return;
    readingId.current = id;
    try {
      await markChatRead(currentUser, personId, id);
      if (selectedRef.current === conversation) {
        if (BigInt(id) > BigInt(readId.current)) readId.current = id;
        onReadRef.current(conversation);
      }
    } catch {
      // The next refresh can retry without hiding the message.
    } finally {
      if (readingId.current === id) readingId.current = '0';
    }
  };

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setPeopleLoading(true);
    void loadChatPeople(currentUser)
      .then((result) => { if (!cancelled) { setPeople(result.people); setSelfId(result.selfId); } })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Não foi possível listar as pessoas.'); })
      .finally(() => { if (!cancelled) setPeopleLoading(false); });
    return () => { cancelled = true; };
  }, [active, currentUser]);

  useEffect(() => { if (target) setSelected(target.conversationId); }, [target?.nonce]);
  useEffect(() => { setDraft(''); }, [selected]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let initialized = false;
    let pollBusy = false;
    selectedRef.current = selected;
    latestId.current = '0';
    readId.current = '0';
    readingId.current = '0';
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
        scrollToBottom();
        void markVisibleRead(latestId.current, selected, currentRecipient);
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a conversa.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    const poll = async () => {
      if (!initialized || cancelled || document.visibilityState !== 'visible' || pollBusy) return;
      if (Date.now() - lastActivity.current > 5 * 60_000) { setPaused(true); return; }
      pollBusy = true;
      try {
        const result = await loadChatMessages(currentUser, currentRecipient, { after: latestId.current });
        if (cancelled || !result.length) return;
        const list = listRef.current;
        const nearBottom = !list || list.scrollHeight - list.scrollTop - list.clientHeight < 100;
        latestId.current = result.at(-1)?.id || latestId.current;
        setMessages((current) => mergeMessages(current, result));
        if (nearBottom) { scrollToBottom(); void markVisibleRead(latestId.current, selected, currentRecipient); }
        setError('');
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a conversa.');
      } finally { pollBusy = false; }
    };

    const onVisible = () => { if (document.visibilityState === 'visible') { lastActivity.current = Date.now(); setPaused(false); void poll(); } };
    const timer = window.setInterval(() => void poll(), 30_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
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
      requestAnimationFrame(() => { if (listRef.current) listRef.current.scrollTop += listRef.current.scrollHeight - oldHeight; });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar mensagens anteriores.');
    } finally { setLoadingOlder(false); }
  };

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const body = draft.trim();
    if (!body || sending || body.length > 1200) return;
    if (selected === 'general' && /(^|\s)@isa\b/i.test(body) && !body.replace(/(^|\s)@isa\b/i, '').trim()) {
      setError('Escreva uma pergunta junto com @isa.');
      return;
    }
    const conversation = selected;
    touch();
    setSending(true);
    setError('');
    try {
      const message = await sendChatMessage(currentUser, recipientId, body);
      if (selectedRef.current === conversation) {
        setMessages((current) => mergeMessages(current, [message]));
        setDraft('');
        scrollToBottom();
      }
      window.dispatchEvent(new Event('fotus:chat-changed'));
      if (conversation === 'general' && /(^|\s)@isa\b/i.test(body)) {
        setIsaThinking(true);
        try {
          const answer = await askIsaInChat(currentUser, message.id);
          if (selectedRef.current === conversation) { setMessages((current) => mergeMessages(current, [answer])); scrollToBottom(); }
          window.dispatchEvent(new Event('fotus:chat-changed'));
        } catch (cause) {
          if (selectedRef.current === conversation) setError(`Mensagem enviada, mas a ISA não respondeu: ${cause instanceof Error ? cause.message : 'tente novamente.'}`);
        } finally { setIsaThinking(false); }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar a mensagem.');
    } finally { setSending(false); }
  };

  const onDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); }
  };

  const choosePhoto = (id: string) => { photoTargetRef.current = id; setPhotoError(''); fileInputRef.current?.click(); };
  const onPhotoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const id = photoTargetRef.current;
    event.target.value = '';
    if (!file || !id) return;
    setPhotoSaving(id);
    setPhotoError('');
    try {
      await saveChatAvatar(currentUser, id, await compressedAvatar(file));
      await refreshPeople();
      setReload((value) => value + 1);
    } catch (cause) { setPhotoError(cause instanceof Error ? cause.message : 'Não foi possível salvar a foto.'); }
    finally { setPhotoSaving(''); }
  };
  const removePhoto = async (id: string) => {
    setPhotoSaving(id);
    setPhotoError('');
    try { await saveChatAvatar(currentUser, id, null); await refreshPeople(); setReload((value) => value + 1); }
    catch (cause) { setPhotoError(cause instanceof Error ? cause.message : 'Não foi possível remover a foto.'); }
    finally { setPhotoSaving(''); }
  };

  const groupUnread = unreadById.get('general') || 0;
  const onlineCount = onlineUserIds.length;

  return (
    <div onPointerDown={touch} onKeyDown={touch} className="relative grid min-h-[650px] overflow-hidden rounded-[28px] border border-[#dfe8e3] bg-white shadow-[0_20px_55px_rgba(28,57,45,0.09)] lg:grid-cols-[310px_minmax(0,1fr)]">
      <aside className="border-b border-[#e5ece7] bg-gradient-to-b from-[#f4f8f5] to-[#eef4f0] p-4 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#6b8978]">Fotus Hub</p><h2 className="mt-0.5 text-lg font-black text-[#203f33]">Conversas</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#385041] shadow-sm"><MessageCircle className="h-5 w-5" /></span></div>
        <button type="button" onClick={() => setSelected('general')} className={`mt-5 flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-all ${selected === 'general' ? 'border-[#385041] bg-[#385041] text-white shadow-md' : 'border-white bg-white/90 text-gray-800 hover:border-[#aac5b1]'}`}><Avatar name={GROUP_NAME} src={GROUP_IMAGE} /><span className="min-w-0 flex-1"><strong className="block text-xs leading-tight">{GROUP_NAME}</strong><small className={`mt-1 block text-[10px] ${selected === 'general' ? 'text-white/70' : 'text-gray-500'}`}>{onlineCount} {onlineCount === 1 ? 'pessoa online' : 'pessoas online'}</small></span>{groupUnread > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-extrabold text-white">{groupUnread > 9 ? '9+' : groupUnread}</span>}</button>
        <div className="mt-6 flex items-center justify-between"><h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6a7e70]">Pessoas</h3><span className="text-[10px] font-bold text-[#3f7a55]">{onlineCount} online</span></div>
        <label className="relative mt-2 block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar colega" className="w-full rounded-xl border border-[#dfe9e1] bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#385041]" /></label>
        <div className="mt-2 max-h-48 space-y-1 overflow-y-auto lg:max-h-[390px]">
          {privatePeople.map((person) => { const count = unreadById.get(person.id) || 0; return <button key={person.id} type="button" onClick={() => setSelected(person.id)} className={`flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors ${selected === person.id ? 'bg-white text-[#274d39] shadow-sm' : 'text-gray-700 hover:bg-white/70'}`}><Avatar name={person.displayName} src={person.avatarUrl} online={online.has(person.id)} size="sm" /><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{person.displayName}</strong><small className="block truncate text-[10px] text-gray-500">{online.has(person.id) ? 'Online agora' : person.email}</small></span>{count > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-extrabold text-white">{count > 9 ? '9+' : count}</span>}</button>; })}
          {!peopleLoading && privatePeople.length === 0 && <p className="px-3 py-3 text-[11px] text-gray-400">{people.length > 1 ? 'Ninguém encontrado.' : 'Nenhuma outra pessoa disponível.'}</p>}
        </div>
        <div className="mt-4 border-t border-[#dbe8dd] pt-3"><p className="text-[10px] leading-relaxed text-[#728477]">Mensagens de texto disponíveis por 30 dias. No grupo, a ISA responde perguntas gerais; para dados restritos do Hub, use a ISA individual.</p>{isPhotoAdmin && <button type="button" onClick={() => setPhotoManagerOpen(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#cfe0d1] bg-white px-3 py-2.5 text-[11px] font-extrabold text-[#385041] hover:bg-[#eaf3e9]"><Camera className="h-4 w-4" />Gerenciar fotos dos usuários</button>}</div>
      </aside>

      <section className="flex min-h-[540px] min-w-0 flex-col bg-[#fbfcfb]">
        <header className="flex items-center gap-3 border-b border-[#e6ece8] bg-white px-4 py-3 sm:px-5"><Avatar name={selectedPerson?.displayName || GROUP_NAME} src={selectedPerson?.avatarUrl || (selected === 'general' ? GROUP_IMAGE : null)} online={Boolean(selectedPerson && online.has(selectedPerson.id))} size="lg" /><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black text-[#203f33]">{selectedPerson?.displayName || (selected === 'general' ? GROUP_NAME : 'Conversa privada')}</h3><p className="mt-0.5 truncate text-[10px] text-gray-500">{selectedPerson ? (online.has(selectedPerson.id) ? 'Online agora' : selectedPerson.email) : `${onlineCount} pessoas online · mencione @isa para perguntar`}</p></div><button type="button" onClick={() => { touch(); setReload((value) => value + 1); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#385041] hover:bg-[#edf4eb]" title={paused ? 'Retomar atualizações' : 'Atualizar conversa'} aria-label={paused ? 'Retomar atualizações' : 'Atualizar conversa'}><RefreshCw className="h-4 w-4" /></button></header>
        <div ref={listRef} onScroll={() => { const list = listRef.current; if (list && list.scrollHeight - list.scrollTop - list.clientHeight < 80) void markVisibleRead(latestId.current, selected, recipientId); }} className="h-[420px] flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top_right,#eaf4ed_0,transparent_46%)] px-4 py-4 sm:px-6">
          {hasOlder && <div className="text-center"><button type="button" disabled={loadingOlder} onClick={() => void loadOlder()} className="rounded-full border border-[#dce8df] bg-white px-4 py-2 text-[10px] font-bold text-[#385041] hover:bg-[#f2f8f3] disabled:opacity-50">{loadingOlder ? 'Carregando...' : 'Ver mensagens anteriores'}</button></div>}
          {loading && <div className="flex justify-center py-16 text-gray-400"><RefreshCw className="h-5 w-5 animate-spin" /></div>}
          {!loading && messages.length === 0 && <div className="py-20 text-center"><Users className="mx-auto h-9 w-9 text-[#b3c9b8]" /><p className="mt-3 text-xs font-semibold text-gray-500">Nenhuma mensagem nos últimos 30 dias.</p><p className="mt-1 text-[11px] text-gray-400">Comece a conversa por aqui.</p></div>}
          {messages.map((message) => <div key={message.id} className={`flex items-end gap-2 ${message.isMine ? 'justify-end' : 'justify-start'}`}>{!message.isMine && <Avatar name={message.senderName} src={message.isIsa ? ISA_IMAGE : message.senderAvatar} size="sm" />}<div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[68%] ${message.isMine ? 'rounded-br-md bg-[#385041] text-white' : message.isIsa ? 'rounded-bl-md border border-[#c8dfd4] bg-[#eaf7f0] text-[#244c37]' : 'rounded-bl-md border border-white bg-white text-gray-800'}`}><div className={`mb-1 flex items-center gap-1 text-[10px] font-extrabold ${message.isMine ? 'text-white/80' : 'text-[#385041]'}`}>{message.isIsa && <Sparkles className="h-3 w-3" />}{message.isMine ? 'Você' : message.senderName}</div><p className="whitespace-pre-wrap break-words text-xs leading-relaxed">{message.body}</p><span className={`mt-1 block text-right text-[9px] ${message.isMine ? 'text-white/70' : 'text-gray-400'}`}>{messageTime(message.createdAt)}</span></div>{message.isMine && <Avatar name="Você" src={message.senderAvatar} size="sm" />}</div>)}
          {isaThinking && selected === 'general' && <div className="flex items-center gap-2 text-[11px] font-bold text-[#587f61]"><Avatar name="ISA" src={ISA_IMAGE} size="sm" /><Sparkles className="h-3.5 w-3.5 animate-pulse" />ISA preparando resposta...</div>}
        </div>
        {error && <p role="alert" className="mx-4 mb-2 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700 sm:mx-5">{error}</p>}
        {paused && <p className="mx-4 mb-2 text-center text-[10px] text-gray-400 sm:mx-5">Atualizações pausadas após 5 minutos sem uso. Clique em atualizar para retomar.</p>}
        <form onSubmit={(event) => void send(event)} className="border-t border-[#e6ece8] bg-white p-3 sm:p-4"><div className="flex items-end gap-2"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onDraftKeyDown} maxLength={1200} rows={2} placeholder={selected === 'general' ? 'Escreva para o grupo ou comece com @isa...' : 'Escreva uma mensagem privada...'} className="min-h-12 flex-1 resize-none rounded-2xl border border-[#dbe7de] bg-[#f8fbf8] px-3 py-3 text-xs outline-none focus:border-[#385041]" /><button type="submit" disabled={!draft.trim() || sending || loading} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#385041] text-white shadow-sm hover:bg-[#2e4736] disabled:opacity-50" aria-label="Enviar mensagem"><Send className="h-4 w-4" /></button></div><div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">{selected === 'general' ? <button type="button" onClick={() => setDraft((current) => /(^|\s)@isa\b/i.test(current) ? current : `@isa ${current}`)} className="flex items-center gap-1 font-bold text-[#47835d] hover:underline"><Sparkles className="h-3 w-3" />Chamar @isa</button> : <span>Somente vocês dois podem ver esta conversa.</span>}<span>{draft.length}/1200</span></div></form>
      </section>

      {photoManagerOpen && <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#162c20]/60 p-3 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-label="Gerenciar fotos dos usuários" className="flex max-h-[88%] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h3 className="text-sm font-extrabold text-[#203f33]">Fotos dos usuários</h3><p className="mt-0.5 text-[11px] text-gray-500">As fotos pequenas ficam salvas no Neon e aparecem para todos no chat.</p></div><button type="button" onClick={() => setPhotoManagerOpen(false)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Fechar"><X className="h-4 w-4" /></button></header><div className="space-y-2 overflow-y-auto p-4">{people.map((person) => <div key={person.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 p-2.5"><Avatar name={person.displayName} src={person.avatarUrl} size="md" /><div className="min-w-0 flex-1"><strong className="block truncate text-xs text-gray-900">{person.displayName}{person.id === selfId ? ' (você)' : ''}</strong><small className="block truncate text-[10px] text-gray-500">{person.email}</small></div><button type="button" disabled={Boolean(photoSaving)} onClick={() => choosePhoto(person.id)} className="rounded-lg bg-[#edf5eb] p-2 text-[#385041] hover:bg-[#dfeedd] disabled:opacity-50" title="Escolher foto"><ImagePlus className="h-4 w-4" /></button>{person.avatarUrl && <button type="button" disabled={Boolean(photoSaving)} onClick={() => void removePhoto(person.id)} className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-50" title="Remover foto"><X className="h-4 w-4" /></button>}{photoSaving === person.id && <RefreshCw className="h-4 w-4 animate-spin text-[#385041]" />}</div>)}{photoError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">{photoError}</p>}</div><footer className="flex items-center gap-2 border-t border-gray-100 px-5 py-3 text-[10px] text-gray-500"><Check className="h-3.5 w-3.5 text-emerald-600" />As imagens são reduzidas automaticamente antes de salvar.</footer><input ref={fileInputRef} type="file" accept="image/*" onChange={(event) => void onPhotoSelected(event)} className="hidden" /></div></div>}
    </div>
  );
}
