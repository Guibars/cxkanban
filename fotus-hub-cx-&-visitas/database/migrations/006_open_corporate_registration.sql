-- Libera o auto cadastro de colaboradores @fotus.com.br.
-- A conta nasce como Agente com Visão Geral, Ocorrências e Visitas.
-- Perfis previamente desativados permanecem bloqueados.

begin;

create or replace function public.link_neon_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, neon_auth, pg_temp
as $$
declare
  profile_id uuid;
  matched_agent text;
  profile_name text;
begin
  select id into profile_id
  from public.app_users
  where lower(email::text) = lower(trim(new.email));

  if profile_id is not null then
    update public.app_users
    set auth_user_id = new.id,
        updated_at = now()
    where id = profile_id;
    return new;
  end if;

  if lower(trim(new.email)) !~ '^[^@]+@fotus[.]com[.]br$' then
    return new;
  end if;

  profile_name := coalesce(nullif(trim(new.name), ''), split_part(trim(new.email), '@', 1));

  select name::text into matched_agent
  from public.occurrence_agents
  where active
    and lower(name::text) = lower(split_part(profile_name, ' ', 1))
  order by sort_order, name
  limit 1;

  insert into public.app_users (auth_user_id, email, display_name, role, agent_name, active)
  values (new.id, lower(trim(new.email)), profile_name, 'Agente', matched_agent, true)
  on conflict (email) do update
  set auth_user_id = excluded.auth_user_id,
      updated_at = now()
  returning id into profile_id;

  insert into public.user_section_permissions (
    user_id, section_key, can_view, can_create, can_edit, can_delete
  )
  select profile_id, section_key, true, true, true, false
  from public.app_sections
  where section_key = any(array['visao-geral', 'ocorrencias', 'visitas']::text[])
  on conflict (user_id, section_key) do nothing;

  insert into public.audit_events (actor_email, action, entity_type, entity_id, after_data)
  values (
    lower(trim(new.email)),
    'self_registration',
    'app_user',
    lower(trim(new.email)),
    jsonb_build_object(
      'email', lower(trim(new.email)),
      'displayName', profile_name,
      'role', 'Agente',
      'visibleTabs', jsonb_build_array('visao-geral', 'ocorrencias', 'visitas')
    )
  );

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
