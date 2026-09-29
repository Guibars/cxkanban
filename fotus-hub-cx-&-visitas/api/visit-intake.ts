import { createHmac, timingSafeEqual } from 'node:crypto';
import { Pool } from 'pg';

type Request = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
type Response = { status: (code: number) => Response; json: (value: unknown) => void; setHeader: (name: string, value: string) => void };

const list = (value: unknown, allowed: string[], required = false): string[] => {
  if (!Array.isArray(value) || value.length > allowed.length || value.some((item) => typeof item !== 'string' || !allowed.includes(item))) throw new Error('invalid-fields');
  const distinct = [...new Set(value)];
  if (required && distinct.length === 0) throw new Error('invalid-fields');
  return distinct;
};
const field = (value: unknown, max: number, required = true): string => {
  if (typeof value !== 'string') throw new Error('invalid-fields');
  const cleaned = value.trim();
  if (cleaned.length > max || (required && !cleaned)) throw new Error('invalid-fields');
  return cleaned;
};
const header = (request: Request, name: string): string => {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : value || '';
};
const pool = () => {
  const connectionString = (process.env.DATABASE_URL || '').trim().replace(/^DATABASE_URL\s*=\s*/i, '').replace(/^['"]|['"]$/g, '');
  if (!/^postgres(?:ql)?:\/\//i.test(connectionString)) throw new Error('database-not-configured');
  const globalPool = globalThis as typeof globalThis & { __fotusVisitPool?: Pool };
  globalPool.__fotusVisitPool ||= new Pool({ connectionString, max: 3, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 20_000 });
  return globalPool.__fotusVisitPool;
};

export default async function handler(request: Request, response: Response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método não permitido.' });
  const secret = process.env.VISIT_BRIDGE_SECRET;
  if (!secret || secret.length < 32) return response.status(503).json({ error: 'Integração ainda não configurada.' });
  try {
    const timestamp = header(request, 'x-fotus-timestamp');
    const signature = header(request, 'x-fotus-signature');
    const seconds = Number(timestamp);
    if (!Number.isSafeInteger(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300 || !/^[0-9a-f]{64}$/.test(signature)) {
      return response.status(401).json({ error: 'Assinatura inválida.' });
    }
    const raw = typeof request.body === 'string' ? request.body : JSON.stringify(request.body || {});
    if (Buffer.byteLength(raw) > 3_000_000) return response.status(413).json({ error: 'Solicitação muito grande.' });
    const expected = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return response.status(401).json({ error: 'Assinatura inválida.' });
    const body = JSON.parse(raw) as Record<string, unknown>;
    const submissionId = field(body.submissionId, 36);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) throw new Error('invalid-fields');
    const integratorName = field(body.integratorName, 160);
    const cnpj = field(body.cnpj, 18).replace(/\D/g, '');
    if (cnpj.length !== 14) throw new Error('invalid-fields');
    const visitDate = field(body.visitDate, 10);
    const startTime = field(body.startTime, 5);
    const endTime = field(body.endTime, 5);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || Number.isNaN(Date.parse(`${visitDate}T00:00:00Z`)) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || endTime <= startTime) throw new Error('invalid-fields');
    const objectives = list(body.objectives, ['Comercial', 'Logístico', 'Financiamento | Venda mais', 'Publicidade', 'Repasse', 'Outra'], true);
    const roles = list(body.visitorRoles, ['CEO', 'Gerente', 'Comprador', 'Vendedor', 'Instalador', 'Outra'], true);
    const materials = list(body.materials, ['Folders', 'Apresentações', 'Catálogos', 'Outra']);
    const objectiveOther = field(body.objectiveOther ?? '', 160, objectives.includes('Outra'));
    const visitorRoleOther = field(body.visitorRoleOther ?? '', 160, roles.includes('Outra'));
    const materialOther = field(body.materialOther ?? '', 160, materials.includes('Outra'));
    const visitorNames = field(body.visitorNames, 1500);
    const relationshipHistory = field(body.relationshipHistory, 4000);
    const consultantRegion = field(body.consultantRegion, 300);
    const requesterName = field(body.requesterName, 160);
    const requesterEmail = field(body.requesterEmail, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) throw new Error('invalid-fields');
    const giftQuantity = body.giftQuantity;
    if (!Number.isInteger(giftQuantity) || Number(giftQuantity) < 0 || Number(giftQuantity) > 10000 || typeof body.includeMeal !== 'boolean') throw new Error('invalid-fields');
    const logo = body.logo as Record<string, unknown> | undefined;
    if (!logo || !['image/png', 'image/jpeg'].includes(String(logo.mime)) || typeof logo.base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(logo.base64)) throw new Error('invalid-fields');
    const image = Buffer.from(logo.base64, 'base64');
    if (!image.length || image.length > 2_000_000 || (logo.mime === 'image/png' && image.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') || (logo.mime === 'image/jpeg' && image.subarray(0, 3).toString('hex') !== 'ffd8ff')) throw new Error('invalid-fields');

    const client = await pool().connect();
    try {
      await client.query('begin');
      const inserted = await client.query<{ id: string }>(`insert into public.integrator_visits (
        legacy_firestore_id,submission_id,integrator_name,integrator_cnpj,contact_person,visit_date,visit_time,visit_end_time,
        host_name_snapshot,objective,objectives,objective_other,participants_count,status,visitor_names,visitor_roles,
        visitor_role_other,relationship_history,consultant_region,gift_quantity,materials,material_other,include_meal,
        requester_name,requester_email,request_source,notes
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,'Equipe Comercial',$9,$10,$11,1,'Solicitada',$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,'conecta', '')
      on conflict do nothing returning id`, [
        submissionId, submissionId, integratorName, cnpj, requesterName, visitDate, startTime, endTime,
        objectives.join(', '), objectives, objectiveOther, visitorNames, roles, visitorRoleOther,
        relationshipHistory, consultantRegion, giftQuantity, materials, materialOther, body.includeMeal,
        requesterName, requesterEmail,
      ]);
      if (inserted.rowCount) {
        await client.query('insert into public.integrator_visit_logos (visit_id,mime_type,image_bytes) values ($1,$2,$3)', [inserted.rows[0].id, logo.mime, image]);
        await client.query(`insert into public.audit_events (action,entity_type,entity_id,after_data)
          values ('create_request','integrator_visits',$1,$2::jsonb)`, [inserted.rows[0].id, JSON.stringify({ source: 'conecta', submissionId })]);
      }
      await client.query('commit');
      return response.status(200).json({ protocol: submissionId, created: Boolean(inserted.rowCount) });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'invalid-fields') return response.status(400).json({ error: 'Revise os campos do formulário.' });
    console.error('Falha ao receber solicitação de visita:', error);
    return response.status(500).json({ error: 'Não foi possível registrar a visita.' });
  }
}
