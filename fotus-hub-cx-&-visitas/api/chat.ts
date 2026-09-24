import { Pool } from 'pg';
import { verifyNeonIdentity } from '../src/server/neonAuth.js';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown>;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (value: unknown) => void;
  setHeader?: (name: string, value: string) => void;
};

type MessageRow = {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  createdAt: Date;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CURSOR = /^(0|[1-9]\d{0,18})$/;
const MAX_ID = 9_223_372_036_854_775_807n;

function getPool() {
  const connectionString = (process.env.DATABASE_URL || '')
    .trim()
    .replace(/^DATABASE_URL\s*=\s*/i, '')
    .replace(/^['"]|['"]$/g, '');
  if (!/^postgres(?:ql)?:\/\//i.test(connectionString)) throw new Error('database-not-configured');
  const globalPool = globalThis as typeof globalThis & { __fotusNeonPool?: Pool };
  globalPool.__fotusNeonPool ||= new Pool({ connectionString, max: 4, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 20_000 });
  return globalPool.__fotusNeonPool;
}

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function conversationKey(userId: string, recipientId: string | null) {
  return recipientId ? `private:${[userId, recipientId].sort().join(':')}` : 'general';
}

async function recipient(pool: Pool, userId: string, recipientId: string | null) {
  if (!recipientId) return null;
  if (!UUID.test(recipientId) || recipientId === userId) throw new Error('invalid-recipient');
  const result = await pool.query<{ id: string }>(
    'select id from public.app_users where id=$1 and active=true', [recipientId],
  );
  if (!result.rows[0]) throw new Error('invalid-recipient');
  return recipientId;
}

function present(row: MessageRow, userId: string) {
  return {
    id: row.id,
    body: row.body,
    senderName: row.senderName,
    senderEmail: row.senderEmail,
    isMine: row.senderId === userId,
    createdAt: row.createdAt.getTime(),
  };
}

const selectMessages = `
  select messages.id::text, messages.body, messages.sender_user_id as "senderId",
    users.display_name as "senderName", users.email::text as "senderEmail",
    messages.created_at as "createdAt"
  from public.chat_messages messages
  join public.app_users users on users.id=messages.sender_user_id
  where messages.channel_key=$1 and messages.created_at >= now() - interval '30 days'
`;

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader?.('Cache-Control', 'private, no-store');
  if (request.method !== 'GET' && request.method !== 'POST') {
    return response.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const pool = getPool();
    const identity = await verifyNeonIdentity(request, pool, { readOnly: true });
    const userId = identity.appUserId;
    if (!userId) throw new Error('profile-not-found');

    if (request.method === 'GET' && queryValue(request.query?.mode) === 'people') {
      const result = await pool.query<{ id: string; displayName: string; email: string }>(`
        select id,display_name as "displayName",email::text
        from public.app_users where active=true and id<>$1
        order by display_name,email limit 500
      `, [userId]);
      return response.status(200).json({ people: result.rows });
    }

    const rawRecipient = request.method === 'GET'
      ? queryValue(request.query?.recipientId)
      : request.body?.recipientId;
    if (rawRecipient !== undefined && rawRecipient !== null && typeof rawRecipient !== 'string') {
      throw new Error('invalid-recipient');
    }
    const recipientId = await recipient(pool, userId, rawRecipient || null);
    const channelKey = conversationKey(userId, recipientId);

    if (request.method === 'POST') {
      const submittedBody = request.body?.body;
      if (typeof submittedBody !== 'string') throw new Error('invalid-message');
      const body = submittedBody.trim();
      if (!body || body.length > 1200) throw new Error('invalid-message');
      const result = await pool.query<MessageRow>(`
        with inserted as (
          insert into public.chat_messages (channel_key,sender_user_id,recipient_user_id,body)
          values ($1,$2,$3,$4)
          returning id,body,sender_user_id,created_at
        )
        select inserted.id::text,inserted.body,inserted.sender_user_id as "senderId",
          users.display_name as "senderName",users.email::text as "senderEmail",
          inserted.created_at as "createdAt"
        from inserted join public.app_users users on users.id=inserted.sender_user_id
      `, [channelKey, userId, recipientId, body]);
      return response.status(201).json({ message: present(result.rows[0], userId) });
    }

    const after = queryValue(request.query?.after);
    const before = queryValue(request.query?.before);
    if ((after && before)
      || (after && (!CURSOR.test(after) || BigInt(after) > MAX_ID))
      || (before && (!CURSOR.test(before) || BigInt(before) > MAX_ID))) {
      throw new Error('invalid-cursor');
    }

    // Opening a conversation also removes expired rows. Polls only read new messages.
    if (!after && !before) {
      await pool.query("delete from public.chat_messages where created_at < now() - interval '30 days'");
    }

    const suffix = after
      ? ' and messages.id > $2::bigint order by messages.id asc limit 100'
      : before
        ? ' and messages.id < $2::bigint order by messages.id desc limit 50'
        : ' order by messages.id desc limit 50';
    const result = await pool.query<MessageRow>(
      selectMessages + suffix,
      after || before ? [channelKey, after || before] : [channelKey],
    );
    const rows = after ? result.rows : result.rows.reverse();
    return response.status(200).json({ messages: rows.map((row) => present(row, userId)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'unauthenticated') return response.status(401).json({ error: 'Sessão não encontrada. Entre novamente.' });
    if (message === 'unauthorized' || message === 'profile-not-found' || message === 'profile-disabled') {
      return response.status(403).json({ error: 'Seu perfil não tem acesso ao chat.' });
    }
    if (message === 'invalid-recipient' || message === 'invalid-message' || message === 'invalid-cursor') {
      return response.status(400).json({ error: 'Dados inválidos para o chat.' });
    }
    if (message === 'database-not-configured') return response.status(503).json({ error: 'A conexão com o Neon não está configurada.' });
    console.error('Erro no chat:', error);
    return response.status(500).json({ error: 'Não foi possível carregar o chat.' });
  }
}
