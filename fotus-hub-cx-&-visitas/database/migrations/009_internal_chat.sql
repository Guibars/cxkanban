begin;

create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  channel_key text not null,
  sender_user_id uuid not null references public.app_users(id) on delete cascade,
  recipient_user_id uuid references public.app_users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1200),
  created_at timestamptz not null default now(),
  check (recipient_user_id is null or recipient_user_id <> sender_user_id),
  check (
    (recipient_user_id is null and channel_key = 'general')
    or (recipient_user_id is not null and channel_key like 'private:%')
  )
);

create index if not exists idx_chat_messages_channel_id
  on public.chat_messages (channel_key, id desc);

create index if not exists idx_chat_messages_created_at
  on public.chat_messages (created_at);

commit;
