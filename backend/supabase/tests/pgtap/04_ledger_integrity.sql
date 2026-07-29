-- pgTAP: ledger integrity and direction lock DL-5 (verified running is the only core power).
-- Master # 11.10 / # 22.7 / audit 7.
begin;
select plan(17);

-- ---------------------------------------------------------------------------
-- The only sources that may touch core power
-- ---------------------------------------------------------------------------
select set_eq(
  $$ select enumlabel::text from pg_enum e join pg_type t on t.oid = e.enumtypid
     where t.typname = 'core_power_source' $$,
  array['verified_run', 'current_month_import', 'monthly_apex_checkpoint', 'reversal', 'adjustment'],
  'core power sources are exactly the verified-running set'
);

select throws_ok(
  $$ select 'purchase'::private.core_power_source $$, '22P02', null,
  'a purchase cannot be typed as a core power source');
select throws_ok(
  $$ select 'advertisement'::private.core_power_source $$, '22P02', null,
  'watching an ad cannot be typed as a core power source');
select throws_ok(
  $$ select 'idle'::private.core_power_source $$, '22P02', null,
  'idle time cannot be typed as a core power source');
select throws_ok(
  $$ select 'referral'::private.core_power_source $$, '22P02', null,
  'a referral cannot be typed as a core power source');
select throws_ok(
  $$ select 'login_day'::private.core_power_source $$, '22P02', null,
  'a login streak alone cannot be typed as a core power source');

-- ---------------------------------------------------------------------------
-- Immutability
-- ---------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code) values
  ('dddddddd-0000-0000-0000-000000000001', 'Ledger Tester', 'LEDG0001');

insert into api.xp_ledger (
  user_id, source_type, formula_version, verification_grade, base_components,
  monthly_distance_before, monthly_distance_after, monthly_multiplier, final_amount, idempotency_key
) values (
  'dddddddd-0000-0000-0000-000000000001', 'verified_run', 'reward.v1.0.0', 'A',
  '{"base_distance_xp": 1000}'::jsonb, 0, 10000, 1.00, 1000, 'ledger-1'
);

-- UPDATE and DELETE are silently discarded by rule: the row cannot be rewritten.
update api.xp_ledger set final_amount = 999999
  where user_id = 'dddddddd-0000-0000-0000-000000000001';
select is(
  (select final_amount from api.xp_ledger where idempotency_key = 'ledger-1'),
  1000::numeric, 'an UPDATE against the XP ledger changes nothing');

delete from api.xp_ledger where user_id = 'dddddddd-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from api.xp_ledger where idempotency_key = 'ledger-1'),
  1, 'a DELETE against the XP ledger removes nothing');

-- ---------------------------------------------------------------------------
-- Idempotency and duplicate defence
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ insert into api.xp_ledger
     (user_id, source_type, formula_version, verification_grade, base_components,
      monthly_distance_before, monthly_distance_after, monthly_multiplier, final_amount, idempotency_key)
     values ('dddddddd-0000-0000-0000-000000000001', 'verified_run', 'reward.v1.0.0', 'A',
             '{}'::jsonb, 0, 10000, 1.00, 1000, 'ledger-1') $$,
  '23505', null, 'the same idempotency key cannot be used twice');

-- ---------------------------------------------------------------------------
-- Ledger invariants that encode the direction lock
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ insert into api.xp_ledger
     (user_id, source_type, formula_version, verification_grade, base_components,
      monthly_distance_before, monthly_distance_after, monthly_multiplier, final_amount, idempotency_key)
     values ('dddddddd-0000-0000-0000-000000000001', 'verified_run', 'reward.v1.0.0', 'A',
             '{}'::jsonb, 0, 1500000, 1.00, 1000, 'ledger-over') $$,
  '23514', null, 'a ledger row cannot record monthly distance above 1000 km');

select throws_ok(
  $$ insert into api.xp_ledger
     (user_id, source_type, formula_version, verification_grade, base_components,
      monthly_distance_before, monthly_distance_after, monthly_multiplier, final_amount, idempotency_key)
     values ('dddddddd-0000-0000-0000-000000000001', 'verified_run', 'reward.v1.0.0', 'A',
             '{}'::jsonb, 0, 10000, 2.50, 1000, 'ledger-mult') $$,
  '23514', null, 'a multiplier above the World Crown value is rejected');

select throws_ok(
  $$ insert into api.xp_ledger
     (user_id, source_type, formula_version, verification_grade, base_components,
      monthly_distance_before, monthly_distance_after, monthly_multiplier, final_amount, idempotency_key)
     values ('dddddddd-0000-0000-0000-000000000001', 'verified_run', 'reward.v1.0.0', 'A',
             '{}'::jsonb, 50000, 10000, 1.00, 1000, 'ledger-regress') $$,
  '23514', null, 'monthly distance can never regress within a ledger row');

select throws_ok(
  $$ insert into api.xp_ledger
     (user_id, source_type, formula_version, verification_grade, base_components,
      monthly_distance_before, monthly_distance_after, monthly_multiplier, final_amount, idempotency_key)
     values ('dddddddd-0000-0000-0000-000000000001', 'verified_run', 'reward.v1.0.0', 'A',
             '{}'::jsonb, 0, 10000, 1.00, -500, 'ledger-negative') $$,
  '23514', null, 'only a reversal may carry a negative amount');

-- A reversal is a NEW row that names its original — never an edit of the original.
select lives_ok(
  $$ insert into api.xp_ledger
     (user_id, source_type, formula_version, verification_grade, base_components,
      monthly_distance_before, monthly_distance_after, monthly_multiplier, final_amount,
      idempotency_key, reversal_of)
     values ('dddddddd-0000-0000-0000-000000000001', 'reversal', 'reward.v1.0.0', 'A',
             '{}'::jsonb, 10000, 10000, 1.00, -1000, 'ledger-reversal',
             (select id from api.xp_ledger where idempotency_key = 'ledger-1')) $$,
  'a compensating reversal row is allowed and references its original');

select is(
  (select total_fitness_xp from api.v_fitness_xp_total
   where user_id = 'dddddddd-0000-0000-0000-000000000001'),
  0::numeric, 'the reversal nets the balance back to zero without deleting history');

select is(
  (select count(*)::int from api.xp_ledger where user_id = 'dddddddd-0000-0000-0000-000000000001'),
  2, 'and both the original and the reversal remain on the record');

-- Cosmetics can never carry power, enforced by CHECK.
select throws_ok(
  $$ insert into api.cosmetics (id, character_id, slot, name_key, core_power)
     values ('csm_cheat', 'chr_seon', 'aura', 'k', 5) $$,
  '23514', null, 'a cosmetic with non-zero core power is rejected by the database');

select * from finish();
rollback;
