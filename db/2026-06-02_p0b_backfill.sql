-- =====================================================================
-- Foundry multi-user — PHASE 0b: backfill Andre's data
-- Run this AFTER: p0a_schema.sql is applied, the multi-user branch is
-- deployed, and you have signed in ONCE via magic link (so your row exists
-- in auth.users). It is idempotent — safe to re-run.
--
-- What it does:
--   * creates your household (if absent) and makes you its owner
--   * sets each app's FIXED data_scope (shared vs personal)
--   * rewrites existing foundry_app_data rows to the scoped id scheme and
--     stamps household_id (+ user_id for personal apps)
--   * grants every current app to YOU specifically (members still see
--     nothing until you provision — owner sees all via the client anyway)
--
-- Scoped id scheme (must match src/hooks/useAppData.ts):
--   shared   :  <app>::<key>::<householdId>
--   personal :  <app>::<key>::<householdId>::<userId>
-- =====================================================================

do $$
declare
  andre_email text := 'andre.wentzel@centialconsulting.com';
  andre_id    uuid;
  hh_id       uuid;
begin
  select id into andre_id from auth.users where lower(email) = lower(andre_email);
  if andre_id is null then
    raise exception 'No auth.users row for % yet. Sign in once via magic link, then re-run.', andre_email;
  end if;

  -- Household (reuse if this user already owns one).
  select h.id into hh_id
  from public.households h
  join public.household_members m on m.household_id = h.id
  where m.user_id = andre_id and m.role = 'owner'
  limit 1;

  if hh_id is null then
    insert into public.households (name) values ('Wentzel') returning id into hh_id;
  end if;

  -- Owner membership.
  insert into public.household_members (household_id, user_id, role, status, email, display_name, joined_at)
  values (hh_id, andre_id, 'owner', 'active', andre_email, 'Andre', now())
  on conflict (household_id, user_id)
  do update set role = 'owner', status = 'active', email = excluded.email;

  -- Fixed per-app data scopes. Everything defaults to 'personal' (from p0a);
  -- only the genuinely shared apps are flipped here.
  update public.foundry_apps set data_scope = 'shared'
    where id in ('grocery-list', 'meal-plan');
  update public.foundry_apps set data_scope = 'personal'
    where id in ('water-tracker', 'workout-streak', 'hyrox-tracker', 'pomodoro');

  -- Rewrite existing data rows to the scoped id scheme + stamp columns.
  -- Only rows that haven't been scoped yet (household_id is null).
  update public.foundry_app_data d
  set household_id = hh_id,
      user_id = case when a.data_scope = 'personal' then andre_id else null end,
      id = case
             when a.data_scope = 'personal'
               then d.app_id || '::' || d.key || '::' || hh_id::text || '::' || andre_id::text
             else d.app_id || '::' || d.key || '::' || hh_id::text
           end
  from public.foundry_apps a
  where d.app_id = a.id
    and d.household_id is null;

  -- Grant every current app to Andre specifically (not household-wide, so
  -- adding Bel later doesn't auto-expose anything).
  insert into public.app_grants (household_id, app_id, member_user_id)
  select hh_id, fa.id, andre_id
  from public.foundry_apps fa
  on conflict (household_id, app_id, member_user_id) where member_user_id is not null
  do nothing;

  raise notice 'Backfill complete. household=% owner=%', hh_id, andre_id;
end $$;

-- Verify (read-only):
-- select * from public.households;
-- select household_id, user_id, role, status, email from public.household_members;
-- select id, data_scope from public.foundry_apps order by id;
-- select id, app_id, household_id, user_id from public.foundry_app_data order by app_id;
-- select household_id, app_id, member_user_id from public.app_grants order by app_id;
