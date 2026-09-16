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
}

function bearerToken(request: RequestLike) {
  const raw = request.headers?.authorization;
  const authorization = Array.isArray(raw) ? raw[0] : raw || '';
  if (!authorization.startsWith('Bearer ')) throw new Error('unauthenticated');
  const token = authorization.slice(7).trim();
  if (!token) throw new Error('unauthenticated');
  return token;
}

export async function verifyNeonIdentity(request: RequestLike, pool: Pool): Promise<NeonIdentity> {
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

  const appUser = await pool.query<{ active: boolean }>(`
    update public.app_users
    set auth_user_id=$1, last_login_at=now(), updated_at=now()
    where email=$2 and active=true
    returning active
  `, [authUserId, email]);
  if (!appUser.rows[0]?.active) throw new Error('unauthorized');

  return { authUserId, email, name: authUser.rows[0].name || email };
}
