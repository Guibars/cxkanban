import type { CurrentUser } from './currentUser';

export interface ChatPerson {
  id: string;
  displayName: string;
  email: string;
}

export interface ChatMessage {
  id: string;
  body: string;
  senderName: string;
  senderEmail: string;
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
  return (await chatRequest<{ people: ChatPerson[] }>(user, '/api/chat?mode=people')).people;
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
