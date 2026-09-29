-- Cole este arquivo no SQL Editor do Neon antes de 015_organization_pdf_contacts.sql.
alter table public.organization_people
  alter column email drop not null,
  add column if not exists job_title text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists photo_url text,
  add column if not exists sort_order integer not null default 0;

-- O documento tem gerentes sem Head e uma coordenação sem gerente informado.
-- Eles devem poder ficar no topo até que o responsável seja cadastrado.
do $$
declare rule_name text;
begin
  for rule_name in
    select conname from pg_constraint
    where conrelid='public.organization_people'::regclass and contype='c'
      and pg_get_constraintdef(oid) like '%reports_to_id%'
  loop
    execute format('alter table public.organization_people drop constraint %I', rule_name);
  end loop;
end;
$$;
alter table public.organization_people
  add constraint organization_people_head_has_no_supervisor
  check (role <> 'Head' or reports_to_id is null);

create or replace function public.validate_organization_hierarchy()
returns trigger language plpgsql as $$
declare
  supervisor_role text;
  expected_role text;
begin
  if new.reports_to_id is null then return new; end if;
  if new.role = 'Head' then raise exception 'Head não pode responder para outra pessoa'; end if;
  if new.reports_to_id = new.id then raise exception 'Uma pessoa não pode responder para ela mesma'; end if;
  select role into supervisor_role from public.organization_people
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
