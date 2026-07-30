-- V11 데이터 구조와 공개 테이블 RLS 잠금을 pgTAP으로 검증한다.
begin;
select plan(32);

select has_schema('private', 'private schema exists');
select has_schema('audit', 'audit schema exists');
select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'my_runners', 'my_runners exists');
select has_table('public', 'friendships', 'friendships exists');
select has_table('public', 'crews', 'crews exists');
select has_table('public', 'crew_memberships', 'crew_memberships exists');
select has_table('public', 'world_progress', 'world_progress exists');
select has_table('public', 'monthly_apex', 'monthly_apex exists');
select has_table('public', 'daily_run_contracts', 'daily contracts exists');
select has_table('private', 'canonical_runs', 'canonical runs exists');
select has_table('private', 'reward_ledger', 'reward ledger exists');
select has_view(
  'public',
  'my_verified_run_summary',
  'safe runner summary exists'
);
select has_function(
  'public',
  'ingest_verified_run',
  array[
    'text', 'text', 'text', 'timestamp with time zone',
    'timestamp with time zone', 'integer', 'integer', 'text', 'jsonb'
  ],
  'verified run ingest exists'
);
select has_pk('public', 'profiles', 'profiles has primary key');
select has_pk('private', 'canonical_runs', 'runs have primary key');
select col_not_null(
  'private',
  'canonical_runs',
  'fingerprint',
  'fingerprint is required'
);
select col_not_null(
  'private',
  'reward_ledger',
  'idempotency_key',
  'ledger idempotency is required'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  true,
  'profiles RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.my_runners'::regclass),
  true,
  'my_runners RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.world_progress'::regclass),
  true,
  'world_progress RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.monthly_apex'::regclass),
  true,
  'monthly_apex RLS enabled'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public'),
  16,
  'all exposed-table policies installed'
);
select is(
  has_table_privilege('authenticated', 'private.canonical_runs', 'select'),
  false,
  'client cannot read canonical runs'
);
select is(
  has_table_privilege('authenticated', 'private.reward_ledger', 'insert'),
  false,
  'client cannot insert reward ledger'
);
select is(
  has_table_privilege('authenticated', 'public.world_progress', 'insert'),
  false,
  'client cannot forge world progress'
);
select is(
  has_table_privilege('authenticated', 'public.monthly_apex', 'update'),
  false,
  'client cannot forge monthly apex'
);
select is(
  has_table_privilege('authenticated', 'public.my_runners', 'insert'),
  false,
  'client cannot insert forged runner growth'
);
select is(
  has_column_privilege('authenticated', 'public.profiles', 'created_at', 'update'),
  false,
  'client cannot rewrite profile creation time'
);
select is(
  has_column_privilege('authenticated', 'public.profiles', 'display_name', 'update'),
  true,
  'client can update own display name'
);
select is(
  has_column_privilege('authenticated', 'public.friendships', 'status', 'update'),
  true,
  'client can use guarded friendship status transition'
);
select is(
  has_column_privilege('authenticated', 'public.friendships', 'requester_id', 'update'),
  false,
  'client cannot rewrite friendship participants'
);

select * from finish();
rollback;
