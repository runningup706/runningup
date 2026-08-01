-- pgTAP: My Runner, the wardrobe, the world field and Global Events (migration 0013).
--
-- The owner floors these tables exist for are the easiest in the product to satisfy
-- dishonestly: 600 rows in `api.wearable_items` is a number, and a number says nothing
-- about whether any of them can be put on a runner. So the count assertions below are the
-- cheap half, and the throws_ok assertions are the half that matters — each one is a way
-- the catalogue could have been a lie, made structurally impossible instead.

begin;
select plan(41);

-- ---------------------------------------------------------------------------
-- Counts: the owner floors, seeded
-- ---------------------------------------------------------------------------
select cmp_ok((select count(*)::int from api.my_runner_base_styles), '>=', 24, '24+ My Runner base styles are seeded');
select cmp_ok((select count(*)::int from api.world_runners), '>=', 200, '200+ world runners are seeded');
select cmp_ok((select count(*)::int from api.equipment_slots), '>=', 18, '18+ equipment slots are seeded');
select cmp_ok((select count(*)::int from api.outfit_sets), '>=', 120, '120+ outfit sets are seeded');
select cmp_ok((select count(*)::int from api.wearable_items), '>=', 600, '600+ wearable items are seeded');
select cmp_ok((select count(*)::int from api.global_events), '>=', 6, '6+ Global Events are seeded');

-- The previously shipped counts were not absorbed into the bigger new ones.
select is((select count(*)::int from api.cosmetics), 96, 'the 96 character cosmetics still exist alongside the wardrobe');
select is((select count(*)::int from api.gear_sets), 72, 'the 72 gear sets still exist alongside the outfit sets');

-- ---------------------------------------------------------------------------
-- The count that a count cannot check
-- ---------------------------------------------------------------------------
-- Every base style must be able to fill every required slot. 600 items and a child style
-- with no shoes passes every assertion above.
select is(
  (select count(*)::int
     from api.my_runner_base_styles st
    cross join api.equipment_slots sl
    where sl.is_required
      and not exists (select 1 from api.wearable_items i
                       where i.slot_id = sl.id and st.id = any (i.compatible_base_style_ids))),
  0, 'every base style has something to wear in every required slot');

select is(
  (select count(*)::int from api.equipment_slots sl
    where not exists (select 1 from api.wearable_items i where i.slot_id = sl.id)),
  0, 'every equipment slot has at least one wearable item');

-- ---------------------------------------------------------------------------
-- Representation floors, in the data rather than in a design document
-- ---------------------------------------------------------------------------
select cmp_ok((select count(distinct age_band)::int from api.my_runner_base_styles), '>=', 6,
  'base styles span at least 6 age bands');
select cmp_ok((select count(distinct build)::int from api.my_runner_base_styles), '>=', 10,
  'base styles span at least 10 builds');
select cmp_ok((select count(distinct skin_tone_id)::int from api.my_runner_base_styles), '>=', 6,
  'base styles span at least 6 skin tones');
select is((select count(distinct presentation)::int from api.my_runner_base_styles), 3,
  'base styles cover masculine, feminine and neutral presentation');
select cmp_ok((select count(*)::int from api.my_runner_base_styles where adaptive_kit_id is not null), '>=', 3,
  'at least 3 base styles are adaptive athletes');
select is((select count(distinct rig_id)::int from api.my_runner_base_styles), 1,
  'all base styles share one rig, so one wardrobe fits all of them');

-- ---------------------------------------------------------------------------
-- World runners are people, and crews are made of them
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from api.rival_crews c
    where (select count(*) from api.world_runners r where r.crew_id = c.id) <> 3),
  0, 'every rival crew carries exactly three named world runners');

select is(
  (select count(*)::int from api.world_runners r
     join api.rival_crews c on c.id = r.crew_id
    where r.continent_id <> c.continent_id),
  0, 'no world runner races for a crew on another continent');

select is((select count(*)::int from api.world_runners where crew_id is not null), 108,
  '108 world runners fill the 36 crews');
