import type { OrganizationPerson, OrganizationRole } from '../types';

export const ORGANIZATION_ROLES: OrganizationRole[] = ['Head', 'Gerente', 'Coordenador', 'Líder', 'Consultor'];
export const ORGANIZATION_SUPERVISORS: Partial<Record<OrganizationRole, OrganizationRole[]>> = {
  Gerente: ['Head'],
  Coordenador: ['Gerente'],
  Líder: ['Coordenador'],
  Consultor: ['Líder', 'Coordenador', 'Gerente'],
};

export function organizationAncestors(person: OrganizationPerson, byId: Map<string, OrganizationPerson>) {
  const ancestors: OrganizationPerson[] = [];
  const visited = new Set([person.id]);
  let parentId = person.reportsToId;
  while (parentId && !visited.has(parentId)) {
    const parent = byId.get(parentId);
    if (!parent) break;
    visited.add(parent.id);
    ancestors.push(parent);
    parentId = parent.reportsToId;
  }
  return ancestors;
}

// Mantém o caminho até a gerência visível junto com a equipe escolhida.
export function organizationScope(people: OrganizationPerson[], selectedId: string) {
  const byId = new Map(people.map((person) => [person.id, person]));
  const selected = byId.get(selectedId);
  if (!selected) return null;
  const descendants = new Set([selected.id]);
  const queue = [selected.id];
  for (let index = 0; index < queue.length; index += 1) {
    for (const person of people) {
      if (person.reportsToId === queue[index] && !descendants.has(person.id)) {
        descendants.add(person.id);
        queue.push(person.id);
      }
    }
  }
  organizationAncestors(selected, byId).forEach((person) => descendants.add(person.id));
  return descendants;
}

export function organizationConsultantCounts(people: OrganizationPerson[]) {
  const byId = new Map(people.map((person) => [person.id, person]));
  const counts = new Map<string, number>();
  for (const person of people) {
    if (person.role !== 'Consultor' || !person.active) continue;
    for (const parent of organizationAncestors(person, byId)) {
      counts.set(parent.id, (counts.get(parent.id) || 0) + 1);
    }
  }
  return counts;
}
