import { Pool } from 'pg';
import { mutateNeon, type MutationBody } from './neon-mutations.js';
import { verifyNeonIdentity } from '../src/server/neonAuth.js';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: MutationBody;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (value: unknown) => void;
  setHeader?: (name: string, value: string) => void;
};

type AccessRole = 'Agente' | 'Gerente' | 'Líder' | 'Coordenador' | 'Administrador';
type SectionKey = 'visao-geral' | 'ocorrencias' | 'custos' | 'ra' | 'visitas' | 'estrutura';

const MASTER_EMAILS = new Set(['guilhermebarbosars@gmail.com', 'matheus.gaspar@fotus.com.br']);

function getPool() {
  const connectionString = (process.env.DATABASE_URL || '')
    .trim()
    .replace(/^DATABASE_URL\s*=\s*/i, '')
    .replace(/^['"]|['"]$/g, '');
  if (!/^postgres(?:ql)?:\/\//i.test(connectionString)) throw new Error('database-not-configured');
  const globalPool = globalThis as typeof globalThis & { __fotusNeonPool?: Pool };
  globalPool.__fotusNeonPool ||= new Pool({ connectionString, max: 4, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 20_000 });
  return globalPool.__fotusNeonPool;
}

async function authenticatedEmail(request: ApiRequest) {
  return (await verifyNeonIdentity(request, getPool())).email;
}

function normalizeRows<T extends Record<string, unknown>>(rows: T[]) {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => {
    if (value instanceof Date) return [key, value.getTime()];
    return [key, value];
  })));
}

async function loadProfile(email: string) {
  const result = await getPool().query<{
    id: string;
    email: string;
    displayName: string;
    role: AccessRole;
    agentName: string | null;
    active: boolean;
    visibleTabs: SectionKey[] | null;
    organizationUnitIds: string[] | null;
    createdAt: Date;
    updatedAt: Date;
  }>(`
    select users.id, users.email::text, users.display_name as "displayName", users.role,
      users.agent_name as "agentName", users.active,
      coalesce(array_agg(distinct permissions.section_key order by permissions.section_key)
        filter (where permissions.can_view), '{}') as "visibleTabs",
      coalesce(array_agg(distinct units.legacy_firestore_id order by units.legacy_firestore_id)
        filter (where units.legacy_firestore_id is not null), '{}') as "organizationUnitIds",
      users.created_at as "createdAt", users.updated_at as "updatedAt"
    from public.app_users users
    left join public.user_section_permissions permissions on permissions.user_id = users.id
    left join public.user_unit_scopes scopes on scopes.user_id = users.id
    left join public.organization_units units on units.id = scopes.unit_id
    where users.email = $1
    group by users.id
  `, [email]);
  return result.rows[0] || null;
}

async function loadProfiles() {
  const result = await getPool().query(`
    select users.email::text as id, users.email::text, users.display_name as "displayName", users.role,
      users.agent_name as "agentName", users.active,
      coalesce(array_agg(distinct permissions.section_key order by permissions.section_key)
        filter (where permissions.can_view), '{}') as "visibleTabs",
      coalesce(array_agg(distinct units.legacy_firestore_id order by units.legacy_firestore_id)
        filter (where units.legacy_firestore_id is not null), '{}') as "organizationUnitIds",
      users.created_at as "createdAt", users.updated_at as "updatedAt"
    from public.app_users users
    left join public.user_section_permissions permissions on permissions.user_id = users.id
    left join public.user_unit_scopes scopes on scopes.user_id = users.id
    left join public.organization_units units on units.id = scopes.unit_id
    group by users.id
    order by users.display_name
  `);
  return normalizeRows(result.rows);
}

