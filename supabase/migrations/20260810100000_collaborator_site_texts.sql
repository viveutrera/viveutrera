alter table public.site_translations
  add column if not exists collaborator_section_text text,
  add column if not exists special_collaborator_label text;
