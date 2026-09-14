alter table public.collaborators
  add column if not exists is_auxiliary boolean not null default false;

update public.collaborators
set is_auxiliary = false
where is_auxiliary is null;

create index if not exists collaborators_auxiliary_order_idx
  on public.collaborators(is_auxiliary, is_special, sort_order);
