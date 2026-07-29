-- pgTAP: regression suite for the AUDIT_07 finding — client write scope on api.profiles.
-- Every assertion here failed before migration 0008.
begin;
select plan(13);

insert into api.profiles (user_id, display_name, user_code, reward_timezone) values
  ('77777777-0000-0000-0000-000000000001', 'Scope User', 'SCOP0001', 'Asia/Seoul');

-- ---------------------------------------------------------------------------
-- Column-level grants
-- ---------------------------------------------------------------------------
select ok(has_column_privilege('authenticated', 'api.profiles', 'display_name', 'update'),
  'a user may still rename themselves');
select ok(has_column_privilege('authenticated', 'api.profiles', 'locale', 'update'),
  'a user may still change their locale');
select ok(has_column_privilege('authenticated', 'api.profiles', 'profile_visibility', 'update'),
  'a user may still change their profile visibility');

select ok(not has_column_privilege('authenticated', 'api.profiles', 'reward_timezone', 'update'),
  'a user may NOT write reward_timezone directly');
select ok(not has_column_privilege('authenticated', 'api.profiles', 'user_id', 'update'),
  'a user may NOT rewrite their user_id');
select ok(not has_column_privilege('authenticated', 'api.profiles', 'user_code', 'update'),
  'a user may NOT rewrite their public user code');
select ok(not has_column_privilege('authenticated', 'api.profiles', 'is_anonymous', 'update'),
  'a user may NOT rewrite their anonymous flag');
select ok(not has_column_privilege('authenticated', 'api.profiles', 'created_at', 'update'),
  'a user may NOT backdate their account');

-- ---------------------------------------------------------------------------
-- The exploit itself, attempted as the user
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"77777777-0000-0000-0000-000000000001","role":"authenticated"}';

select throws_ok(
  $$ update api.profiles set reward_timezone = 'Pacific/Kiritimati'
     where user_id = '77777777-0000-0000-0000-000000000001' $$,
  '42501', null,
  'the timezone boundary-shopping exploit is refused at the grant layer');

select lives_ok(
  $$ update api.profiles set display_name = 'Renamed'
     where user_id = '77777777-0000-0000-0000-000000000001' $$,
  'an ordinary rename still works');

reset role;

-- ---------------------------------------------------------------------------
-- Defence in depth: even a privileged direct UPDATE is rejected
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ update api.profiles set reward_timezone = 'Pacific/Kiritimati'
     where user_id = '77777777-0000-0000-0000-000000000001' $$,
  '23514', null,
  'a direct privileged UPDATE of reward_timezone is rejected by the trigger');

-- ---------------------------------------------------------------------------
-- The audited path works, and is rate limited
-- ---------------------------------------------------------------------------
select is(
  (private.apply_timezone_change('77777777-0000-0000-0000-000000000001', 'Europe/Berlin') ->> 'status'),
  'changed', 'a genuine relocation succeeds through the audited function');

select throws_ok(
  $$ select private.apply_timezone_change('77777777-0000-0000-0000-000000000001', 'America/New_York') $$,
  '23514', null,
  'a second change within 24 hours is refused, which kills nightly boundary shopping');

select * from finish();
rollback;
