alter table public.elements
  add column if not exists show_long_text_default boolean not null default false;
