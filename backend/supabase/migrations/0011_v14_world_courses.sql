-- RunningUp 0011 — running courses: 2,304 of them, twelve per region
--
-- The V14 world is twelve continents, 192 regions, 2,304 courses. Courses had no
-- representation in this schema at all: the world ended at the region, and what a runner
-- actually ran was a battle stage. This is the table that makes a course a first-class
-- thing the server can hand out, verify against and reward.
--
-- DL-3 is enforced at the type level, not by convention:
--
--   * surface is a CHECK over exactly road, track, treadmill and indoor. Any other
--     surface is unrepresentable rather than merely unseeded — the out-of-scope modes
--     DL-3 names cannot be stored at all. 02_running_scope.sql proves it by trying.
--   * there is deliberately no elevation, gradient or incline column. Elevation is inert
--     sensor metadata elsewhere in the product; a column here would be the first step to
--     rewarding it, which is the line DL-3 draws.
--   * distance_meters is a positive integer. Metres, like every other credited distance
--     in the schema, so 42_195 is exact and no threshold sits on a float.
--
-- A point-to-point course is always road: a treadmill and a track do not go anywhere.
-- That rule lives in the content factory; the schema only requires the pair to be valid.

begin;

create table api.world_courses (
  id               text primary key,
  continent_id     text not null references api.world_continents(id) on delete cascade,
  region_id        text not null references api.world_regions(id) on delete cascade,
  display_order    integer not null,
  name_key         text not null,
  distance_meters  integer not null,
  surface          text not null,
  shape            text not null,
  scene_address    text not null,
  reward_table_id  text not null,
  enabled          boolean not null default true,
  debug_only       boolean not null default false,
  content_version  text not null,

  constraint course_distance_is_positive_metres check (distance_meters > 0),
  -- 50 km is the longest course the launch world offers; a longer one is a data error,
  -- not a feature, and would silently change what a single session can be worth.
  constraint course_distance_within_launch_world check (distance_meters <= 50000),
  constraint course_surface_is_running_only
    check (surface in ('road', 'track', 'treadmill', 'indoor')),
  constraint course_shape_is_known
    check (shape in ('loop', 'out_and_back', 'point_to_point')),
  unique (region_id, display_order)
);

create index world_courses_region_idx on api.world_courses (region_id, display_order);
create index world_courses_distance_idx on api.world_courses (distance_meters);

-- RLS, matching what 0006 applies to every api table. FORCE matters as much as ENABLE:
-- without it the table owner bypasses its own policies, and 01_schema_rls.sql asserts it.
-- 0006 looped over the tables that existed then, so a table added later has to say it.
alter table api.world_courses enable row level security;
alter table api.world_courses force row level security;

-- Launch content is public read, like every other seeded world table, and writable by
-- nobody through the client — no insert, update or delete policy exists.
create policy world_courses_public_read
  on api.world_courses for select to anon, authenticated using (true);

grant select on api.world_courses to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Launch floor: courses join the gate
-- -----------------------------------------------------------------------------
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
      ('courses',                 (select count(*)::int from api.world_courses),                                     2304),
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
  if exists (
    select 1 from api.world_continents c
    where (select count(*) from api.world_regions rg where rg.continent_id = c.id) < 16
       or (select count(*) from api.world_stages st where st.continent_id = c.id and st.kind = 'main') < 6
       or (select count(*) from api.world_bosses bo where bo.continent_id = c.id and bo.kind = 'continent_boss') < 1
  ) then
    raise exception 'launch content incomplete: at least one continent is below its per-continent floor';
  end if;

  -- And every region must carry its twelve courses. 2,304 courses piled onto one region
  -- satisfies the total above while leaving 191 regions with nothing to run.
  if exists (
    select 1 from api.world_regions rg
    where (select count(*) from api.world_courses cr where cr.region_id = rg.id) <> 12
  ) then
    raise exception 'launch content incomplete: at least one region does not carry exactly 12 courses';
  end if;

  return;
end;
$$;

commit;
