-- Execute no SQL Editor do Neon antes de 018_organization_scd_teams.sql.
-- Requer as migrações anteriores da Estrutura (014 e 015).
begin;

alter table public.organization_people
  add column if not exists team_name text not null default '';

do $$
declare rule_name text;
begin
  for rule_name in
    select conname from pg_constraint
    where conrelid='public.organization_people'::regclass and contype='c'
      and pg_get_constraintdef(oid) like '%role%'
      and pg_get_constraintdef(oid) not like '%reports_to_id%'
  loop
    execute format('alter table public.organization_people drop constraint %I', rule_name);
  end loop;
end;
$$;

alter table public.organization_people
  add constraint organization_people_role_check
  check (role in ('Head','Gerente','Coordenador','Líder','Consultor'));

create or replace function public.validate_organization_hierarchy()
returns trigger language plpgsql as $$
declare
  supervisor_role text;
  allowed_roles text[];
begin
  if new.reports_to_id is null then return new; end if;
  if new.role = 'Head' then raise exception 'Head não pode responder para outra pessoa'; end if;
  if new.reports_to_id = new.id then raise exception 'Uma pessoa não pode responder para ela mesma'; end if;
  select role into supervisor_role from public.organization_people
    where id = new.reports_to_id and active = true;
  allowed_roles := case new.role
    when 'Gerente' then array['Head']
    when 'Coordenador' then array['Gerente']
    when 'Líder' then array['Coordenador']
    when 'Consultor' then array['Líder','Coordenador','Gerente']
    else array[]::text[]
  end;
  if supervisor_role is null or not (supervisor_role = any(allowed_roles)) then
    raise exception '% deve responder para um responsável ativo: %', new.role, array_to_string(allowed_roles, ', ');
  end if;
  return new;
end;
$$;

commit;
