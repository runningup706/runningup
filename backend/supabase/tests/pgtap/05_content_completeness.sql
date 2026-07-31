-- pgTAP: launch content completeness in the database (direction lock DL-4).
-- Master # 22.2 / audit 5 / audit 6.
begin;
select plan(15);

select is((select count(*)::int from api.world_continents), 12, '12 continents are seeded');
select is((select count(*)::int from api.world_regions), 192, '192 region nodes are seeded');
select is((select count(*)::int from api.world_stages where kind = 'main'), 72, '72 main stages are seeded');
select is((select count(*)::int from api.world_stages where kind = 'side'), 24, '24 side stages are seeded');
select is((select count(*)::int from api.characters), 12, '12 playable characters are seeded');
select is((select count(*)::int from api.character_episodes), 36, '36 character episodes are seeded');
select is((select count(*)::int from api.character_skills), 48, '48 tactical skills are seeded');
select is((select count(*)::int from api.tactical_relics), 72, '72 tactical relics are seeded');
select is((select count(*)::int from api.world_bosses where kind = 'continent_boss'), 12, '12 continent bosses');
select is((select count(*)::int from api.world_bosses where kind = 'world_boss'), 4, '4 rotating world bosses');
select is((select count(*)::int from api.world_bosses where kind = 'apex_boss'), 1, 'exactly 1 Apex 1000 boss');

-- Per-continent floor: the total must not be carried by a handful of rich continents.
select is(
  (select count(*)::int from api.world_continents c
   where (select count(*) from api.world_regions r where r.continent_id = c.id) < 16
      or (select count(*) from api.world_stages s where s.continent_id = c.id and s.kind = 'main') < 6),
  0, 'every continent carries at least 16 regions and 6 main stages of its own');

-- Availability: nothing counted may be hidden, disabled or gated behind another continent.
select is(
  (select count(*)::int from api.world_continents
   where not visible_at_first_login or not playable_at_launch),
  0, 'all 12 continents are visible at first login and playable at launch');

select is(
  (select count(*)::int from api.characters
   where not visible_at_launch or not trial_available or paid_gacha),
  0, 'all 12 characters are visible, trial-playable and free of gacha');

-- A second Apex boss is structurally impossible.
select throws_ok(
  $$ insert into api.world_bosses (id, kind, continent_id, name_key, phases, scene_address)
     values ('boss_apex_second', 'apex_boss', null, 'k', array['a','b','c'], 'x') $$,
  '23505', null, 'a second Apex 1000 boss cannot be inserted');

select * from finish();
rollback;