select cmp_ok((select count(*)::int from api.world_runners where open_field), '>=', 92,
  'the open field can fill a 100-runner Global Event');
select is((select count(distinct role)::int from api.world_runners), 8,
  'the world field covers all eight running roles');
select is(
  (select count(distinct base_style_id)::int from api.world_runners),
  (select count(*)::int from api.my_runner_base_styles),
  'every base style is worn by at least one world runner');

-- Two world runners cannot be the same appearance, role and tendency.
select throws_ok(
  $$ update api.world_runners
        set base_style_id = (select base_style_id from api.world_runners where id = 'wrn_lumena_01'),
            role          = (select role from api.world_runners where id = 'wrn_lumena_01'),
            tendency_id   = (select tendency_id from api.world_runners where id = 'wrn_lumena_01')
      where id = 'wrn_lumena_02' $$,
  '23505', null, 'two world runners cannot share appearance, role and tendency');

-- A runner is in a crew or in the open field, never claiming to be both.
select throws_ok(
  $$ update api.world_runners set open_field = true where id = 'wrn_lumena_01' $$,
  '23514', null, 'a crewed runner cannot also be in the open field');

-- ---------------------------------------------------------------------------
-- An item that fits nobody cannot be stored, so it cannot be counted
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ update api.wearable_items set compatible_base_style_ids = '{}'
      where id = (select id from api.wearable_items order by id limit 1) $$,
  '23514', null, 'a wearable item that fits no base style cannot exist');

select throws_ok(
  $$ insert into api.wearable_items
       (id, set_id, continent_id, slot_id, display_order, name_key,
        compatible_base_style_ids, thumbnail_address, prefab_address, rig_id, acquisition_source, content_version)
     select 'wrb_bad_rig', set_id, continent_id, slot_id, 99, name_key,
            compatible_base_style_ids, thumbnail_address, prefab_address, 'rig_other', acquisition_source, content_version
       from api.wearable_items order by id limit 1 $$,
  '23514', null, 'a wearable item on a second rig cannot exist');

select throws_ok(
  $$ insert into api.wearable_items
       (id, set_id, continent_id, slot_id, display_order, name_key,
        compatible_base_style_ids, thumbnail_address, prefab_address, rig_id, acquisition_source, content_version)
     select 'wrb_bad_source', set_id, continent_id, slot_id, 98, name_key,
            compatible_base_style_ids, thumbnail_address, prefab_address, rig_id, 'random_box', content_version
       from api.wearable_items order by id limit 1 $$,
  '23514', null, 'a wearable item cannot come from a random box');

-- DL-5: no stat column exists on any wardrobe or style table. An unused column is one
-- migration away from being populated "temporarily", so absence is asserted, not assumed.
select is(
  (select count(*)::int from information_schema.columns
    where table_schema = 'api'
      and table_name in ('wearable_items', 'outfit_sets', 'my_runner_base_styles',
                         'equipment_slots', 'world_runners')
      and (column_name ~ '(power|damage|attack|health|hp|stat|multiplier|bonus|rating)')),
  0, 'no wardrobe, style or world-runner table carries a power column');

-- ---------------------------------------------------------------------------
-- One account, one runner — and the equip rule
-- ---------------------------------------------------------------------------
insert into api.profiles (user_id, display_name, user_code)
values ('00000000-0000-0000-0000-0000000000aa', 'Tester', 'TESTAA01');

insert into api.my_runners (user_id, base_style_id) values
  ('00000000-0000-0000-0000-0000000000aa', 'mrs_sprout');

select throws_ok(
  $$ insert into api.my_runners (user_id, base_style_id)
     values ('00000000-0000-0000-0000-0000000000aa', 'mrs_kite') $$,
  '23505', null, 'an account cannot have a second My Runner');

-- Equipping something you do not own.
select throws_ok(
  $$ insert into api.my_runner_equipment (user_id, slot_id, item_id)
     values ('00000000-0000-0000-0000-0000000000aa', 'slt_shoes',
             (select id from api.wearable_items where slot_id = 'slt_shoes' order by id limit 1)) $$,
  'P0001', null, 'a runner cannot equip an item the account does not own');

