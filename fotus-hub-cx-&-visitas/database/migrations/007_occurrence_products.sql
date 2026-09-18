-- Permite relacionar vários produtos a uma única ocorrência sem perder
-- compatibilidade com as colunas antigas product e quantity.

begin;

alter table public.occurrences
  add column if not exists products jsonb not null default '[]'::jsonb;

update public.occurrences
set products = jsonb_build_array(
  jsonb_build_object(
    'product', product,
    'quantity', greatest(quantity, 1)
  )
)
where jsonb_array_length(products) = 0
  and nullif(trim(product), '') is not null;

commit;
