export const DEVELOPER_EMAIL = 'guilhermebarbosars@gmail.com';
export const MASTER_OPERATOR_EMAILS = [
  DEVELOPER_EMAIL,
  'matheus.gaspar@fotus.com.br',
] as const;

export function isAuthorizedEmail(email: string | null | undefined) {
  const normalizedEmail = email?.trim().toLowerCase();
  return normalizedEmail === DEVELOPER_EMAIL || normalizedEmail?.endsWith('@fotus.com.br') === true;
}

export function isMasterOperatorEmail(email: string | null | undefined) {
  const normalizedEmail = email?.trim().toLowerCase();
  return MASTER_OPERATOR_EMAILS.some((masterEmail) => masterEmail === normalizedEmail);
}
