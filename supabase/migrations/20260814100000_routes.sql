create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.route_translations (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  language_id uuid not null references public.languages(id) on delete cascade,
  name text not null,
  description text,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_translations_unique unique (route_id, language_id)
);

create table if not exists public.route_elements (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  element_id uuid not null references public.elements(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint route_elements_unique unique (route_id, element_id)
);

create index if not exists routes_active_order_idx on public.routes(is_active, sort_order);
create index if not exists route_translations_language_idx on public.route_translations(language_id);
create index if not exists route_elements_route_order_idx on public.route_elements(route_id, sort_order);
create index if not exists route_elements_element_idx on public.route_elements(element_id);

alter table public.routes enable row level security;
alter table public.route_translations enable row level security;
alter table public.route_elements enable row level security;

drop policy if exists "Public can read active routes" on public.routes;
drop policy if exists "Admins manage routes" on public.routes;
drop policy if exists "Public can read active route translations" on public.route_translations;
drop policy if exists "Admins manage route translations" on public.route_translations;
drop policy if exists "Public can read active route elements" on public.route_elements;
drop policy if exists "Admins manage route elements" on public.route_elements;

create policy "Public can read active routes"
on public.routes
for select
using (is_active);

create policy "Admins manage routes"
on public.routes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read active route translations"
on public.route_translations
for select
using (
  public.is_active_language(language_id)
  and exists (
    select 1
    from public.routes r
    where r.id = route_id
      and r.is_active
  )
);

create policy "Admins manage route translations"
on public.route_translations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read active route elements"
on public.route_elements
for select
using (
  exists (
    select 1
    from public.routes r
    where r.id = route_id
      and r.is_active
  )
  and exists (
    select 1
    from public.elements e
    where e.id = element_id
      and e.status = 'published'
  )
);

create policy "Admins manage route elements"
on public.route_elements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.can_read_media_asset(asset_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.element_images ei
    join public.elements e on e.id = ei.element_id
    where ei.media_asset_id = asset_uuid
      and e.status = 'published'
  )
  or exists(
    select 1
    from public.element_audios ea
    join public.elements e on e.id = ea.element_id
    where ea.media_asset_id = asset_uuid
      and ea.is_published
      and e.status = 'published'
      and public.is_active_language(ea.language_id)
  )
  or exists(
    select 1
    from public.collaborators c
    where c.media_asset_id = asset_uuid
      and c.is_active
  )
  or exists(
    select 1
    from public.routes r
    where r.media_asset_id = asset_uuid
      and r.is_active
  );
$$;
