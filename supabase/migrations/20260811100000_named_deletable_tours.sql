alter table public.tours
add column if not exists name text;

drop policy if exists "Hosts can delete own tours" on public.tours;

create policy "Hosts can delete own tours"
on public.tours
for delete
to authenticated
using (host_id = auth.uid() and (public.is_host() or public.is_admin()));

drop function if exists public.join_tour_by_code(text);

create or replace function public.join_tour_by_code(input_code text)
returns table(id uuid, code varchar, name text, host_id uuid, status text, created_at timestamptz, started_at timestamptz, ended_at timestamptz, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.code, t.name, t.host_id, t.status, t.created_at, t.started_at, t.ended_at, t.expires_at
  from public.tours t
  where t.code = upper(trim(input_code))
    and t.status = 'active'
    and t.expires_at > now()
  limit 1;
$$;

grant execute on function public.join_tour_by_code(text) to anon, authenticated;
