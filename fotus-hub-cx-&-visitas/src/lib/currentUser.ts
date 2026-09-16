export type AppAuthProvider = 'neon';

export interface CurrentUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  authProvider: AppAuthProvider;
  getIdToken: () => Promise<string>;
}

export function currentUserFromNeon(user: { id: string; email: string; name: string; image?: string | null }, getIdToken: () => Promise<string>): CurrentUser {
  return {
    uid: user.id,
    email: user.email,
    displayName: user.name,
    photoURL: user.image || null,
    authProvider: 'neon',
    getIdToken,
  };
}
