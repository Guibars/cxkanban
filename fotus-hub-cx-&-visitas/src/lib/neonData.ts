import type { CurrentUser } from './currentUser';
import type { CXCase, ExtraCost, IntegratorVisit, Occurrence, OrganizationPerson, OrganizationUnit, RACase, UserAccessProfile } from '../types';

export interface NeonBootstrap {
  profile: UserAccessProfile;
  profiles: UserAccessProfile[];
  occurrenceAgents: string[];
  organizationPeople: OrganizationPerson[];
  organizationUnits: OrganizationUnit[];
  occurrences: Occurrence[];
  extraCosts: ExtraCost[];
  raCases: RACase[];
  visits: IntegratorVisit[];
  cases: CXCase[];
}

export async function loadNeonBootstrap(user: CurrentUser): Promise<NeonBootstrap> {
  const token = await user.getIdToken();
  const response = await fetch('/api/neon-data', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({})) as Partial<NeonBootstrap> & { error?: string };
  if (!response.ok) throw new Error(body.error || 'Não foi possível carregar os dados do Neon.');
  return body as NeonBootstrap;
}
