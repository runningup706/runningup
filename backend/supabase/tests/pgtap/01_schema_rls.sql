-- pgTAP: schema boundary and Row Level Security
-- Master # 22.7 / audit 7. Attacks the boundary rather than describing it.
begin;
select plan(33);

-- ---------------------------------------------------------------------------
-- Every exposed relation has RLS enabled and forced.
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_tables t
   join pg_class c on c.relname = t.tablename
   join pg_namespace n on n.oid = c.relnamespace and n.nspname = t.schemaname
   where t.schemaname = 'api' and not c.relrowsecurity),
  0,
  'every table in api has row level security enabled'
);

select is(
  (select count(*)::int from pg_tables t
   join pg_class c on c.relname = t.tablename
   join pg_namespace n on n.oid = c.relnamespace and n.nspname = t.schemaname
   where t.schemaname = 'api' and not c.relforcerowsecurity),
  0,
  'every table in api forces RLS even for the table owner'
);

select is(
  (select count(*)::int from pg_tables t
   join pg_class c on c.relname = t.tablename
   join pg_namespace n on n.oid = c.relnamespace and n.nspname = t.schemaname
   where t.schemaname in ('private', 'audit', 'analytics_private') and not c.relrowsecurity),
  0,
  'private, audit and analytics_private tables also have RLS enabled'
);

-- ---------------------------------------------------------------------------
-- Client roles cannot reach the private schemas at all.
-- ---------------------------------------------------------------------------
select ok(not has_schema_privilege('anon', 'private', 'usage'), 'anon has no USAGE on private');
select ok(not has_schema_privilege('authenticated', 'private', 'usage'), 'authenticated has no USAGE on private');
select ok(not has_schema_privilege('anon', 'audit', 'usage'), 'anon has no USAGE on audit');
select ok(not has_schema_privilege('authenticated', 'audit', 'usage'), 'authenticated has no USAGE on audit');
select ok(not has_schema_privilege('authenticated', 'analytics_private', 'usage'), 'authenticated has no USAGE on analytics_private');

-- ---------------------------------------------------------------------------
-- Ledgers and progression are server-write only.
-- ---------------------------------------------------------------------------
select ok(not has_table_privilege('authenticated', 'api.xp_ledger', 'insert'), 'client cannot INSERT into xp_ledger');
select ok(not has_table_privilege('authenticated', 'api.xp_ledger', 'update'), 'client cannot UPDATE xp_ledger');
select ok(not has_table_privilege('authenticated', 'api.xp_ledger', 'delete'), 'client cannot DELETE from xp_ledger');
select ok(has_table_privilege('authenticated', 'api.xp_ledger', 'select'), 'client CAN read its own xp_ledger rows');

select ok(not has_table_privilege('authenticated', 'api.monthly_apex_progress', 'insert'), 'client cannot INSERT Monthly Apex progress');
select ok(not has_table_privilege('authenticated', 'api.monthly_apex_progress', 'update'), 'client cannot UPDATE Monthly Apex progress');
select ok(not has_table_privilege('authenticated', 'api.monthly_apex_checkpoint_claims', 'insert'), 'client cannot self-claim a checkpoint');
select ok(not has_table_privilege('authenticated', 'api.world_crown_history', 'insert'), 'client cannot award itself a World Crown');
select ok(not has_table_privilege('authenticated', 'api.apex_race_entries', 'insert'), 'client cannot enter itself into the Apex Axis race');
select ok(not has_table_privilege('authenticated', 'api.runner_passports', 'update'), 'client cannot write verified passport fields');
select ok(not has_table_privilege('authenticated', 'api.user_daily_momentum', 'update'), 'client cannot inflate its own streak');
select ok(not has_table_privilege('authenticated', 'api.currency_ledger', 'insert'), 'client cannot mint currency');

-- ---------------------------------------------------------------------------
-- The reward transaction is not callable by a client role.
-- ---------------------------------------------------------------------------
select ok(
  not has_function_privilege('authenticated', 'private.apply_verified_run_reward(uuid, text, text)', 'execute'),
  'client cannot execute apply_verified_run_reward directly'
);
select ok(
  not has_function_privilege('anon', 'private.apply_verified_run_reward(uuid, text, text)', 'execute'),
  'anonymous cannot execute apply_verified_run_reward directly'
);

-- ---------------------------------------------------------------------------
-- Cross-user isolation, exercised with real JWT claims.
-- ---------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code) values
  ('11111111-1111-1111-1111-111111111111', 'Runner A', 'AAAA1111'),
  ('22222222-2222-2222-2222-222222222222', 'Runner B', 'BBBB2222');

insert into api.user_settings (user_id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*)::int from api.profiles),
  1,
  'a signed-in user sees exactly their own profile row, not every profile'
);
select is(
  (select display_name from api.profiles),
  'Runner A',
  'and it is the right one'
);
select is(
  (select count(*)::int from api.profiles where user_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'another user profile is invisible even when addressed by primary key'
);
select is(
  (select count(*)::int from api.user_settings where user_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'another user settings row is invisible'
);

-- An UPDATE aimed at another user matches no visible row, so it changes nothing. RLS
-- filters it via USING before WITH CHECK is ever reached: the correct outcome is zero
-- rows affected, NOT an exception. Asserting an exception here would have been wrong.
select lives_ok(
  $$ update api.user_settings set reduced_motion = true
     where user_id = '22222222-2222-2222-2222-222222222222' $$,
  'an update aimed at another user raises no error...'
);

-- An INSERT naming another user DOES violate WITH CHECK and must raise.
select throws_ok(
  $$ insert into api.consents (user_id, consent_kind, consent_version, granted)
     values ('22222222-2222-2222-2222-222222222222', 'location', '1.0.0', true) $$,
  '42501',
  null,
  'inserting a row owned by another user is refused'
);

select lives_ok(
  $$ update api.user_settings set reduced_motion = true
     where user_id = '11111111-1111-1111-1111-111111111111' $$,
  'updating your own settings is allowed'
);

-- Raw route data must be unreachable from a client role entirely.
select throws_ok(
  $$ select count(*) from private.run_samples $$,
  '42501',
  null,
  'raw GPS samples are unreachable from a client role'
);

reset role;
select is(
  (select count(*)::int from api.profiles),
  2,
  'the service side still sees both profiles'
);

-- ...and, seen from the service side where the row IS visible, it changed nothing.
select is(
  (select reduced_motion from api.user_settings
   where user_id = '22222222-2222-2222-2222-222222222222'),
  false,
  '...and leaves the other user row untouched'
);

select is(
  (select reduced_motion from api.user_settings
   where user_id = '11111111-1111-1111-1111-111111111111'),
  true,
  'while the update to your own row did take effect'
);

select * from finish();
rollback;
