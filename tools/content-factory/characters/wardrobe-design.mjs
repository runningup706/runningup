/**
 * My Runner wardrobe — 18 equip slots, 120 outfit sets, 600+ individual wearable items.
 *
 * WHAT COUNTS AS AN ITEM
 * ----------------------
 * The owner floor is explicit that a catalogue number is not the deliverable: an item only
 * counts when it occupies a real slot, is compatible with real base styles, has a
 * thumbnail and a runtime visual reference, has an acquisition route, and survives an app
 * restart. `tools/content-validator/validate.mjs` checks each of those over the emitted
 * data — so a row that exists only to raise a total fails the build rather than passing it.
 *
 * HOW 600 IS REACHED WITHOUT A RESKIN MILL
 * ----------------------------------------
 * Not by generating 600 recolours. Three authored axes multiply out:
 *
 *   1. Twelve continents, each with its own WARDROBE LANGUAGE — the material a place
 *      actually makes clothing out of and the way it constructs it. Nival sews for cold
 *      and wind; Neris seals against pressure; Voltis has to earth a garment.
 *   2. Ten authored SETS per continent, each a different line within that language.
 *   3. Ten SET SHAPES — which of the 18 slots a set actually fills. A set is not always
 *      "top, bottom, shoes": one is built around the head, one around the arms, one is a
 *      night kit with a trail and a back piece.
 *
 * 12 × 10 sets = 120 sets, and the shapes give 684 individual garments. Two items are
 * never the same garment in another colour: they differ by slot, by continent material,
 * by set line, or by all three.
 *
 * MECHANICAL NEUTRALITY
 * ---------------------
 * DL-5. Nothing here touches Fitness Core Power, XP, ranking or verification. Every emitted
 * item states each of those as an explicit zero so the fairness test reads a value instead
 * of trusting an absence, exactly as the existing character cosmetics do.
 */

/**
 * The 18 equip slots.
 *
 * `layer` is render order on the rig, low to high — the runtime sorts by it, so inserting a
 * slot later is an ordering change in one place rather than a hunt through prefabs.
 * `hides` lists slots this one suppresses when equipped: a full helmet hides hair, and
 * without that the mesh clips. `required` marks the slots a runner is never seen without;
 * the wardrobe screen refuses to leave them empty rather than letting a player unequip
 * their way to a naked runner.
 */
export const EQUIPMENT_SLOTS = Object.freeze([
  { id: 'hair',     order:  1, layer: 20, required: true,  hides: [], ko: '머리카락', en: 'Hair' },
  { id: 'headwear', order:  2, layer: 60, required: false, hides: [], ko: '모자',     en: 'Headwear' },
  { id: 'face',     order:  3, layer: 55, required: false, hides: [], ko: '얼굴',     en: 'Face' },
  { id: 'eyewear',  order:  4, layer: 58, required: false, hides: [], ko: '안경',     en: 'Eyewear' },
  { id: 'ear',      order:  5, layer: 57, required: false, hides: [], ko: '귀',       en: 'Ear' },
  { id: 'neck',     order:  6, layer: 45, required: false, hides: [], ko: '목',       en: 'Neck' },
  { id: 'top',      order:  7, layer: 30, required: true,  hides: [], ko: '상의',     en: 'Top' },
  { id: 'outer',    order:  8, layer: 40, required: false, hides: [], ko: '아우터',   en: 'Outer' },
  { id: 'arm',      order:  9, layer: 32, required: false, hides: [], ko: '팔',       en: 'Arm' },
  { id: 'wrist',    order: 10, layer: 34, required: false, hides: [], ko: '손목',     en: 'Wrist' },
  { id: 'hand',     order: 11, layer: 36, required: false, hides: [], ko: '손',       en: 'Hand' },
  { id: 'waist',    order: 12, layer: 38, required: false, hides: [], ko: '허리',     en: 'Waist' },
  { id: 'bottom',   order: 13, layer: 28, required: true,  hides: [], ko: '하의',     en: 'Bottom' },
  { id: 'leg',      order: 14, layer: 26, required: false, hides: [], ko: '다리',     en: 'Leg' },
  { id: 'socks',    order: 15, layer: 22, required: true,  hides: [], ko: '양말',     en: 'Socks' },
  { id: 'shoes',    order: 16, layer: 24, required: true,  hides: [], ko: '신발',     en: 'Shoes' },
  { id: 'back',     order: 17, layer: 15, required: false, hides: [], ko: '등',       en: 'Back' },
  { id: 'trail',    order: 18, layer: 10, required: false, hides: [], ko: '트레일',   en: 'Trail' },
]);

