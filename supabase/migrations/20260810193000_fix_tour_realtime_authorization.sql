create or replace function public.is_active_realtime_tour()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tours t
    where t.id = public.realtime_tour_id_from_topic()
      and t.status = 'active'
      and t.expires_at > now()
  );
$$;

create or replace function public.can_broadcast_to_realtime_tour()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.tours t
      where t.id = public.realtime_tour_id_from_topic()
        and t.status = 'active'
        and t.expires_at > now()
        and (t.host_id = auth.uid() or public.is_admin())
    );
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
  and public.is_active_realtime_tour()
);

create policy "Active tours can publish presence"
on realtime.messages
for insert
to anon, authenticated
with check (
  realtime.messages.extension = 'presence'
  and public.is_active_realtime_tour()
);

create policy "Hosts can broadcast to own active tours"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and public.can_broadcast_to_realtime_tour()
);
