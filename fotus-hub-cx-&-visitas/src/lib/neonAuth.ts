import { createAuthClient, createInternalNeonAuth } from '@neondatabase/neon-js/auth';
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters';
import { BetterAuthVanillaAdapter } from '@neondatabase/neon-js/auth/vanilla/adapters';

const DEFAULT_NEON_AUTH_URL = 'https://ep-falling-waterfall-b5oiundt.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth';
export const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL?.trim() || DEFAULT_NEON_AUTH_URL;

export const neonAuth = createAuthClient(NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter(),
});

const tokenService = createInternalNeonAuth(NEON_AUTH_URL, {
  adapter: BetterAuthVanillaAdapter(),
});

export const getNeonAccessToken = async () => {
  const token = await tokenService.getJWTToken();
  if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
  return token;
};