/**
 * Set shapes — which slots a set actually fills.
 *
 * Every one of the 18 slots appears in at least one shape, and `top`, `bottom` and `shoes`
 * appear in all ten because those are the garments a runner is always wearing. The
 * validator asserts the union of these shapes is exactly the slot list: a slot nothing
 * fills is a slot that exists only in a count.
 */
export const SET_SHAPES = Object.freeze([
  { id: 'road_kit',    construction: 'single-layer racing kit cut close to the body',              slots: ['top', 'bottom', 'socks', 'shoes', 'headwear'] },
  { id: 'layered',     construction: 'shell over a base layer, carried weight on the back',        slots: ['top', 'outer', 'bottom', 'shoes', 'neck', 'back'] },
  { id: 'minimal',     construction: 'the least fabric the climate allows',                        slots: ['top', 'bottom', 'shoes', 'wrist', 'face'] },
  { id: 'head_first',  construction: 'built outward from what covers the head',                    slots: ['hair', 'headwear', 'eyewear', 'top', 'bottom', 'shoes'] },
  { id: 'arm_driven',  construction: 'sleeves, wraps and grips — a kit for the upper body',        slots: ['top', 'arm', 'wrist', 'hand', 'bottom', 'shoes'] },
  { id: 'leg_driven',  construction: 'compression through the whole leg and nothing loose',        slots: ['top', 'bottom', 'leg', 'socks', 'shoes'] },
  { id: 'accented',    construction: 'plain body, everything spent on the small pieces',           slots: ['top', 'bottom', 'shoes', 'ear', 'neck', 'trail'] },
  { id: 'night',       construction: 'dark ground, reflective seams, a light carried behind',      slots: ['outer', 'top', 'bottom', 'shoes', 'trail', 'back'] },
  { id: 'field',       construction: 'a working kit with somewhere to put things',                 slots: ['top', 'waist', 'bottom', 'shoes', 'hand', 'headwear'] },
  { id: 'ceremonial',  construction: 'what this place wears to a start line that matters',         slots: ['outer', 'top', 'bottom', 'shoes', 'hair', 'ear'] },
]);

/**
 * Acquisition routes. None of them is a purchase with real money and none of them is a
 * random box: DL-5 keeps power out of the wardrobe, and the wardrobe keeps gambling out of
 * the product. Rotated across sets so no single route owns a continent's whole wardrobe.
 */
export const ACQUISITION_ROUTES = Object.freeze([
  'world_progress', 'region_restoration', 'race_placement', 'challenge_clear',
  'monthly_apex_checkpoint', 'season_track', 'crew_campaign', 'open_race_event',
  'character_episode', 'global_event',
]);

/**
 * Twelve wardrobe languages, one per continent.
 *
 * `material` and `construction` are what make a Nival top and a Neris top different
 * garments rather than the same garment in two palettes — the anti-reskin gate reads them.
 * The palette comes from the continent itself (world-design.mjs), never restated here.
 */
