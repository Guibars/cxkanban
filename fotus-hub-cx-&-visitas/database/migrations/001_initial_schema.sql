-- Fotus CX — estrutura inicial do Neon/Postgres
-- Esta migração cria somente a base de dados. As políticas RLS entram depois
-- da ativação do Neon Auth, antes de qualquer Data API ser exposta.

begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id text unique,
  email citext not null unique,
  display_name text not null,
  role text not null default 'Agente'
    check (role in ('Agente', 'Gerente', 'Líder', 'Coordenador', 'Administrador')),
  agent_name text,
  active boolean not null default true,
  last_login_at timestamptz,
  created_by_user_id uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_sections (
  section_key text primary key,
  label text not null,
  description text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.user_section_permissions (
  user_id uuid not null references public.app_users(id) on delete cascade,
  section_key text not null references public.app_sections(section_key) on delete cascade,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  granted_by_user_id uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, section_key)
);

create table if not exists public.organization_people (
  id uuid primary key default gen_random_uuid(),
  legacy_firestore_id text unique,
  app_user_id uuid unique references public.app_users(id) on delete set null,
  name text not null,
  email citext not null unique,
  role text not null check (role in ('Head', 'Gerente', 'Coordenador', 'Líder')),
  reports_to_id uuid references public.organization_people(id) on delete restrict,
  department text not null default '',
  regional text not null default '',
  active boolean not null default true,
  created_by_email citext,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (role = 'Head' and reports_to_id is null)
    or (role <> 'Head' and reports_to_id is not null)
  )
);

create or replace function public.validate_organization_hierarchy()
returns trigger
language plpgsql
as $$
declare
  supervisor_role text;
  expected_role text;
begin
  if new.role = 'Head' then
    if new.reports_to_id is not null then
      raise exception 'Head não pode responder para outra pessoa';
    end if;
    return new;
  end if;

  if new.reports_to_id = new.id then
    raise exception 'Uma pessoa não pode responder para ela mesma';
  end if;

  select role into supervisor_role
  from public.organization_people
  where id = new.reports_to_id and active = true;

  expected_role := case new.role
    when 'Gerente' then 'Head'
    when 'Coordenador' then 'Gerente'
    when 'Líder' then 'Coordenador'
  end;

  if supervisor_role is null or supervisor_role <> expected_role then
    raise exception '% deve responder para um % ativo', new.role, expected_role;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_organization_hierarchy on public.organization_people;
create trigger trg_validate_organization_hierarchy
before insert or update of role, reports_to_id on public.organization_people
for each row execute function public.validate_organization_hierarchy();

create table if not exists public.organization_units (
  id uuid primary key default gen_random_uuid(),
  legacy_firestore_id text unique,
  department text not null,
  team_name text not null,
  regional text not null default '',
  active boolean not null default true,
  created_by_email citext,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department, team_name, regional)
);

create table if not exists public.organization_unit_people (
  unit_id uuid not null references public.organization_units(id) on delete cascade,
  person_id uuid not null references public.organization_people(id) on delete restrict,
  responsibility text not null
    check (responsibility in ('Head', 'Gerente', 'Coordenador', 'Líder', 'Membro')),
  created_at timestamptz not null default now(),
  primary key (unit_id, person_id, responsibility)
);

create table if not exists public.user_unit_scopes (
  user_id uuid not null references public.app_users(id) on delete cascade,
  unit_id uuid not null references public.organization_units(id) on delete cascade,
  access_level text not null default 'Membro'
    check (access_level in ('Membro', 'Liderança', 'Administração')),
  created_at timestamptz not null default now(),
  primary key (user_id, unit_id)
);

create table if not exists public.occurrence_agents (
  id uuid primary key default gen_random_uuid(),
  name citext not null unique,
  app_user_id uuid unique references public.app_users(id) on delete set null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_by_email citext,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.occurrences (
  id uuid primary key default gen_random_uuid(),
  legacy_firestore_id text unique,
  occurrence_date date not null,
  agent_id uuid references public.occurrence_agents(id) on delete set null,
  agent_name_snapshot text not null,
  company_name text not null,
  state char(2) not null default '',
  city text not null default '',
  region text not null default '',
  order_number text not null default '',
  unique_number text not null default '',
  sac_code text not null default '',
  occurrence_type text not null,
  product text not null,
  quantity integer not null default 0 check (quantity >= 0),
  stage text not null default 'Recebida'
    check (stage in ('Recebida', 'Em Análise', 'Aguardando Retorno', 'Finalizada')),
  approval_status text not null default 'Pendente'
    check (approval_status in ('Pendente', 'Aprovado', 'Reprovado')),
  carrier text not null default '',
  comments text not null default '',
  consultant text not null default '',
  is_damage boolean not null default false,
  damage_amount numeric(14,2) not null default 0 check (damage_amount >= 0),
  organization_unit_id uuid references public.organization_units(id) on delete set null,
  routed_to_person_id uuid references public.organization_people(id) on delete set null,
  routed_to_name_snapshot text,
  routed_to_email_snapshot citext,
  created_by_user_id uuid references public.app_users(id) on delete set null,
  created_by_email citext,
  created_by_name text,
  import_source text,
  import_row integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_source, import_row)
);

