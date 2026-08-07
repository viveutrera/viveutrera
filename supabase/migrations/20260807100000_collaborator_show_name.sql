alter table public.collaborators
  add column if not exists show_name boolean not null default true;
