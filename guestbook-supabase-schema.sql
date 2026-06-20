create table if not exists public.guestbook_messages (
  id text primary key,
  author_name text not null default '',
  body text not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.guestbook_messages enable row level security;

drop policy if exists "public guestbook messages are readable" on public.guestbook_messages;
create policy "public guestbook messages are readable"
on public.guestbook_messages
for select
to anon, authenticated
using (is_public = true);

drop policy if exists "guestbook messages are insertable" on public.guestbook_messages;
create policy "guestbook messages are insertable"
on public.guestbook_messages
for insert
to anon, authenticated
with check (
  char_length(body) between 1 and 1200
  and char_length(author_name) <= 40
);

create index if not exists guestbook_messages_public_created_at_idx
on public.guestbook_messages (created_at desc)
where is_public = true;