create table if not exists public.extra_costs (
  id uuid primary key default gen_random_uuid(),
  legacy_firestore_id text unique,
  cost_date date not null,
  order_number text not null,
  regional text not null default '',
  product text not null,
  quantity integer not null default 0 check (quantity >= 0),
  origin text not null default '',
  product_cost numeric(14,2) not null default 0 check (product_cost >= 0),
  logistics_cost numeric(14,2) not null default 0 check (logistics_cost >= 0),
  tax_cost numeric(14,2) not null default 0 check (tax_cost >= 0),
  total_cost numeric(14,2) generated always as (product_cost + logistics_cost + tax_cost) stored,
  responsible text not null check (responsible in ('Comercial', 'Cliente')),
  reason_category text not null default '',
  detailed_reason text not null default '',
  created_by_user_id uuid references public.app_users(id) on delete set null,
  created_by_email citext,
  created_by_name text,
  import_source text,
  import_row integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_source, import_row)
);

create table if not exists public.ra_cases (
  id uuid primary key default gen_random_uuid(),
  legacy_firestore_id text unique,
  ra_number text not null unique,
  customer_name text not null,
  phone text not null default '',
  customer_email citext,
  information text not null default '',
  status text not null default 'Aberto'
    check (status in ('Aberto', 'Em Andamento', 'Resolvido', 'Cancelado')),
  indicator_ir numeric(6,2),
  indicator_is numeric(6,2),
  indicator_ma numeric(6,2),
  indicator_in numeric(6,2),
  final_score numeric(6,2),
  assignee_user_id uuid references public.app_users(id) on delete set null,
  assignee_email_snapshot citext,
  assignee_name_snapshot text,
  created_by_user_id uuid references public.app_users(id) on delete set null,
  created_by_email citext,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integrator_visits (
  id uuid primary key default gen_random_uuid(),
  legacy_firestore_id text unique,
  integrator_name text not null,
  contact_person text not null,
  contact_phone text not null default '',
  contact_email citext,
  city_state text not null default '',
  visit_date date not null,
  visit_time time,
  host_user_id uuid references public.app_users(id) on delete set null,
  host_name_snapshot text not null default '',
  host_email_snapshot citext,
  objective text not null,
  participants_count integer not null default 1 check (participants_count >= 1),
  status text not null default 'Agendada'
    check (status in ('Agendada', 'Em Andamento', 'Concluída', 'Cancelada')),
  notes text not null default '',
  feedback text not null default '',
  created_by_user_id uuid references public.app_users(id) on delete set null,
  created_by_email citext,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cx_cases (
  id uuid primary key default gen_random_uuid(),
  legacy_firestore_id text unique,
  order_number text not null,
  product_code text not null,
  quantity integer not null default 1 check (quantity >= 1),
  is_replacement boolean not null default false,
  status text not null default 'Aberto'
    check (status in ('Aberto', 'Em Andamento', 'Resolvido', 'Cancelado')),
  assignee_user_id uuid references public.app_users(id) on delete set null,
  assignee_email_snapshot citext,
  assignee_name_snapshot text,
  organization_unit_id uuid references public.organization_units(id) on delete set null,
  target_department text,
  target_team text,
  target_regional text,
  department_assignee_name_snapshot text,
  department_assignee_email_snapshot citext,
  escalation_leader_name_snapshot text,
  escalation_leader_email_snapshot citext,
  extra_cost_reason text not null default '',
  observations text not null default '',
  created_by_user_id uuid references public.app_users(id) on delete set null,
  created_by_email citext,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cx_case_extra_costs (
  id uuid primary key default gen_random_uuid(),
  cx_case_id uuid not null references public.cx_cases(id) on delete cascade,
  description text not null,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.cx_case_tags (
  cx_case_id uuid not null references public.cx_cases(id) on delete cascade,
  tag citext not null,
  primary key (cx_case_id, tag)
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.app_users(id) on delete set null,
  actor_email citext,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

insert into public.app_sections (section_key, label, description, sort_order)
values
  ('visao-geral', 'Visão Geral', 'Resumo executivo das áreas liberadas', 10),
  ('ocorrencias', 'Ocorrências', 'Controle operacional e produtividade', 20),
  ('custos', 'Custo Extra', 'Custos, aprovações e relatórios', 30),
  ('ra', 'Reclame Aqui', 'Casos e indicadores do Reclame Aqui', 40),
  ('visitas', 'Visitas', 'Agenda e acompanhamento de integradores', 50),
  ('estrutura', 'Estrutura', 'Pessoas, times e hierarquia organizacional', 60)
on conflict (section_key) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order,
    active = true;

insert into public.app_users (email, display_name, role, active)
values
  ('guilhermebarbosars@gmail.com', 'Guilherme Barbosa', 'Administrador', true)
on conflict (email) do update
set role = 'Administrador',
    active = true,
    updated_at = now();

insert into public.user_section_permissions (
  user_id,
  section_key,
  can_view,
  can_create,
  can_edit,
  can_delete
)
select users.id, sections.section_key, true, true, true, true
from public.app_users users
cross join public.app_sections sections
where users.email = 'guilhermebarbosars@gmail.com'
on conflict (user_id, section_key) do update
set can_view = true,
    can_create = true,
    can_edit = true,
    can_delete = true,
    updated_at = now();

create index if not exists idx_app_users_active_role
  on public.app_users (active, role);
create index if not exists idx_organization_people_hierarchy
  on public.organization_people (reports_to_id, role, active);
create index if not exists idx_organization_units_regional
  on public.organization_units (regional, active);
create index if not exists idx_occurrences_date_stage
  on public.occurrences (occurrence_date desc, stage);
create index if not exists idx_occurrences_agent_date
  on public.occurrences (agent_id, occurrence_date desc);
create index if not exists idx_occurrences_carrier_date
  on public.occurrences (carrier, occurrence_date desc);
create index if not exists idx_occurrences_state_date
  on public.occurrences (state, occurrence_date desc);
create index if not exists idx_occurrences_damage
  on public.occurrences (is_damage, occurrence_date desc)
  where is_damage = true;
create index if not exists idx_extra_costs_date
  on public.extra_costs (cost_date desc);
create index if not exists idx_extra_costs_regional_date
  on public.extra_costs (regional, cost_date desc);
create index if not exists idx_extra_costs_responsible_date
  on public.extra_costs (responsible, cost_date desc);
create index if not exists idx_ra_cases_status_updated
  on public.ra_cases (status, updated_at desc);
create index if not exists idx_integrator_visits_date_status
  on public.integrator_visits (visit_date desc, status);
create index if not exists idx_audit_events_entity
  on public.audit_events (entity_type, entity_id, created_at desc);

drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at before update on public.app_users
for each row execute function public.set_updated_at();
drop trigger if exists trg_user_section_permissions_updated_at on public.user_section_permissions;
create trigger trg_user_section_permissions_updated_at before update on public.user_section_permissions
for each row execute function public.set_updated_at();
drop trigger if exists trg_organization_people_updated_at on public.organization_people;
create trigger trg_organization_people_updated_at before update on public.organization_people
for each row execute function public.set_updated_at();
drop trigger if exists trg_organization_units_updated_at on public.organization_units;
create trigger trg_organization_units_updated_at before update on public.organization_units
for each row execute function public.set_updated_at();
drop trigger if exists trg_occurrence_agents_updated_at on public.occurrence_agents;
create trigger trg_occurrence_agents_updated_at before update on public.occurrence_agents
for each row execute function public.set_updated_at();
drop trigger if exists trg_occurrences_updated_at on public.occurrences;
create trigger trg_occurrences_updated_at before update on public.occurrences
for each row execute function public.set_updated_at();
drop trigger if exists trg_extra_costs_updated_at on public.extra_costs;
create trigger trg_extra_costs_updated_at before update on public.extra_costs
for each row execute function public.set_updated_at();
drop trigger if exists trg_ra_cases_updated_at on public.ra_cases;
create trigger trg_ra_cases_updated_at before update on public.ra_cases
for each row execute function public.set_updated_at();
drop trigger if exists trg_integrator_visits_updated_at on public.integrator_visits;
create trigger trg_integrator_visits_updated_at before update on public.integrator_visits
for each row execute function public.set_updated_at();
drop trigger if exists trg_cx_cases_updated_at on public.cx_cases;
create trigger trg_cx_cases_updated_at before update on public.cx_cases
for each row execute function public.set_updated_at();

create or replace view public.v_occurrence_monthly_summary as
select
  date_trunc('month', occurrence_date)::date as month,
  agent_name_snapshot as agent_name,
  upper(trim(carrier)) as carrier,
  upper(trim(state)) as state,
  count(*)::bigint as occurrence_count,
  count(*) filter (where stage = 'Finalizada')::bigint as finalized_count,
  count(*) filter (where stage <> 'Finalizada')::bigint as open_count,
  sum(damage_amount) filter (where is_damage)::numeric(14,2) as damage_total
from public.occurrences
group by 1, 2, 3, 4;

create or replace view public.v_extra_cost_monthly_summary as
select
  date_trunc('month', cost_date)::date as month,
  regional,
  responsible,
  count(*)::bigint as occurrence_count,
  sum(total_cost)::numeric(14,2) as total_cost
from public.extra_costs
group by 1, 2, 3;

commit;
