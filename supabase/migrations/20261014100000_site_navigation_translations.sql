alter table public.site_translations
  add column if not exists footer_donations_label text not null default 'Donativos',
  add column if not exists footer_collaborators_label text not null default 'Colaboradores',
  add column if not exists footer_home_label text not null default 'Inicio',
  add column if not exists footer_guide_label text not null default 'Guía',
  add column if not exists footer_administration_label text not null default 'Administración',
  add column if not exists footer_hosts_label text not null default 'Anfitriones',
  add column if not exists nearby_places_button_label text not null default 'Lugares próximos';
