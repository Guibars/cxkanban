import { Pool } from 'pg';

type ApiRequest = {
  method?: string;
  body?: { email?: unknown; name?: unknown };
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (value: unknown) => void;
  setHeader?: (name: string, value: string) => void;
};

function getPool() {
  const connectionString = (process.env.DATABASE_URL || '')
    .trim()
    .replace(/^DATABASE_URL\s*=\s*/i, '')
    .replace(/^['"]|['"]$/g, '');
  if (!/^postgres(?:ql)?:\/\//i.test(connectionString)) throw new Error('database-not-configured');
  const globalPool = globalThis as typeof globalThis & { __fotusRegistrationPool?: Pool };
  globalPool.__fotusRegistrationPool ||= new Pool({ connectionString, max: 2, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 20_000 });
  return globalPool.__fotusRegistrationPool;
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader?.('Cache-Control', 'private, no-store');
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método não permitido.' });
  try {
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return response.status(400).json({ allowed: false });
    const existing = await getPool().query<{ active: boolean }>(`
      select active from public.app_users where lower(email::text)=$1
    `, [email]);
    if (existing.rows[0] && !existing.rows[0].active) {
      return response.status(403).json({ allowed: false, error: 'Este perfil está desativado. Procure um operador mestre.' });
    }
    const corporateEmail = email.endsWith('@fotus.com.br');
    const existingAuthorizedProfile = Boolean(existing.rows[0]?.active);
    if (!corporateEmail && !existingAuthorizedProfile) {
      return response.status(403).json({ allowed: false, error: 'Use seu e-mail corporativo @fotus.com.br.' });
    }
    return response.status(200).json({ allowed: true, automaticProfile: corporateEmail && !existing.rows[0] });
  } catch (error) {
    console.error('Erro ao verificar liberação de primeiro acesso:', error);
    return response.status(503).json({ allowed: false, error: 'Não foi possível confirmar a liberação deste e-mail.' });
  }
}
