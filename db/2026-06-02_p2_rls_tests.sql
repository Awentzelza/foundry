-- =====================================================================
-- Foundry multi-user — PHASE 2 RLS policy tests
-- Run this in the Supabase SQL editor BEFORE applying p2_rls_tighten.sql to
-- production data — actually, run it AFTER p2_rls_tighten.sql is applied (it
-- needs the policies to exist), but the whole script ROLLS BACK at the end so
-- it leaves no trace. It creates throwaway users/household/apps/data, then
-- simulates each role via request.jwt.claims and asserts visibility + writes.
--
-- A failed assertion raises and aborts. If you see 'ALL RLS TESTS PASSED' the
-- policies behave correctly. Everything is rolled back.
-- =====================================================================

begin;

-- Minimal auth.users rows (FK targets). Adjust columns if your Supabase
-- version rejects them.
insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner@test.local',now(),now()),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','member@test.local',now(),now()),
  ('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','outsider@test.local',now(),now());

do $$
declare
  hh uuid;
  owner_id    uuid := '11111111-1111-1111-1111-111111111111';
  member_id   uuid := '22222222-2222-2222-2222-222222222222';
  outsider_id uuid := '33333333-3333-3333-3333-333333333333';
  n int;
  ok boolean;
begin
  insert into public.households (name) values ('TEST-HH') returning id into hh;

  insert into public.household_members (household_id, user_id, role, status)
  values (hh, owner_id, 'owner', 'active'),
         (hh, member_id, 'member', 'active');

  -- Two apps: one shared, one personal.
  insert into public.foundry_apps (id, name, description, icon, route, needs_persistence, status, data_scope)
  values ('test-shared','TestShared','','x','test-shared',true,'active','shared'),
         ('test-personal','TestPersonal','','x','test-personal',true,'active','personal')
  on conflict (id) do nothing;

  -- Data: one shared row; personal rows for owner and member.
  insert into public.foundry_app_data (id, app_id, key, value, status, household_id, user_id)
  values
    ('test-shared::state::'||hh, 'test-shared','state','{"x":1}','active',hh,null),
    ('test-personal::state::'||hh||'::'||owner_id,  'test-personal','state','{"o":1}','active',hh,owner_id),
    ('test-personal::state::'||hh||'::'||member_id, 'test-personal','state','{"m":1}','active',hh,member_id);

  insert into public.app_grants (household_id, app_id, member_user_id)
  values (hh, 'test-shared', null), (hh, 'test-personal', member_id);

  -- ---- Simulate MEMBER ----
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub', member_id, 'role','authenticated')::text, true);

  select count(*) into n from public.foundry_app_data;  -- shared + own personal = 2
  if n <> 2 then raise exception 'MEMBER should see 2 data rows, saw %', n; end if;

  select count(*) into n from public.foundry_app_data where app_id='test-personal' and user_id=owner_id;
  if n <> 0 then raise exception 'MEMBER must NOT see owner personal row, saw %', n; end if;

  -- member can write their own personal row
  begin
    insert into public.foundry_app_data (id, app_id, key, value, status, household_id, user_id)
    values ('test-personal::k2::'||hh||'::'||member_id,'test-personal','k2','{"m":2}','active',hh,member_id);
    ok := true;
  exception when others then ok := false; end;
  if not ok then raise exception 'MEMBER should be able to write their own personal row'; end if;

  -- member CANNOT write a row as the owner
  begin
    insert into public.foundry_app_data (id, app_id, key, value, status, household_id, user_id)
    values ('test-personal::k3::'||hh||'::'||owner_id,'test-personal','k3','{"x":1}','active',hh,owner_id);
    ok := true;
  exception when others then ok := false; end;
  if ok then raise exception 'MEMBER must NOT be able to write a row owned by someone else'; end if;

  -- member CANNOT write a grant (not admin)
  begin
    insert into public.app_grants (household_id, app_id, member_user_id)
    values (hh,'test-shared',member_id);
    ok := true;
  exception when others then ok := false; end;
  if ok then raise exception 'MEMBER must NOT be able to write grants'; end if;

  -- ---- Simulate OWNER ----
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role','authenticated')::text, true);

  -- owner sees shared + own personal, but NOT member personal (privacy by RLS)
  select count(*) into n from public.foundry_app_data where app_id='test-personal' and user_id=member_id;
  if n <> 0 then raise exception 'OWNER must NOT read member personal data via RLS, saw %', n; end if;

  -- owner CAN write a grant
  begin
    insert into public.app_grants (household_id, app_id, member_user_id)
    values (hh,'test-shared',member_id);
    ok := true;
  exception when others then ok := false; end;
  if not ok then raise exception 'OWNER (admin) should be able to write grants'; end if;

  -- ---- Simulate OUTSIDER ----
  perform set_config('request.jwt.claims', json_build_object('sub', outsider_id, 'role','authenticated')::text, true);
  select count(*) into n from public.foundry_app_data;
  if n <> 0 then raise exception 'OUTSIDER must see no data, saw %', n; end if;
  select count(*) into n from public.household_members;
  if n <> 0 then raise exception 'OUTSIDER must see no members, saw %', n; end if;

  perform set_config('role','postgres',true);
  raise notice 'ALL RLS TESTS PASSED';
end $$;

rollback;
