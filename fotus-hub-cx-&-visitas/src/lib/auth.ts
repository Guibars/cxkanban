export const DEVELOPER_EMAIL = 'guilhermebarbosars@gmail.com';

export function isAuthorizedEmail(email: string | null | undefined) {
  const normalizedEmail = email?.trim().toLowerCase();
  return normalizedEmail === DEVELOPER_EMAIL || normalizedEmail?.endsWith('@fotus.com.br') === true;
}