export const WARDROBE_LANGUAGES = Object.freeze({
  con_lumena: { material: 'bleached linen and thin gilt plate', construction: 'panelled and pinned like vestments, every seam visible' },
  con_verdia: { material: 'woven bast fibre and living leaf-lamina', construction: 'grown to shape rather than cut, edges left raw' },
  con_rubra:  { material: 'fire-treated hide and slag-thread weave', construction: 'riveted at the stress points, nothing sewn that heat can open' },
  con_anel:   { material: 'ripstop sailcloth and cord', construction: 'reefed and tied down so the wind has nothing to hold' },
  con_serene: { material: 'salt-cured net and mother-of-pearl scale', construction: 'knotted in open mesh that sheds water on the run' },
  con_voltis: { material: 'insulated mesh with earthed copper trace', construction: 'every panel bonded to a common ground before it is worn' },
  con_hora:   { material: 'spun silica gauze and mirrored film', construction: 'double-skinned with an air gap that holds the heat out' },
  con_nival:  { material: 'boiled wool and windproof laminate', construction: 'overlapped like roof tiles so nothing catches spindrift' },
  con_kael:   { material: 'feather-light ripstop and braided tether cord', construction: 'nothing that flaps, everything anchored twice' },
  con_neris:  { material: 'sealed neoprene and lume-thread', construction: 'welded seams, no stitch holes anywhere below the ribs' },
  con_tempora:{ material: 'oiled canvas and brass fitting', construction: 'buckled and adjustable in fixed increments, like a movement' },
  con_origin: { material: 'unstable weave that reads as two fabrics at once', construction: 'seamed along the fracture rather than the body line' },
});

/**
 * 120 outfit sets — ten per continent.
 *
 * `detail` is the one thing that distinguishes this line from its nine neighbours inside
 * the same wardrobe language. It is authored per set and the validator requires all 120 to
 * be distinct: two sets with the same detail are the same garment line twice.
 *
 * The set at index i takes SET_SHAPES[i], so every continent covers all ten constructions
 * and every slot is filled somewhere in every continent.
 */
