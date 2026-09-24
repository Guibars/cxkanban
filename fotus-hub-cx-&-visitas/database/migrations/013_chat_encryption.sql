begin;

alter table public.chat_messages
  add column if not exists body_is_encrypted boolean not null default false;

alter table public.chat_messages
  drop constraint if exists chat_messages_body_check;

alter table public.chat_messages
  add constraint chat_messages_body_check
    check (char_length(body) between 1 and 8000);

create index if not exists idx_chat_messages_unencrypted
  on public.chat_messages (id)
  where body_is_encrypted = false;

commit;
