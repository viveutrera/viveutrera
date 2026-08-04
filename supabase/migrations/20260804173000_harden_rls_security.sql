do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'element_types_slug_format_chk') then
    alter table public.element_types
      add constraint element_types_slug_format_chk check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'elements_slug_format_chk') then
    alter table public.elements
      add constraint elements_slug_format_chk check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'elements_maps_url_format_chk') then
    alter table public.elements
      add constraint elements_maps_url_format_chk check (maps_url is null or maps_url ~* '^https?://');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'element_links_url_format_chk') then
    alter table public.element_links
      add constraint element_links_url_format_chk check (url ~* '^https?://');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'collaborators_url_format_chk') then
    alter table public.collaborators
      add constraint collaborators_url_format_chk check (url is null or url ~* '^https?://');
  end if;
end;
$$;

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

drop policy if exists "Admins can manage admin profiles" on public.admin_profiles;
drop policy if exists "Admins manage site settings" on public.site_settings;
drop policy if exists "Public can read active languages" on public.languages;
drop policy if exists "Admins can manage languages" on public.languages;
drop policy if exists "Public can read site translations for active languages" on public.site_translations;
drop policy if exists "Admins manage all site translations" on public.site_translations;
drop policy if exists "Public can read published elements" on public.elements;
drop policy if exists "Admins manage elements" on public.elements;
drop policy if exists "Public can read published element translations" on public.element_translations;
drop policy if exists "Admins manage element translations" on public.element_translations;
drop policy if exists "Public can read active element types" on public.element_types;
drop policy if exists "Admins manage element types" on public.element_types;
drop policy if exists "Public can read element type translations" on public.element_type_translations;
drop policy if exists "Admins manage element type translations" on public.element_type_translations;
drop policy if exists "Public can read media metadata" on public.media_assets;
drop policy if exists "Admins manage media metadata" on public.media_assets;
drop policy if exists "Public can read media variants" on public.media_variants;
drop policy if exists "Admins manage media variants" on public.media_variants;
drop policy if exists "Public can read element images" on public.element_images;
drop policy if exists "Admins manage element images" on public.element_images;
drop policy if exists "Public can read image translations" on public.element_image_translations;
drop policy if exists "Admins manage image translations" on public.element_image_translations;
drop policy if exists "Public can read published audios" on public.element_audios;
drop policy if exists "Admins manage audios" on public.element_audios;
drop policy if exists "Public can read published links" on public.element_links;
drop policy if exists "Admins manage links" on public.element_links;
drop policy if exists "Public can read active collaborators" on public.collaborators;
drop policy if exists "Admins manage collaborators" on public.collaborators;
drop policy if exists "Public can read collaborator translations" on public.collaborator_translations;
drop policy if exists "Admins manage collaborator translations" on public.collaborator_translations;

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

create policy "Public can read element images" on public.element_images for select using (
  exists(select 1 from public.elements e where e.id = element_id and e.status = 'published')
);
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