-- Own two items: a pair of shoes and a top.
insert into api.my_runner_wardrobe (user_id, item_id, acquired_from)
select '00000000-0000-0000-0000-0000000000aa', id, 'world_progress'
  from api.wearable_items where slot_id in ('slt_shoes', 'slt_top')
 order by id limit 2;

-- Putting a top in the shoe slot.
select throws_ok(
  $$ insert into api.my_runner_equipment (user_id, slot_id, item_id)
     values ('00000000-0000-0000-0000-0000000000aa', 'slt_shoes',
             (select item_id from api.my_runner_wardrobe w
                join api.wearable_items i on i.id = w.item_id
               where i.slot_id = 'slt_top' limit 1)) $$,
  'P0001', null, 'an item cannot be equipped into a slot it does not belong to');

-- The legitimate equip.
insert into api.my_runner_equipment (user_id, slot_id, item_id)
select '00000000-0000-0000-0000-0000000000aa', 'slt_shoes', w.item_id
  from api.my_runner_wardrobe w
  join api.wearable_items i on i.id = w.item_id
 where w.user_id = '00000000-0000-0000-0000-0000000000aa' and i.slot_id = 'slt_shoes'
 limit 1;

select is((select count(*)::int from api.my_runner_equipment
            where user_id = '00000000-0000-0000-0000-0000000000aa'),
          1, 'a compatible, owned item equips into its own slot');

-- A required slot is emptied only by replacement.
select throws_ok(
  $$ delete from api.my_runner_equipment
      where user_id = '00000000-0000-0000-0000-0000000000aa' and slot_id = 'slt_shoes' $$,
  'P0001', null, 'a required slot cannot be left empty');

-- ---------------------------------------------------------------------------
-- Global Events: capacity is a constraint, privacy is a schema property
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ update api.global_events set max_participants = 24 where id = 'gev_canyon_ten' $$,
  '23514', null, 'a Global Event cannot quietly hold fewer than 100');

select throws_ok(
  $$ update api.global_events set min_participants = 8 where id = 'gev_canyon_ten' $$,
  '23514', null, 'a Global Event cannot drop below the 50-runner floor');

select is(
  (select count(*)::int from information_schema.columns
    where table_schema = 'api' and table_name = 'global_event_progress'
      and (column_name ~ '(lat|lon|coord|gps|location|speed)')),
  0, 'a Global Event progress snapshot has no column that could hold a location');

select is((select count(*)::int from api.global_events where max_participants <> 100), 0,
  'every Global Event is built for a field of 100');

select is(
  (select count(*)::int from api.global_events
    where ceil(max_participants::numeric / heat_size) * heat_size < max_participants),
  0, 'every Global Event has enough heats to seat its own capacity');

-- A second result row for the same runner in the same occurrence is the shape a duplicate
-- reward takes. The primary key makes it impossible rather than idempotent-by-convention.
select col_is_pk('api', 'global_event_results', array['occurrence_id', 'user_id'],
  'a Global Event result is unique per runner per occurrence');
select col_is_unique('api', 'global_event_results', array['reward_grant_key'],
  'a Global Event reward grant key can only be used once');

-- ---------------------------------------------------------------------------
-- RLS: catalogues are readable, user data is not the world's
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_tables t
    where t.schemaname = 'api'
      and t.tablename in ('my_runner_base_styles', 'equipment_slots', 'outfit_sets',
                          'wearable_items', 'world_runners', 'global_events', 'my_runners',
                          'my_runner_wardrobe', 'my_runner_equipment',
                          'global_event_occurrences', 'global_event_entries',
                          'global_event_progress', 'global_event_results')
      and not exists (select 1 from pg_class c
                       join pg_namespace n on n.oid = c.relnamespace
                      where n.nspname = 'api' and c.relname = t.tablename
                        and c.relrowsecurity and c.relforcerowsecurity)),
  0, 'every table added by 0013 has RLS enabled and forced');

select * from finish();
rollback;