export const OUTFIT_SETS = Object.freeze({
  con_lumena: [
    { suffix: 'vigil',      ko: '철야',     en: 'Vigil',       detail: 'worn through the night watch, hem weighted so it hangs still' },
    { suffix: 'reliquary',  ko: '성유물',   en: 'Reliquary',   detail: 'a sealed pocket over the sternum that is never opened' },
    { suffix: 'rampart',    ko: '성벽',     en: 'Rampart',     detail: 'plate at the shoulder in the shape of the wall it is named for' },
    { suffix: 'matins',     ko: '조과',     en: 'Matins',      detail: 'undyed and unlined, made to be run in before sunrise' },
    { suffix: 'censer',     ko: '향로',     en: 'Censer',      detail: 'perforated panels that vent heat in a repeating pattern' },
    { suffix: 'chorister',  ko: '성가대',   en: 'Chorister',   detail: 'a high collar that carries sound rather than blocking wind' },
    { suffix: 'sunspear',   ko: '햇창',     en: 'Sunspear',    detail: 'one gilt line running the full length of the outside leg' },
    { suffix: 'ivory',      ko: '상아',     en: 'Ivory',       detail: 'entirely without metal, for the runners who refuse it' },
    { suffix: 'beacon',     ko: '봉화',     en: 'Beacon',      detail: 'reflective at the back only, so it reads as a light leaving' },
    { suffix: 'procession', ko: '행렬',     en: 'Procession',  detail: 'cut to look identical from any angle in a moving line' },
  ],
  con_verdia: [
    { suffix: 'canopy',     ko: '수관',     en: 'Canopy',      detail: 'layered leaf-lamina that overlaps upward, shedding rain outward' },
    { suffix: 'spore',      ko: '홀씨',     en: 'Spore',       detail: 'a dusting across the shoulders that lifts when the wearer moves' },
    { suffix: 'bark',       ko: '수피',     en: 'Bark',        detail: 'ridged panels that stiffen at the joint and stay soft between' },
    { suffix: 'fern',       ko: '고사리',   en: 'Fern',        detail: 'a curled edge at every hem that uncoils as it warms' },
    { suffix: 'sapline',    ko: '수액선',   en: 'Sapline',     detail: 'a single wet-looking channel tracing the spine' },
    { suffix: 'thornline',  ko: '가시선',   en: 'Thornline',   detail: 'blunt thorn ribs along the forearm, protective and not sharp' },
    { suffix: 'mycelia',    ko: '균사',     en: 'Mycelia',     detail: 'a branching pale network that glows faintly under load' },
    { suffix: 'bloomfall',  ko: '낙화',     en: 'Bloomfall',   detail: 'petals sewn loose so they trail and settle behind the runner' },
    { suffix: 'understory', ko: '하층림',   en: 'Understory',  detail: 'deep green and matte, built to disappear at ground level' },
    { suffix: 'greenwake',  ko: '초록자국', en: 'Greenwake',   detail: 'the only Verdia line cut symmetrically, for ceremony' },
  ],
  con_rubra: [
    { suffix: 'cinder',     ko: '잔불',     en: 'Cinder',      detail: 'scorch marks placed deliberately where heat actually lands' },
    { suffix: 'slagline',   ko: '슬래그선', en: 'Slagline',    detail: 'a poured metal edge along the hem, cooled rough on purpose' },
    { suffix: 'redvein',    ko: '적맥',     en: 'Redvein',     detail: 'the canyon seam pattern, matched to the region it was earned in' },
    { suffix: 'kiln',       ko: '가마',     en: 'Kiln',        detail: 'double-fired hide that has gone hard and stays cool inside' },
    { suffix: 'ashfall',    ko: '재비',     en: 'Ashfall',     detail: 'grey over red, so it lightens as the wearer sweats through it' },
    { suffix: 'emberline',  ko: '불씨선',   en: 'Emberline',   detail: 'a single heat-reactive thread that brightens with core temperature' },
    { suffix: 'forgewalk',  ko: '제련보',   en: 'Forgewalk',   detail: 'sole and cuff built for a floor that is always too hot' },
    { suffix: 'basalt',     ko: '현무암',   en: 'Basalt',      detail: 'hexagonal plate, the only Rubra line with no red in it at all' },
    { suffix: 'magmaline',  ko: '용암선',   en: 'Magmaline',   detail: 'glows along the underside of the arm and nowhere else' },
    { suffix: 'scorchmark', ko: '낙인',     en: 'Scorchmark',  detail: 'each piece carries the mark of the race that awarded it' },
  ],
  con_anel: [
    { suffix: 'gale',       ko: '돌풍',     en: 'Gale',        detail: 'cut deliberately loose so the wind is audible against it' },
    { suffix: 'vane',       ko: '풍향',     en: 'Vane',        detail: 'a stiffened tail panel that turns the runner into a wind indicator' },
    { suffix: 'thermal',    ko: '상승기류', en: 'Thermal',     detail: 'vented at the ribs, sealed everywhere else' },
    { suffix: 'chaff',      ko: '왕겨',     en: 'Chaff',       detail: 'a fine straw-coloured nap that never quite lies flat' },
    { suffix: 'sailcloth',  ko: '돛천',     en: 'Sailcloth',   detail: 'reused sail, the seam numbers still legible on the panel' },
    { suffix: 'updraft',    ko: '상승풍',   en: 'Updraft',     detail: 'hems that lift rather than press when the pace rises' },
    { suffix: 'weathervane',ko: '풍신',     en: 'Weathervane', detail: 'a brass cardinal marker at the collar, aligned by hand' },
    { suffix: 'grasswake',  ko: '풀결',     en: 'Grasswake',   detail: 'a green bend printed across it in the direction of travel' },
    { suffix: 'kiteline',   ko: '연줄',     en: 'Kiteline',    detail: 'cord runs from wrist to waist and takes the strain off the shoulder' },
    { suffix: 'dustline',   ko: '먼지선',   en: 'Dustline',    detail: 'the plain working line, worn by everyone on the plain' },
  ],
  con_serene: [
    { suffix: 'tideline',   ko: '조수선',   en: 'Tideline',    detail: 'a wet-dark band at the exact height the water reached' },
    { suffix: 'phosphor',   ko: '인광',     en: 'Phosphor',    detail: 'holds daylight and gives it back for the first hour after dark' },
    { suffix: 'stiltwalk',  ko: '기둥길',   en: 'Stiltwalk',   detail: 'ankle wrap for running a plank walkway without looking down' },
    { suffix: 'brine',      ko: '염수',     en: 'Brine',       detail: 'salt-stiffened and never washed, by choice' },
    { suffix: 'mirrorwave', ko: '거울결',   en: 'Mirrorwave',  detail: 'scale panels that break up the runner outline on the water' },
    { suffix: 'netmend',    ko: '그물손',   en: 'Netmend',     detail: 'visibly repaired in a contrasting thread, and prouder for it' },
    { suffix: 'moonpull',   ko: '달끌림',   en: 'Moonpull',    detail: 'weighted at one hip so it hangs the same way every stride' },
    { suffix: 'saltglass',  ko: '소금유리', en: 'Saltglass',   detail: 'clear beads at the cuff that ring faintly against each other' },
    { suffix: 'undertow',   ko: '이안류',   en: 'Undertow',    detail: 'the darkest line Serene makes, worn for night crossings' },
    { suffix: 'harborlight',ko: '항구등',   en: 'Harborlight', detail: 'one warm point of light at the collarbone, visible from the sea' },
  ],
  con_voltis: [
    { suffix: 'arcline',    ko: '호선',     en: 'Arcline',     detail: 'a copper trace that follows the shortest path to the ground strap' },
    { suffix: 'coil',       ko: '코일',     en: 'Coil',        detail: 'wound sleeve that stores nothing and looks like it stores everything' },
    { suffix: 'smelter',    ko: '용해로',   en: 'Smelter',     detail: 'heat-rejecting outer face, still warm to the touch inside' },
    { suffix: 'capacitor',  ko: '축전',     en: 'Capacitor',   detail: 'flat cells across the back that are decorative and stated to be so' },
    { suffix: 'strikeplate',ko: '피뢰판',   en: 'Strikeplate', detail: 'a shoulder plate scarred by an actual strike, once' },
    { suffix: 'conduit',    ko: '도관',     en: 'Conduit',     detail: 'channels down the outside of both legs, empty and open' },
    { suffix: 'dynamo',     ko: '발전기',   en: 'Dynamo',      detail: 'a hub at the small of the back that turns with the hips' },
    { suffix: 'bluearc',    ko: '청호',     en: 'Bluearc',     detail: 'the city racing colour, and the only Voltis line without copper' },
    { suffix: 'groundwire', ko: '접지선',   en: 'Groundwire',  detail: 'a trailing earth strap that touches the road behind the heel' },
    { suffix: 'flashpoint', ko: '섬광점',   en: 'Flashpoint',  detail: 'goes white for a half second at the finish and then back' },
  ],
  con_hora: [
    { suffix: 'vitrine',    ko: '진열장',   en: 'Vitrine',     detail: 'a clear outer skin over a coloured one, with the gap visible' },
    { suffix: 'mirage',     ko: '신기루',   en: 'Mirage',      detail: 'the hem reads as detached from the leg at distance' },
    { suffix: 'sandglass',  ko: '모래시계', en: 'Sandglass',   detail: 'a narrow waist panel that is the only fitted part of it' },
    { suffix: 'refract',    ko: '굴절',     en: 'Refract',     detail: 'splits direct sun into a band of colour across the ground' },
    { suffix: 'duneline',   ko: '사구선',   en: 'Duneline',    detail: 'wind-ripple texture running across the body, not along it' },
    { suffix: 'sunfleck',   ko: '햇점',     en: 'Sunfleck',    detail: 'mirrored flecks scattered thin enough to read as dust' },
    { suffix: 'silica',     ko: '규사',     en: 'Silica',      detail: 'raw spun gauze, unfinished, the cheapest thing Hora makes' },
    { suffix: 'heathaze',   ko: '아지랑이', en: 'Heathaze',    detail: 'edges printed soft so the silhouette never resolves fully' },
    { suffix: 'shardwalk',  ko: '파편길',   en: 'Shardwalk',   detail: 'a sole built for a surface that is glass all the way down' },
    { suffix: 'glasswind',  ko: '유리바람', en: 'Glasswind',   detail: 'Hora ceremonial: a full mirrored outer worn once a season' },
  ],
  con_nival: [
    { suffix: 'rimefall',   ko: '서릿발',   en: 'Rimefall',    detail: 'a frosted nap that flattens under the hand and springs back' },
    { suffix: 'snowline',   ko: '설선',     en: 'Snowline',    detail: 'white above and dark below, split at the exact ribs' },
    { suffix: 'whiteout',   ko: '화이트아웃', en: 'Whiteout',  detail: 'entirely white including the sole, which is a real problem' },
    { suffix: 'glacier',    ko: '빙하',     en: 'Glacier',     detail: 'compressed layers visible at the cut edge of every panel' },
    { suffix: 'hoarfrost',  ko: '상고대',   en: 'Hoarfrost',   detail: 'crystalline embroidery only visible below freezing' },
    { suffix: 'breathcloud',ko: '입김',     en: 'Breathcloud', detail: 'a fleece collar shaped by years of being breathed into' },
    { suffix: 'icewall',    ko: '빙벽',     en: 'Icewall',     detail: 'a rigid front panel that takes the wind off the chest entirely' },
    { suffix: 'driftline',  ko: '눈더미선', en: 'Driftline',   detail: 'overlapping tiles angled to shed spindrift sideways' },
    { suffix: 'coldsnap',   ko: '한파',     en: 'Coldsnap',    detail: 'the thinnest thing Nival will sell you, and it is a dare' },
    { suffix: 'summitwind', ko: '정상풍',   en: 'Summitwind',  detail: 'the ridge racing line, awarded rather than made' },
  ],
  con_kael: [
    { suffix: 'updrift',    ko: '떠오름',   en: 'Updrift',     detail: 'nothing on it weighs more than the cord holding it down' },
    { suffix: 'tetherline', ko: '고삐선',   en: 'Tetherline',  detail: 'a working clip at the hip that is genuinely load-rated' },
    { suffix: 'cloudbank',  ko: '구름벽',   en: 'Cloudbank',   detail: 'graded pale to dark from shoulder to hem, like weather' },
    { suffix: 'skybridge',  ko: '하늘다리', en: 'Skybridge',   detail: 'rope-braid trim copied from the bridges it is worn across' },
    { suffix: 'featherfall',ko: '깃털낙하', en: 'Featherfall', detail: 'the lightest set in the world, and it is stated in grams' },
    { suffix: 'thermalride',ko: '기류타기', en: 'Thermalride', detail: 'wing vents under the arm that open only above a certain pace' },
    { suffix: 'ropewalk',   ko: '줄타기',   en: 'Ropewalk',    detail: 'grip surfaces on both palms and the inside of both forearms' },
    { suffix: 'highwind',   ko: '고공풍',   en: 'Highwind',    detail: 'sealed at every opening, for the routes between islands' },
    { suffix: 'aerie',      ko: '둥지',     en: 'Aerie',       detail: 'lined in down that came from nowhere anyone will explain' },
    { suffix: 'glidepath',  ko: '활공로',   en: 'Glidepath',   detail: 'the archipelago race line: one long taper from collar to ankle' },
  ],
  con_neris: [
    { suffix: 'pressure',   ko: '수압',     en: 'Pressure',    detail: 'graduated compression that is tightest at the ankle by design' },
    { suffix: 'sonar',      ko: '음탐',     en: 'Sonar',       detail: 'concentric rings from a single point at the sternum' },
    { suffix: 'lumenfish',  ko: '발광어',   en: 'Lumenfish',   detail: 'lume-thread arranged as a shoal that reads as movement' },
    { suffix: 'siltline',   ko: '실트선',   en: 'Siltline',    detail: 'settled sediment tone, matte, absorbs every light there is' },
    { suffix: 'currentline',ko: '해류선',   en: 'Currentline', detail: 'flow lines that match the drift of the region it came from' },
    { suffix: 'deepglass',  ko: '심해유리', en: 'Deepglass',   detail: 'a single pane at the forearm, and nobody knows what it is for' },
    { suffix: 'archive',    ko: '기록소',   en: 'Archive',     detail: 'text from the drowned archive, unreadable and never translated' },
    { suffix: 'kelpline',   ko: '켈프선',   en: 'Kelpline',    detail: 'long trailing strands that move a half beat behind the runner' },
    { suffix: 'bathysphere',ko: '잠수구',   en: 'Bathysphere', detail: 'a rigid collar ring that the rest of the set hangs from' },
    { suffix: 'quietdepth', ko: '고요심연', en: 'Quietdepth',  detail: 'the abyssal ceremonial line, and it emits no light at all' },
  ],
  con_tempora: [
    { suffix: 'escapement', ko: '탈진기',   en: 'Escapement',  detail: 'a ticking counterweight at the hip, set to the wearer cadence' },
    { suffix: 'mainspring', ko: '주태엽',   en: 'Mainspring',  detail: 'a coiled band across the back that visibly tensions with the stride' },
    { suffix: 'tickline',   ko: '초침선',   en: 'Tickline',    detail: 'sixty marks around the waist, one gone for every minute run' },
    { suffix: 'gearfall',   ko: '톱니낙하', en: 'Gearfall',    detail: 'brass teeth along the outer seam, decorative and stated to be so' },
    { suffix: 'hourhand',   ko: '시침',     en: 'Hourhand',    detail: 'one heavy dark line from the collar down the centre front' },
    { suffix: 'balance',    ko: '균형바퀴', en: 'Balance',     detail: 'symmetric to the millimetre, which no other Tempora line is' },
    { suffix: 'chime',      ko: '종소리',   en: 'Chime',       detail: 'small tuned plates that sound only above a certain cadence' },
    { suffix: 'ratchet',    ko: '래칫',     en: 'Ratchet',     detail: 'adjusts in fixed clicks and never smoothly' },
    { suffix: 'pendulum',   ko: '진자',     en: 'Pendulum',    detail: 'a weighted trailing hem that swings against the arm carriage' },
    { suffix: 'timeworn',   ko: '풍화',     en: 'Timeworn',    detail: 'issued already aged, and the wear pattern is the same on every copy' },
  ],
  con_origin: [
    { suffix: 'seamline',   ko: '이음선',   en: 'Seamline',    detail: 'the join runs where the worldline broke, not where the body bends' },
    { suffix: 'fracture',   ko: '균열',     en: 'Fracture',    detail: 'panels that do not quite meet, with dark showing through' },
    { suffix: 'worldline',  ko: '세계선',   en: 'Worldline',   detail: 'twelve threads, one per continent, running the full length' },
    { suffix: 'prism',      ko: '프리즘',   en: 'Prism',       detail: 'reads a different colour from each of three viewing angles' },
    { suffix: 'threadbare', ko: '해진',     en: 'Threadbare',  detail: 'deliberately worn through at the elbows and nowhere else' },
    { suffix: 'splitsecond',ko: '찰나',     en: 'Splitsecond', detail: 'an afterimage baked into the fabric a half stride behind' },
    { suffix: 'convergence',ko: '수렴',     en: 'Convergence', detail: 'every line on it points at a single spot over the heart' },
    { suffix: 'nullpoint',  ko: '영점',     en: 'Nullpoint',   detail: 'completely featureless, and the rarest thing Origin awards' },
    { suffix: 'echoform',   ko: '메아리꼴', en: 'Echoform',    detail: 'the silhouette repeats at reduced opacity behind the runner' },
    { suffix: 'riftwalk',   ko: '균열보',   en: 'Riftwalk',    detail: 'the Apex Axis line, and it cannot be earned anywhere else' },
  ],
});

