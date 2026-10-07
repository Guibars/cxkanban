-- Execute uma vez no SQL Editor do Neon, depois das migrações anteriores.
-- Cria Atendimentos e VoC e retira as quatro agentes desligadas da lista ativa.
-- Preserva todos os registros e as contas de login; perfis vinculados às agentes são desativados.
begin;

insert into public.app_sections (section_key,label,description,sort_order,active)
values ('atendimentos','Atendimentos','Tratativas e soluções da equipe',7,true),
       ('voc','VoC','Voz do cliente: feedbacks e oportunidades de melhoria',8,true)
on conflict (section_key) do update set label=excluded.label,description=excluded.description,active=true;

create table if not exists public.service_tickets (
  id uuid primary key default gen_random_uuid(),
  legacy_firestore_id text not null unique,
  ticket_date date not null,
  title text not null check (char_length(title) between 1 and 180),
  customer_name text not null default '' check (char_length(customer_name)<=150),
  order_number text not null default '' check (char_length(order_number)<=80),
  categories text[] not null check (cardinality(categories) between 1 and 5
    and array_position(categories,null) is null
    and categories <@ array['Solução para entrega','Solução fiscal','Avarias na Entrega','Processo Seletivo','Compliance']::text[]),
  description text not null check (char_length(description) between 1 and 8000),
  assignee_name text not null check (char_length(assignee_name) between 1 and 150),
  status text not null default 'Aberto' check (status in ('Aberto','Em Andamento','Finalizado')),
  resolution text not null default '' check (char_length(resolution)<=4000),
  created_by_user_id uuid references public.app_users(id) on delete set null,
  created_by_email citext not null,
  created_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voc_feedback (
  id uuid primary key default gen_random_uuid(),
  legacy_firestore_id text not null unique,
  feedback_date date not null,
  title text not null check (char_length(title) between 1 and 180),
  customer_name text not null default '' check (char_length(customer_name)<=150),
  order_number text not null default '' check (char_length(order_number)<=80),
  description text not null check (char_length(description) between 1 and 8000),
  kind text not null check (kind in ('Reclamação','Sugestão','Elogio','Dor')),
  theme text not null check (char_length(theme) between 1 and 120),
  responsible_area text not null check (char_length(responsible_area) between 1 and 120),
  source text not null check (char_length(source) between 1 and 80),
  priority text not null default 'Média' check (priority in ('Baixa','Média','Alta')),
  status text not null default 'Novo' check (status in ('Novo','Em análise','Em melhoria','Concluído')),
  assignee_name text not null check (char_length(assignee_name) between 1 and 150),
  action_plan text not null default '' check (char_length(action_plan)<=4000),
  created_by_user_id uuid references public.app_users(id) on delete set null,
  created_by_email citext not null,
  created_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_tickets_date on public.service_tickets (ticket_date desc,created_at desc);
create index if not exists idx_voc_feedback_date on public.voc_feedback (feedback_date desc,created_at desc);

drop trigger if exists trg_service_tickets_updated_at on public.service_tickets;
create trigger trg_service_tickets_updated_at before update on public.service_tickets
for each row execute function public.set_updated_at();
drop trigger if exists trg_voc_feedback_updated_at on public.voc_feedback;
create trigger trg_voc_feedback_updated_at before update on public.voc_feedback
for each row execute function public.set_updated_at();

-- Os dados são acessados pelas APIs do servidor, que validam identidade e permissões.
alter table public.service_tickets enable row level security;
alter table public.voc_feedback enable row level security;
revoke all on public.service_tickets,public.voc_feedback from public;

-- Comparação sem acentos para Júlia/Julia e Laís/Lais.
update public.occurrence_agents set active=false
where translate(lower(trim(name::text)),'áàâãéêíóôõúüç','aaaaeeiooouuc')
  in ('adriely','carol','julia','lais');

-- Desativa somente perfis de agentes com vínculo explícito, sem adivinhar pelo e-mail.
update public.app_users users set active=false,updated_at=now()
where users.role='Agente' and (
  translate(lower(trim(coalesce(users.agent_name,''))),'áàâãéêíóôõúüç','aaaaeeiooouuc') in ('adriely','carol','julia','lais')
  or exists (select 1 from public.occurrence_agents agents where agents.app_user_id=users.id
    and translate(lower(trim(agents.name::text)),'áàâãéêíóôõúüç','aaaaeeiooouuc') in ('adriely','carol','julia','lais'))
);

-- Libera as novas abas para os colaboradores ativos. Todos podem excluir Atendimentos.
-- Em VoC, exclusão fica com administradores; agentes podem registrar e tratar os feedbacks.
insert into public.user_section_permissions (user_id,section_key,can_view,can_create,can_edit,can_delete)
select users.id,sections.section_key,true,true,true,sections.section_key='atendimentos' or users.role='Administrador'
from public.app_users users cross join public.app_sections sections
where users.active and sections.section_key in ('atendimentos','voc')
on conflict (user_id,section_key) do nothing;

-- Contas futuras também recebem as novas abas, inclusive as criadas pelo auto cadastro atual.
create or replace function public.grant_experience_sections()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.active then
    insert into public.user_section_permissions (user_id,section_key,can_view,can_create,can_edit,can_delete)
    select new.id,section_key,true,true,true,section_key='atendimentos' or new.role='Administrador'
    from public.app_sections where section_key in ('atendimentos','voc')
    on conflict (user_id,section_key) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_grant_experience_sections on public.app_users;
create trigger trg_grant_experience_sections after insert on public.app_users
for each row execute function public.grant_experience_sections();

commit;
