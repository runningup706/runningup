import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LAUNCH_CONTENT_FLOOR, SCALE_FLOOR } from '../packages/domain/constants.mjs';
import { ROLE_IDS } from '../packages/domain/race.mjs';
import { MY_RUNNER_BASE_STYLES } from '../tools/content-factory/characters/my-runner-design.mjs';
import { EQUIPMENT_SLOTS, SET_SHAPES, OUTFIT_SETS } from '../tools/content-factory/characters/wardrobe-design.mjs';
import { WORLD_RUNNER_ROSTERS, TENDENCIES, assignment } from '../tools/content-factory/characters/world-runner-design.mjs';

/**
 * The owner fixed six scale floors — 24 base styles, 200 world runners, 600 wearable
 * items, 120 outfit sets, 18 equip slots, a 50-to-100 Global Event — and attached one rule
 * to them: they may never be lowered, and a number reached by cloning something does not
 * count.
 *
 * Counting is the easy half and it is the half that lies. Every content category in this
 * repository has, at some point, hit its floor while a twelfth of it silently pointed at
 * one continent. So this suite is in two parts:
 *
 *   PART 1 checks the shape of the authored tables directly.
 *   PART 2 breaks the generated content on purpose and checks the validator notices.
 *
 * Part 2 is the one that matters. A gate nobody has watched fail is not a gate.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LAUNCH = join(ROOT, 'content', 'launch');
const read = (rel) => JSON.parse(readFileSync(join(LAUNCH, rel), 'utf8'));

const styles = read('characters/my_runner/base_styles.json').items;
const runners = read('characters/world_runners/world_runners.json').items;
const slots = read('characters/wardrobe/equipment_slots.json').items;
const sets = read('characters/wardrobe/outfit_sets.json').items;
const wearables = read('characters/wardrobe/wearable_items.json').items;
const events = read('events/global_events.json').items;

// ===========================================================================
// PART 1 — the floors themselves, and the shape of what meets them
// ===========================================================================

test('every owner scale floor is present in the canonical launch floor', () => {
  // The failure this prevents: SCALE_FLOOR exists, reads correctly, and nothing counts it.
  assert.equal(LAUNCH_CONTENT_FLOOR.my_runner_base_styles, SCALE_FLOOR.MY_RUNNER_BASE_STYLE_MIN);
  assert.equal(LAUNCH_CONTENT_FLOOR.world_runners, SCALE_FLOOR.PACER_WORLD_RUNNER_MIN);
  assert.equal(LAUNCH_CONTENT_FLOOR.wearable_items, SCALE_FLOOR.WEARABLE_ITEM_MIN);
  assert.equal(LAUNCH_CONTENT_FLOOR.outfit_sets, SCALE_FLOOR.OUTFIT_SET_MIN);
  assert.equal(LAUNCH_CONTENT_FLOOR.equipment_slots, SCALE_FLOOR.EQUIPMENT_SLOT_MIN);
});

test('the previously shipped counts were not folded into the new bigger ones', () => {
  // "600 wearable items" could have been reached by absorbing the 96 character cosmetics
  // and calling it growth. Both categories still exist and both still have a floor.
  assert.equal(LAUNCH_CONTENT_FLOOR.equipable_cosmetics, 96);
  assert.equal(LAUNCH_CONTENT_FLOOR.gear_sets, 72);
  assert.equal(LAUNCH_CONTENT_FLOOR.playable_characters, 12);
  assert.ok(LAUNCH_CONTENT_FLOOR.wearable_items > LAUNCH_CONTENT_FLOOR.equipable_cosmetics);
});

test('generated content meets every scale floor', () => {
  assert.ok(styles.length >= SCALE_FLOOR.MY_RUNNER_BASE_STYLE_MIN, `${styles.length} styles`);
  assert.ok(runners.length >= SCALE_FLOOR.PACER_WORLD_RUNNER_MIN, `${runners.length} runners`);
  assert.ok(wearables.length >= SCALE_FLOOR.WEARABLE_ITEM_MIN, `${wearables.length} items`);
  assert.ok(sets.length >= SCALE_FLOOR.OUTFIT_SET_MIN, `${sets.length} sets`);
  assert.ok(slots.length >= SCALE_FLOOR.EQUIPMENT_SLOT_MIN, `${slots.length} slots`);
});

test('no two base styles are the same body with different colouring', () => {
  // Skin tone and hair colour are deliberately excluded from the signature: they are
  // exactly what a recolour changes.
  const seen = new Map();
  for (const s of MY_RUNNER_BASE_STYLES) {
    const sig = [s.age_band, s.build, s.presentation, s.gait.description, s.posture, s.finish].join('|');
    assert.ok(!seen.has(sig), `${s.id} is a recolour of ${seen.get(sig)}`);
    seen.set(sig, s.id);
  }
});

test('base styles cover the age range the direction asks for, not just young adults', () => {
  const byBand = new Map();
  for (const s of MY_RUNNER_BASE_STYLES) {
    byBand.set(s.age_band, (byBand.get(s.age_band) ?? 0) + 1);
  }
  for (const band of ['child', 'teen', 'young_adult', 'adult', 'midlife', 'senior', 'elder']) {
    assert.ok((byBand.get(band) ?? 0) >= 2, `only ${byBand.get(band) ?? 0} styles in the "${band}" band`);
  }
  // The floor names this failure explicitly: young and thin as the only normal body.
  const youngAndSlight = MY_RUNNER_BASE_STYLES.filter(
    (s) => ['teen', 'young_adult'].includes(s.age_band) && ['lean', 'wiry', 'petite', 'tall_slim'].includes(s.build),
  );
  assert.ok(youngAndSlight.length <= MY_RUNNER_BASE_STYLES.length / 3,
    `${youngAndSlight.length} of ${MY_RUNNER_BASE_STYLES.length} styles are young and slight`);
});

test('adaptive runners are athletes, never a stat and never a costume', () => {
  const adaptive = styles.filter((s) => s.adaptive_kit_id !== null);
  assert.ok(adaptive.length >= 3, `${adaptive.length} adaptive styles`);
  assert.ok(new Set(adaptive.map((s) => s.age_band)).size >= 3, 'adaptive styles sit in one age bracket');
  for (const s of adaptive) {
    assert.equal(s.grants_core_power, false, `${s.id} grants core power`);
    assert.ok(s.adaptive_equipment, `${s.id} has no named equipment`);
    // Same rig as everyone else: the wardrobe fits, and there is no separate asset path.
    assert.equal(s.rig_id, styles[0].rig_id);
  }
});

test('the world runner assignment cannot repeat inside the roster', () => {
  // The 23-length tendency cycle against 24 styles and 8 roles is the whole mechanism.
  // Asserting the outcome is not enough — check the property that produces it, so that
  // someone "tidying" 23 into 24 fails here with a reason rather than three files away.
  const seen = new Map();
  for (let i = 0; i < runners.length; i += 1) {
    const a = assignment(i);
    const key = `${a.base_style_id}|${a.role}|${a.tendency_id}`;
    assert.ok(!seen.has(key), `index ${i} repeats index ${seen.get(key)}`);
    seen.set(key, i);
  }
  assert.equal(TENDENCIES.length, 23,
    'the tendency count must stay coprime with 24 styles and 8 roles, or the triple repeats every 24');
  assert.equal(MY_RUNNER_BASE_STYLES.length % TENDENCIES.length !== 0, true);
});

test('every world runner is a person, not a seat', () => {
  const sigs = new Set();
  const intros = new Set();
  for (const r of runners) {
    assert.ok(r.race_signature && r.race_signature.length > 20, `${r.id} has no race signature`);
    assert.ok(r.introduction && r.introduction.length > 20, `${r.id} has no introduction`);
    assert.ok(!sigs.has(r.race_signature), `${r.id} reuses a race signature`);
    assert.ok(!intros.has(r.introduction), `${r.id} reuses an introduction`);
    sigs.add(r.race_signature);
    intros.add(r.introduction);
    assert.ok(r.home_region_id.startsWith('rgn_'), `${r.id} has no home region`);
    assert.equal(r.grants_core_power, false);
  }
  assert.equal(new Set(runners.map((r) => r.base_style_id)).size, MY_RUNNER_BASE_STYLES.length);
  assert.equal(new Set(runners.map((r) => r.role)).size, ROLE_IDS.length);
});

test('rival crews are made of named runners who agree they are in them', () => {
  const byId = new Map(runners.map((r) => [r.id, r]));
  const crews = [
    ...read('world/rivals/standard_rival_crews.json').items,
    ...read('world/rivals/elite_rival_crews.json').items,
  ];
  assert.equal(crews.length, 36);
  const claimed = new Set();
  for (const crew of crews) {
    assert.equal(crew.runners.length, 3, `${crew.id} has ${crew.runners.length} runners`);
    for (const seat of crew.runners) {
      const runner = byId.get(seat.world_runner_id);
      assert.ok(runner, `${crew.id} references a runner that does not exist`);
      assert.equal(runner.crew_id, crew.id, `${runner.id} does not agree it is in ${crew.id}`);
      assert.ok(!claimed.has(runner.id), `${runner.id} is in two crews`);
      claimed.add(runner.id);
    }
  }
  assert.equal(claimed.size, 108);
});

test('every base style can actually get dressed', () => {
  // The count says 684 items compatible with 24 styles. That is true and says nothing
  // about whether the child styles have shoes.
  const required = slots.filter((s) => s.required).map((s) => s.slot);
  assert.ok(required.length >= 4, 'nothing is a required slot, so this test proves nothing');
  for (const style of styles) {
    for (const slot of required) {
      const options = wearables.filter(
        (i) => i.slot === slot && i.compatible_base_style_ids.includes(style.id),
      );
      assert.ok(options.length > 0, `${style.id} has nothing to wear in "${slot}"`);
    }
  }
});

test('all 18 slots are real slots with something to put in them', () => {
  assert.equal(EQUIPMENT_SLOTS.length, 18);
  const shapeUnion = new Set(SET_SHAPES.flatMap((s) => s.slots));
  const declared = new Set(EQUIPMENT_SLOTS.map((s) => s.id));
  assert.deepEqual([...shapeUnion].sort(), [...declared].sort(),
    'a slot exists that no set shape fills, or a shape fills a slot that does not exist');
  for (const slot of slots) {
    const count = wearables.filter((i) => i.slot === slot.slot).length;
    assert.ok(count >= 10, `slot "${slot.slot}" has only ${count} items`);
  }
  const layers = slots.map((s) => s.layer);
  assert.equal(new Set(layers).size, layers.length, 'two slots share a render layer');
});

test('the 120 outfit sets are 120 garment lines, not 12 lines in 10 colours', () => {
  assert.equal(Object.keys(OUTFIT_SETS).length, 12);
  const details = new Set();
  for (const [continent, list] of Object.entries(OUTFIT_SETS)) {
    assert.equal(list.length, 10, `${continent} has ${list.length} sets`);
    for (const s of list) {
      assert.ok(!details.has(s.detail), `"${s.detail}" is used by two sets`);
      details.add(s.detail);
    }
  }
  assert.equal(details.size, 120);
  // And each continent uses all ten constructions, so no continent is one shape ten times.
  for (const continent of Object.keys(OUTFIT_SETS)) {
    const own = sets.filter((s) => s.continent_id === continent);
    assert.equal(new Set(own.map((s) => s.shape_id)).size, SET_SHAPES.length, `${continent} repeats a construction`);
  }
});

test('a Global Event holds 50 to 100 and says honestly how many are drawn', () => {
  assert.ok(events.length >= 6);
  for (const e of events) {
    assert.ok(e.min_participants >= SCALE_FLOOR.GLOBAL_EVENT_MIN_PARTICIPANTS, e.id);
    assert.equal(e.max_participants, SCALE_FLOOR.GLOBAL_EVENT_MAX_PARTICIPANTS, e.id);
    assert.ok(e.heats_at_capacity * e.heat_size >= e.max_participants, `${e.id} cannot seat its own capacity`);
    const drawn = e.render_budget.full_3d_near + e.render_budget.low_cost_3d_mid
      + e.render_budget.animated_billboard_far;
    assert.ok(drawn < e.max_participants, `${e.id} claims to draw all ${e.max_participants}`);
    assert.equal(drawn + e.render_budget.rank_panel_only, e.max_participants,
      `${e.id} render budget does not account for every participant`);
  }
});

test('Global Events share progress and rank, never a location', () => {
  const allowed = new Set([
    'participant_id', 'display_name', 'my_runner_appearance_id', 'course_progress_ratio',
    'verified_distance_meters', 'server_rank', 'pace_state', 'status',
  ]);
  for (const e of events) {
    assert.equal(e.shares_raw_gps, false, e.id);
    for (const field of e.shared_participant_fields) {
      assert.ok(allowed.has(field), `${e.id} shares "${field}"`);
    }
  }
});

test('Global Event capacity evidence is recorded as not yet measured, not as passing', () => {
  // The direction says a Global Event is not complete on a design document. Until a load
  // test runs, the honest value is NOT_RUN — and the report must be able to read it.
  for (const e of events) {
    for (const key of e.evidence_required) {
      assert.ok(key in e.evidence, `${e.id} has no evidence entry for ${key}`);
      assert.ok(['NOT_RUN', 'BLOCKED'].includes(e.evidence[key]) || /^\d/.test(String(e.evidence[key])),
        `${e.id}.${key} is "${e.evidence[key]}" — evidence is a measurement or NOT_RUN, never a claim`);
    }
  }
});

test('the authored rosters are the size the generated content says they are', () => {
  const authored = Object.values(WORLD_RUNNER_ROSTERS).reduce((n, l) => n + l.length, 0);
  assert.equal(authored, runners.length,
    'the generator invented or dropped runners relative to the authored table');
});

// ===========================================================================
// PART 2 — break the content on purpose and watch the gate fire
// ===========================================================================

/**
 * Runs the content validator against a copy of `content/launch` with one file rewritten.
 * Returns { code, output }. The validator reads localization from the real tree, which is
 * intentional: these mutations are about structure, not about translation coverage.
 */
