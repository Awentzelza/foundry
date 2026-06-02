-- =====================================================================
-- Foundry multi-user — PHASE 0a: schema (additive, non-destructive)
-- Run this FIRST, in the Supabase SQL editor (project ref gcdqbaupvzqzcjhfkkjq).
--
-- This migration is PURELY ADDITIVE. It creates the household / membership /
-- grant tables and the new columns, and puts FINAL-correct RLS on the NEW
-- tables only. It deliberately does NOT touch the RLS on foundry_apps or
-- foundry_app_data — those stay on their current (permissive, anon-write)
-- policies so the live, auth-optional client is never locked out. RLS on the
-- data tables is tightened later in p2_rls_tighten.sql, after auth is on and
-- you've verified the authenticated path.
--
-- Order of operations for the whole rollout:
--   1. p0a_schema.sql        <- you are here (safe, additive)
--   2. deploy the multi-user branch (auth-optional client)
--   3. sign in once via magic link  (creates your auth.users row)
--   4. p0b_backfill.sql      (creates your household, scopes, rewrites data ids)
--   5. verify the authenticated path
--   6. p2_rls_tighten.sql + p2_rls_tests.sql  (security-critical; before Bel)
-- =====================================================================

begin;

-- --- Households ------------------------------------------------------
create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Household',
  created_at  timestamptz not null default now()
);

-- --- Household members ----------------------------------------------
-- One row per (household, user). Pending invites live here with
-- status='invited' until the person first signs in (then 'active').
-- Supabase's inviteUserByEmail creates the auth.users row at invite time,
-- so user_id is always present.
create table if not exists public.household_members (
  household_id  uuid not null references public.households(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'member' check (role in ('owner','admin','member')),
  status        text not null default 'active'  check (status in ('invited','active')),
  email         text,
  display_name  text,
  invited_at    timestamptz,
  joined_at     timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index if not exists household_members_user_idx on public.household_members(user_id);

-- --- App grants (provisioning) --------------------------------------
-- member_user_id NULL  => granted to the WHOLE household (everyone).
-- member_user_id set   => granted to that specific member.
create table if not exists public.app_grants (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households(id) on delete cascade,
  app_id          text not null references public.foundry_apps(id) on delete cascade,
  member_user_id  uuid references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now()
);
-- At most one household-wide grant per app, and at most one per (app, member).
create unique index if not exists app_grants_household_app_idx
  on public.app_grants(household_id, app_id)
  where member_user_id is null;
create unique index if not exists app_grants_member_app_idx
  on public.app_grants(household_id, app_id, member_user_id)
  where member_user_id is not null;

-- --- New columns on existing tables ---------------------------------
-- FIXED-per-app data scope. 'personal' = each member sees their own data;
-- 'shared' = one dataset for the whole household. Default personal.
alter table public.foundry_apps
  add column if not exists data_scope text not null default 'personal'
  check (data_scope in ('shared','personal'));

-- foundry_app_data gains household_id (always, once scoped) and user_id
-- (personal apps only). Nullable so legacy/anon rows keep working pre-backfill.
alter table public.foundry_app_data
  add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.foundry_app_data
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- --- Membership helpers (SECURITY DEFINER avoids RLS recursion) ------
create or replace function public.is_member(hh uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hh and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function public.is_admin(hh uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hh and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('owner','admin')
  );
$$;

create or replace function public.is_owner(hh uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hh and m.user_id = auth.uid()
      and m.status = 'active' and m.role = 'owner'
  );
$$;

-- --- RLS on the NEW tables (final-correct; safe because nothing live
--     reads these yet) -------------------------------------------------
alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.app_grants        enable row level security;

-- households: members read their own household; owner edits its name.
drop policy if exists households_select on public.households;
create policy households_select on public.households
  for select using (public.is_member(id));

drop policy if exists households_update on public.households;
create policy households_update on public.households
  for update using (public.is_owner(id)) with check (public.is_owner(id));
-- (insert/delete: service role only — no policy granted to anon/authenticated.)

-- household_members: members see their household's roster; admins write it.
drop policy if exists household_members_select on public.household_members;
create policy household_members_select on public.household_members
  for select using (public.is_member(household_id));

drop policy if exists household_members_write on public.household_members;
create policy household_members_write on public.household_members
  for all using (public.is_admin(household_id)) with check (public.is_admin(household_id));

-- app_grants: members read their household's grants; admins write them.
drop policy if exists app_grants_select on public.app_grants;
create policy app_grants_select on public.app_grants
  for select using (public.is_member(household_id));

drop policy if exists app_grants_write on public.app_grants;
create policy app_grants_write on public.app_grants
  for all using (public.is_admin(household_id)) with check (public.is_admin(household_id));

-- --- Guard: never leave a household without an owner ----------------
create or replace function public.guard_household_owner()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  hh uuid;
begin
  hh := coalesce(old.household_id, new.household_id);
  -- After a delete or a role/status change, ensure >=1 active owner remains.
  if (tg_op = 'DELETE')
     or (tg_op = 'UPDATE' and (new.role <> 'owner' or new.status <> 'active')) then
    if not exists (
      select 1 from public.household_members m
      where m.household_id = hh and m.role = 'owner' and m.status = 'active'
        and not (m.household_id = coalesce(old.household_id, new.household_id)
                 and m.user_id = old.user_id)
    ) then
      raise exception 'Cannot remove or demote the last owner of a household';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists household_members_owner_guard on public.household_members;
create trigger household_members_owner_guard
  before update or delete on public.household_members
  for each row execute function public.guard_household_owner();

commit;

-- Sanity checks (read-only):
-- select table_name from information_schema.tables where table_name in
--   ('households','household_members','app_grants');
-- select column_name from information_schema.columns
--   where table_name='foundry_app_data' and column_name in ('household_id','user_id');
-- select column_name from information_schema.columns
--   where table_name='foundry_apps' and column_name='data_scope';
