create extension if not exists pgcrypto;

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.languages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  locale text not null,
  name text not null,
  native_name text not null,
  flag_code text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  fallback_language_id uuid references public.languages(id),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_translations (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references public.languages(id) on delete cascade,
  hero_title text not null,
  hero_slogan text not null,
  hero_description text not null,
  city_title text not null,
  city_text text not null,
  language_card_text text not null,
  language_card_button text not null,
  collaborator_section_text text,
  special_collaborator_label text,
  seo_title text not null,
  seo_description text not null,
  unique(language_id)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  object_key text not null unique,
  media_type text not null check (media_type in ('image', 'audio', 'logo', 'file')),
  mime_type text not null,
  original_name text not null,
  file_size bigint not null,
  width integer,
  height integer,
  duration_seconds numeric,
  checksum text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table public.media_variants (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  variant text not null,
  object_key text not null unique,
  file_size bigint not null,
  width integer,
  height integer,
  unique(media_asset_id, variant)
);

create table public.element_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique constraint element_types_slug_format_chk check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.element_type_translations (
  id uuid primary key default gen_random_uuid(),
  element_type_id uuid not null references public.element_types(id) on delete cascade,
  language_id uuid not null references public.languages(id) on delete cascade,
  name text not null,
  description text,
  unique(element_type_id, language_id)
);

create table public.elements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique constraint elements_slug_format_chk check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  element_type_id uuid not null references public.element_types(id),
  maps_url text constraint elements_maps_url_format_chk check (maps_url is null or maps_url ~* '^https?://'),
  latitude numeric,
  longitude numeric,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table public.element_translations (
  id uuid primary key default gen_random_uuid(),
  element_id uuid not null references public.elements(id) on delete cascade,
  language_id uuid not null references public.languages(id) on delete cascade,
  name text not null,
  short_text text not null,
  long_text text,
  seo_title text,
  seo_description text,
  is_published boolean not null default false,
  unique(element_id, language_id)
);

create table public.element_images (
  id uuid primary key default gen_random_uuid(),
  element_id uuid not null references public.elements(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id),
  is_cover boolean not null default false,
  sort_order integer not null default 0
);

create table public.element_image_translations (
  id uuid primary key default gen_random_uuid(),
  element_image_id uuid not null references public.element_images(id) on delete cascade,
  language_id uuid not null references public.languages(id) on delete cascade,
  title text,
  alt_text text not null,
  caption text,
  unique(element_image_id, language_id)
);

create table public.element_audios (
  id uuid primary key default gen_random_uuid(),
  element_id uuid not null references public.elements(id) on delete cascade,
  language_id uuid not null references public.languages(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id),
  title text not null,
  transcript text,
  sort_order integer not null default 0,
  is_published boolean not null default false
);

create table public.element_links (
  id uuid primary key default gen_random_uuid(),
  element_id uuid not null references public.elements(id) on delete cascade,
  language_id uuid not null references public.languages(id) on delete cascade,
  title text not null,
  url text not null constraint element_links_url_format_chk check (url ~* '^https?://'),
  link_type text,
  sort_order integer not null default 0,
  is_published boolean not null default false
);

create table public.collaborators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  media_asset_id uuid references public.media_assets(id),
  url text constraint collaborators_url_format_chk check (url is null or url ~* '^https?://'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_special boolean not null default false,
  show_name boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collaborator_translations (
  id uuid primary key default gen_random_uuid(),
  collaborator_id uuid not null references public.collaborators(id) on delete cascade,
  language_id uuid not null references public.languages(id) on delete cascade,
  display_name text not null,
  thank_you_text text,
  unique(collaborator_id, language_id)
);

create index languages_active_order_idx on public.languages(is_active, sort_order);
create index elements_status_order_idx on public.elements(status, sort_order);
create index elements_type_idx on public.elements(element_type_id);
create index element_translations_language_idx on public.element_translations(language_id);
create index element_translations_name_idx on public.element_translations(lower(name));
create index element_translations_short_text_idx on public.element_translations(lower(short_text));
create index element_images_order_idx on public.element_images(element_id, sort_order);
create index element_audios_language_order_idx on public.element_audios(element_id, language_id, sort_order);
create index element_links_language_order_idx on public.element_links(element_id, language_id, sort_order);
create index collaborators_active_order_idx on public.collaborators(is_active, sort_order);

alter table public.admin_profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.languages enable row level security;
alter table public.site_translations enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_variants enable row level security;
alter table public.element_types enable row level security;
alter table public.element_type_translations enable row level security;
alter table public.elements enable row level security;
alter table public.element_translations enable row level security;
alter table public.element_images enable row level security;
alter table public.element_image_translations enable row level security;
alter table public.element_audios enable row level security;
alter table public.element_links enable row level security;
alter table public.collaborators enable row level security;
alter table public.collaborator_translations enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists(select 1 from public.admin_profiles where user_id = auth.uid());
$$;

create or replace function public.is_active_language(language_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.languages l
    where l.id = language_uuid
      and l.is_active
  );
$$;

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
  );
$$;

create policy "Admins can manage admin profiles" on public.admin_profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage site settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Public can read active languages" on public.languages for select using (is_active);
create policy "Admins can manage languages" on public.languages for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Public can read site translations for active languages" on public.site_translations for select using (public.is_active_language(language_id));
create policy "Admins manage all site translations" on public.site_translations for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Public can read published elements" on public.elements for select using (status = 'published');
create policy "Admins manage elements" on public.elements for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Public can read published element translations" on public.element_translations for select using (
  is_published
  and public.is_active_language(language_id)
  and exists(select 1 from public.elements e where e.id = element_id and e.status = 'published')
);
create policy "Admins manage element translations" on public.element_translations for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Public can read active element types" on public.element_types for select using (is_active);
create policy "Admins manage element types" on public.element_types for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Public can read element type translations" on public.element_type_translations for select using (
  public.is_active_language(language_id)
  and exists(select 1 from public.element_types et where et.id = element_type_id and et.is_active)
);
create policy "Admins manage element type translations" on public.element_type_translations for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Public can read media metadata" on public.media_assets for select using (public.can_read_media_asset(id));
create policy "Admins manage media metadata" on public.media_assets for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Public can read media variants" on public.media_variants for select using (public.can_read_media_asset(media_asset_id));
create policy "Admins manage media variants" on public.media_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Public can read element images" on public.element_images for select using (exists(select 1 from public.elements e where e.id = element_id and e.status = 'published'));
create policy "Admins manage element images" on public.element_images for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Public can read image translations" on public.element_image_translations for select using (
  public.is_active_language(language_id)
  and exists(
    select 1
    from public.element_images ei
    join public.elements e on e.id = ei.element_id
    where ei.id = element_image_id
      and e.status = 'published'
  )
);
create policy "Admins manage image translations" on public.element_image_translations for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Public can read published audios" on public.element_audios for select using (
  is_published
  and public.is_active_language(language_id)
  and exists(select 1 from public.elements e where e.id = element_id and e.status = 'published')
);
create policy "Admins manage audios" on public.element_audios for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Public can read published links" on public.element_links for select using (
  is_published
  and public.is_active_language(language_id)
  and exists(select 1 from public.elements e where e.id = element_id and e.status = 'published')
);
create policy "Admins manage links" on public.element_links for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Public can read active collaborators" on public.collaborators for select using (is_active);
create policy "Admins manage collaborators" on public.collaborators for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Public can read collaborator translations" on public.collaborator_translations for select using (
  public.is_active_language(language_id)
  and exists(select 1 from public.collaborators c where c.id = collaborator_id and c.is_active)
);
create policy "Admins manage collaborator translations" on public.collaborator_translations for all to authenticated using (public.is_admin()) with check (public.is_admin());