export async function loadBootstrap(email: string) {
  const master = MASTER_EMAILS.has(email);
  const profile = await loadProfile(email);
  if (!profile) throw new Error('profile-not-found');
  const visibleTabs = profile.visibleTabs || [];
  if (!profile.active) throw new Error('profile-disabled');
  const canView = (section: SectionKey) => visibleTabs.includes(section);
  const agentOnly = !master && profile.role === 'Agente';
  const pool = getPool();

  const [profiles, agents, people, units, occurrences, costs, raCases, visits, cxCases] = await Promise.all([
    master ? loadProfiles() : Promise.resolve(normalizeRows([{ ...profile, id: email }])),
    canView('ocorrencias') ? pool.query(`select name::text from public.occurrence_agents where active order by sort_order,name`) : Promise.resolve({ rows: [] }),
    canView('estrutura') || canView('ocorrencias') ? pool.query(`
      select people.legacy_firestore_id as id,people.name,people.email::text,people.role,supervisor.legacy_firestore_id as "reportsToId",
        people.department,people.regional,people.active,people.created_by_email::text as "createdByEmail",
        people.created_at as "createdAt",people.updated_at as "updatedAt"
      from public.organization_people people
      left join public.organization_people supervisor on supervisor.id=people.reports_to_id
      order by people.created_at`) : Promise.resolve({ rows: [] }),
    canView('estrutura') || canView('ocorrencias') ? pool.query(`
      select units.legacy_firestore_id as id,units.department,units.team_name as "teamName",units.regional,units.active,
        max(people.name) filter (where links.responsibility='Gerente') as "managerName",
        max(people.email::text) filter (where links.responsibility='Gerente') as "managerEmail",
        max(people.name) filter (where links.responsibility='Líder') as "leaderName",
        max(people.email::text) filter (where links.responsibility='Líder') as "leaderEmail",
        max(people.name) filter (where links.responsibility='Coordenador') as "coordinatorName",
        max(people.email::text) filter (where links.responsibility='Coordenador') as "coordinatorEmail",
        units.created_by_email::text as "createdByEmail",units.created_at as "createdAt",units.updated_at as "updatedAt"
      from public.organization_units units
      left join public.organization_unit_people links on links.unit_id=units.id
      left join public.organization_people people on people.id=links.person_id
      group by units.id order by units.created_at desc`) : Promise.resolve({ rows: [] }),
    canView('ocorrencias') ? pool.query(`
      select legacy_firestore_id as id,occurrence_date::text as date,agent_name_snapshot as "agentName",company_name as "companyName",
        state,city,region,order_number as "orderNumber",unique_number as "uniqueNumber",sac_code as "sacCode",
        occurrence_type as "occurrenceType",product,quantity,stage,approval_status as "approvalStatus",carrier,comments,consultant,
        is_damage as "isDamage",damage_amount::float8 as "damageAmount",
        (select legacy_firestore_id from public.organization_units where id=occurrences.organization_unit_id) as "organizationUnitId",
        routed_to_name_snapshot as "routedToName",routed_to_email_snapshot::text as "routedToEmail",
        created_by_email::text as "createdByEmail",created_by_name as "createdByName",import_source as "importSource",import_row as "importRow",
        created_at as "createdAt",updated_at as "updatedAt"
      from public.occurrences
      where ($1::boolean=false or lower(agent_name_snapshot)=lower($2) or lower(coalesce(created_by_email::text,''))=$3)
      order by created_at desc`, [agentOnly, profile.agentName || profile.displayName, email]) : Promise.resolve({ rows: [] }),
    canView('custos') ? pool.query(`
      select legacy_firestore_id as id,cost_date::text as date,order_number as "orderNumber",regional,product,quantity,origin,
        product_cost::float8 as "productCost",logistics_cost::float8 as "logisticsCost",tax_cost::float8 as "taxCost",
        total_cost::float8 as "totalCost",responsible,reason_category as "reasonCategory",detailed_reason as "detailedReason",
        to_char(cost_date,'YYYY-MM') as "monthYear",created_by_email::text as "createdByEmail",created_by_name as "createdByName",
        import_source as "importSource",import_row as "importRow",created_at as "createdAt",updated_at as "updatedAt"
      from public.extra_costs order by created_at desc`) : Promise.resolve({ rows: [] }),
    canView('ra') ? pool.query(`
      select legacy_firestore_id as id,ra_number as "raNumber",customer_name as "customerName",phone,customer_email::text as email,
        information,status,indicator_ir::float8 as "indicatorIR",indicator_is::float8 as "indicatorIS",indicator_ma::float8 as "indicatorMA",
        indicator_in::float8 as "indicatorIN",final_score::float8 as "finalScore",assignee_email_snapshot::text as "assigneeEmail",
        assignee_name_snapshot as "assigneeName",created_by_email::text as "createdByEmail",created_by_name as "createdByName",
        created_at as "createdAt",updated_at as "updatedAt" from public.ra_cases order by created_at desc`) : Promise.resolve({ rows: [] }),
    canView('visitas') ? pool.query(`
      select legacy_firestore_id as id,integrator_name as "integratorName",contact_person as "contactPerson",contact_phone as "contactPhone",
        contact_email::text as "contactEmail",city_state as "cityState",visit_date::text as "visitDate",
        to_char(visit_time,'HH24:MI') as "visitTime",host_name_snapshot as "hostName",host_email_snapshot::text as "hostEmail",
        objective,participants_count as "participantsCount",status,notes,feedback,created_by_email::text as "createdByEmail",
        created_by_name as "createdByName",created_at as "createdAt",updated_at as "updatedAt"
      from public.integrator_visits order by created_at desc`) : Promise.resolve({ rows: [] }),
    MASTER_EMAILS.has(email) ? pool.query(`
      select legacy_firestore_id as id,order_number as "orderNumber",product_code as "productCode",quantity,is_replacement as "isReplacement",
        status,assignee_email_snapshot::text as "assigneeEmail",assignee_name_snapshot as "assigneeName",
        (select legacy_firestore_id from public.organization_units where id=cx_cases.organization_unit_id) as "organizationUnitId",
        target_department as "targetDepartment",target_team as "targetTeam",target_regional as "targetRegional",
        department_assignee_name_snapshot as "departmentAssigneeName",department_assignee_email_snapshot::text as "departmentAssigneeEmail",
        escalation_leader_name_snapshot as "escalationLeaderName",escalation_leader_email_snapshot::text as "escalationLeaderEmail",
        extra_cost_reason as "extraCostReason",observations,created_at as "createdAt",updated_at as "updatedAt"
      from public.cx_cases order by created_at desc`) : Promise.resolve({ rows: [] }),
  ]);

  return {
    profile: normalizeRows([{ ...profile, id: email, visibleTabs }])[0],
    profiles,
    occurrenceAgents: agents.rows.map((row) => String(row.name)),
    organizationPeople: normalizeRows(people.rows),
    organizationUnits: normalizeRows(units.rows),
    occurrences: normalizeRows(occurrences.rows),
    extraCosts: normalizeRows(costs.rows),
    raCases: normalizeRows(raCases.rows),
    visits: normalizeRows(visits.rows),
    cases: normalizeRows(cxCases.rows),
  };
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader?.('Cache-Control', 'private, no-store');
  if (!['GET', 'POST'].includes(request.method || '')) return response.status(405).json({ error: 'Método não permitido.' });
  try {
    const email = await authenticatedEmail(request);
    if (request.method === 'POST') {
      response.status(200).json(await mutateNeon(getPool(), email, request.body || {}));
      return;
    }
    response.status(200).json(await loadBootstrap(email));
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'unauthenticated') return response.status(401).json({ error: 'Sessão não encontrada. Entre novamente.' });
    if (message === 'auth-not-configured') return response.status(503).json({ error: 'A URL do Neon Auth não está configurada corretamente na Vercel.' });
    if (message === 'database-not-configured') return response.status(503).json({ error: 'A conexão DATABASE_URL do Neon não está configurada corretamente na Vercel.' });
    if (message === 'unauthorized') return response.status(403).json({ error: 'E-mail não autorizado.' });
    if (message === 'profile-not-found') return response.status(403).json({ error: 'Seu perfil ainda não foi cadastrado no Neon.' });
    if (message === 'profile-disabled') return response.status(403).json({ error: 'Seu perfil está desativado.' });
    if (message === 'forbidden') return response.status(403).json({ error: 'Seu perfil não permite esta alteração.' });
    if (message === 'invalid-mutation') return response.status(400).json({ error: 'Alteração inválida.' });
    if (message === 'too-many-records') return response.status(400).json({ error: 'Importe no máximo 1.500 registros por vez.' });
    console.error('Erro ao carregar dados do Neon:', error);
    return response.status(500).json({ error: 'Não foi possível carregar os dados do Neon.' });
  }
}
