import type { CurrentUser } from './currentUser';
import type { CXCase, ExtraCost, IntegratorVisit, Occurrence, OrganizationPerson, OrganizationUnit, RACase, UserAccessProfile, ServiceTicket, VocFeedback } from '../types';

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
  serviceTickets: ServiceTicket[];
  vocFeedback: VocFeedback[];
}

export class NeonDataError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function loadNeonBootstrap(user: CurrentUser): Promise<NeonBootstrap> {
  const token = await user.getIdToken();
  const response = await fetch('/api/neon-data', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({})) as Partial<NeonBootstrap> & { error?: string };
  if (!response.ok) throw new NeonDataError(body.error || 'Não foi possível carregar os dados do Neon.', response.status);
  return body as NeonBootstrap;
}
