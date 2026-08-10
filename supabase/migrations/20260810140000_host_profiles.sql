create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null check (role in ('admin', 'host')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_active_idx on public.profiles(role, active);
create unique index if not exists profiles_email_lower_idx on public.profiles(lower(email));

insert into public.profiles (user_id, email, display_name, role, active)
select
  ap.user_id,
  coalesce(au.email, ap.user_id::text),
  coalesce(au.email, 'Administrador'),
  'admin',
  true
from public.admin_profiles ap
left join auth.users au on au.id = ap.user_id
on conflict (user_id) do update set
  role = case when public.profiles.role = 'admin' then public.profiles.role else excluded.role end,
  active = true,
  updated_at = now();

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and (
      exists(select 1 from public.profiles where user_id = auth.uid() and role = 'admin' and active)
      or exists(select 1 from public.admin_profiles where user_id = auth.uid())
    );
$$;

create or replace function public.is_host()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists(select 1 from public.profiles where user_id = auth.uid() and role = 'host' and active);
$$;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can read host profiles" on public.profiles;
drop policy if exists "Admins can update host profiles" on public.profiles;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (user_id = auth.uid() and active);

create policy "Admins can read host profiles"
on public.profiles
for select
to authenticated
using (public.is_admin() and role = 'host');

create policy "Admins can update host profiles"
on public.profiles
for update
to authenticated
using (public.is_admin() and role = 'host')
with check (public.is_admin() and role = 'host');
