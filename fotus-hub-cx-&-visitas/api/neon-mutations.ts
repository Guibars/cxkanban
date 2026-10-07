import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { SERVICE_CATEGORIES, SERVICE_STATUSES, VOC_KINDS, VOC_STATUSES, VOC_PRIORITIES } from '../src/lib/serviceDesk.js';

export type MutationBody = {
  resource?: unknown;
  action?: unknown;
  id?: unknown;
  data?: unknown;
  records?: unknown;
};

type Resource = 'occurrences' | 'extra_costs' | 'ra_cases' | 'integrator_visits' | 'occurrence_agents' | 'organization_people' | 'organization_units' | 'service_tickets' | 'voc_feedback';
type Action = 'create' | 'update' | 'delete' | 'bulk-upsert' | 'replace' | 'reorder';
type Payload = Record<string, unknown>;

const RESOURCE_SECTION: Record<Resource, string> = {
  occurrences: 'ocorrencias',
  extra_costs: 'custos',
  ra_cases: 'ra',
  integrator_visits: 'visitas',
  occurrence_agents: 'ocorrencias',
  organization_people: 'estrutura',
  organization_units: 'estrutura',
  service_tickets: 'atendimentos',
  voc_feedback: 'voc',
};

const MASTER_EMAILS = new Set(['guilhermebarbosars@gmail.com', 'matheus.gaspar@fotus.com.br']);
const s = (value: unknown, fallback = '') => value == null ? fallback : String(value).replace(/\s+/g, ' ').trim();
const e = (value: unknown) => s(value).toLowerCase();
const n = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const i = (value: unknown, fallback = 0, minimum = 0) => Math.max(minimum, Math.trunc(n(value, fallback)));
const b = (value: unknown) => value === true;
const time = (value: unknown, fallback = new Date()) => {
  const parsed = typeof value === 'number' ? new Date(value) : value instanceof Date ? value : fallback;
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

type OccurrenceProductPayload = { product: string; quantity: number };

function occurrenceProducts(data: Payload): OccurrenceProductPayload[] {
  const received = Array.isArray(data.products) ? data.products : [];
  const products = received.map((raw) => {
    const item = raw && typeof raw === 'object' ? raw as Payload : {};
    const product = s(item.product);
    return product ? { product, quantity: i(item.quantity, 1, 1) } : null;
  }).filter((item): item is OccurrenceProductPayload => item !== null);
  const fallbackProduct = s(data.product);
  return products.length ? products : fallbackProduct ? [{ product: fallbackProduct, quantity: i(data.quantity, 1, 1) }] : [];
}

function identityPart(value: unknown) {
  return s(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function occurrenceIdentityKeys(data: Payload) {
  const uniqueNumber = identityPart(data.uniqueNumber);
  const sacCode = identityPart(data.sacCode);
  const products = occurrenceProducts(data)
    .map((item) => `${identityPart(item.product)}:${item.quantity}`)
    .sort()
    .join('|');
  const strongKeys = [uniqueNumber ? `unique:${uniqueNumber}` : '', sacCode ? `sac:${sacCode}` : ''].filter(Boolean);
  if (strongKeys.length) return strongKeys;
  return [`details:${[
    identityPart(data.date),
    identityPart(data.orderNumber),
    identityPart(data.companyName),
    identityPart(data.occurrenceType),
    products,
  ].join('|')}`];
}

async function access(pool: Pool, email: string, resource: Resource, action: Action) {
  const result = await pool.query<{
    id: string;
    role: string;
    agentName: string | null;
    displayName: string;
    active: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canView: boolean;
  }>(`select users.id,users.role,users.agent_name as "agentName",users.display_name as "displayName",users.active,
    coalesce(permissions.can_create,false) as "canCreate",coalesce(permissions.can_edit,false) as "canEdit",
    coalesce(permissions.can_delete,false) as "canDelete",coalesce(permissions.can_view,false) as "canView"
    from public.app_users users left join public.user_section_permissions permissions
      on permissions.user_id=users.id and permissions.section_key=$2
    where users.email=$1`, [email, RESOURCE_SECTION[resource]]);
  const profile = result.rows[0];
  if (!profile?.active) throw new Error('forbidden');
  if (MASTER_EMAILS.has(email)) return profile;
  // Atendimentos é compartilhado: todo usuário ativo com acesso à aba pode excluir e tratar os cards.
  if (resource === 'service_tickets') {
    if (!profile.canView) throw new Error('forbidden');
    return profile;
  }
  if (resource === 'voc_feedback' && !profile.canView) throw new Error('forbidden');
  const allowed = action === 'delete' ? profile.canDelete
    : action === 'update' || action === 'reorder' ? profile.canEdit
      : action === 'bulk-upsert' ? profile.canCreate && profile.canEdit
        : profile.canCreate;
  if (!allowed) throw new Error('forbidden');
  if (resource === 'occurrence_agents' && !['Administrador', 'Coordenador', 'Líder'].includes(profile.role)) throw new Error('forbidden');
  return profile;
}

async function unitId(client: PoolClient, legacyId: unknown) {
  const id = s(legacyId);
  if (!id) return null;
  const result = await client.query<{ id: string }>('select id from public.organization_units where legacy_firestore_id=$1', [id]);
  return result.rows[0]?.id || null;
}

async function appUserId(client: PoolClient, email: unknown) {
  const normalized = e(email);
  if (!normalized) return null;
  const result = await client.query<{ id: string }>('select id from public.app_users where email=$1', [normalized]);
  return result.rows[0]?.id || null;
}

async function agentId(client: PoolClient, name: unknown) {
  const normalized = s(name);
  if (!normalized) return null;
  const result = await client.query<{ id: string }>('select id from public.occurrence_agents where name=$1', [normalized]);
  return result.rows[0]?.id || null;
}

async function assertAgentOwnsOccurrence(
  client: PoolClient,
  legacyId: string,
  actorEmail: string,
  agentName: string,
) {
  const result = await client.query<{ allowed: boolean }>(`select
    lower(trim(coalesce(agent_name_snapshot, ''))) = lower(trim($2))
    or lower(trim(coalesce(created_by_email, ''))) = lower(trim($3)) as allowed
    from public.occurrences where legacy_firestore_id=$1`, [legacyId, agentName, actorEmail]);
  if (result.rows[0] && !result.rows[0].allowed) throw new Error('forbidden');
}

async function upsertOccurrence(client: PoolClient, legacyId: string, data: Payload, actorEmail: string, actorUserId: string, forceAgent?: string) {
  const agentName = forceAgent || s(data.agentName, 'Não informado');
  const products = occurrenceProducts(data);
  const productLabel = products.map((item) => item.product).join(', ') || s(data.product, 'Não informado');
  const totalQuantity = products.reduce((sum, item) => sum + item.quantity, 0) || i(data.quantity);
  await client.query(`insert into public.occurrences (
    legacy_firestore_id,occurrence_date,agent_id,agent_name_snapshot,company_name,state,city,region,order_number,unique_number,
    sac_code,occurrence_type,product,quantity,products,stage,approval_status,carrier,comments,consultant,is_damage,damage_amount,
    organization_unit_id,routed_to_name_snapshot,routed_to_email_snapshot,created_by_user_id,created_by_email,created_by_name,
    import_source,import_row,created_at,updated_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)
    on conflict (legacy_firestore_id) do update set occurrence_date=excluded.occurrence_date,agent_id=excluded.agent_id,
      agent_name_snapshot=excluded.agent_name_snapshot,company_name=excluded.company_name,state=excluded.state,city=excluded.city,
      region=excluded.region,order_number=excluded.order_number,unique_number=excluded.unique_number,sac_code=excluded.sac_code,
      occurrence_type=excluded.occurrence_type,product=excluded.product,quantity=excluded.quantity,products=excluded.products,stage=excluded.stage,
      approval_status=excluded.approval_status,carrier=excluded.carrier,comments=excluded.comments,consultant=excluded.consultant,
      is_damage=excluded.is_damage,damage_amount=excluded.damage_amount,organization_unit_id=excluded.organization_unit_id,
      routed_to_name_snapshot=excluded.routed_to_name_snapshot,routed_to_email_snapshot=excluded.routed_to_email_snapshot,
      updated_at=excluded.updated_at`, [legacyId, s(data.date), await agentId(client, agentName), agentName, s(data.companyName, 'Não informada'),
    s(data.state).toUpperCase().slice(0, 2), s(data.city), s(data.region), s(data.orderNumber), s(data.uniqueNumber), s(data.sacCode),
    s(data.occurrenceType, 'Não informado'), productLabel, totalQuantity, JSON.stringify(products),
    s(data.stage, 'Recebida'), s(data.approvalStatus, 'Pendente'), s(data.carrier), s(data.comments), s(data.consultant), b(data.isDamage),
    Math.max(0, n(data.damageAmount)), await unitId(client, data.organizationUnitId), s(data.routedToName) || null,
    e(data.routedToEmail) || null, actorUserId, actorEmail, s(data.createdByName) || null, s(data.importSource) || null,
    data.importRow == null ? null : i(data.importRow), time(data.createdAt), time(data.updatedAt)]);
}

async function upsertExtraCost(client: PoolClient, legacyId: string, data: Payload, actorEmail: string, actorUserId: string) {
  await client.query(`insert into public.extra_costs (
    legacy_firestore_id,cost_date,order_number,regional,product,quantity,origin,product_cost,logistics_cost,tax_cost,responsible,
    reason_category,detailed_reason,created_by_user_id,created_by_email,created_by_name,import_source,import_row,created_at,updated_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
    on conflict (legacy_firestore_id) do update set cost_date=excluded.cost_date,order_number=excluded.order_number,regional=excluded.regional,
      product=excluded.product,quantity=excluded.quantity,origin=excluded.origin,product_cost=excluded.product_cost,
      logistics_cost=excluded.logistics_cost,tax_cost=excluded.tax_cost,responsible=excluded.responsible,
      reason_category=excluded.reason_category,detailed_reason=excluded.detailed_reason,updated_at=excluded.updated_at`, [legacyId, s(data.date),
    s(data.orderNumber, 'Não informado'), s(data.regional), s(data.product, 'Não informado'), i(data.quantity), s(data.origin),
    Math.max(0, n(data.productCost)), Math.max(0, n(data.logisticsCost)), Math.max(0, n(data.taxCost)), s(data.responsible, 'Comercial'),
    s(data.reasonCategory), s(data.detailedReason), actorUserId, actorEmail, s(data.createdByName) || null, s(data.importSource) || null,
    data.importRow == null ? null : i(data.importRow), time(data.createdAt), time(data.updatedAt)]);
}

async function upsertRaCase(client: PoolClient, legacyId: string, data: Payload, actorEmail: string, actorUserId: string) {
  const assigneeEmail = e(data.assigneeEmail) || actorEmail;
  const complaintDate = s(data.complaintDate);
  const parsedDate = new Date(`${complaintDate}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(complaintDate) || Number.isNaN(parsedDate.getTime())
    || parsedDate.toISOString().slice(0, 10) !== complaintDate) throw new Error('invalid-mutation');
  await client.query(`insert into public.ra_cases (
    legacy_firestore_id,complaint_date,ra_number,customer_name,phone,customer_email,information,status,resolved,indicator_ir,indicator_is,indicator_ma,
    indicator_in,final_score,assignee_user_id,assignee_email_snapshot,assignee_name_snapshot,created_by_user_id,created_by_email,
    created_by_name,created_at,updated_at)
    values ($1,$2::date,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
    on conflict (legacy_firestore_id) do update set complaint_date=excluded.complaint_date,ra_number=excluded.ra_number,customer_name=excluded.customer_name,phone=excluded.phone,
      customer_email=excluded.customer_email,information=excluded.information,status=excluded.status,resolved=excluded.resolved,indicator_ir=excluded.indicator_ir,
      indicator_is=excluded.indicator_is,indicator_ma=excluded.indicator_ma,indicator_in=excluded.indicator_in,final_score=excluded.final_score,
      assignee_user_id=excluded.assignee_user_id,assignee_email_snapshot=excluded.assignee_email_snapshot,
      assignee_name_snapshot=excluded.assignee_name_snapshot,updated_at=excluded.updated_at`, [legacyId, complaintDate, s(data.raNumber, legacyId),
    s(data.customerName, 'Não informado'), s(data.phone), e(data.email) || null, s(data.information), s(data.status, 'Em Andamento'),
    data.resolved === true ? true : data.resolved === false ? false : null,
    data.indicatorIR == null ? null : n(data.indicatorIR), data.indicatorIS == null ? null : n(data.indicatorIS),
    data.indicatorMA == null ? null : n(data.indicatorMA), data.indicatorIN == null ? null : n(data.indicatorIN),
    data.finalScore == null ? null : n(data.finalScore), await appUserId(client, assigneeEmail), assigneeEmail,
    s(data.assigneeName) || null, actorUserId, actorEmail, s(data.createdByName) || null, time(data.createdAt), time(data.updatedAt)]);
}

async function upsertVisit(client: PoolClient, legacyId: string, data: Payload, actorEmail: string, actorUserId: string) {
  const hostEmail = e(data.hostEmail) || actorEmail;
  await client.query(`insert into public.integrator_visits (
    legacy_firestore_id,integrator_name,contact_person,contact_phone,contact_email,city_state,visit_date,visit_time,host_user_id,
    host_name_snapshot,host_email_snapshot,objective,participants_count,status,notes,feedback,created_by_user_id,created_by_email,
    created_by_name,created_at,updated_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    on conflict (legacy_firestore_id) do update set integrator_name=excluded.integrator_name,contact_person=excluded.contact_person,
      contact_phone=excluded.contact_phone,contact_email=excluded.contact_email,city_state=excluded.city_state,visit_date=excluded.visit_date,
      visit_time=excluded.visit_time,host_user_id=excluded.host_user_id,host_name_snapshot=excluded.host_name_snapshot,
      host_email_snapshot=excluded.host_email_snapshot,objective=excluded.objective,participants_count=excluded.participants_count,
      status=excluded.status,notes=excluded.notes,feedback=excluded.feedback,updated_at=excluded.updated_at`, [legacyId,
    s(data.integratorName, 'Não informado'), s(data.contactPerson, 'Não informado'), s(data.contactPhone), e(data.contactEmail) || null,
    s(data.cityState), s(data.visitDate), s(data.visitTime) || null, await appUserId(client, hostEmail), s(data.hostName), hostEmail,
    s(data.objective, 'Não informado'), i(data.participantsCount, 1, 1), s(data.status, 'Agendada'), s(data.notes), s(data.feedback),
    actorUserId, actorEmail, s(data.createdByName) || null, time(data.createdAt), time(data.updatedAt)]);
}

async function upsertOrganizationPerson(client: PoolClient, legacyId: string, data: Payload, actorEmail: string) {
  const reportsToLegacyId = s(data.reportsToId);
  const supervisor = reportsToLegacyId
    ? await client.query<{ id: string }>('select id from public.organization_people where legacy_firestore_id=$1 and active=true', [reportsToLegacyId])
    : null;
  const normalizedEmail = e(data.email) || null;
  const name = s(data.name);
  const jobTitle = s(data.jobTitle);
  const phone = s(data.phone);
  const teamName = s(data.teamName);
  const photoUrl = s(data.photoUrl);
  if (!name || name.length > 150 || jobTitle.length > 150 || teamName.length > 200 || phone.length > 40 || photoUrl.length > 50_000 || (photoUrl &&
    !/^\/organization\/[a-z0-9-]+\.jpg$/.test(photoUrl) &&
    !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photoUrl))) throw new Error('invalid-mutation');
  if (photoUrl.startsWith('data:')) {
    const bytes = Buffer.from(photoUrl.split(',')[1], 'base64');
    if (bytes.length > 37_000 || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new Error('invalid-mutation');
  }
  if (reportsToLegacyId && !supervisor?.rows[0]) throw new Error('invalid-mutation');
  await client.query(`insert into public.organization_people
    (legacy_firestore_id,app_user_id,name,email,job_title,phone,photo_url,sort_order,role,reports_to_id,department,regional,team_name,active,created_by_email,created_at,updated_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    on conflict (legacy_firestore_id) do update set app_user_id=excluded.app_user_id,
      name=excluded.name,email=excluded.email,job_title=excluded.job_title,phone=excluded.phone,photo_url=excluded.photo_url,
      sort_order=excluded.sort_order,role=excluded.role,reports_to_id=excluded.reports_to_id,
      department=excluded.department,regional=excluded.regional,team_name=excluded.team_name,active=excluded.active,updated_at=excluded.updated_at`, [legacyId,
    await appUserId(client, normalizedEmail), name, normalizedEmail, jobTitle, phone, photoUrl || null,
    i(data.sortOrder, 0), s(data.role, 'Líder'),
    s(data.role) === 'Head' ? null : supervisor?.rows[0]?.id || null, s(data.department), s(data.regional), teamName,
    data.active !== false, actorEmail, time(data.createdAt), time(data.updatedAt)]);
}

function experienceText(value: unknown, maximum: number, required = false) {
  if (typeof value !== 'string' && value != null) throw new Error('invalid-mutation');
  const text = (value as string | null | undefined)?.trim() || '';
  if (text.length > maximum || (required && !text)) throw new Error('invalid-mutation');
  return text;
}

function experienceEnum(value: unknown, choices: readonly string[]) {
  if (typeof value !== 'string' || !choices.includes(value)) throw new Error('invalid-mutation');
  return value;
}

function experienceRecord(data: Payload) {
  const date = experienceText(data.date, 10, true);
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error('invalid-mutation');
  return { date, title: experienceText(data.title, 180, true), customer: experienceText(data.customerName, 150),
    order: experienceText(data.orderNumber, 80), description: experienceText(data.description, 8000, true),
    assignee: experienceText(data.assigneeName, 150, true) };
}

async function upsertExperience(client: PoolClient, resource: 'service_tickets' | 'voc_feedback', id: string, data: Payload, actorEmail: string, actorUserId: string, actorName: string) {
  const record = experienceRecord(data);
  if (resource === 'service_tickets') {
    if (!Array.isArray(data.categories) || !data.categories.length || data.categories.length > SERVICE_CATEGORIES.length) throw new Error('invalid-mutation');
    const categories = [...new Set(data.categories.map(value => experienceEnum(value, SERVICE_CATEGORIES)))];
    const status = experienceEnum(data.status, SERVICE_STATUSES);
    const resolution = experienceText(data.resolution, 4000);
    await client.query(`insert into public.service_tickets
      (legacy_firestore_id,ticket_date,title,customer_name,order_number,categories,description,assignee_name,status,resolution,created_by_user_id,created_by_email,created_by_name)
      values ($1,$2::date,$3,$4,$5,$6::text[],$7,$8,$9,$10,$11,$12,$13)
      on conflict (legacy_firestore_id) do update set ticket_date=excluded.ticket_date,title=excluded.title,
        customer_name=excluded.customer_name,order_number=excluded.order_number,categories=excluded.categories,
        description=excluded.description,assignee_name=excluded.assignee_name,status=excluded.status,resolution=excluded.resolution,updated_at=now()`,
    [id, record.date, record.title, record.customer, record.order, categories, record.description, record.assignee, status, resolution, actorUserId, actorEmail, actorName]);
  } else {
    const kind = experienceEnum(data.kind, VOC_KINDS);
    const status = experienceEnum(data.status, VOC_STATUSES);
    const priority = experienceEnum(data.priority, VOC_PRIORITIES);
    await client.query(`insert into public.voc_feedback
      (legacy_firestore_id,feedback_date,title,customer_name,order_number,description,kind,theme,responsible_area,source,priority,status,assignee_name,action_plan,created_by_user_id,created_by_email,created_by_name)
      values ($1,$2::date,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      on conflict (legacy_firestore_id) do update set feedback_date=excluded.feedback_date,title=excluded.title,
        customer_name=excluded.customer_name,order_number=excluded.order_number,description=excluded.description,kind=excluded.kind,
        theme=excluded.theme,responsible_area=excluded.responsible_area,source=excluded.source,priority=excluded.priority,
        status=excluded.status,assignee_name=excluded.assignee_name,action_plan=excluded.action_plan,updated_at=now()`,
    [id, record.date, record.title, record.customer, record.order, record.description, kind, experienceText(data.theme, 120, true),
      experienceText(data.responsibleArea, 120, true), experienceText(data.source, 80, true), priority, status, record.assignee,
      experienceText(data.actionPlan, 4000), actorUserId, actorEmail, actorName]);
  }
}

export async function mutateNeon(pool: Pool, actorEmail: string, body: MutationBody) {
  const resource = s(body.resource) as Resource;
  const action = s(body.action) as Action;
  if (!Object.hasOwn(RESOURCE_SECTION, resource) || !['create', 'update', 'delete', 'bulk-upsert', 'replace', 'reorder'].includes(action)) throw new Error('invalid-mutation');
  if ((action === 'replace') !== (resource === 'occurrence_agents')
    || (action === 'reorder' && resource !== 'organization_people')
    || (action === 'bulk-upsert' && resource !== 'occurrences' && resource !== 'extra_costs')) throw new Error('invalid-mutation');
  if (['service_tickets', 'voc_feedback'].includes(resource) && !['create', 'update', 'delete'].includes(action)) throw new Error('invalid-mutation');
  const profile = await access(pool, actorEmail, resource, action);
  const client = await pool.connect();
  let bulkOccurrenceResult: { inserted: number; skipped: number } | null = null;
  try {
    await client.query('begin');
    await client.query("set local statement_timeout='30s'");
    const payload = body.data && typeof body.data === 'object' ? body.data as Payload : {};
    const id = action === 'create' ? randomUUID() : s(body.id);
    if (['service_tickets', 'voc_feedback'].includes(resource) && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('invalid-mutation');
    if (action === 'update') {
      if (!id) throw new Error('invalid-mutation');
      const existing = await client.query(`select 1 from public.${resource} where legacy_firestore_id=$1 for update`, [id]);
      if (!existing.rowCount) throw new Error('invalid-mutation');
    }
    if (action === 'reorder') {
      const ids = Array.isArray(payload.ids) ? payload.ids.map((value) => s(value)) : [];
      if (!ids.length || ids.length > 500 || new Set(ids).size !== ids.length) throw new Error('invalid-mutation');
      const found = await client.query<{ id: string; role: string }>(
        'select id,role from public.organization_people where legacy_firestore_id=any($1::text[]) for update', [ids]);
      if (found.rows.length !== ids.length || new Set(found.rows.map((person) => person.role)).size !== 1) throw new Error('invalid-mutation');
      await client.query(`update public.organization_people as people set sort_order=ordered.position,updated_at=now()
        from unnest($1::text[]) with ordinality as ordered(legacy_id,position)
        where people.legacy_firestore_id=ordered.legacy_id`, [ids]);
    } else if (action === 'delete') {
      if (resource === 'occurrence_agents') throw new Error('invalid-mutation');
      if (resource === 'occurrences' && profile.role === 'Agente') {
        await assertAgentOwnsOccurrence(client, id, actorEmail, profile.agentName || profile.displayName);
      }
      const table = resource;
      const deleted = await client.query(`delete from public.${table} where legacy_firestore_id=$1 returning id`, [id]);
      if (['integrator_visits', 'service_tickets', 'voc_feedback'].includes(resource) && !deleted.rowCount) throw new Error('invalid-mutation');
    } else if (resource === 'occurrence_agents' && action === 'replace') {
      const names = Array.isArray(payload.names) ? [...new Set(payload.names.map((item) => s(item)).filter(Boolean))] : [];
      if (!names.length || names.length > 100 || names.some(name => name.length > 150)) throw new Error('invalid-mutation');
      await client.query('update public.occurrence_agents set active=false');
      for (let index = 0; index < names.length; index += 1) await client.query(`insert into public.occurrence_agents (name,active,sort_order,created_by_email)
        values ($1,true,$2,$3) on conflict (name) do update set active=true,sort_order=excluded.sort_order`, [names[index], index, actorEmail]);
    } else {
      const records = action === 'bulk-upsert' && Array.isArray(body.records) ? body.records : [{ ...payload, id }];
      if (records.length > 1500) throw new Error('too-many-records');
      const occurrenceKeys = new Set<string>();
      if (resource === 'occurrences' && action === 'bulk-upsert') {
        const existing = await client.query(`select occurrence_date::text as date,company_name as "companyName",
          order_number as "orderNumber",unique_number as "uniqueNumber",sac_code as "sacCode",
          occurrence_type as "occurrenceType",product,quantity,products from public.occurrences`);
        existing.rows.forEach((row) => occurrenceIdentityKeys(row as Payload).forEach((key) => occurrenceKeys.add(key)));
      }
      let inserted = 0;
      let skipped = 0;
      for (const raw of records) {
        const record = raw && typeof raw === 'object' ? raw as Payload : {};
        const legacyId = s(record.id) || randomUUID();
        const forcedAgent = profile.role === 'Agente' ? profile.agentName || profile.displayName : undefined;
        if (resource === 'occurrences') {
          const keys = occurrenceIdentityKeys(record);
          if (action === 'bulk-upsert' && keys.some((key) => occurrenceKeys.has(key))) {
            skipped += 1;
            continue;
          }
          if (forcedAgent) await assertAgentOwnsOccurrence(client, legacyId, actorEmail, forcedAgent);
          await upsertOccurrence(client, legacyId, record, actorEmail, profile.id, forcedAgent);
          keys.forEach((key) => occurrenceKeys.add(key));
          inserted += 1;
        }
        else if (resource === 'extra_costs') await upsertExtraCost(client, legacyId, record, actorEmail, profile.id);
        else if (resource === 'ra_cases') await upsertRaCase(client, legacyId, record, actorEmail, profile.id);
        else if (resource === 'integrator_visits') await upsertVisit(client, legacyId, record, actorEmail, profile.id);
        else if (resource === 'organization_people') await upsertOrganizationPerson(client, legacyId, record, actorEmail);
        else if (resource === 'service_tickets' || resource === 'voc_feedback') await upsertExperience(client, resource, legacyId, record, actorEmail, profile.id, profile.displayName);
        else if (resource === 'organization_units') throw new Error('invalid-mutation');
      }
      if (resource === 'occurrences' && action === 'bulk-upsert') {
        bulkOccurrenceResult = { inserted, skipped };
        await client.query(`insert into public.audit_events (actor_user_id,actor_email,action,entity_type,entity_id,after_data)
          values ($1,$2,'bulk-import-result','occurrences',null,$3::jsonb)`, [profile.id, actorEmail, JSON.stringify({ inserted, skipped })]);
      }
    }
    const auditData = resource === 'service_tickets' || resource === 'voc_feedback'
      ? { status: payload.status || null, kind: payload.kind || null, categories: payload.categories || null }
      : action === 'bulk-upsert'
      ? { count: Array.isArray(body.records) ? body.records.length : 0 }
      : resource === 'organization_people' && 'photoUrl' in payload
        ? { ...payload, photoUrl: payload.photoUrl ? '[foto]' : null }
        : payload;
    await client.query(`insert into public.audit_events (actor_user_id,actor_email,action,entity_type,entity_id,after_data)
      values ($1,$2,$3,$4,$5,$6::jsonb)`, [profile.id, actorEmail, action, resource, resource === 'service_tickets' || resource === 'voc_feedback' ? id : s(body.id) || null, JSON.stringify(auditData)]);
    await client.query('commit');
    if (bulkOccurrenceResult) return { ok: true, id, ...bulkOccurrenceResult };
    return { ok: true, id };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
