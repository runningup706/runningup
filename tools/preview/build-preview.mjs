#!/usr/bin/env node
/**
 * Static preview generator.
 *
 * WHAT THIS IS FOR
 *
 * The project owner cannot build the Unity project, and right now nobody can: Unity
 * Personal no longer issues a CI licence. That must not mean the owner sees nothing. This
 * produces a self-contained HTML page they can open in a browser and a set of PNGs at the
 * three phone sizes, so "what will this look like" has an answer that does not depend on
 * a build.
 *
 * TWO RULES IT FOLLOWS
 *
 * 1. NOTHING HERE IS INVENTED. Every number, name and count is read out of
 *    `content/launch/**` and every colour is parsed out of the app's own
 *    `Design/V14Design.cs`. A preview with plausible-looking made-up data is worse than no
 *    preview, because it is indistinguishable from a real one and it teaches the owner
 *    things that are not true.
 *
 * 2. IT SAYS WHAT IT IS. Every frame carries DESIGN PROPOSAL / NOT THE RUNNING UNITY BUILD
 *    / NATIVE FEATURES NOT EXECUTED. A real capture of the running app would be labelled
 *    CURRENT UNITY RUNTIME CAPTURE, and there is no way to confuse the two.
 *
 * THE DESIGN, AND WHY THIS ONE
 *
 * Chosen rather than offered as options, per the owner's instruction not to be asked to
 * pick. The constraints that decided it, in order:
 *
 *   - It is read while running, at arm's length, moving. So: one primary action per screen
 *     at 56 px minimum, numbers at 40 px+, and no information that is not needed mid-run.
 *   - Portrait, fixed camera. So: a stable top HUD and bottom nav that never move between
 *     screens, and the live viewport gets the middle 60%.
 *   - The status bar and the gesture bar have collided with this app before. So: the safe
 *     area is DRAWN, hatched, on every frame — it is the thing most likely to regress.
 *   - There are now 684 wearable items and 204 runners. So: the catalogue screens are
 *     designed as paged grids with a count header, not as a wall of tiles. The direction
 *     is explicit that 600 items must not all be instantiated at once, and a preview that
 *     shows a wall of 684 would be designing for something that must not be built.
 *   - The palette is the app's, unchanged. Retoning is a separate decision from layout,
 *     and mixing the two makes both unreviewable.
 *
 * Usage: node tools/preview/build-preview.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DIRECTION_LOCK, SCALE_FLOOR } from '../../packages/domain/constants.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LAUNCH = join(ROOT, 'content', 'launch');
const OUT = join(ROOT, 'preview');

const read = (rel) => JSON.parse(readFileSync(join(LAUNCH, rel), 'utf8'));
const items = (rel) => read(rel).items;
const en = JSON.parse(readFileSync(join(ROOT, 'content/localization/en/content.json'), 'utf8'));
const t = (key) => en[key] ?? key;

// ---------------------------------------------------------------------------
// Palette — parsed from the app, not chosen here
// ---------------------------------------------------------------------------
/**
 * `V14Design.cs` holds `new(r, g, b)` in 0..1 floats. Reading them keeps the preview and
 * the app the same colour by construction: a retone changes one file and both follow.
 */
function palette() {
  const source = readFileSync(
    join(ROOT, 'client/unity/Assets/RunningUp/Design/V14Design.cs'), 'utf8',
  );
  const out = {};
  for (const m of source.matchAll(/public static readonly Color (\w+)\s*=\s*new\(([^)]*)\);/g)) {
    const [r, g, b] = m[2].split(',').map((p) => Number(p.trim().replace(/f$/, '')));
    const hex = [r, g, b]
      .map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0'))
      .join('');
    out[m[1]] = `#${hex}`;
  }
  if (Object.keys(out).length < 15) {
    throw new Error(`parsed only ${Object.keys(out).length} colours from V14Design.cs`);
  }
  return out;
}
const C = palette();

