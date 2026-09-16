-- Fotus CX — Neon Auth como autenticação única
-- Autoriza cadastro somente para e-mails previamente liberados em app_users.

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

  if new.email in ('guilhermebarbosars@gmail.com', 'matheus.gaspar@fotus.com.br') then
    new.role := 'admin';
  else
    new.role := 'user';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_authorize_fotus_neon_user on neon_auth."user";
create trigger trg_authorize_fotus_neon_user
before insert or update of email on neon_auth."user"
for each row execute function public.authorize_neon_auth_user();

create or replace function public.link_neon_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, neon_auth, pg_temp
as $$
begin
  update public.app_users
  set auth_user_id = new.id, updated_at = now()
  where lower(email::text) = lower(new.email);
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

commit;
