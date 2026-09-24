import type { CurrentUser } from './currentUser';

export interface ChatPerson {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

export interface ChatMessage {
  id: string;
  body: string;
  senderName: string;
  senderEmail: string;
  senderAvatar: string | null;
  isIsa: boolean;
  isMine: boolean;
  createdAt: number;
}

async function chatRequest<T>(user: CurrentUser, url: string, body?: Record<string, unknown>): Promise<T> {
  const token = await user.getIdToken();
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error || 'Não foi possível acessar o chat.');
  return result;
}

export async function loadChatPeople(user: CurrentUser) {
  return chatRequest<{ people: ChatPerson[]; selfId: string }>(user, '/api/chat?mode=people');
}

export interface ChatUnread {
  conversationId: string;
  count: number;
}

export interface ChatSync {
  onlineUserIds: string[];
  unread: ChatUnread[];
}

export async function syncChat(user: CurrentUser) {
  return chatRequest<ChatSync>(user, '/api/chat', { action: 'sync' });
}

export async function loadChatMessages(user: CurrentUser, recipientId: string | null, cursor?: { after?: string; before?: string }) {
  const params = new URLSearchParams();
  if (recipientId) params.set('recipientId', recipientId);
  if (cursor?.after) params.set('after', cursor.after);
  if (cursor?.before) params.set('before', cursor.before);
  const query = params.toString();
  return (await chatRequest<{ messages: ChatMessage[] }>(user, `/api/chat${query ? `?${query}` : ''}`)).messages;
}

export async function sendChatMessage(user: CurrentUser, recipientId: string | null, body: string) {
  return (await chatRequest<{ message: ChatMessage }>(user, '/api/chat', { recipientId, body })).message;
}

export async function markChatRead(user: CurrentUser, recipientId: string | null, messageId: string) {
  await chatRequest(user, '/api/chat', { action: 'read', recipientId, messageId });
}

export async function clearChatConversation(user: CurrentUser, recipientId: string) {
  return chatRequest<{ clearedBeforeId: string }>(user, '/api/chat', { action: 'clear', recipientId });
}

export async function askIsaInChat(user: CurrentUser, messageId: string) {
  return (await chatRequest<{ message: ChatMessage }>(user, '/api/chat', { action: 'ask-isa', messageId })).message;
}

export async function saveChatAvatar(user: CurrentUser, targetUserId: string, dataUrl: string | null) {
  await chatRequest(user, '/api/chat', { action: 'avatar', targetUserId, dataUrl });
}