function validateWithMutation(relPath, mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'runningup-content-'));
  try {
    cpSync(LAUNCH, dir, { recursive: true });
    const full = join(dir, relPath);
    const doc = JSON.parse(readFileSync(full, 'utf8'));
    mutate(doc);
    writeFileSync(full, JSON.stringify(doc, null, 2));
    try {
      execFileSync(process.execPath, ['tools/content-validator/validate.mjs'], {
        cwd: ROOT,
        env: { ...process.env, RUNNINGUP_CONTENT_DIR: relative(ROOT, dir) || dir },
        encoding: 'utf8',
        stdio: 'pipe',
      });
      return { code: 0, output: '' };
    } catch (err) {
      return { code: err.status, output: `${err.stdout ?? ''}${err.stderr ?? ''}` };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the mutation harness itself is not broken', () => {
  // If an unmutated copy failed, every test below would "pass" for the wrong reason.
  const clean = validateWithMutation('events/global_events.json', () => {});
  assert.equal(clean.code, 0, `an unmodified copy fails validation:\n${clean.output}`);
});

const MUTATIONS = [
  {
    what: 'an item that cannot be equipped is still counted',
    file: 'characters/wardrobe/wearable_items.json',
    mutate: (doc) => { doc.items[0].equippable = false; },
    expect: /is not equippable but is counted/,
  },
  {
    what: 'an item that fits nobody is still counted',
    file: 'characters/wardrobe/wearable_items.json',
    mutate: (doc) => { doc.items[3].compatible_base_style_ids = []; },
    expect: /fits no base style but is counted/,
  },
  {
    what: 'a base style is left with nothing to wear in a required slot',
    file: 'characters/wardrobe/wearable_items.json',
    mutate: (doc) => {
      for (const item of doc.items) {
        if (item.slot === 'shoes') {
          item.compatible_base_style_ids = item.compatible_base_style_ids.filter((id) => id !== 'mrs_sprout');
        }
      }
    },
    expect: /mrs_sprout has nothing to wear in required slot "shoes"/,
  },
  {
    what: 'a wearable item quietly grants power',
    file: 'characters/wardrobe/wearable_items.json',
    mutate: (doc) => { doc.items[7].core_power = 1; },
    expect: /core_power must be exactly 0/,
  },
  {
    what: 'the wearable count is dropped below the owner floor',
    file: 'characters/wardrobe/wearable_items.json',
    mutate: (doc) => { doc.items = doc.items.slice(0, 599); },
    expect: /wearable items: 599 < 600/,
  },
  {
    what: 'two base styles become the same body in different colours',
    file: 'characters/my_runner/base_styles.json',
    mutate: (doc) => {
      const [a, b] = doc.items;
      b.age_band = a.age_band; b.build = a.build; b.presentation = a.presentation;
      b.gait = a.gait; b.posture = a.posture; b.finish_motion = a.finish_motion;
      b.skin_tone_id = 'tone_ebony';
    },
    expect: /is a recolour of/,
  },
  {
    what: 'the base styles lose an age band',
    file: 'characters/my_runner/base_styles.json',
    mutate: (doc) => { doc.items = doc.items.filter((s) => s.age_band !== 'elder'); },
    expect: /no base style in the "elder" age band/,
  },
  {
    what: 'two world runners become the same runner',
    file: 'characters/world_runners/world_runners.json',
    mutate: (doc) => {
      const [a, b] = doc.items;
      b.base_style_id = a.base_style_id; b.role = a.role; b.tendency_id = a.tendency_id;
    },
    expect: /share appearance, role and tendency/,
  },
  {
    what: 'a world runner is given a copied introduction',
    file: 'characters/world_runners/world_runners.json',
    mutate: (doc) => { doc.items[5].introduction = doc.items[4].introduction; },
    expect: /has the same introduction as/,
  },
  {
    what: 'a crew claims a runner who does not agree',
    file: 'characters/world_runners/world_runners.json',
    mutate: (doc) => { doc.items[0].crew_id = null; },
    expect: /claims wrn_lumena_01, who belongs to no crew/,
  },
  {
    what: 'Global Event capacity is quietly halved',
    file: 'events/global_events.json',
    mutate: (doc) => { doc.items[0].max_participants = 50; },
    expect: /max 50, expected 100/,
  },
  {
    what: 'a Global Event starts sharing a coordinate',
    file: 'events/global_events.json',
    mutate: (doc) => { doc.items[2].shared_participant_fields.push('gps_latitude'); },
    expect: /shares "gps_latitude", which is not on the allow-list/,
  },
  {
    what: 'a Global Event claims to render its whole field at full fidelity',
    file: 'events/global_events.json',
    mutate: (doc) => { doc.items[1].render_budget.full_3d_near = 100; },
    expect: /render budget draws \d+ of 100 at full fidelity/,
  },
  {
    what: 'an outfit set is given a completion bonus',
    file: 'characters/wardrobe/outfit_sets.json',
    mutate: (doc) => { doc.items[0].complete_set_bonus = { cruise: 1 }; },
    expect: /grants a completion bonus/,
  },
  {
    what: 'an equipment slot is removed',
    file: 'characters/wardrobe/equipment_slots.json',
    mutate: (doc) => { doc.items = doc.items.slice(0, 17); },
    expect: /equipment slots: 17 < 18/,
  },
];

for (const { what, file, mutate, expect } of MUTATIONS) {
  test(`the validator blocks the release when ${what}`, () => {
    const result = validateWithMutation(file, mutate);
    assert.notEqual(result.code, 0, 'the validator passed content it should have rejected');
    assert.match(result.output, expect);
  });
}
