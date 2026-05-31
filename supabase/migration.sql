-- Foundry — Supabase migration
-- Idempotent: safe to re-run.
-- Run in Supabase project "foundry" → SQL editor.

-- --------------------------------------------------------------------------
-- Tables
-- --------------------------------------------------------------------------

create table if not exists public.foundry_apps (
  id                 text primary key,
  name               text not null,
  description        text,
  icon               text not null,
  route              text not null unique,
  component_code     text,                              -- optional; in-repo apps don't use this
  needs_persistence  boolean default false,
  table_name         text,
  status             text not null default 'active'
                       check (status in ('active','archived')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.foundry_app_data (
  id          text primary key,                          -- conventionally `${app_id}::${key}`
  app_id      text not null references public.foundry_apps(id) on delete restrict,
  key         text not null,
  value       jsonb,
  status      text not null default 'active'
                check (status in ('active','archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (app_id, key)
);

-- --------------------------------------------------------------------------
-- Indexes
-- --------------------------------------------------------------------------
create index if not exists foundry_app_data_app_id_idx
  on public.foundry_app_data (app_id);
create index if not exists foundry_app_data_status_idx
  on public.foundry_app_data (status);
create index if not exists foundry_apps_status_idx
  on public.foundry_apps (status);

-- --------------------------------------------------------------------------
-- Triggers: updated_at
-- --------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists foundry_apps_touch on public.foundry_apps;
create trigger foundry_apps_touch
  before update on public.foundry_apps
  for each row execute function public.touch_updated_at();

drop trigger if exists foundry_app_data_touch on public.foundry_app_data;
create trigger foundry_app_data_touch
  before update on public.foundry_app_data
  for each row execute function public.touch_updated_at();

-- --------------------------------------------------------------------------
-- Row-Level Security
--
-- Foundry is single-user (Andre). For v1 we allow read with anon key, and
-- writes only via service role (API endpoints). Tighten with auth later.
-- --------------------------------------------------------------------------
alter table public.foundry_apps      enable row level security;
alter table public.foundry_app_data  enable row level security;

drop policy if exists "foundry_apps_read"      on public.foundry_apps;
drop policy if exists "foundry_app_data_read"  on public.foundry_app_data;
drop policy if exists "foundry_app_data_write" on public.foundry_app_data;

create policy "foundry_apps_read"
  on public.foundry_apps
  for select
  to anon, authenticated
  using (true);

create policy "foundry_app_data_read"
  on public.foundry_app_data
  for select
  to anon, authenticated
  using (status = 'active');

-- Single-user dev: allow anon upsert into foundry_app_data so the client
-- can persist directly. If you add auth later, replace with an auth.uid()
-- check.
create policy "foundry_app_data_write"
  on public.foundry_app_data
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- --------------------------------------------------------------------------
-- Seed: grocery-list (idempotent)
-- --------------------------------------------------------------------------
insert into public.foundry_apps (id, name, description, icon, route, needs_persistence, status)
values (
  'grocery-list',
  'Grocery List',
  'Add items, check off, clear. Synced.',
  '🛒',
  'grocery-list',
  true,
  'active'
)
on conflict (id) do update set
  name              = excluded.name,
  description       = excluded.description,
  icon              = excluded.icon,
  route             = excluded.route,
  needs_persistence = excluded.needs_persistence;
