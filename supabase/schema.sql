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

-- Allow anonymous and authenticated users to log download events
drop policy if exists "Allow anonymous and authenticated download logging" on public.app_downloads;
create policy "Allow anonymous and authenticated download logging"
  on public.app_downloads
  for insert
  to anon, authenticated
  with check (true);

-- Allow admins to read all download telemetry
drop policy if exists "Allow admins to read all download telemetry" on public.app_downloads;
create policy "Allow admins to read all download telemetry"
  on public.app_downloads
  for select
  to authenticated
  using (public.is_verified_commute_admin());

-- Seed baseline download counts (Windows: 7, iOS: 5, Mac: 4, Android: 2)
insert into public.app_downloads (platform, user_agent)
select 'windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0' from generate_series(1, 7)
union all
select 'ios', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' from generate_series(1, 5)
union all
select 'mac', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15' from generate_series(1, 4)
union all
select 'android', 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 Chrome/120.0.0.0' from generate_series(1, 2);
