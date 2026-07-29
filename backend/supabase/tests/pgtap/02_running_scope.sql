-- pgTAP: direction lock DL-3 — running only.
-- Master # 22.1 / # 22.6 / audit 4. The point of this suite is that trail, hiking,
-- cycling and climbing are not merely absent from the data: they are unrepresentable.
begin;
select plan(14);

select is(
  (select count(*)::int from pg_enum e join pg_type t on t.oid = e.enumtypid
   where t.typname = 'activity_type'),
  4, 'exactly four activity types exist');

select set_eq(
  $$ select enumlabel::text from pg_enum e join pg_type t on t.oid = e.enumtypid
     where t.typname = 'activity_type' $$,
  array['road', 'track', 'treadmill', 'indoor'],
  'the activity types are exactly road, track, treadmill and indoor');

-- Every forbidden mode fails at the type level, not at a code review.
select throws_ok(
  $$ select 'trail'::private.activity_type $$, '22P02', null,
  'trail is not a valid activity type');
select throws_ok(
  $$ select 'hiking'::private.activity_type $$, '22P02', null,
  'hiking is not a valid activity type');
select throws_ok(
  $$ select 'cycling'::private.activity_type $$, '22P02', null,
  'cycling is not a valid activity type');
select throws_ok(
  $$ select 'climbing'::private.activity_type $$, '22P02', null,
  'climbing is not a valid activity type');
select throws_ok(
  $$ select 'walking'::private.activity_type $$, '22P02', null,
  'walking is not a standalone activity type');

-- run-walk survives as a beginner running STYLE, which is the only place walking belongs.
select ok(
  exists(select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
         where t.typname = 'session_style' and e.enumlabel = 's_run_walk'),
  'run-walk exists as a beginner running style');

select is(
  (select count(*)::int from pg_enum e join pg_type t on t.oid = e.enumtypid
   where t.typname = 'session_style' and e.enumlabel ilike any(array['%trail%','%hike%','%cycl%','%climb%'])),
  0, 'no session style references a forbidden mode');

-- A session row cannot be created with a forbidden activity.
insert into api.profiles (user_id, display_name, user_code) values
  ('cccccccc-0000-0000-0000-000000000001', 'Scope Tester', 'SCOPE001');

select throws_ok(
  $$ insert into api.run_sessions (user_id, activity_type, started_at, distance_meters, server_nonce)
     values ('cccccccc-0000-0000-0000-000000000001', 'trail', now(), 10000, 'nonce-trail') $$,
  '22P02', null, 'a trail session cannot be inserted at all');

select lives_ok(
  $$ insert into api.run_sessions (user_id, activity_type, started_at, distance_meters, server_nonce)
     values ('cccccccc-0000-0000-0000-000000000001', 'treadmill', now(), 10000, 'nonce-treadmill') $$,
  'a treadmill session is a first-class running session');

-- Altitude may be stored as inert sensor metadata, but nothing may consume it.
select ok(
  exists(select 1 from information_schema.columns
         where table_schema = 'private' and table_name = 'run_samples' and column_name = 'altitude_meters'),
  'altitude is retained as raw sensor metadata');

-- `prokind = 'f'` is required: pg_get_functiondef() raises on aggregates and window
-- functions, which would abort the suite rather than report a result.
select is(
  (select count(*)::int from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('private', 'api')
     and p.prokind = 'f'
     and pg_get_functiondef(p.oid) ilike '%altitude%'),
  0, 'no function reads altitude: it can never reach a stat, quest or multiplier');

select is(
  (select count(*)::int from information_schema.columns
   where table_schema in ('api', 'private')
     and (column_name ilike '%elevation%' or column_name ilike '%weather%' or column_name ilike '%night%')),
  0, 'no elevation, weather or night-time column exists anywhere in the schema');

select * from finish();
rollback;
