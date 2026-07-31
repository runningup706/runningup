-- RunningUp 0010 — the world carries 192 regions, 16 per continent
--
-- The V14 world is twelve continents of sixteen regions. 0005 pinned the launch floor at
-- 96 regions and eight per continent, so a world built to the V14 shape passed the gate
-- with half of it unaccounted for: the count check would have been satisfied by 96 of the
-- 192, and the per-continent check by eight of the sixteen. A floor that sits below the
-- content it guards is not a floor.
--
-- 0005 is left as applied history. This migration replaces the function it declared.
--
-- Only the region numbers move here. The combat categories still listed below come out
-- with the combat content itself, in the migration that drops those tables — removing
-- their floors first would leave the data unguarded in between.
--
-- The canonical counts live in packages/domain/constants.mjs (LAUNCH_CONTENT_FLOOR). SQL
-- cannot import them, so they are restated and the content validator checks both sides.

begin;

create or replace function private.assert_launch_content_complete()
returns table (requirement text, actual integer, required integer)
language plpgsql
set search_path = ''
as $$
declare
  v_row record;
begin
  for v_row in
    select * from (values
      ('continents',              (select count(*)::int from api.world_continents),                                    12),
      ('region_nodes',            (select count(*)::int from api.world_regions),                                      192),
      ('main_stages',             (select count(*)::int from api.world_stages where kind = 'main'),                    72),
      ('side_stages',             (select count(*)::int from api.world_stages where kind = 'side'),                    24),
      ('playable_characters',     (select count(*)::int from api.characters),                                          12),
      ('character_episodes',      (select count(*)::int from api.character_episodes),                                  36),
      ('tactical_skills',         (select count(*)::int from api.character_skills),                                    48),
      ('tactical_relics',         (select count(*)::int from api.tactical_relics),                                     72),
      ('standard_enemy_families', (select count(*)::int from api.enemy_families where family_kind = 'standard'),       24),
      ('elite_enemy_families',    (select count(*)::int from api.enemy_families where family_kind = 'elite'),          12),
      ('continent_bosses',        (select count(*)::int from api.world_bosses where kind = 'continent_boss'),          12),
      ('world_bosses',            (select count(*)::int from api.world_bosses where kind = 'world_boss'),               4),
      ('apex_bosses',             (select count(*)::int from api.world_bosses where kind = 'apex_boss'),                1),
      ('companions',              (select count(*)::int from api.companions),                                          12),
      ('equipable_cosmetics',     (select count(*)::int from api.cosmetics),                                           96),
      ('story_chapters',          (select count(*)::int from api.story_chapters),                                      12)
    ) as t(requirement, actual, required)
  loop
    if v_row.actual < v_row.required then
      raise exception 'launch content incomplete: % has % of required %',
        v_row.requirement, v_row.actual, v_row.required;
    end if;
    requirement := v_row.requirement; actual := v_row.actual; required := v_row.required;
    return next;
  end loop;

  -- Every continent must carry its own share, not 11 empty shells behind one rich one.
  --
  -- Sixteen, not eight. The count above and this check have to move together: 192 regions
  -- distributed as 176 and 16 across two continents would satisfy a total-only gate, and
  -- ten empty continents is exactly the failure the per-continent clause exists to catch.
  if exists (
    select 1 from api.world_continents c
    where (select count(*) from api.world_regions rg where rg.continent_id = c.id) < 16
       or (select count(*) from api.world_stages st where st.continent_id = c.id and st.kind = 'main') < 6
       or (select count(*) from api.world_bosses bo where bo.continent_id = c.id and bo.kind = 'continent_boss') < 1
  ) then
    raise exception 'launch content incomplete: at least one continent is below its per-continent floor';
  end if;

  return;
end;
$$;

commit;
