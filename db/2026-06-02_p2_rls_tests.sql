-- =====================================================================
-- Foundry multi-user — PHASE 2 RLS policy tests (SELF-CONTAINED)
-- Run this any time after p0a_schema.sql. It creates the tightened policies
-- INSIDE this transaction, runs the assertions, and ROLLS BACK — so it
-- validates the exact policy logic in p2_rls_tighten.sql WITHOUT committing
-- anything and WITHOUT disturbing your live data or current RLS. Safe to run
-- before you ever apply the real tightening.
--
-- A failed assertion raises and aborts (everything rolls back anyway). If you
-- see 'ALL RLS TESTS PASSED', the policies behave correctly.
-- =====================================================================

begin;

-- ---- Apply the tightened policies in-transaction (mirror of p2_rls_tighten) -
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

create policy app_data_select on public.foundry_app_data
  for select to authenticated
  using (public.is_member(household_id) and (user_id is null or user_id = auth.uid()));
create policy app_data_insert on public.foundry_app_data
  for insert to authenticated
  with check (public.is_member(household_id) and (user_id is null or user_id = auth.uid()));
create policy app_data_update on public.foundry_app_data
  for update to authenticated
  using (public.is_member(household_id) and (user_id is null or user_id = auth.uid()))
  with check (public.is_member(household_id) and (user_id is null or user_id = auth.uid()));
create policy app_data_delete on public.foundry_app_data
  for delete to authenticated
  using (public.is_member(household_id) and (user_id is null or user_id = auth.uid()));
create policy apps_select on public.foundry_apps
  for select to authenticated using (true);

-- ---- Fixtures (throwaway users; rolled back) -----------------------
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

  insert into public.foundry_apps (id, name, description, icon, route, needs_persistence, status, data_scope)
  values ('test-shared','TestShared','','x','test-shared',true,'active','shared'),
         ('test-personal','TestPersonal','','x','test-personal',true,'active','personal')
  on conflict (id) do nothing;

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

  -- Only the TEST household's rows the member is entitled to: shared + own
  -- personal. Scope to the test app ids so unrelated real rows can't affect it.
  select count(*) into n from public.foundry_app_data where app_id in ('test-shared','test-personal');
  if n <> 2 then raise exception 'MEMBER should see 2 test data rows, saw %', n; end if;

  select count(*) into n from public.foundry_app_data where app_id='test-personal' and user_id=owner_id;
  if n <> 0 then raise exception 'MEMBER must NOT see owner personal row, saw %', n; end if;

  begin
    insert into public.foundry_app_data (id, app_id, key, value, status, household_id, user_id)
    values ('test-personal::k2::'||hh||'::'||member_id,'test-personal','k2','{"m":2}','active',hh,member_id);
    ok := true;
  exception when others then ok := false; end;
  if not ok then raise exception 'MEMBER should be able to write their own personal row'; end if;

  begin
    insert into public.foundry_app_data (id, app_id, key, value, status, household_id, user_id)
    values ('test-personal::k3::'||hh||'::'||owner_id,'test-personal','k3','{"x":1}','active',hh,owner_id);
    ok := true;
  exception when others then ok := false; end;
  if ok then raise exception 'MEMBER must NOT write a row owned by someone else'; end if;

  begin
    insert into public.app_grants (household_id, app_id, member_user_id) values (hh,'test-shared',member_id);
    ok := true;
  exception when others then ok := false; end;
  if ok then raise exception 'MEMBER must NOT be able to write grants'; end if;

  -- ---- Simulate OWNER ----
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role','authenticated')::text, true);

  select count(*) into n from public.foundry_app_data where app_id='test-personal' and user_id=member_id;
  if n <> 0 then raise exception 'OWNER must NOT read member personal data via RLS, saw %', n; end if;

  begin
    insert into public.app_grants (household_id, app_id, member_user_id) values (hh,'test-shared',member_id);
    ok := true;
  exception when others then ok := false; end;
  if not ok then raise exception 'OWNER (admin) should be able to write grants'; end if;

  -- ---- Simulate OUTSIDER ----
  perform set_config('request.jwt.claims', json_build_object('sub', outsider_id, 'role','authenticated')::text, true);
  select count(*) into n from public.foundry_app_data where app_id in ('test-shared','test-personal');
  if n <> 0 then raise exception 'OUTSIDER must see no test data, saw %', n; end if;
  select count(*) into n from public.household_members where household_id = hh;
  if n <> 0 then raise exception 'OUTSIDER must see no members of the test household, saw %', n; end if;

  perform set_config('role','postgres',true);
  raise notice 'ALL RLS TESTS PASSED';
end $$;

rollback;
