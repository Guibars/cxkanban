import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Pool } from 'pg';

const DEFAULT_NEON_AUTH_URL = 'https://ep-falling-waterfall-b5oiundt.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth';
const NEON_AUTH_URL = (process.env.NEON_AUTH_BASE_URL || process.env.VITE_NEON_AUTH_URL || DEFAULT_NEON_AUTH_URL).replace(/\/$/, '');
const JWKS = createRemoteJWKSet(new URL(`${NEON_AUTH_URL}/.well-known/jwks.json`));

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
  let payload;
  try {
    ({ payload } = await jwtVerify(token, JWKS, {
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
