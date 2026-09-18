import type { CurrentUser } from './currentUser';

export type DataResource = 'occurrences' | 'extra_costs' | 'ra_cases' | 'integrator_visits' | 'occurrence_agents' | 'organization_people' | 'organization_units';

async function neonMutation(user: CurrentUser, body: Record<string, unknown>) {
  const token = await user.getIdToken();
  const response = await fetch('/api/neon-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({})) as { error?: string; id?: string; inserted?: number; skipped?: number };
  if (!response.ok) throw new Error(result.error || 'Não foi possível salvar no Neon.');
  window.dispatchEvent(new Event('fotus:data-changed'));
  return result;
}

export async function createData(user: CurrentUser, resource: Exclude<DataResource, 'occurrence_agents'>, data: Record<string, unknown>) {
  return neonMutation(user, { resource, action: 'create', data });
}

export async function updateData(user: CurrentUser, resource: Exclude<DataResource, 'occurrence_agents'>, id: string, data: Record<string, unknown>) {
  return neonMutation(user, { resource, action: 'update', id, data });
}

export async function deleteData(user: CurrentUser, resource: Exclude<DataResource, 'occurrence_agents'>, id: string) {
  return neonMutation(user, { resource, action: 'delete', id });
}

export async function replaceOccurrenceAgents(user: CurrentUser, names: string[]) {
  return neonMutation(user, { resource: 'occurrence_agents', action: 'replace', data: { names } });
}

export async function bulkUpsertData(
  user: CurrentUser,
  resource: 'occurrences' | 'extra_costs',
  records: Array<Record<string, unknown> & { id: string }>,
  onProgress?: (saved: number, total: number) => void,
) {
  const result = await neonMutation(user, { resource, action: 'bulk-upsert', records });
  const inserted = result.inserted ?? records.length;
  const skipped = result.skipped ?? 0;
  onProgress?.(inserted + skipped, records.length);
  return { inserted, skipped };
}
