-- RunningUp 0009 — V14 Monthly Apex ladder: 1..1000 km, 121 checkpoints
--
-- Supersedes the pinned numbers in 0003. 0003 is left untouched: it is applied history,
-- and rewriting it would mean every existing database disagreed with the migration that
-- supposedly built it.
--
-- What changed and why
-- --------------------
-- The V14 product ladder has 120 checkpoints and starts at 1 km; this schema stores 121,
-- because 42.195 km — the marathon — is kept as an exact checkpoint between 41 and 45 km.
-- The Unity client's MonthlyCheckpointsKm must gain the same entry. 0003 pinned 52 at the
-- type level (`check (checkpoint_count = 52)`, `check (index between 1 and 52)`), so the
-- V14 client — which ships its thresholds verbatim in
-- V14ScreenFlowController.MonthlyCheckpointsKm — could not have its ladder stored at all.
-- That was a structural incompatibility between the client and this schema, not a
-- documentation drift.
--
-- The 0 km checkpoint is gone. A runner who has not run has reached nothing; the first
-- checkpoint is 1 km. `apex_cp_within_ladder` is tightened accordingly, which also makes
-- a 0 m checkpoint unrepresentable rather than merely unseeded.
--
-- DL-1 is unchanged and still asserted at the type level: the final checkpoint is exactly
-- 1000 km, exactly one checkpoint is final, and nothing may exceed it.
--
-- The canonical values live in tools/lib/constants.mjs. SQL cannot import them, so the
-- count is restated here and `private.assert_apex_ladder_valid` re-checks the seeded rows
-- against it — the same arrangement 0003 used.

begin;

-- -----------------------------------------------------------------------------
-- Definition table: 52 -> 121
-- -----------------------------------------------------------------------------
alter table api.monthly_apex_definitions
  drop constraint if exists apex_checkpoint_count_is_52;

alter table api.monthly_apex_definitions
  add constraint apex_checkpoint_count_is_121 check (checkpoint_count = 121);

-- -----------------------------------------------------------------------------
-- Checkpoint table: index range and threshold floor
-- -----------------------------------------------------------------------------
-- The index CHECK in 0003 was declared inline and therefore carries PostgreSQL's
-- generated name. Drop it by that name if it is there, and by any other name the
-- constraint may have acquired, before adding the named replacement.
do $$
declare
  v_name text;
begin
  for v_name in
    select con.conname
    from pg_constraint as con
    join pg_class      as cls on cls.oid = con.conrelid
    join pg_namespace  as nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'api'
      and cls.relname = 'monthly_apex_checkpoints'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%index%'
      and pg_get_constraintdef(con.oid) like '%52%'
  loop
    execute format('alter table api.monthly_apex_checkpoints drop constraint %I', v_name);
  end loop;
end;
$$;

alter table api.monthly_apex_checkpoints
  add constraint apex_cp_index_within_ladder check (index between 1 and 121);

-- The ladder no longer contains 0 m. Raise the floor so it cannot be reintroduced.
alter table api.monthly_apex_checkpoints
  drop constraint if exists apex_cp_within_ladder;

alter table api.monthly_apex_checkpoints
  add constraint apex_cp_within_ladder check (threshold_meters between 1000 and 1000000);

-- -----------------------------------------------------------------------------
-- Structural validation: 52 -> 121, plus an explicit first-checkpoint assertion
-- -----------------------------------------------------------------------------
create or replace function private.assert_apex_ladder_valid(p_version text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
  v_max   integer;
  v_min   integer;
  v_final integer;
  v_gaps  integer;
begin
  select count(*), max(threshold_meters), min(threshold_meters)
  into v_count, v_max, v_min
  from api.monthly_apex_checkpoints where ladder_version = p_version;

  if v_count <> 121 then
    raise exception 'apex ladder %: expected 121 checkpoints, found %', p_version, v_count;
  end if;
  if v_max <> 1000000 then
    raise exception 'apex ladder %: highest checkpoint must be exactly 1000 km, found % m', p_version, v_max;
  end if;
  if v_min <> 1000 then
    raise exception 'apex ladder %: lowest checkpoint must be exactly 1 km, found % m', p_version, v_min;
  end if;

  select count(*) into v_final
  from api.monthly_apex_checkpoints
  where ladder_version = p_version and is_final;
  if v_final <> 1 then
    raise exception 'apex ladder %: expected exactly one final checkpoint, found %', p_version, v_final;
  end if;

  -- Index and threshold must rise together: a ladder that is not strictly ascending
  -- would let a crossing be skipped or double-counted.
  select count(*) into v_gaps
  from (
    select threshold_meters,
           lag(threshold_meters) over (order by index) as previous
    from api.monthly_apex_checkpoints
    where ladder_version = p_version
  ) as ordered
  where previous is not null and threshold_meters <= previous;

  if v_gaps > 0 then
    raise exception 'apex ladder %: % non-ascending checkpoint(s)', p_version, v_gaps;
  end if;
end;
$$;

commit;
