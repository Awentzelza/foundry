-- =====================================================================
-- Foundry multi-user — PHASE 2: tighten RLS (SECURITY-CRITICAL)
-- Run this LAST, only after auth is on and you've verified the
-- authenticated path end-to-end. Run p2_rls_tests.sql first (it rolls back)
-- to confirm the policies behave before applying here.
--
-- This drops the legacy anon-write posture on foundry_app_data / foundry_apps
-- and replaces it with household + per-user scoping. The service role
-- (push_app, /api/invite, backfill) BYPASSES RLS, so those paths are
-- unaffected. After this runs, an unauthenticated client can no longer read
-- or write app data — make sure the client login gate is on (VITE_REQUIRE_AUTH=true).
-- =====================================================================

begin;

-- Drop every existing policy on the two data tables (names vary by history).
do $$
declare r record;
begin
  for r in select policyname from pg_policies
           where schemaname='public' and tablename='foundry_app_data' loop
    execute format('drop policy if exists %I on public.foundry_app_data', r.policyname);
  end loop;
  for r in select policyname from pg_policies
           where schemaname='public' and tablename='foundry_apps' loop
    execute format('drop policy if exists %I on public.foundry_apps', r.policyname);
  end loop;
end $$;

alter table public.foundry_app_data enable row level security;
alter table public.foundry_apps     enable row level security;

-- foundry_app_data: a member of the household, and either a shared row
-- (user_id is null) or their own personal row (user_id = auth.uid()).
-- household_id is null => is_member(null) => false, so legacy unscoped rows
-- are no longer readable by the anon/authenticated client (only service role).
create policy app_data_select on public.foundry_app_data
  for select to authenticated
  using (public.is_member(household_id)
         and (user_id is null or user_id = auth.uid()));

create policy app_data_insert on public.foundry_app_data
  for insert to authenticated
  with check (public.is_member(household_id)
              and (user_id is null or user_id = auth.uid()));

create policy app_data_update on public.foundry_app_data
  for update to authenticated
  using (public.is_member(household_id)
         and (user_id is null or user_id = auth.uid()))
  with check (public.is_member(household_id)
              and (user_id is null or user_id = auth.uid()));

create policy app_data_delete on public.foundry_app_data
  for delete to authenticated
  using (public.is_member(household_id)
         and (user_id is null or user_id = auth.uid()));

-- foundry_apps: app metadata (names/scope) is not sensitive — any
-- authenticated user may read it; the dashboard filters by grants and the
-- data RLS above is what actually protects content. Writes are service-role
-- only (no insert/update/delete policy granted to authenticated).
create policy apps_select on public.foundry_apps
  for select to authenticated using (true);

commit;

-- After this: confirm a normal (authenticated, non-service) client can still
-- read its own apps and data, and that push_app (service role) still works.
