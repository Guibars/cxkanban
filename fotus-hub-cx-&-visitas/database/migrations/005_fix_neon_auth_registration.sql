-- Corrige o cadastro de primeiro acesso no Neon Auth.
-- Pode ser executada com segurança mesmo se as migrações anteriores já rodaram.

begin;

drop trigger if exists trg_authorize_fotus_neon_user on neon_auth."user";
drop function if exists public.authorize_neon_auth_user();

create or replace function public.link_neon_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, neon_auth, pg_temp
as $$
begin
  update public.app_users
  set auth_user_id = new.id,
      updated_at = now()
  where lower(email::text) = lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists trg_link_fotus_neon_user on neon_auth."user";
create trigger trg_link_fotus_neon_user
after insert or update of email on neon_auth."user"
for each row execute function public.link_neon_auth_user();

update neon_auth.project_config
set email_and_password = jsonb_set(
      coalesce(email_and_password, '{}'::jsonb),
      '{disableSignUp}',
      'false'::jsonb,
      true
    ),
    updated_at = now();

-- Restaura os dois operadores mestres autorizados a criar e administrar usuários.
insert into public.app_users (email, display_name, role, active)
values
  ('guilhermebarbosars@gmail.com', 'Guilherme Barbosa', 'Administrador', true),
  ('matheus.gaspar@fotus.com.br', 'Matheus Gaspar', 'Administrador', true)
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
where lower(users.email::text) = 'guilhermebarbosars@gmail.com'
on conflict (user_id, section_key) do update
set can_view = true,
    can_create = true,
    can_edit = true,
    can_delete = true,
    updated_at = now();

-- O Matheus começa com as áreas cadastradas, mas futuras execuções desta
-- correção não substituem as escolhas feitas no painel de permissões.
insert into public.user_section_permissions (
  user_id, section_key, can_view, can_create, can_edit, can_delete
)
select users.id, sections.section_key, true, true, true, true
from public.app_users users
cross join public.app_sections sections
where lower(users.email::text) = 'matheus.gaspar@fotus.com.br'
on conflict (user_id, section_key) do nothing;

commit;
