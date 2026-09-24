begin;

alter table public.ra_cases
  add column if not exists resolved boolean;

-- Preserve the former "Resolvido" stage; old cancelled cases have no known answer.
update public.ra_cases
set resolved = true
where status = 'Resolvido' and resolved is null;

alter table public.ra_cases
  drop constraint if exists ra_cases_status_check;

update public.ra_cases
set status = case status
  when 'Aberto' then 'Em Andamento'
  when 'Resolvido' then 'Finalizado'
  when 'Cancelado' then 'Desativado'
  else status
end
where status in ('Aberto', 'Resolvido', 'Cancelado');

alter table public.ra_cases
  alter column status set default 'Em Andamento',
  add constraint ra_cases_status_check
    check (status in ('Em Andamento', 'Finalizado', 'Moderado', 'Desativado'));

-- Inactive cases are no longer included in the reputation calculation.
update public.ra_cases
set indicator_ir = 0, indicator_is = 0, final_score = null
where status = 'Desativado';

commit;
