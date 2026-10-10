-- 星笺 v1：每用户一份账本快照（JSONB），与本地 Snapshot 类型对齐
-- RLS：仅本人可读写自己的行

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ledger_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists ledger_snapshots_updated_at_idx
  on public.ledger_snapshots (updated_at desc);

alter table public.profiles enable row level security;
alter table public.ledger_snapshots enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "ledger_select_own" on public.ledger_snapshots;
create policy "ledger_select_own"
  on public.ledger_snapshots for select
  using (auth.uid() = user_id);

drop policy if exists "ledger_insert_own" on public.ledger_snapshots;
create policy "ledger_insert_own"
  on public.ledger_snapshots for insert
  with check (auth.uid() = user_id);

drop policy if exists "ledger_update_own" on public.ledger_snapshots;
create policy "ledger_update_own"
  on public.ledger_snapshots for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ledger_delete_own" on public.ledger_snapshots;
create policy "ledger_delete_own"
  on public.ledger_snapshots for delete
  using (auth.uid() = user_id);

-- 注册后自动建 profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