/**
 * Per-slot garment nouns, used to name an individual piece within a set.
 *
 * A set called "Tideline" produces a Tideline Singlet and a Tideline Cap, not twelve rows
 * all called "Tideline". Two nouns per slot so that pieces from different sets in the same
 * slot do not all share one word.
 */
export const SLOT_GARMENTS = Object.freeze({
  hair:     [{ ko: '머리 손질', en: 'Cut' },        { ko: '묶음', en: 'Tie' }],
  headwear: [{ ko: '캡', en: 'Cap' },              { ko: '두건', en: 'Headwrap' }],
  face:     [{ ko: '페이스 마크', en: 'Face Mark' },{ ko: '버프', en: 'Buff' }],
  eyewear:  [{ ko: '고글', en: 'Goggles' },        { ko: '선글라스', en: 'Shades' }],
  ear:      [{ ko: '이어 커프', en: 'Ear Cuff' },  { ko: '이어밴드', en: 'Earband' }],
  neck:     [{ ko: '넥게이터', en: 'Gaiter' },     { ko: '펜던트', en: 'Pendant' }],
  top:      [{ ko: '싱글렛', en: 'Singlet' },      { ko: '롱슬리브', en: 'Long Sleeve' }],
  outer:    [{ ko: '셸', en: 'Shell' },            { ko: '베스트', en: 'Vest' }],
  arm:      [{ ko: '암슬리브', en: 'Arm Sleeve' }, { ko: '암랩', en: 'Arm Wrap' }],
  wrist:    [{ ko: '손목밴드', en: 'Wristband' },  { ko: '스플릿 밴드', en: 'Split Band' }],
  hand:     [{ ko: '글러브', en: 'Gloves' },       { ko: '미트', en: 'Mitts' }],
  waist:    [{ ko: '웨이스트 벨트', en: 'Belt' },  { ko: '플라스크 벨트', en: 'Flask Belt' }],
  bottom:   [{ ko: '쇼츠', en: 'Shorts' },         { ko: '하프 타이츠', en: 'Half Tights' }],
  leg:      [{ ko: '레그 슬리브', en: 'Leg Sleeve' }, { ko: '타이츠', en: 'Tights' }],
  socks:    [{ ko: '삭스', en: 'Socks' },          { ko: '크루삭스', en: 'Crew Socks' }],
  shoes:    [{ ko: '레이서', en: 'Racers' },       { ko: '트레이너', en: 'Trainers' }],
  back:     [{ ko: '베스트팩', en: 'Vest Pack' },  { ko: '넘버 빕', en: 'Race Bib' }],
  trail:    [{ ko: '트레일', en: 'Trail' },        { ko: '웨이크', en: 'Wake' }],
});

/**
 * Age-scoped slots.
 *
 * Almost every item fits all 24 base styles — that is the point of one shared rig. These
 * two are the honest exceptions: a set's `waist` flask belt and `back` vest pack are adult
 * race equipment and are not fitted to the child styles. Declaring the exception here, in
 * data, is what lets the validator prove the *other* 16 slots really do fit everyone
 * instead of taking "compatible with all" on trust.
 */
export const ADULT_ONLY_SLOTS = Object.freeze(['waist', 'back']);
