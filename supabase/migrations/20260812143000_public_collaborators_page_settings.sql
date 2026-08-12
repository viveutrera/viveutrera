drop policy if exists "Public can read visual site settings" on public.site_settings;

create policy "Public can read visual site settings"
on public.site_settings
for select
using (key in (
  'hero_logo_media',
  'hero_media',
  'city_media',
  'donation_content',
  'collaborators_page_content'
));
