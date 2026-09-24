begin;

alter table public.app_users
  add column if not exists avatar_data_url text;

create table if not exists public.chat_presence (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

create table if not exists public.chat_reads (
  user_id uuid not null references public.app_users(id) on delete cascade,
  channel_key text not null,
  last_read_id bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, channel_key)
);

alter table public.chat_messages
  add column if not exists is_isa boolean not null default false,
  add column if not exists isa_reply_to_id bigint;

create unique index if not exists idx_chat_messages_isa_reply_to
  on public.chat_messages (isa_reply_to_id)
  where isa_reply_to_id is not null;

create index if not exists idx_chat_messages_recipient_id
  on public.chat_messages (recipient_user_id, id desc)
  where recipient_user_id is not null;

commit;
