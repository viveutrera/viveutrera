create table if not exists public.tour_events (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  event_type text not null check (event_type in ('element', 'message', 'notice', 'meeting_point')),
  element_id uuid references public.elements(id) on delete set null,
  message text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists tour_events_tour_created_idx on public.tour_events(tour_id, created_at desc);

alter table public.tour_events enable row level security;

drop policy if exists "Hosts can read own tour events" on public.tour_events;
drop policy if exists "Admins can read all tour events" on public.tour_events;

create policy "Hosts can read own tour events"
on public.tour_events
for select
to authenticated
using (
  exists(
    select 1
    from public.tours t
    where t.id = tour_id
      and t.host_id = auth.uid()
  )
);

create policy "Admins can read all tour events"
on public.tour_events
for select
to authenticated
using (public.is_admin());

create or replace function public.send_tour_element(input_tour_id uuid, input_element_id uuid)
returns table(id uuid, tour_id uuid, event_type text, element_id uuid, message text, created_by uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted public.tour_events;
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;

  if not exists (
    select 1
    from public.tours t
    where t.id = input_tour_id
      and t.host_id = auth.uid()
      and t.status = 'active'
      and t.expires_at > now()
  ) and not public.is_admin() then
    raise exception 'El tour no esta activo o no pertenece al anfitrion.';
  end if;

  if not exists (
    select 1
    from public.elements e
    where e.id = input_element_id
      and e.status = 'published'
  ) then
    raise exception 'El elemento no esta publicado.';
  end if;

  insert into public.tour_events (tour_id, event_type, element_id, created_by)
  values (input_tour_id, 'element', input_element_id, auth.uid())
  returning * into inserted;

  return query
  select inserted.id, inserted.tour_id, inserted.event_type, inserted.element_id, inserted.message, inserted.created_by, inserted.created_at;
end;
$$;

create or replace function public.get_latest_tour_event(input_tour_id uuid)
returns table(id uuid, tour_id uuid, event_type text, element_id uuid, message text, created_by uuid, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select te.id, te.tour_id, te.event_type, te.element_id, te.message, te.created_by, te.created_at
  from public.tour_events te
  join public.tours t on t.id = te.tour_id
  where te.tour_id = input_tour_id
    and t.status = 'active'
    and t.expires_at > now()
  order by te.created_at desc
  limit 1;
$$;

grant execute on function public.send_tour_element(uuid, uuid) to authenticated;
grant execute on function public.get_latest_tour_event(uuid) to anon, authenticated;

create or replace function public.realtime_tour_id_from_topic()
returns uuid
language sql
stable
set search_path = public
as $$
  select case
    when (select realtime.topic()) ~ '^tour:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then substring((select realtime.topic()) from 6)::uuid
    else null
  end;
$$;

drop policy if exists "Active tours can receive realtime" on realtime.messages;
drop policy if exists "Active tours can publish presence" on realtime.messages;
drop policy if exists "Hosts can broadcast to own active tours" on realtime.messages;

create policy "Active tours can receive realtime"
on realtime.messages
for select
to anon, authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and exists (
    select 1
    from public.tours t
    where t.id = public.realtime_tour_id_from_topic()
      and t.status = 'active'
      and t.expires_at > now()
  )
);

create policy "Active tours can publish presence"
on realtime.messages
for insert
to anon, authenticated
with check (
  realtime.messages.extension = 'presence'
  and exists (
    select 1
    from public.tours t
    where t.id = public.realtime_tour_id_from_topic()
      and t.status = 'active'
      and t.expires_at > now()
  )
);

create policy "Hosts can broadcast to own active tours"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and exists (
    select 1
    from public.tours t
    where t.id = public.realtime_tour_id_from_topic()
      and t.status = 'active'
      and t.expires_at > now()
      and (t.host_id = auth.uid() or public.is_admin())
  )
);
