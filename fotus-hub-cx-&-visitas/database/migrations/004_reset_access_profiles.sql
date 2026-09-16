-- Remove apenas perfis antigos do painel. Os registros operacionais permanecem.
-- O login Neon do operador principal não é alterado.

begin;

create or replace function public.authorize_neon_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, neon_auth, pg_temp
as $$
begin
  new.email := lower(trim(new.email));
  if not exists (
    select 1 from public.app_users
    where lower(email::text) = new.email and active = true
  ) then
    raise exception 'Este e-mail ainda não foi liberado por um operador mestre';
  end if;
  new.role := case when new.email = 'guilhermebarbosars@gmail.com' then 'admin' else 'user' end;
  return new;
end;
$$;

delete from public.app_users
where lower(email::text) <> 'guilhermebarbosars@gmail.com';

insert into public.app_users (email, display_name, role, active)
values ('guilhermebarbosars@gmail.com', 'Guilherme Barbosa', 'Administrador', true)
on conflict (email) do update
set display_name = excluded.display_name,
    role = 'Administrador',
    active = true,
    updated_at = now();

insert into public.user_section_permissions (
  user_id, section_key, can_view, can_create, can_edit, can_delete
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

commit;
