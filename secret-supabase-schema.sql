create table if not exists public.secret_messages (
  id text primary key,
  room text not null default 'main',
  author_id text not null,
  author_label text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.secret_messages enable row level security;

drop policy if exists "secret messages are readable" on public.secret_messages;
create policy "secret messages are readable"
on public.secret_messages
for select
to anon
using (true);

drop policy if exists "secret messages are insertable" on public.secret_messages;
create policy "secret messages are insertable"
on public.secret_messages
for insert
to anon
with check (true);

drop policy if exists "secret messages are upsertable" on public.secret_messages;
create policy "secret messages are upsertable"
on public.secret_messages
for update
to anon
using (true)
with check (true);
