-- Fotus CX — vínculo seguro entre os usuários internos e o Neon Auth
-- Execute somente depois de ativar o Neon Auth no projeto.

begin;

alter table public.app_users
  alter column auth_user_id type uuid
  using nullif(auth_user_id, '')::uuid;

-- Vincula automaticamente os usuários que já existirem nos dois lados.
update public.app_users app_user
set auth_user_id = auth_user.id,
    updated_at = now()
from neon_auth."user" auth_user
where lower(app_user.email::text) = lower(auth_user.email)
  and app_user.auth_user_id is distinct from auth_user.id;

-- Visão administrativa sem senha, token ou outro dado sensível.
create or replace view public.v_app_user_auth_status as
select
  app_user.id,
  app_user.email,
  app_user.display_name,
  app_user.role,
  app_user.active,
  app_user.auth_user_id,
  (auth_user.id is not null) as has_neon_login,
  coalesce(auth_user."emailVerified", false) as email_verified,
  auth_user."createdAt" as auth_created_at,
  auth_user."updatedAt" as auth_updated_at
from public.app_users app_user
left join neon_auth."user" auth_user
  on auth_user.id = app_user.auth_user_id
  or lower(auth_user.email) = lower(app_user.email::text);

comment on view public.v_app_user_auth_status is
  'Status de login no Neon Auth para cada usuário interno autorizado.';

commit;
