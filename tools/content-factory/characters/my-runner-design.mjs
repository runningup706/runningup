/**
 * My Runner — the one persistent runner an account owns.
 *
 * One account has exactly one My Runner. That identity never forks: this table is not a
 * roster to pick a *character* from, it is the set of bodies that one runner can be.
 * `CHARACTERS` in character-design.mjs is a different thing entirely — those twelve are
 * named world figures with episodes and techniques, and they are untouched.
 *
 * WHY 24 AND WHY THESE 24
 * -----------------------
 * The owner floor is 24 base styles, and the floor is explicit that 24 recolours do not
 * count. So each row differs on the axes a viewer can actually see at 36% of a portrait
 * screen height in a 2.8-head chibi proportion: age band, build, silhouette, gait. Skin
 * tone and hair are *also* varied, but no two rows differ on those alone — the uniqueness
 * validator enforces that by ignoring colour when it computes a style's signature.
 *
 * Representation rules, from the owner direction and not negotiable:
 *
 *   - Older runners are drawn as runners, never as a joke about being old.
 *   - Child and teen styles get child and teen proportions and no adult styling.
 *   - Young and thin is one way to be a runner here, not the default one. Nine of the 24
 *     are neither.
 *   - Adaptive athletes (5 of 24) are runners with equipment, never a cosmetic theme and
 *     never a stat penalty. `packages/domain/race.mjs` cannot see this field at all.
 *
 * MECHANICAL NEUTRALITY
 * ---------------------
 * A base style carries zero Fitness Core Power (DL-5). The gait numbers below are
 * animation inputs — how the mesh moves — and are deliberately not race inputs. The
 * validator asserts no style record carries a stat field.
 *
 * RIG CONTRACT
 * ------------
 * Every style shares `rig_v14_chibi`, which is what makes a wardrobe of 600+ items
 * wearable by all 24 without a per-style asset explosion. `build_scale` and `head_ratio`
 * are applied by the runtime as skeleton scaling, not as separate meshes.
 */

/** The one skeleton every base style and every wardrobe item is authored against. */
export const RIG_ID = 'rig_v14_chibi';

/** Shared locomotion clip set. Styles differ by gait parameters, not by clip. */
export const ANIMATION_SET_ID = 'anim_v14_run_core';

/**
 * Skin tones. Named, not numbered, so a designer changing a swatch changes one row and
 * every style using it follows. Colour alone never makes two styles distinct.
 */
export const SKIN_TONES = Object.freeze([
  { id: 'tone_porcelain', hex: '#F2D7C4' },
  { id: 'tone_sand', hex: '#E5BE9B' },
  { id: 'tone_honey', hex: '#D19E6F' },
  { id: 'tone_olive', hex: '#B98A5E' },
  { id: 'tone_amber', hex: '#A26E43' },
  { id: 'tone_umber', hex: '#7C5030' },
  { id: 'tone_cocoa', hex: '#5A3823' },
  { id: 'tone_ebony', hex: '#3D2418' },
]);

/**
 * Age bands. `order` is presentation order in the creator, nothing else — there is no
 * progression through them and a style is never unlocked by another style.
 */
export const AGE_BANDS = Object.freeze([
  { id: 'child', order: 1, head_ratio: 2.3 },
  { id: 'teen', order: 2, head_ratio: 2.55 },
  { id: 'young_adult', order: 3, head_ratio: 2.8 },
  { id: 'adult', order: 4, head_ratio: 2.8 },
  { id: 'midlife', order: 5, head_ratio: 2.75 },
  { id: 'senior', order: 6, head_ratio: 2.7 },
  { id: 'elder', order: 7, head_ratio: 2.65 },
]);

/**
 * Builds. `scale` is [width, height, limb] against the rig's neutral pose. These are the
 * axis the anti-recolour validator reads first: two styles that share an age band must
 * not share a build.
 */
