alter table public.elements
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'elements_latitude_range_chk') then
    alter table public.elements
      add constraint elements_latitude_range_chk check (latitude is null or (latitude >= -90 and latitude <= 90));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'elements_longitude_range_chk') then
    alter table public.elements
      add constraint elements_longitude_range_chk check (longitude is null or (longitude >= -180 and longitude <= 180));
  end if;
end $$;
