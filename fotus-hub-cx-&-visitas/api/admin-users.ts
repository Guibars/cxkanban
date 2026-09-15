import { randomBytes } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, UserRecord } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

type AdminAction = 'ensure-user' | 'inspect' | 'list-users' | 'reset-link' | 'save-profile';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: {
    action?: unknown;
    email?: unknown;
    displayName?: unknown;
    profile?: unknown;
  };
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (value: unknown) => void;
  setHeader?: (name: string, value: string) => void;
};

const PROJECT_ID = 'gen-lang-client-0929275981';
const FIRESTORE_DATABASE_ID = 'ai-studio-752453f7-ae97-40d3-ab96-17738cb30cc2';
const MASTER_EMAILS = new Set([
  'guilhermebarbosars@gmail.com',
  'matheus.gaspar@fotus.com.br',
]);

function errorCode(error: unknown) {
  return typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
}

function getAdminApp() {
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || PROJECT_ID;
  if (!clientEmail || !privateKey) {
    throw new Error('admin-not-configured');
  }

  return getApps()[0] || initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

function getAdminAuth() {
  return getAuth(getAdminApp());
}

function getAdminDb() {
  return getFirestore(getAdminApp(), FIRESTORE_DATABASE_ID);
}

function accountSummary(user: UserRecord) {
  return {
    exists: true,
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    disabled: user.disabled,
    emailVerified: user.emailVerified,
    providers: user.providerData.map((provider) => provider.providerId),
    createdAt: user.metadata.creationTime,
    lastSignInAt: user.metadata.lastSignInTime || null,
  };
}

async function findUser(email: string) {
  try {
    return await getAdminAuth().getUserByEmail(email);
  } catch (error) {
    if (errorCode(error).includes('user-not-found')) return null;
    throw error;
  }
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader?.('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  try {
    const rawAuthorization = request.headers?.authorization;
    const authorization = Array.isArray(rawAuthorization) ? rawAuthorization[0] : rawAuthorization || '';
    const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!idToken) {
      response.status(401).json({ error: 'Sessão não encontrada. Entre novamente.' });
      return;
    }

    const adminAuth = getAdminAuth();
    const operator = await adminAuth.verifyIdToken(idToken, true);
    const operatorEmail = operator.email?.trim().toLowerCase() || '';
    if (!MASTER_EMAILS.has(operatorEmail)) {
      response.status(403).json({ error: 'Somente operadores mestres podem administrar logins.' });
      return;
    }

    const action = request.body?.action as AdminAction;
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const displayName = typeof request.body?.displayName === 'string' ? request.body.displayName.trim() : '';
    if (!['ensure-user', 'inspect', 'list-users', 'reset-link', 'save-profile'].includes(action)) {
      response.status(400).json({ error: 'Ação inválida.' });
      return;
    }

    if (action === 'list-users') {
      const users: ReturnType<typeof accountSummary>[] = [];
      let pageToken: string | undefined;
      do {
        const page = await adminAuth.listUsers(1000, pageToken);
        users.push(...page.users.filter((item) => Boolean(item.email)).map(accountSummary));
        pageToken = page.pageToken;
      } while (pageToken && users.length < 5000);
      const profileSnapshot = await getAdminDb().collection('user_access').get();
      const profiles = profileSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      response.status(200).json({ users, profiles });
      return;
    }

    if (!/^[^@\s]+@fotus[.]com[.]br$/i.test(email) && email !== 'guilhermebarbosars@gmail.com') {
      response.status(400).json({ error: 'Use um e-mail corporativo @fotus.com.br.' });
      return;
    }

    if (action === 'save-profile') {
      const profile = request.body?.profile;
      if (!profile || typeof profile !== 'object') {
        response.status(400).json({ error: 'Perfil de acesso inválido.' });
        return;
      }
      const data = profile as Record<string, unknown>;
      const validRoles = ['Agente', 'Gerente', 'Líder', 'Coordenador', 'Administrador'];
      const validTabs = ['visao-geral', 'ocorrencias', 'custos', 'ra', 'visitas', 'estrutura'];
      const visibleTabs = Array.isArray(data.visibleTabs) ? data.visibleTabs : [];
      const organizationUnitIds = Array.isArray(data.organizationUnitIds) ? data.organizationUnitIds : [];
      if (
        data.email !== email
        || typeof data.displayName !== 'string'
        || !data.displayName.trim()
        || typeof data.role !== 'string'
        || !validRoles.includes(data.role)
        || !visibleTabs.length
        || visibleTabs.some((item) => typeof item !== 'string' || !validTabs.includes(item))
        || organizationUnitIds.some((item) => typeof item !== 'string')
        || typeof data.active !== 'boolean'
        || typeof data.createdAt !== 'number'
        || typeof data.updatedAt !== 'number'
      ) {
        response.status(400).json({ error: 'Confira os dados e as permissões selecionadas para este usuário.' });
        return;
      }
      const cleanProfile = {
        email,
        displayName: data.displayName.trim(),
        role: data.role,
        agentName: typeof data.agentName === 'string' ? data.agentName : '',
        organizationUnitIds,
        visibleTabs: [...new Set(visibleTabs)],
        active: data.active,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        ...(typeof data.createdByEmail === 'string' ? { createdByEmail: data.createdByEmail } : {}),
      };
      await getAdminDb().collection('user_access').doc(email).set(cleanProfile, { merge: true });
      response.status(200).json({ profile: { id: email, ...cleanProfile } });
      return;
    }

    let user = await findUser(email);

    if (action === 'inspect') {
      response.status(200).json(user ? accountSummary(user) : { exists: false, email });
      return;
    }

    if (action === 'ensure-user') {
      let created = false;
      if (!user) {
        user = await adminAuth.createUser({
          email,
          displayName: displayName || undefined,
          password: `${randomBytes(24).toString('base64url')}Aa1!`,
          emailVerified: false,
          disabled: false,
        });
        created = true;
      } else if (user.disabled || (displayName && user.displayName !== displayName)) {
        user = await adminAuth.updateUser(user.uid, {
          disabled: false,
          ...(displayName ? { displayName } : {}),
        });
      }
      const resetLink = await adminAuth.generatePasswordResetLink(email);
      response.status(200).json({ ...accountSummary(user), created, resetLink });
      return;
    }

    if (!user) {
      response.status(404).json({ error: 'Esta conta ainda não existe. Use “Criar conta de login”.' });
      return;
    }

    const resetLink = await adminAuth.generatePasswordResetLink(email);
    response.status(200).json({ ...accountSummary(user), resetLink });
  } catch (error) {
    console.error('Erro na administração de usuários:', error);
    const code = errorCode(error);
    if (error instanceof Error && error.message === 'admin-not-configured') {
      response.status(503).json({ error: 'A administração de usuários ainda não foi configurada na Vercel.' });
      return;
    }
    if (code.includes('id-token-expired') || code.includes('id-token-revoked') || code.includes('argument-error')) {
      response.status(401).json({ error: 'Sua sessão expirou. Saia e entre novamente.' });
      return;
    }
    if (code.includes('email-already-exists')) {
      response.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
      return;
    }
    response.status(500).json({ error: 'Não foi possível administrar esta conta agora.' });
  }
}
