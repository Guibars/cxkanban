import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Pool } from 'pg';

const DEFAULT_NEON_AUTH_URL = 'https://ep-falling-waterfall-b5oiundt.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth';
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks() {
  if (jwks) return jwks;

  const authUrl = (process.env.NEON_AUTH_BASE_URL || process.env.VITE_NEON_AUTH_URL || DEFAULT_NEON_AUTH_URL)
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/+$/, '');

  let endpoint: URL;
  try {
    endpoint = new URL(`${authUrl}/.well-known/jwks.json`);
  } catch {
    throw new Error('auth-not-configured');
  }
  if (endpoint.protocol !== 'https:') throw new Error('auth-not-configured');

  jwks = createRemoteJWKSet(endpoint);
  return jwks;
}

type RequestLike = { headers?: Record<string, string | string[] | undefined> };

export interface NeonIdentity {
  authUserId: string;
  email: string;
  name: string;
  appUserId?: string;
}

function bearerToken(request: RequestLike) {
  const raw = request.headers?.authorization;
  const authorization = Array.isArray(raw) ? raw[0] : raw || '';
  if (!authorization.startsWith('Bearer ')) throw new Error('unauthenticated');
  const token = authorization.slice(7).trim();
  if (!token) throw new Error('unauthenticated');
  return token;
}

export async function verifyNeonIdentity(request: RequestLike, pool: Pool, options?: { readOnly?: boolean }): Promise<NeonIdentity> {
  const token = bearerToken(request);
  const remoteJwks = getJwks();
  let payload;
  try {
    ({ payload } = await jwtVerify(token, remoteJwks, {
      algorithms: ['EdDSA'],
      clockTolerance: 10,
    }));
  } catch {
    throw new Error('unauthenticated');
  }
  const authUserId = typeof payload.sub === 'string' ? payload.sub : '';
  if (!authUserId) throw new Error('unauthenticated');

  const authUser = await pool.query<{ email: string; name: string }>(`
    select lower(email) as email, name
    from neon_auth."user"
    where id=$1 and coalesce(banned,false)=false
  `, [authUserId]);
  const email = authUser.rows[0]?.email?.trim().toLowerCase() || '';
  if (!email) throw new Error('unauthenticated');

  const name = authUser.rows[0].name?.trim() || email;
  if (options?.readOnly) {
    const profile = await pool.query<{ id: string; active: boolean }>(
      'select id,active from public.app_users where lower(email::text)=$1', [email],
    );
    if (!profile.rows[0]) throw new Error('profile-not-found');
    if (!profile.rows[0].active) throw new Error('profile-disabled');
    return { authUserId, email, name, appUserId: profile.rows[0].id };
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    let appUser = await client.query<{ id: string; active: boolean }>(`
      select id,active from public.app_users where lower(email::text)=$1 for update
    `, [email]);
    let automaticallyCreated = false;

    if (!appUser.rows[0]) {
      if (!email.endsWith('@fotus.com.br')) throw new Error('unauthorized');
      const agent = await client.query<{ name: string }>(`
        select name::text from public.occurrence_agents
        where active and lower(name::text)=lower(split_part($1,' ',1))
        order by sort_order,name limit 1
      `, [name]);
      appUser = await client.query<{ id: string; active: boolean }>(`
        insert into public.app_users (auth_user_id,email,display_name,role,agent_name,active,last_login_at)
        values ($1,$2,$3,'Agente',$4,true,now())
        on conflict (email) do update set auth_user_id=excluded.auth_user_id,last_login_at=now(),updated_at=now()
        returning id,active
      `, [authUserId, email, name, agent.rows[0]?.name || null]);
      automaticallyCreated = true;
    }

    if (!appUser.rows[0]?.active) throw new Error('unauthorized');
    await client.query(`
      update public.app_users set auth_user_id=$1,last_login_at=now(),updated_at=now() where id=$2
    `, [authUserId, appUser.rows[0].id]);
    if (automaticallyCreated) {
      await client.query(`
        insert into public.user_section_permissions (user_id,section_key,can_view,can_create,can_edit,can_delete)
        select $1,section_key,true,true,true,false from public.app_sections
        where section_key=any($2::text[])
        on conflict (user_id,section_key) do nothing
      `, [appUser.rows[0].id, ['visao-geral', 'ocorrencias', 'visitas']]);
      await client.query(`
        insert into public.audit_events (actor_email,action,entity_type,entity_id,after_data)
        values ($1,'self_registration','app_user',$1,$2::jsonb)
      `, [email, JSON.stringify({ email, displayName: name, role: 'Agente', visibleTabs: ['visao-geral', 'ocorrencias', 'visitas'] })]);
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  return { authUserId, email, name };
}
