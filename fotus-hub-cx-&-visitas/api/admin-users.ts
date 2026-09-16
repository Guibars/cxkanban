import { Pool } from 'pg';
import { verifyNeonIdentity } from '../src/server/neonAuth';

type AdminAction = 'ensure-user' | 'inspect' | 'list-users' | 'reset-link' | 'save-profile';
type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: { action?: unknown; email?: unknown; displayName?: unknown; profile?: unknown };
};
type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (value: unknown) => void;
  setHeader?: (name: string, value: string) => void;
};

const MASTER_EMAILS = new Set(['guilhermebarbosars@gmail.com', 'matheus.gaspar@fotus.com.br']);
const SECTION_KEYS = ['visao-geral', 'ocorrencias', 'custos', 'ra', 'visitas', 'estrutura'];

function getPool() {
  const connectionString = (process.env.DATABASE_URL || '')
    .trim()
    .replace(/^DATABASE_URL\s*=\s*/i, '')
    .replace(/^['"]|['"]$/g, '');
  if (!/^postgres(?:ql)?:\/\//i.test(connectionString)) throw new Error('database-not-configured');
  const globalPool = globalThis as typeof globalThis & { __fotusAdminPool?: Pool };
  globalPool.__fotusAdminPool ||= new Pool({ connectionString, max: 3, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 20_000 });
  return globalPool.__fotusAdminPool;
}

function requestOrigin(request: ApiRequest) {
  const rawOrigin = request.headers?.origin;
  const origin = Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin;
  if (origin && /^https?:\/\//i.test(origin)) return origin.replace(/\/$/, '');
  const rawHost = request.headers?.['x-forwarded-host'] || request.headers?.host;
  const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
  return host ? `https://${host}` : 'https://cxkanban.vercel.app';
}

export async function listAccessProfiles() {
  const result = await getPool().query(`select users.email::text as id,users.email::text,users.display_name as "displayName",users.role,
    users.agent_name as "agentName",users.active,
    coalesce(array_agg(distinct permissions.section_key order by permissions.section_key)
      filter (where permissions.can_view),'{}') as "visibleTabs",
    coalesce(array_agg(distinct units.legacy_firestore_id order by units.legacy_firestore_id)
      filter (where units.legacy_firestore_id is not null),'{}') as "organizationUnitIds",
    (extract(epoch from users.created_at)*1000)::bigint as "createdAt",
    (extract(epoch from users.updated_at)*1000)::bigint as "updatedAt"
    from public.app_users users
    left join public.user_section_permissions permissions on permissions.user_id=users.id
    left join public.user_unit_scopes scopes on scopes.user_id=users.id
    left join public.organization_units units on units.id=scopes.unit_id
    group by users.id order by users.display_name`);
  return result.rows.map((row) => ({ ...row, createdAt: Number(row.createdAt), updatedAt: Number(row.updatedAt) }));
}

export async function saveAccessProfile(email: string, profile: Record<string, unknown>, operatorEmail: string) {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    await client.query("set local statement_timeout='20s'");
    const user = await client.query<{ id: string }>(`insert into public.app_users
      (email,display_name,role,agent_name,active,created_at,updated_at)
      values ($1,$2,$3,$4,$5,$6,$7)
      on conflict (email) do update set display_name=excluded.display_name,role=excluded.role,agent_name=excluded.agent_name,
        active=excluded.active,updated_at=excluded.updated_at returning id`, [email, profile.displayName, profile.role,
      typeof profile.agentName === 'string' && profile.agentName ? profile.agentName : null, profile.active,
      new Date(Number(profile.createdAt)), new Date(Number(profile.updatedAt))]);
    const userId = user.rows[0].id;
    const visibleTabs = Array.isArray(profile.visibleTabs) ? profile.visibleTabs.map(String) : [];
    const isAdmin = profile.role === 'Administrador';
    for (const section of SECTION_KEYS) {
      const allowed = visibleTabs.includes(section);
      await client.query(`insert into public.user_section_permissions
        (user_id,section_key,can_view,can_create,can_edit,can_delete)
        values ($1,$2,$3,$3,$3,$4) on conflict (user_id,section_key) do update set
        can_view=excluded.can_view,can_create=excluded.can_create,can_edit=excluded.can_edit,can_delete=excluded.can_delete,updated_at=now()`,
      [userId, section, allowed, isAdmin && allowed]);
    }
    await client.query('delete from public.user_unit_scopes where user_id=$1', [userId]);
    const unitIds = Array.isArray(profile.organizationUnitIds) ? profile.organizationUnitIds.map(String) : [];
    const level = isAdmin ? 'Administração' : profile.role === 'Agente' ? 'Membro' : 'Liderança';
    if (unitIds.length) await client.query(`insert into public.user_unit_scopes (user_id,unit_id,access_level)
      select $1,units.id,$3 from public.organization_units units where units.legacy_firestore_id=any($2::text[])
      on conflict (user_id,unit_id) do update set access_level=excluded.access_level`, [userId, unitIds, level]);
    await client.query(`insert into public.audit_events (actor_email,action,entity_type,entity_id,after_data)
      values ($1,'save_profile','app_user',$2,$3::jsonb)`, [operatorEmail, email, JSON.stringify(profile)]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function listAuthAccounts(email?: string) {
  const values: unknown[] = [];
  const where = email ? 'where lower(users.email)=lower($1)' : '';
  if (email) values.push(email);
  const result = await getPool().query(`select users.id::text as uid,lower(users.email) as email,users.name as "displayName",
    coalesce(users.banned,false) as disabled,users."emailVerified" as "emailVerified",
    users."createdAt"::text as "createdAt",max(sessions."updatedAt")::text as "lastSignInAt",
    coalesce(array_agg(distinct case accounts."providerId" when 'credential' then 'password' when 'google' then 'google.com' else accounts."providerId" end)
      filter (where accounts."providerId" is not null),'{}') as providers
    from neon_auth."user" users
    left join neon_auth.account accounts on accounts."userId"=users.id
    left join neon_auth.session sessions on sessions."userId"=users.id
    ${where}
    group by users.id order by users.name`, values);
  return result.rows.map((row) => ({ exists: true, ...row }));
}

function validateProfile(email: string, profile: unknown) {
  if (!profile || typeof profile !== 'object') throw new Error('invalid-profile');
  const data = profile as Record<string, unknown>;
  const roles = ['Agente', 'Gerente', 'Líder', 'Coordenador', 'Administrador'];
  const tabs = Array.isArray(data.visibleTabs) ? data.visibleTabs : [];
  const units = Array.isArray(data.organizationUnitIds) ? data.organizationUnitIds : [];
  if (data.email !== email || typeof data.displayName !== 'string' || !data.displayName.trim()
    || typeof data.role !== 'string' || !roles.includes(data.role) || !tabs.length
    || tabs.some((item) => typeof item !== 'string' || !SECTION_KEYS.includes(item))
    || units.some((item) => typeof item !== 'string') || typeof data.active !== 'boolean'
    || typeof data.createdAt !== 'number' || typeof data.updatedAt !== 'number') throw new Error('invalid-profile');
  return {
    email,
    displayName: data.displayName.trim(),
    role: data.role,
    agentName: typeof data.agentName === 'string' ? data.agentName : '',
    organizationUnitIds: units,
    visibleTabs: [...new Set(tabs)],
    active: data.active,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader?.('Cache-Control', 'private, no-store');
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método não permitido.' });
  try {
    const identity = await verifyNeonIdentity(request, getPool());
    if (!MASTER_EMAILS.has(identity.email)) return response.status(403).json({ error: 'Somente operadores mestres podem administrar usuários.' });
    const action = request.body?.action as AdminAction;
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const displayName = typeof request.body?.displayName === 'string' ? request.body.displayName.trim() : '';
    if (!['ensure-user', 'inspect', 'list-users', 'reset-link', 'save-profile'].includes(action)) return response.status(400).json({ error: 'Ação inválida.' });

    if (action === 'list-users') {
      response.status(200).json({ users: await listAuthAccounts(), profiles: await listAccessProfiles() });
      return;
    }
    if (!/^[^@\s]+@fotus[.]com[.]br$/i.test(email) && email !== 'guilhermebarbosars@gmail.com') return response.status(400).json({ error: 'Use um e-mail corporativo @fotus.com.br.' });

    if (action === 'save-profile') {
      const profile = validateProfile(email, request.body?.profile);
      await saveAccessProfile(email, profile, identity.email);
      response.status(200).json({ profile: { id: email, ...profile } });
      return;
    }

    const account = (await listAuthAccounts(email))[0];
    if (action === 'inspect') {
      response.status(200).json(account || { exists: false, email, displayName });
      return;
    }
    if (action === 'reset-link' && account) {
      response.status(200).json({ ...account, resetLink: `${requestOrigin(request)}/?reset=1&email=${encodeURIComponent(email)}` });
      return;
    }

    const setupLink = `${requestOrigin(request)}/?firstAccess=1&email=${encodeURIComponent(email)}&name=${encodeURIComponent(displayName)}`;
    response.status(200).json(account ? { ...account, created: false } : {
      exists: false,
      email,
      displayName,
      created: true,
      resetLink: setupLink,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'unauthenticated') return response.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
    if (message === 'auth-not-configured') return response.status(503).json({ error: 'A URL do Neon Auth não está configurada corretamente na Vercel.' });
    if (message === 'unauthorized') return response.status(403).json({ error: 'Esta conta não está liberada.' });
    if (message === 'database-not-configured') return response.status(503).json({ error: 'O banco Neon ainda não foi configurado na Vercel.' });
    if (message === 'invalid-profile') return response.status(400).json({ error: 'Confira os dados e as permissões selecionadas.' });
    console.error('Erro na administração de usuários Neon:', error);
    response.status(500).json({ error: 'Não foi possível administrar esta conta no Neon.' });
  }
}