export const BUILDS = Object.freeze([
  { id: 'compact', scale: [0.96, 0.90, 0.94] },
  { id: 'wiry', scale: [0.88, 1.00, 1.06] },
  { id: 'lean', scale: [0.92, 1.02, 1.04] },
  { id: 'athletic', scale: [1.00, 1.00, 1.00] },
  { id: 'long_limbed', scale: [0.94, 1.08, 1.12] },
  { id: 'stocky', scale: [1.12, 0.94, 0.92] },
  { id: 'broad', scale: [1.16, 1.04, 1.00] },
  { id: 'muscular', scale: [1.10, 1.01, 0.98] },
  { id: 'full', scale: [1.20, 0.99, 0.96] },
  { id: 'soft_round', scale: [1.14, 0.96, 0.94] },
  { id: 'petite', scale: [0.90, 0.88, 0.92] },
  { id: 'tall_slim', scale: [0.90, 1.10, 1.10] },
]);

/**
 * Adaptive running equipment. Each entry is real competitive running equipment, drawn as
 * part of the athlete. `grants_core_power: false` is stated on the record so that the
 * fairness test has something to read rather than an absence to trust.
 */
export const ADAPTIVE_KITS = Object.freeze([
  {
    id: 'adp_blade_unilateral',
    equipment: 'single below-knee running blade, right side',
    gait_note: 'asymmetric contact time, blade recoil drives the swing',
    grants_core_power: false,
  },
  {
    id: 'adp_blade_bilateral',
    equipment: 'paired below-knee running blades',
    gait_note: 'symmetric bounce, longer flight phase, shorter ground contact',
    grants_core_power: false,
  },
  {
    id: 'adp_forearm_frame',
    equipment: 'lightweight forearm running frame',
    gait_note: 'upper body carries rhythm, cadence set by frame plant',
    grants_core_power: false,
  },
  {
    id: 'adp_guide_tether',
    equipment: 'guide tether at the wrist, guide runner one step off the shoulder',
    gait_note: 'holds a line by feel, arm swing narrower on the tethered side',
    grants_core_power: false,
  },
  {
    id: 'adp_upper_prosthetic',
    equipment: 'below-elbow prosthetic, left arm',
    gait_note: 'shortened arm swing on one side, torso counter-rotates more',
    grants_core_power: false,
  },
]);

/**
 * The 24 base styles.
 *
 * Read a row as: this is what the runner looks like standing on the line, and this is what
 * they look like at 800 m to go when it hurts. The `effort` and `finish` fields exist
 * because the owner direction asks for fatigue and finish motion per body and age — a
 * 68-year-old and a 15-year-old do not fall apart the same way, and drawing them with one
 * shared "tired" pose is the reskin this table refuses.
 */
