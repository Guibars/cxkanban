begin;

alter table public.chat_reads
  add column if not exists cleared_before_id bigint not null default 0;

commit;
