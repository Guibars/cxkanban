begin;

alter table public.ra_cases
  add column if not exists complaint_date date;

update public.ra_cases
set complaint_date = (created_at at time zone 'America/Sao_Paulo')::date
where complaint_date is null;

alter table public.ra_cases
  alter column complaint_date set default ((now() at time zone 'America/Sao_Paulo')::date),
  alter column complaint_date set not null;

commit;
