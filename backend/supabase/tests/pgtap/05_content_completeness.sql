-- pgTAP: launch content completeness in the database (direction lock DL-4 and DL-6).
-- Master # 22.2 / audit 5 / audit 6.
--
-- The world is counted in races, rival crews, champions and courses. The combat catalogue
-- these replaced is asserted gone at the end of this file, because a floor that is met
-- while `api.world_bosses` still exists means the removal did not happen.
begin;
select plan(24);

select is((select count(*)::int from api.world_continents), 12, '12 continents are seeded');
select is((select count(*)::int from api.world_regions), 192, '192 region nodes are seeded');
select is((select count(*)::int from api.world_courses), 2304, '2304 courses are seeded');
select is((select count(*)::int from api.world_races where kind = 'main'), 72, '72 main races are seeded');
select is((select count(*)::int from api.world_races where kind = 'side'), 24, '24 challenge races are seeded');
select is((select count(*)::int from api.race_formats), 7, '7 race formats are seeded');
select is((select count(*)::int from api.challenge_formats), 6, '6 challenge formats are seeded');
select is((select count(*)::int from api.characters), 12, '12 playable runners are seeded');
select is((select count(*)::int from api.character_episodes), 36, '36 character episodes are seeded');
select is((select count(*)::int from api.race_techniques), 48, '48 race techniques are seeded');
select is((select count(*)::int from api.gear_sets), 72, '72 gear sets are seeded');
select is((select count(*)::int from api.rival_crews where crew_kind = 'standard'), 24, '24 standard rival crews');
select is((select count(*)::int from api.rival_crews where crew_kind = 'elite'), 12, '12 elite rival crews');
select is((select count(*)::int from api.world_champions where kind = 'continent_champion'), 12, '12 continent champions');
select is((select count(*)::int from api.world_champions where kind = 'open_race'), 4, '4 rotating open race events');
select is((select count(*)::int from api.world_champions where kind = 'apex_race'), 1, 'exactly 1 Apex 1000 race');

-- Per-continent floor: the total must not be carried by a handful of rich continents.
select is(
  (select count(*)::int from api.world_continents c
   where (select count(*) from api.world_regions r where r.continent_id = c.id) < 16
      or (select count(*) from api.world_races s where s.continent_id = c.id and s.kind = 'main') < 6
      or (select count(*) from api.gear_sets g where g.continent_id = c.id) < 6),
  0, 'every continent carries at least 16 regions, 6 main races and 6 gear sets of its own');

-- Per-runner floor: 48 techniques piled onto three runners is not a roster kit.
select is(
  (select count(*)::int from api.characters ch
   where (select count(*) from api.race_techniques t where t.character_id = ch.id) <> 4),
  0, 'every runner carries exactly 4 race techniques');

-- Availability: nothing counted may be hidden, disabled or gated behind another continent.
select is(
  (select count(*)::int from api.world_continents
   where not visible_at_first_login or not playable_at_launch),
  0, 'all 12 continents are visible at first login and playable at launch');

select is(
  (select count(*)::int from api.characters
   where not visible_at_launch or not trial_available or paid_gacha),
  0, 'all 12 runners are visible, trial-playable and free of gacha');

-- A second Apex race is structurally impossible.
select throws_ok(
  $$ insert into api.world_champions (id, kind, continent_id, name_key, race_plan, scene_address)
     values ('race_apex_second', 'apex_race', null, 'k', array['a','b','c'], 'x') $$,
  '23505', null, 'a second Apex 1000 race cannot be inserted');

-- DL-6: the combat catalogue is gone from the schema, not merely unseeded. An empty
-- `api.world_bosses` would satisfy every count above while leaving `boss_break` a legal
-- objective and the next seed one insert away from bringing it back.
select is(
  (select count(*)::int from pg_tables
   where schemaname = 'api'
     and tablename in ('world_stages', 'world_bosses', 'character_skills',
                       'tactical_relics', 'enemy_families')),
  0, 'no combat catalogue table exists in api');

-- And a region cannot be a battle node, because that value is no longer representable.
select throws_ok(
  $$ update api.world_regions set node_type = 'battle_node' where id = 'rgn_lumena_01' $$,
  '23514', null, 'a region node cannot be set back to a battle node');

-- Gear may only move an axis the race engine actually resolves races on.
select throws_ok(
  $$ insert into api.gear_sets (id, continent_id, name_key, trade_from, trade_to, activation_condition)
     values ('ger_bad', 'con_lumena', 'k', 'attack_budget', 'cruise', 'always') $$,
  '23514', null, 'a gear set cannot trade a stat that is not a running axis');

select * from finish();
rollback;