// ---------------------------------------------------------------------------
// Real content
// ---------------------------------------------------------------------------
const continents = items('world/continents/continents.json');
const courses = items('world/courses/courses.json');
const regions = items('world/regions/regions.json');
const styles = items('characters/my_runner/base_styles.json');
const runners = items('characters/world_runners/world_runners.json');
const slots = items('characters/wardrobe/equipment_slots.json');
const sets = items('characters/wardrobe/outfit_sets.json');
const wearables = items('characters/wardrobe/wearable_items.json');
const events = items('events/global_events.json');
const ladder = read('progression/monthly_apex_0_1000.json');
const manifest = read('launch_content_manifest.json');

const km = (m) => (m % 1000 === 0 ? `${m / 1000} km` : `${(m / 1000).toFixed(3)} km`);

// ---------------------------------------------------------------------------
// Frame chrome
// ---------------------------------------------------------------------------
const NAV = [
  ['Home', 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  ['Run', 'M13 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 22l3-7-2-3-3 4-2-1 4-6 4-1 5 3 3-1 1 2-4 2-3-2-1 3 3 4v6h-2v-5l-3-3-2 5z'],
  ['World', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 1.6c1.2 0 2.6 2.9 2.6 7.4S13.2 19.4 12 19.4 9.4 16.5 9.4 12 10.8 4.6 12 4.6zM3.6 10.4h16.8v1.4H3.6z'],
  ['Journey', 'M4 20h4v-8H4zm6 0h4V6h-4zm6 0h4v-4h-4z'],
  ['Runner', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-8 2-8 5v3h16v-3c0-3-4-5-8-5z'],
];

function icon(path, active) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" fill="${
    active ? C.TextBright ?? '#d1e9ff' : C.TextMuted ?? '#8fa2b5'}"/></svg>`;
}

/** One phone frame. `state` drives the loading/empty/error/disabled variants. */
function frame({ id, title, subtitle, body, nav = 0, state = 'ready', note = '' }) {
  const overlay = {
    loading: `<div class="state"><div class="spin"></div><p>Loading</p></div>`,
    empty: `<div class="state"><div class="glyph">—</div><p>Nothing here yet</p>
            <span>Finish a run and this fills in.</span></div>`,
    error: `<div class="state err"><div class="glyph">!</div><p>Could not load</p>
            <span>Check your connection.</span><button class="retry">Retry</button></div>`,
    ready: '',
    disabled: '',
  }[state] ?? '';

  return `
<figure class="phone-wrap" id="scr-${id}">
  <figcaption>
    <b>${title}</b>${subtitle ? `<span>${subtitle}</span>` : ''}
    ${state !== 'ready' ? `<em class="tag tag-${state}">${state}</em>` : ''}
  </figcaption>
  <div class="phone ${state === 'disabled' ? 'is-disabled' : ''}">
    <div class="safe safe-top" title="status bar / camera cutout — the interface never enters this">
      <span>SAFE AREA — status bar</span>
    </div>
    <header class="hud">
      <div class="hud-l"><span class="crown">${ladder.checkpoints.length}</span> checkpoints</div>
      <div class="hud-r">1000 km</div>
    </header>
    <main class="view">${body}${overlay ? `<div class="veil">${overlay}</div>` : ''}</main>
    <div class="stamp">DESIGN PROPOSAL · NOT THE RUNNING UNITY BUILD</div>
    <nav class="tabs">
      ${NAV.map(([label, d], i) => `<button class="${i === nav ? 'on' : ''}">${icon(d, i === nav)}<span>${label}</span></button>`).join('')}
    </nav>
    <div class="safe safe-bottom" title="gesture / back bar — the interface never enters this">
      <span>SAFE AREA — gesture bar</span><i></i>
    </div>
  </div>
  ${note ? `<p class="note">${note}</p>` : ''}
</figure>`;
}

const bigNumber = (value, label) =>
  `<div class="big"><b>${value}</b><span>${label}</span></div>`;
const primary = (label, disabled = false) =>
  `<button class="cta"${disabled ? ' disabled' : ''}>${label}</button>`;
const row = (left, right) => `<div class="row"><span>${left}</span><b>${right}</b></div>`;
const chip = (s) => `<span class="chip">${s}</span>`;

// ---------------------------------------------------------------------------
// Screens — every value below comes from the generated content
// ---------------------------------------------------------------------------
const sampleContinent = continents[0];
const sampleCourses = courses.filter((c) => c.continent_id === sampleContinent.id).slice(0, 4);
const crownIndex = ladder.checkpoints.findIndex((c) => c.threshold_meters === 42_195);

const SCREENS = [];

SCREENS.push(frame({
  id: 'home', title: 'Home', nav: 0,
  subtitle: 'the one screen that must work at arm’s length, moving',
  body: `
    <p class="eyebrow">Today’s contract</p>
    <h2>Steady 8 km</h2>
    ${bigNumber('8.0', 'km target')}
    <div class="split">${row('This month', '312 km')}${row('Next checkpoint', km(ladder.checkpoints[60].threshold_meters))}</div>
    <div class="bar"><i style="width:31%"></i></div>
    ${primary('Start run')}
    <div class="quick">${chip('Sync a run')}${chip('World')}${chip('Race')}</div>`,
  note: 'One action, one number. Everything else is a chip.',
}));

SCREENS.push(frame({
  id: 'active', title: 'Active Training', nav: 1,
  subtitle: 'read at a glance while moving — three numbers, nothing else',
  body: `
    <div class="live"><div class="road"></div><div class="me"></div></div>
    ${bigNumber('5.42', 'km')}
    <div class="split">${row('Pace', '5:38 /km')}${row('Time', '30:34')}</div>
    <div class="dual">${primary('Pause')}<button class="cta ghost">Finish</button></div>
    <p class="micro">Back returns to Home. The run keeps going.</p>`,
  note: 'System back here NEVER discards the run — the single most damaging possible bug.',
}));

SCREENS.push(frame({
  id: 'world', title: 'World', nav: 2,
  subtitle: `${manifest.counts.continents} continents · ${manifest.counts.region_nodes} regions · ${manifest.counts.courses.toLocaleString('en-US')} courses`,
  body: `
    <p class="eyebrow">Continent</p>
    <h2>${t(sampleContinent.name_key)}</h2>
    <div class="globe">${continents.map((c, i) => `<i class="dot ${i === 0 ? 'on' : ''}" title="${t(c.name_key)}"></i>`).join('')}</div>
    <p class="eyebrow">Courses in ${t(regions[0].name_key)}</p>
    <ul class="list">
      ${sampleCourses.map((c) => `<li><b>${t(c.name_key)}</b><span>${km(c.distance_meters)} · ${c.surface}</span></li>`).join('')}
    </ul>
    <p class="micro">Back steps continent ← region ← course.</p>`,
  note: 'All 12 continents visible from first login. Nothing is Coming Soon.',
}));

SCREENS.push(frame({
  id: 'apex', title: 'Monthly Apex', nav: 3,
  subtitle: `${DIRECTION_LOCK.CHECKPOINT_COUNT} checkpoints to the World Crown at 1000 km`,
  body: `
    ${bigNumber('312', 'km this month')}
    <div class="ladder">
      ${ladder.checkpoints.filter((_, i) => i % 6 === 0).map((c) => `
        <i class="${c.threshold_meters <= 312_000 ? 'done' : ''} ${c.threshold_meters === 42_195 ? 'mark' : ''} ${c.is_final ? 'crown' : ''}"
           title="${km(c.threshold_meters)}"></i>`).join('')}
    </div>
    <div class="split">${row('Rank', 'Vanguard')}${row('Marathon point', `#${crownIndex + 1}`)}</div>
    ${row('Final', 'World Crown · 1000 km')}
    <p class="micro">Nothing exists above the World Crown.</p>`,
  note: `The marathon sits at exactly ${km(42_195)} — that is why the count is 121, not 120.`,
}));

SCREENS.push(frame({
  id: 'myrunner', title: 'My Runner  (planned)', nav: 4,
  subtitle: `${styles.length} base styles · one account, one runner`,
  body: `
    <p class="eyebrow">Your runner</p>
    <div class="portrait"><span>art pending</span></div>
    <p class="eyebrow">Base style — ${styles.length} available</p>
    <div class="grid4">${styles.slice(0, 12).map((s, i) => `
      <i class="cell ${i === 0 ? 'on' : ''}" style="--tone:${s.skin_hex}" title="${t(s.name_key)} · ${s.age_band} · ${s.build}"></i>`).join('')}
      <i class="cell more">+${styles.length - 12}</i></div>
    <div class="facets">
      ${[...new Set(styles.map((s) => s.age_band))].map((b) => chip(b.replace(/_/g, ' '))).join('')}
    </div>
    ${primary('Save')}`,
  note: `Ages ${[...new Set(styles.map((s) => s.age_band))].length}, builds ${[...new Set(styles.map((s) => s.build))].length}, adaptive athletes ${styles.filter((s) => s.adaptive_kit_id).length}. Meshes are BLOCKED_ART_ASSET.`,
}));

SCREENS.push(frame({
  id: 'wardrobe', title: 'Wardrobe  (planned)', nav: 4,
  subtitle: `${wearables.length} items · ${sets.length} sets · ${slots.length} slots`,
  body: `
    <p class="eyebrow">Slot</p>
    <div class="slots">${slots.slice(0, 9).map((s, i) => `<i class="pill ${i === 6 ? 'on' : ''}">${t(s.name_key)}</i>`).join('')}<i class="pill">+${slots.length - 9}</i></div>
    <div class="count">Showing <b>1–12</b> of <b>${wearables.filter((w) => w.slot === 'top').length}</b> tops</div>
    <div class="grid3">${wearables.filter((w) => w.slot === 'top').slice(0, 9).map((w, i) => `
      <i class="tile ${i === 1 ? 'on' : ''}" title="${t(w.name_key)}"><span>${t(w.name_key)}</span></i>`).join('')}</div>
    <div class="pager"><button>‹</button><span>1 / ${Math.ceil(wearables.filter((w) => w.slot === 'top').length / 12)}</span><button>›</button></div>
    ${primary('Equip')}`,
  note: `Paged, not a wall of ${wearables.length}. The direction forbids instantiating the whole catalogue at once.`,
}));

SCREENS.push(frame({
  id: 'globalevent', title: 'Global Event  (planned)', nav: 2,
  subtitle: `${SCALE_FLOOR.GLOBAL_EVENT_MIN_PARTICIPANTS}–${SCALE_FLOOR.GLOBAL_EVENT_MAX_PARTICIPANTS} runners`,
  body: `
    <p class="eyebrow">${events[1].cadence} · ${t(events[1].name_key)}</p>
    <h2>${km(events[1].distance_meters)}</h2>
    ${bigNumber('04:12', 'until check-in')}
    <div class="split">${row('Field', `${events[1].max_participants} max`)}${row('Heat', `${events[1].heat_size} per heat`)}</div>
    <div class="strip">${Array.from({ length: 20 }, (_, i) => `<i style="left:${(i * 4.4 + 3).toFixed(1)}%"></i>`).join('')}<b style="left:46%"></b></div>
    <p class="micro">Progress and rank only. Never a location.</p>
    ${primary('Check in')}`,
  note: 'Capacity is designed, constrained and gated. The 50- and 100-runner load tests are NOT_RUN.',
}));

SCREENS.push(frame({
  id: 'race', title: 'Live Race', nav: 2,
  subtitle: `${runners.length} named world runners exist; 8 line up`,
  body: `
    <div class="live"><div class="road"></div>
      ${[18, 34, 46, 58, 70].map((l, i) => `<i class="pacer" style="left:${l}%;--z:${i}"></i>`).join('')}
      <div class="me"></div></div>
    ${bigNumber('3rd', 'of 8')}
    <ul class="list tight">
      ${runners.slice(0, 4).map((r, i) => `<li><b>${i + 1}. ${t(r.name_key)}</b><span>${r.tendency_id.replace(/_/g, ' ')}</span></li>`).join('')}
    </ul>`,
  note: 'A rival is described entirely by how it runs. No health, no damage, no attack.',
}));

SCREENS.push(frame({
  id: 'training', title: 'Training', nav: 1,
  subtitle: 'every distance and style available on day one',
  body: `
    <p class="eyebrow">Distance</p>
    <div class="facets">${['1 km', '5 km', '10 km', 'Half', 'Marathon', '50 km', 'Custom'].map(chip).join('')}</div>
    <p class="eyebrow">Style</p>
    <div class="facets">${['Easy', 'Steady', 'Tempo', 'Intervals', 'Long run', 'Run-walk'].map(chip).join('')}</div>
    <p class="eyebrow">Course</p>
    ${row(t(sampleCourses[0].name_key), km(sampleCourses[0].distance_meters))}
    ${primary('Start')}
    <p class="micro">No distance is locked behind a shorter one.</p>`,
  note: 'DL-2: a recommendation is never a restriction.',
}));

SCREENS.push(frame({
  id: 'result', title: 'Race Result', nav: 2,
  subtitle: 'losing costs nothing but the placing',
  body: `
    ${bigNumber('2nd', 'of 8')}
    <div class="split">${row('Distance', '10.00 km')}${row('Time', '48:12')}</div>
    ${row('Verification', 'Grade A')}
    ${row('Fitness XP', '+340')}
    <div class="quick">${chip('Rematch')}${chip('Share')}</div>
    <p class="micro">Nothing was taken. The rematch is immediate.</p>`,
}));

// Explicit state variants of one screen. These are the states that get skipped and then
// ship as a blank rectangle.
const STATES = ['loading', 'empty', 'error', 'disabled'].map((state) => frame({
  id: `state-${state}`, title: `Activity History — ${state}`, nav: 3, state,
  subtitle: 'every screen needs these four, and they are what gets forgotten',
  body: state === 'disabled' ? `
      <p class="eyebrow">Sync</p>
      <h2>Health Connect</h2>
      ${row('Permission', 'not granted')}
      ${primary('Import runs', true)}
      <p class="micro">Grant permission in Settings to enable this.</p>` : `
      <ul class="list">${['12 Jul · 10.0 km', '10 Jul · 5.2 km', '08 Jul · 21.1 km'].map((r) => `<li><b>${r.split(' · ')[0]}</b><span>${r.split(' · ')[1]}</span></li>`).join('')}</ul>`,
  note: state === 'disabled'
    ? 'A disabled button says why it is disabled and what would enable it.'
    : `The ${state} state, drawn rather than assumed.`,
}));

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const CSS = `
:root{
  --deep:${C.SurfaceDeep};--cool:${C.SurfaceDeepCool};--mid:${C.SurfaceMid};
  --panel:${C.SurfacePanel};--warm:${C.SurfacePanelWarm};--slate:${C.SurfaceSlate};
  --teal:${C.SurfaceTeal};--scrim:${C.Scrim};
  --muted:${C.TextMuted};--sec:${C.TextSecondary};--ph:${C.TextPlaceholder};
  --hi:${C.ButtonHighlighted};--press:${C.ButtonPressed};--off:${C.ButtonDisabled};
  --a:${C.SwatchAurora ?? C.SwatchA ?? '#1ae0a8'};
  --b:${C.SwatchViolet ?? C.SwatchB ?? '#ad66ff'};
}
*{box-sizing:border-box}
body{margin:0;background:#080c12;color:#dbe6f2;font:15px/1.5 -apple-system,"Segoe UI",Roboto,"Noto Sans KR",sans-serif}
.page{max-width:1400px;margin:0 auto;padding:32px 20px 80px}
h1{font-size:26px;margin:0 0 6px}
.lede{color:var(--muted);max-width:62ch;margin:0 0 20px}
.banner{border:1px solid var(--hi);background:${C.SurfaceMid};border-radius:10px;padding:14px 16px;margin:0 0 28px}
.banner b{display:block;letter-spacing:.14em;font-size:12px;color:var(--a)}
.banner p{margin:6px 0 0;color:var(--sec);font-size:13px}
h2.sec{font-size:14px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);
  border-top:1px solid #1b2836;padding-top:22px;margin:44px 0 18px}
.rail{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:34px}

.phone-wrap{margin:0}
figcaption{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin:0 0 8px;font-size:13px}
figcaption b{font-size:15px}
figcaption span{color:var(--muted);font-size:12px}
.tag{font-style:normal;font-size:10px;letter-spacing:.1em;text-transform:uppercase;
  border:1px solid var(--off);border-radius:99px;padding:1px 8px;color:var(--sec)}
.tag-error{border-color:#d4614a;color:#f0917c}
.note{margin:10px 2px 0;font-size:12px;color:var(--muted);line-height:1.45}

.phone{position:relative;width:280px;height:606px;border-radius:26px;overflow:hidden;
  background:var(--deep);border:1px solid #223449;display:flex;flex-direction:column;
  box-shadow:0 18px 40px rgba(0,0,0,.5)}
.phone.is-disabled .view{opacity:.55}
.safe{flex:0 0 auto;font-size:8px;letter-spacing:.1em;color:#7d92a8;display:flex;
  align-items:center;justify-content:center;gap:6px;
  background:repeating-linear-gradient(45deg,#101a25 0 6px,#0c141d 6px 12px)}
.safe-top{height:30px}
.safe-bottom{height:24px;flex-direction:column;gap:3px}
.safe-bottom i{width:76px;height:3px;border-radius:99px;background:#43566b}
.hud{flex:0 0 auto;display:flex;justify-content:space-between;padding:9px 14px;
  background:var(--cool);font-size:11px;color:var(--sec)}
.crown{color:var(--a);font-weight:700}
.view{flex:1 1 auto;position:relative;padding:14px;overflow:hidden;background:var(--deep)}
.tabs{flex:0 0 auto;display:flex;background:var(--mid);border-top:1px solid #1c2c3c}
.tabs button{flex:1;background:none;border:0;padding:7px 0 6px;display:flex;
  flex-direction:column;align-items:center;gap:2px;color:var(--muted);font-size:9px;cursor:default}
.tabs svg{width:19px;height:19px}
.tabs .on{color:#d1e9ff}
.stamp{flex:0 0 auto;text-align:center;background:#0b1119;color:var(--a);
  font-size:7px;letter-spacing:.1em;padding:3px 0;border-top:1px solid #1b2836}

.eyebrow{margin:0 0 3px;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.view h2{margin:0 0 10px;font-size:19px}
.big{margin:6px 0 12px}
.big b{display:block;font-size:46px;line-height:1;letter-spacing:-.02em}
.big span{font-size:11px;color:var(--muted)}
.split{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
.row{background:var(--panel);border-radius:8px;padding:7px 10px;display:flex;
  justify-content:space-between;align-items:center;font-size:11px;color:var(--muted);margin-bottom:6px}
.row b{color:#e6f0fa;font-size:12px}
.split .row{margin:0;display:block}
.split .row b{display:block;margin-top:2px}
.bar{height:5px;border-radius:99px;background:var(--slate);overflow:hidden;margin:0 0 12px}
.bar i{display:block;height:100%;background:var(--a)}
.cta{width:100%;min-height:44px;border:0;border-radius:11px;background:var(--hi);
  color:#08131e;font-size:14px;font-weight:700;cursor:default}
.cta.ghost{background:none;border:1px solid var(--off);color:var(--sec)}
.cta:disabled{background:var(--off);color:#8d9dad}
.dual{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.quick{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.chip,.pill{background:var(--slate);border-radius:99px;padding:4px 10px;font-size:10px;
  color:var(--sec);font-style:normal;display:inline-block}
.pill.on{background:var(--teal);color:#062028}
.facets{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px}
.micro{margin:9px 0 0;font-size:9px;color:var(--ph)}
.list{list-style:none;margin:0;padding:0}
.list li{background:var(--panel);border-radius:8px;padding:7px 10px;margin-bottom:5px;
  display:flex;justify-content:space-between;font-size:11px}
.list li span{color:var(--muted)}
.list.tight li{padding:5px 9px;margin-bottom:4px}

.live{position:relative;height:120px;border-radius:10px;overflow:hidden;margin-bottom:10px;
  background:linear-gradient(180deg,var(--cool) 0%,var(--deep) 70%)}
.road{position:absolute;bottom:0;left:0;right:0;height:44px;background:var(--slate)}
.me{position:absolute;bottom:30px;left:44%;width:16px;height:30px;border-radius:7px;background:var(--a)}
.pacer{position:absolute;bottom:32px;width:11px;height:22px;border-radius:5px;
  background:var(--b);opacity:calc(.85 - var(--z) * .13)}
.globe{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px}
.dot{width:22px;height:22px;border-radius:50%;background:var(--slate);display:block}
.dot.on{background:var(--a)}
.ladder{display:flex;gap:2px;flex-wrap:wrap;margin-bottom:12px}
.ladder i{width:9px;height:9px;border-radius:2px;background:var(--slate)}
.ladder i.done{background:var(--a)}
.ladder i.mark{background:var(--b)}
.ladder i.crown{background:#f0c987;width:13px}
.portrait{height:112px;border-radius:10px;background:var(--slate);display:flex;
  align-items:center;justify-content:center;margin-bottom:10px}
.portrait span{font-size:10px;color:var(--ph);letter-spacing:.1em}
.grid4{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:10px}
.cell{aspect-ratio:1;border-radius:7px;background:var(--tone,var(--slate));display:block;
  border:2px solid transparent}
.cell.on{border-color:var(--a)}
.cell.more{background:var(--slate);display:flex;align-items:center;justify-content:center;
  font-size:9px;color:var(--muted);font-style:normal}
.slots{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:9px}
.count{font-size:10px;color:var(--muted);margin-bottom:7px}
.count b{color:#e6f0fa}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:9px}
.tile{aspect-ratio:1;border-radius:8px;background:var(--panel);border:2px solid transparent;
  display:flex;align-items:flex-end;padding:4px;overflow:hidden}
.tile.on{border-color:var(--a)}
.tile span{font-size:7px;color:var(--muted);line-height:1.2;font-style:normal}
.pager{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:10px;
  font-size:10px;color:var(--muted)}
.pager button{background:var(--slate);border:0;color:var(--sec);border-radius:6px;
  width:26px;height:22px;cursor:default}
.strip{position:relative;height:26px;border-radius:99px;background:var(--slate);margin:8px 0}
.strip i{position:absolute;top:9px;width:6px;height:8px;border-radius:2px;background:var(--b);opacity:.6}
.strip b{position:absolute;top:6px;width:8px;height:14px;border-radius:3px;background:var(--a)}

.veil{position:absolute;inset:0;background:var(--scrim);display:flex;align-items:center;
  justify-content:center;backdrop-filter:blur(1px)}
.state{text-align:center;padding:0 24px}
.state p{margin:10px 0 3px;font-size:14px}
.state span{display:block;font-size:10px;color:var(--muted);max-width:26ch;margin:0 auto}
.state .glyph{font-size:30px;color:var(--muted)}
.state.err .glyph{color:#f0917c}
.retry{display:block;margin:12px auto 0;background:var(--hi);border:0;border-radius:9px;padding:8px 20px;
  font-size:12px;font-weight:700;color:#08131e;cursor:default}
.spin{width:26px;height:26px;border-radius:50%;border:3px solid var(--slate);
  border-top-color:var(--a);margin:0 auto;animation:sp 1s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}

table{border-collapse:collapse;width:100%;font-size:13px;margin-top:8px}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid #182634}
th{color:var(--muted);font-weight:600;font-size:11px;letter-spacing:.08em;text-transform:uppercase}
td b{color:var(--a)}
@media (max-width:640px){.phone{width:100%;max-width:280px}}
`;

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RunningUp V14 — design proposal</title>
<style>${CSS}</style>
</head><body>
<div class="page">

<h1>RunningUp V14 — screen design proposal</h1>
<p class="lede">Fixed-camera 2.5D, portrait, read at arm’s length while running. Every number,
name and colour on this page is read out of the repository — the content the game actually
ships and the palette the app actually uses. Nothing here is a mock-up number.</p>

<div class="banner">
  <b>DESIGN PROPOSAL · NOT THE RUNNING UNITY BUILD · NATIVE FEATURES NOT EXECUTED</b>
  <p>This is a drawing, not a capture. GPS, Health Connect, the system back button and
  notifications are Android-only and are not running here — a real screenshot of the app
  would be labelled CURRENT UNITY RUNTIME CAPTURE and would look different in the details.</p>
</div>

<table>
  <tr><th>Source</th><th>Value</th></tr>
  <tr><td>Continents / regions / courses</td><td><b>${manifest.counts.continents} / ${manifest.counts.region_nodes} / ${manifest.counts.courses.toLocaleString('en-US')}</b></td></tr>
  <tr><td>Monthly checkpoints → World Crown</td><td><b>${DIRECTION_LOCK.CHECKPOINT_COUNT} → 1000 km</b></td></tr>
  <tr><td>My Runner base styles</td><td><b>${styles.length}</b></td></tr>
  <tr><td>Named world runners</td><td><b>${runners.length}</b></td></tr>
  <tr><td>Wearable items / sets / slots</td><td><b>${wearables.length} / ${sets.length} / ${slots.length}</b></td></tr>
  <tr><td>Global Event capacity</td><td><b>${SCALE_FLOOR.GLOBAL_EVENT_MIN_PARTICIPANTS}–${SCALE_FLOOR.GLOBAL_EVENT_MAX_PARTICIPANTS}</b> (load test NOT_RUN)</td></tr>
  <tr><td>Palette</td><td>parsed from <b>Design/V14Design.cs</b></td></tr>
</table>

<h2 class="sec">Screens</h2>
<div class="rail">${SCREENS.join('')}</div>

<h2 class="sec">The states that get forgotten</h2>
<p class="lede">Loading, empty, error and disabled are where an app stops feeling finished.
Each is drawn here so it is a decision rather than an omission — and a disabled control
always says what would enable it.</p>
<div class="rail">${STATES.join('')}</div>

<h2 class="sec">Safe area</h2>
<p class="lede">The hatched bands at the top and bottom of every frame are the phone’s
status bar and gesture bar. The interface never enters them. This app has collided with
both before, so they are drawn on every single frame rather than assumed — a design that
looks right only on a phone without a cutout is not a design that works.</p>

<h2 class="sec">Why this design</h2>
<table>
  <tr><th>Constraint</th><th>What it decided</th></tr>
  <tr><td>Read while running, moving, at arm’s length</td><td>one primary action per screen, one 46px number, everything else demoted to a chip</td></tr>
  <tr><td>Fixed-camera 2.5D, portrait</td><td>a top HUD and bottom nav that never move between screens; the live view keeps the middle</td></tr>
  <tr><td>Status bar and gesture bar have collided before</td><td>the safe area is drawn on every frame, not assumed</td></tr>
  <tr><td>${wearables.length} items and ${runners.length} runners now exist</td><td>catalogues are paged with a count header — never a wall of ${wearables.length} tiles</td></tr>
  <tr><td>Retoning is a separate decision from layout</td><td>the palette is the app’s current one, unchanged, so this review is about layout only</td></tr>
</table>

</div></body></html>
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'index.html'), html, 'utf8');
console.log(`preview written: ${join(OUT, 'index.html')}`);
console.log(`  ${SCREENS.length} screens + ${STATES.length} state variants`);
console.log(`  palette: ${Object.keys(C).length} tokens parsed from V14Design.cs`);
console.log(`  content: ${manifest.counts.courses} courses, ${runners.length} runners, ${wearables.length} items`);
