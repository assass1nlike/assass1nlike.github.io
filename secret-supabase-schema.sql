create table if not exists public.secret_messages (
  id text primary key,
  room text not null default 'main',
  author_id text not null,
  author_label text not null,
  body text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'secret_messages_body_encrypted_v2'
  ) then
    alter table public.secret_messages
      add constraint secret_messages_body_encrypted_v2
      check ((body::jsonb ->> 'v') = '2') not valid;
  end if;
end $$;

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
with check ((body::jsonb ->> 'v') = '2');

drop policy if exists "secret messages are upsertable" on public.secret_messages;

drop policy if exists "secret messages are updateable" on public.secret_messages;

-- Existing plaintext rows remain in the table until they are deleted manually.
-- The current client ignores plaintext or invalid rows and only renders
-- decryptable v2 encrypted messages.
