create or replace function public.generate_tour_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  candidate text;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  attempts integer := 0;
begin
  loop
    attempts := attempts + 1;
    candidate := lpad(floor(random() * 100000)::text, 5, '0')
      || substr(alphabet, floor(random() * length(alphabet) + 1)::integer, 1);

    exit when not exists (
      select 1
      from public.tours
      where code = candidate
        and status in ('draft', 'active')
        and expires_at > now()
    );

    if attempts > 25 then
      raise exception 'No se pudo generar un codigo de tour unico.';
    end if;
  end loop;

  return candidate;
end;
$$;

create table if not exists public.tours (
  id uuid primary key default gen_random_uuid(),
  code varchar(6) not null default public.generate_tour_code(),
  host_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'active', 'finished', 'cancelled')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  expires_at timestamptz not null default now() + interval '24 hours',
  constraint tours_code_format_chk check (code ~ '^[0-9]{5}[A-Z]$')
);

create unique index if not exists tours_code_unique_idx on public.tours(code);
create index if not exists tours_host_status_idx on public.tours(host_id, status, created_at desc);
create index if not exists tours_join_code_idx on public.tours(code, status, expires_at);

alter table public.tours enable row level security;

drop policy if exists "Visitors can read active tours by code" on public.tours;
drop policy if exists "Hosts can read own tours" on public.tours;
drop policy if exists "Hosts can create own tours" on public.tours;
drop policy if exists "Hosts can update own tours" on public.tours;
drop policy if exists "Admins can manage all tours" on public.tours;

create policy "Hosts can read own tours"
on public.tours
for select
to authenticated
using (host_id = auth.uid() or public.is_admin());

create policy "Hosts can create own tours"
on public.tours
for insert
to authenticated
with check (host_id = auth.uid() and (public.is_host() or public.is_admin()));

create policy "Hosts can update own tours"
on public.tours
for update
to authenticated
using (host_id = auth.uid() and (public.is_host() or public.is_admin()))
with check (host_id = auth.uid() and (public.is_host() or public.is_admin()));

create policy "Admins can manage all tours"
on public.tours
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.join_tour_by_code(input_code text)
returns table(id uuid, code varchar, host_id uuid, status text, created_at timestamptz, started_at timestamptz, ended_at timestamptz, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.code, t.host_id, t.status, t.created_at, t.started_at, t.ended_at, t.expires_at
  from public.tours t
  where t.code = upper(trim(input_code))
    and t.status = 'active'
    and t.expires_at > now()
  limit 1;
$$;

grant execute on function public.join_tour_by_code(text) to anon, authenticated;
