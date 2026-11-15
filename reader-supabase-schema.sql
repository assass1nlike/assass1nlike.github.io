-- Reading counts and inline annotations.
-- Run once in the Supabase SQL editor; the site works without it and hides both features
-- until the tables exist.

begin;

-- View counts. The table is world-readable (it only holds counts), but increments go through
-- a security definer function so nobody can set an arbitrary number.
create table if not exists public.page_views (
  path text primary key,
  views bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.page_views enable row level security;
grant usage on schema public to anon, authenticated;
revoke all on public.page_views from anon, authenticated;
grant select on public.page_views to anon, authenticated;

drop policy if exists "page view counts are readable" on public.page_views;
create policy "page view counts are readable"
on public.page_views for select to anon, authenticated using (true);

create or replace function public.record_page_view(p_path text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare total bigint;
begin
  if p_path is null or char_length(p_path) < 1 or char_length(p_path) > 300 then
    raise exception 'invalid path';
  end if;
  insert into public.page_views (path) values (p_path)
  on conflict (path) do update
    set views = public.page_views.views + 1, updated_at = now()
  returning views into total;
  return total;
end;
$$;

revoke all on function public.record_page_view(text) from public;
grant execute on function public.record_page_view(text) to anon, authenticated;

-- Inline annotations. An anchor is the selected text plus a little context on either side,
-- because character offsets go stale as soon as the document is edited or re-rendered.
create table if not exists public.page_annotations (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  quote text not null,
  prefix text not null default '',
  suffix text not null default '',
  body text not null,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '',
  avatar_url text not null default '',
  created_at timestamptz not null default now()
);

alter table public.page_annotations enable row level security;
revoke all on public.page_annotations from anon, authenticated;
grant select, insert, delete on public.page_annotations to anon, authenticated;

drop policy if exists "annotations are readable" on public.page_annotations;
create policy "annotations are readable"
on public.page_annotations for select to anon, authenticated using (true);

drop policy if exists "signed-in readers can annotate" on public.page_annotations;
create policy "signed-in readers can annotate"
on public.page_annotations for insert to authenticated
with check (
  auth_user_id = auth.uid()
  and char_length(body) between 1 and 1000
  and char_length(quote) between 1 and 400
  and char_length(prefix) <= 80
  and char_length(suffix) <= 80
  and char_length(author_name) <= 40
  and char_length(avatar_url) <= 500
  and char_length(path) <= 300
);

drop policy if exists "authors can delete their annotations" on public.page_annotations;
create policy "authors can delete their annotations"
on public.page_annotations for delete to authenticated
using (auth_user_id = auth.uid());

create index if not exists page_annotations_path_created_at_idx
on public.page_annotations (path, created_at);

commit;
