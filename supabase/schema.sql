create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  email text not null unique,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

create or replace function public.is_verified_commute_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where id = (select auth.uid())
      and lower(email) = 'amiyohasan23@gmail.com'
      and email_confirmed_at is not null
  );
$$;

revoke all on function public.is_verified_commute_admin() from public, anon;
grant execute on function public.is_verified_commute_admin() to authenticated;

drop policy if exists "Users can read their own profile and admins can read all profiles"
  on public.profiles;
create policy "Users can read their own profile and admins can read all profiles"
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_verified_commute_admin())
  );

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email, created_at, last_login_at)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), new.email),
    new.email,
    new.created_at,
    new.last_sign_in_at
  )
  on conflict (id) do update
    set email = excluded.email,
        last_login_at = excluded.last_login_at;

  return new;
end;
$$;

drop trigger if exists sync_auth_user_profile_after_insert on auth.users;
create trigger sync_auth_user_profile_after_insert
  after insert on auth.users
  for each row execute function public.sync_auth_user_profile();

drop trigger if exists sync_auth_user_profile_after_login on auth.users;
create trigger sync_auth_user_profile_after_login
  after update of last_sign_in_at on auth.users
  for each row
  when (old.last_sign_in_at is distinct from new.last_sign_in_at)
  execute function public.sync_auth_user_profile();

insert into public.profiles (id, display_name, email, created_at, last_login_at)
select
  users.id,
  coalesce(nullif(users.raw_user_meta_data ->> 'display_name', ''), users.email),
  users.email,
  users.created_at,
  users.last_sign_in_at
from auth.users as users
on conflict (id) do update
  set email = excluded.email,
      last_login_at = excluded.last_login_at;

-- =========================================================
-- 📱 PWA App Download & OS Distribution Telemetry
-- =========================================================
create table if not exists public.app_downloads (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('windows', 'mac', 'ios', 'android', 'linux', 'other')),
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.app_downloads enable row level security;

-- Ensure public access permissions for PostgREST API
grant usage on schema public to anon, authenticated;
grant select, insert on public.app_downloads to anon, authenticated;

-- Allow anonymous and authenticated users to log download events from anywhere
drop policy if exists "Allow anonymous and authenticated download logging" on public.app_downloads;
create policy "Allow anonymous and authenticated download logging"
  on public.app_downloads
  for insert
  to anon, authenticated
  with check (true);

-- Allow reading download telemetry worldwide for live counters and admin sync
drop policy if exists "Allow anyone to read download telemetry" on public.app_downloads;
drop policy if exists "Allow admins to read all download telemetry" on public.app_downloads;
create policy "Allow anyone to read download telemetry"
  on public.app_downloads
  for select
  to anon, authenticated
  using (true);

-- Seed verified baseline downloads (1 Windows PC, 1 Android Phone, 1 iOS iPad)
insert into public.app_downloads (id, platform, user_agent, created_at)
values 
  ('00000000-0000-0000-0000-000000000001', 'windows', 'Baseline install: Admin PC', now()),
  ('00000000-0000-0000-0000-000000000002', 'android', 'Baseline install: Admin Mobile', now()),
  ('00000000-0000-0000-0000-000000000003', 'ios', 'Baseline install: Friend iPad', now())
on conflict (id) do nothing;
