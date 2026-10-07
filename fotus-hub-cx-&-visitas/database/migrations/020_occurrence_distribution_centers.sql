-- Execute no SQL Editor do Neon antes de publicar o código atualizado.
-- Cards anteriores continuam sem CD até que o time informe a origem real.
begin;

alter table public.occurrences
  add column if not exists distribution_center text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.occurrences'::regclass
      and conname = 'occurrences_distribution_center_check'
  ) then
    alter table public.occurrences
      add constraint occurrences_distribution_center_check
      check (distribution_center is null or distribution_center in ('PE','SC','ES','SP','GO','BA','PA','MT'));
  end if;
end $$;

comment on column public.occurrences.distribution_center is
  'UF identificadora do CD de origem do pedido. ES = Espírito Santo (antigo CD Sudeste). Não inferir da UF de entrega.';

commit;