export const MY_RUNNER_BASE_STYLES = Object.freeze([
  {
    id: 'mrs_sprout', order: 1, age_band: 'child', build: 'compact',
    presentation: 'neutral', skin: 'tone_sand',
    name: { ko: '새싹', en: 'Sprout' },
    face: 'round cheeks, wide-set eyes, permanent half-smile',
    hair: 'short mop with a cowlick that never lies down',
    gait: { cadence_spm: 196, step_length_index: 0.62, description: 'bouncy, heels flicking high behind' },
    posture: 'upright to the point of leaning back slightly',
    neutral: 'looking at everything except the finish line',
    effort: 'mouth open, arms swinging wide and loose',
    finish: 'both arms straight up and a small jump on the line',
    adaptive: null,
  },
  {
    id: 'mrs_kite', order: 2, age_band: 'child', build: 'wiry',
    presentation: 'feminine', skin: 'tone_umber',
    name: { ko: '연', en: 'Kite' },
    face: 'narrow chin, gap in the front teeth, eyebrows always up',
    hair: 'two high braids that swing out of phase with the stride',
    gait: { cadence_spm: 204, step_length_index: 0.58, description: 'very quick and very short, leans from the ankles' },
    posture: 'forward lean well ahead of the hips',
    neutral: 'bouncing on the spot before the gun',
    effort: 'chin drops, cadence somehow rises',
    finish: 'runs straight through the line without slowing and turns around confused',
    adaptive: null,
  },
  {
    id: 'mrs_ember', order: 3, age_band: 'teen', build: 'lean',
    presentation: 'masculine', skin: 'tone_amber',
    name: { ko: '잉걸', en: 'Ember' },
    face: 'sharp jaw not grown into yet, freckles across the nose',
    hair: 'grown-out undercut pushed back with a headband',
    gait: { cadence_spm: 184, step_length_index: 0.92, description: 'over-strides slightly, all forefoot' },
    posture: 'shoulders a touch high, tension in the neck',
    neutral: 'jaw set, refusing to look at anyone',
    effort: 'shoulders climb toward the ears, hands ball into fists',
    finish: 'a hard dip at the line whether it is close or not',
    adaptive: null,
  },
  {
    id: 'mrs_static', order: 4, age_band: 'teen', build: 'tall_slim',
    presentation: 'neutral', skin: 'tone_porcelain',
    name: { ko: '잔결', en: 'Static' },
    face: 'long features, heavy-lidded, unreadable',
    hair: 'chin-length and tucked behind one ear',
    gait: { cadence_spm: 172, step_length_index: 1.10, description: 'long and quiet, almost no vertical movement' },
    posture: 'very tall through the spine, arms low',
    neutral: 'still in a way that reads as either calm or nerves',
    effort: 'nothing changes above the waist, which is its own tell',
    finish: 'holds form through the line and keeps running past it',
    adaptive: null,
  },
  {
    id: 'mrs_lark', order: 5, age_band: 'teen', build: 'athletic',
    presentation: 'feminine', skin: 'tone_honey',
    name: { ko: '종달', en: 'Lark' },
    face: 'open, high cheekbones, smiles under load',
    hair: 'high ponytail cut short enough to stay put',
    gait: { cadence_spm: 190, step_length_index: 0.95, description: 'even and economical, textbook midfoot' },
    posture: 'square shoulders, elbows tight',
    neutral: 'scanning the field and counting',
    effort: 'breathing goes audible before anything else moves',
    finish: 'accelerates from 200 m out and does not look back',
    adaptive: null,
  },
  {
    id: 'mrs_quarry', order: 6, age_band: 'young_adult', build: 'broad',
    presentation: 'masculine', skin: 'tone_cocoa',
    name: { ko: '채석', en: 'Quarry' },
    face: 'heavy brow, wide nose, deliberate blink',
    hair: 'close-cropped with a hard part',
    gait: { cadence_spm: 178, step_length_index: 1.02, description: 'heavy, audible footfall, drives from the hips' },
    posture: 'chest open, arms carried wide of the body',
    neutral: 'plants both feet and does not fidget',
    effort: 'the footfall gets louder rather than the cadence slower',
    finish: 'lowers the head and grinds the last 400 m at one pace',
    adaptive: null,
  },
  {
    id: 'mrs_meridian', order: 7, age_band: 'young_adult', build: 'long_limbed',
    presentation: 'feminine', skin: 'tone_olive',
    name: { ko: '자오선', en: 'Meridian' },
    face: 'long neck, calm mouth, eyes fixed far ahead',
    hair: 'locs gathered high and wrapped',
    gait: { cadence_spm: 168, step_length_index: 1.18, description: 'enormous stride at a low turnover, floats between contacts' },
    posture: 'slight forward tilt from the whole body, not the waist',
    neutral: 'unhurried, arrives at the line last on purpose',
    effort: 'stride shortens before cadence drops',
    finish: 'one long change of gear rather than a sprint',
    adaptive: null,
  },
  {
    id: 'mrs_ash', order: 8, age_band: 'young_adult', build: 'wiry',
    presentation: 'neutral', skin: 'tone_sand',
    name: { ko: '재', en: 'Ash' },
    face: 'hollow cheeks, quick eyes, mouth usually moving',
    hair: 'shaved at the sides, longer and messy on top',
    gait: { cadence_spm: 198, step_length_index: 0.80, description: 'restless, changes rhythm every few hundred metres' },
    posture: 'never quite settled, one shoulder lower',
    neutral: 'cannot stand still, walks small circles',
    effort: 'the rhythm changes stop and it becomes one flat drive',
    finish: 'goes early, twice, and the second one sticks',
    adaptive: null,
  },
  {
    id: 'mrs_pillar', order: 9, age_band: 'young_adult', build: 'muscular',
    presentation: 'masculine', skin: 'tone_ebony',
    name: { ko: '기둥', en: 'Pillar' },
    face: 'square, deep-set eyes, rarely changes',
    hair: 'flat top, edged sharp',
    gait: { cadence_spm: 186, step_length_index: 0.98, description: 'powerful and compact, very little ground contact' },
    posture: 'absolutely vertical, arms pistoning at ninety degrees',
    neutral: 'takes the inside lane and stands there',
    effort: 'form does not break; the pace simply stops rising',
    finish: 'a real sprint, upright, arms driving through',
    adaptive: null,
  },
  {
    id: 'mrs_current', order: 10, age_band: 'young_adult', build: 'athletic',
    presentation: 'feminine', skin: 'tone_amber',
    name: { ko: '물살', en: 'Current' },
    face: 'broad smile, laugh lines already starting',
    hair: 'short natural curls, no covering',
    gait: { cadence_spm: 182, step_length_index: 1.04, description: 'blade recoil on the right sets the rhythm for both sides' },
    posture: 'tall, slight lead with the left shoulder',
    neutral: 'checks the blade socket twice and forgets about it',
    effort: 'contact time on the intact side lengthens first',
    finish: 'the last 100 m are the fastest 100 m, every time',
    adaptive: 'adp_blade_unilateral',
  },
  {
    id: 'mrs_ledger', order: 11, age_band: 'adult', build: 'stocky',
    presentation: 'masculine', skin: 'tone_porcelain',
    name: { ko: '장부', en: 'Ledger' },
    face: 'round, glasses that get taped before a race, patient',
    hair: 'thinning and honest about it',
    gait: { cadence_spm: 180, step_length_index: 0.86, description: 'short, metronomic, does not vary by a step' },
    posture: 'slight forward hunch, hands low',
    neutral: 'checks a paper split card in a pocket',
    effort: 'nothing visible changes for a very long time',
    finish: 'crosses at exactly the pace planned, to the second',
    adaptive: null,
  },
  {
    id: 'mrs_harbor', order: 12, age_band: 'adult', build: 'full',
    presentation: 'feminine', skin: 'tone_umber',
    name: { ko: '항구', en: 'Harbor' },
    face: 'warm, round, direct gaze, smiles at strangers',
    hair: 'braided crown pinned close',
    gait: { cadence_spm: 176, step_length_index: 0.88, description: 'grounded and rolling, strong arm carriage' },
    posture: 'upright with the weight well back over the heels',
    neutral: 'talking to whoever is next to her on the line',
    effort: 'the arms take over and the legs follow them',
    finish: 'holds the pace to the line and then hugs someone',
    adaptive: null,
  },
  {
    id: 'mrs_signal', order: 13, age_band: 'adult', build: 'lean',
    presentation: 'neutral', skin: 'tone_honey',
    name: { ko: '신호', en: 'Signal' },
    face: 'angular, alert, one raised eyebrow at rest',
    hair: 'grown out to the shoulder and tied back flat',
    gait: { cadence_spm: 188, step_length_index: 1.00, description: 'clipped and precise, lands under the hip every time' },
    posture: 'level shoulders, chin tucked',
    neutral: 'watching the clock rather than the field',
    effort: 'cadence holds and stride quietly shortens',
    finish: 'a measured lift over the last 600 m, no sprint',
    adaptive: null,
  },
  {
    id: 'mrs_anvil', order: 14, age_band: 'adult', build: 'broad',
    presentation: 'masculine', skin: 'tone_olive',
    name: { ko: '모루', en: 'Anvil' },
    face: 'weathered, thick beard, unbothered',
    hair: 'tied back under a folded bandana',
    gait: { cadence_spm: 174, step_length_index: 0.94, description: 'frame plant sets the beat, legs answer it' },
    posture: 'forward through the chest, weight over the frame',
    neutral: 'adjusts the forearm cuffs and nods once',
    effort: 'plant rate stays and the recovery between plants shortens',
    finish: 'the last kilometre is the loudest thing on the course',
    adaptive: 'adp_forearm_frame',
  },
  {
    id: 'mrs_willow', order: 15, age_band: 'adult', build: 'tall_slim',
    presentation: 'feminine', skin: 'tone_cocoa',
    name: { ko: '버들', en: 'Willow' },
    face: 'fine features, downturned eyes, very still',
    hair: 'straight to the waist, wound into a low knot',
    gait: { cadence_spm: 170, step_length_index: 1.14, description: 'long and low with a pronounced hip drive' },
    posture: 'a slight sway through the torso that never becomes a wobble',
    neutral: 'stretches one calf and stops paying attention',
    effort: 'the sway grows and the head starts to drop',
    finish: 'catches people in the last 300 m without appearing to speed up',
    adaptive: null,
  },
  {
    id: 'mrs_tinder', order: 16, age_band: 'midlife', build: 'compact',
    presentation: 'masculine', skin: 'tone_sand',
    name: { ko: '부싯깃', en: 'Tinder' },
    face: 'deep smile lines, grey at the temples, quick to laugh',
    hair: 'short and neat, receding at the corners',
    gait: { cadence_spm: 192, step_length_index: 0.78, description: 'small fast steps, very low to the ground' },
    posture: 'compact, elbows tucked in tight',
    neutral: 'jokes with the person behind him until the gun',
    effort: 'the jokes stop, nothing else changes',
    finish: 'a short vicious kick from 150 m that surprises people every time',
    adaptive: null,
  },
  {
    id: 'mrs_almanac', order: 17, age_band: 'midlife', build: 'soft_round',
    presentation: 'feminine', skin: 'tone_ebony',
    name: { ko: '역서', en: 'Almanac' },
    face: 'full cheeks, reading glasses on a cord, entirely unhurried',
    hair: 'silver-streaked twists gathered at the nape',
    gait: { cadence_spm: 178, step_length_index: 0.84, description: 'even and rolling, absolutely unchanged from km 1 to km 30' },
    posture: 'square and settled, arms low and relaxed',
    neutral: 'knows the course and says so',
    effort: 'genuinely difficult to tell that anything is happening',
    finish: 'passes people who started far too fast, at her opening pace',
    adaptive: null,
  },
  {
    id: 'mrs_keel', order: 18, age_band: 'midlife', build: 'athletic',
    presentation: 'neutral', skin: 'tone_amber',
    name: { ko: '용골', en: 'Keel' },
    face: 'squared jaw, dark glasses, listens more than looks',
    hair: 'cropped close with a defined line',
    gait: { cadence_spm: 184, step_length_index: 0.99, description: 'holds a dead-straight line by feel, tether hand steady' },
    posture: 'very level, tethered arm swinging narrower than the free one',
    neutral: 'talks the guide through the plan, not the other way round',
    effort: 'the tether goes slack — the guide is the one working now',
    finish: 'both runners lift together and cross a stride apart',
    adaptive: 'adp_guide_tether',
  },
  {
    id: 'mrs_furnace', order: 19, age_band: 'midlife', build: 'muscular',
    presentation: 'masculine', skin: 'tone_honey',
    name: { ko: '화덕', en: 'Furnace' },
    face: 'heavy features, permanent scowl that means nothing',
    hair: 'shaved to the skin',
    gait: { cadence_spm: 182, step_length_index: 0.96, description: 'strong and slightly heavy, visible power off the toe' },
    posture: 'chest forward, shoulders rolled back',
    neutral: 'stands with arms crossed and does not warm up enough',
    effort: 'starts to run on the heels and fights it back',
    finish: 'one enormous surge that either wins it or ends the race',
    adaptive: null,
  },
  {
    id: 'mrs_lantern', order: 20, age_band: 'senior', build: 'lean',
    presentation: 'feminine', skin: 'tone_porcelain',
    name: { ko: '등불', en: 'Lantern' },
    face: 'fine lines everywhere, bright eyes, entirely present',
    hair: 'white bob held with a plain clip',
    gait: { cadence_spm: 186, step_length_index: 0.82, description: 'short and light with surprisingly quick turnover' },
    posture: 'upright, chin level, arms compact',
    neutral: 'first to the start line by ten minutes',
    effort: 'stride shortens further and the cadence goes up to compensate',
    finish: 'reels in one person per hundred metres over the last kilometre',
    adaptive: null,
  },
  {
    id: 'mrs_bellows', order: 21, age_band: 'senior', build: 'stocky',
    presentation: 'masculine', skin: 'tone_umber',
    name: { ko: '풀무', en: 'Bellows' },
    face: 'broad, white moustache, deeply creased around the eyes',
    hair: 'thick white, combed back',
    gait: { cadence_spm: 172, step_length_index: 0.90, description: 'deliberate, audible breathing on a four-count' },
    posture: 'slight forward set, hands high and open',
    neutral: 'checks the wind and picks a side of the road',
    effort: 'the four-count breathing goes to two and holds there',
    finish: 'the same pace, all the way through, and a hand raised at the line',
    adaptive: null,
  },
  {
    id: 'mrs_reed', order: 22, age_band: 'senior', build: 'petite',
    presentation: 'neutral', skin: 'tone_olive',
    name: { ko: '갈대', en: 'Reed' },
    face: 'small, sharp, hard to read, misses nothing',
    hair: 'grey and close-cropped',
    gait: { cadence_spm: 194, step_length_index: 0.70, description: 'tiny quick steps, feet barely leaving the ground' },
    posture: 'low and narrow, shoulders soft',
    neutral: 'takes the outside lane deliberately, out of the crush',
    effort: 'the steps get quicker and shorter still',
    finish: 'never changes pace and finishes ahead of people who did',
    adaptive: null,
  },
  {
    id: 'mrs_hearth', order: 23, age_band: 'elder', build: 'soft_round',
    presentation: 'feminine', skin: 'tone_cocoa',
    name: { ko: '화롯가', en: 'Hearth' },
    face: 'round and lined, glasses, looks pleased about everything',
    hair: 'white and short under a cotton cap',
    gait: { cadence_spm: 168, step_length_index: 0.86, description: 'slow, even, and completely unshakeable' },
    posture: 'settled and square, arms swinging low and wide',
    neutral: 'the last one onto the line and unhurried about it',
    effort: 'no visible change at all across the whole distance',
    finish: 'walks the last twenty metres if she wants to, and still finishes',
    adaptive: 'adp_upper_prosthetic',
  },
  {
    id: 'mrs_kiln', order: 24, age_band: 'elder', build: 'wiry',
    presentation: 'masculine', skin: 'tone_ebony',
    name: { ko: '가마', en: 'Kiln' },
    face: 'gaunt, weathered, eyes fixed on the horizon',
    hair: 'white and thin, cut very short',
    gait: { cadence_spm: 180, step_length_index: 0.92, description: 'light and springy on both blades, long flight phase' },
    posture: 'tall through the chest, blades tracking dead straight',
    neutral: 'says nothing to anyone and is entirely comfortable',
    effort: 'flight phase shortens, contact stays quiet',
    finish: 'lifts once at 400 m and holds it, all the way in',
    adaptive: 'adp_blade_bilateral',
  },
]);

/**
 * Slots a style occupies by default before any wardrobe is equipped. Every base style
 * ships wearing something: an empty slot at first launch is a naked runner, and "wear
 * nothing until the player shops" is not a first-run experience.
 */
export const STARTER_SLOT_FILL = Object.freeze(['hair', 'top', 'bottom', 'socks', 'shoes']);
