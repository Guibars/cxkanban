-- Pedidos recebidos do Conecta. Executar apenas no banco fotus-cx.
alter table public.integrator_visits
  drop constraint if exists integrator_visits_status_check;
alter table public.integrator_visits
  add constraint integrator_visits_status_check
  check (status in ('Solicitada', 'Agendada', 'Em Andamento', 'Concluída', 'Cancelada'));

alter table public.integrator_visits
  add column if not exists submission_id uuid unique,
  add column if not exists integrator_cnpj text,
  add column if not exists visit_end_time time,
  add column if not exists objectives text[] not null default '{}',
  add column if not exists objective_other text,
  add column if not exists visitor_names text,
  add column if not exists visitor_roles text[] not null default '{}',
  add column if not exists visitor_role_other text,
  add column if not exists relationship_history text,
  add column if not exists consultant_region text,
  add column if not exists gift_quantity integer,
  add column if not exists materials text[] not null default '{}',
  add column if not exists material_other text,
  add column if not exists include_meal boolean,
  add column if not exists requester_name text,
  add column if not exists requester_email text,
  add column if not exists request_source text;

create table if not exists public.integrator_visit_logos (
  visit_id uuid primary key references public.integrator_visits(id) on delete cascade,
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg')),
  image_bytes bytea not null check (octet_length(image_bytes) <= 2000000),
  uploaded_at timestamptz not null default now()
);
