/**
 * Curated launch design table for the 12 continents of 에테르로드 (Aetherroad).
 *
 * This file is AUTHORED, not generated. It is the place where each continent earns its
 * right to exist: a distinct combat mechanic, palette, skyline, enemy behaviour, boss phase
 * graph, restoration arc and story beat. `tools/content-factory/build.mjs` expands it into
 * the canonical content JSON, and `tools/content-validator` fails the build if any two
 * continents, regions, stages or bosses collapse into the same signature.
 *
 * Direction lock DL-4: 12 continents, >= 8 region nodes and >= 6 main stages each,
 * >= 24 side stages overall, every one reachable at launch. Nothing here may be marked
 * "coming soon", disabled or debug-only.
 */

/** Stage objective archetypes. A continent must not repeat one twice in its main line. */
export const OBJECTIVE_TYPES = Object.freeze([
  'survival', 'escort', 'defense', 'elite_hunt', 'boss_break', 'resource_control', 'timed_assault',
]);

export const CONTINENTS = Object.freeze([
  {
    id: 'con_lumena', order: 1,
    name: { ko: '시작의 성도 루메나', en: 'Lumena, Citadel of First Light' },
    identity: { ko: '빛의 성도와 기계 성벽', en: 'A cathedral-city of light behind machine ramparts' },
    mechanic: { id: 'mech_light_reflection', ko: '방어막·빛 반사', en: 'Barrier and light reflection' },
    mechanic_rule: 'Reflect a telegraphed beam back into the barrier emitter to strip enemy shields.',
    relic_condition: 'while a reflected beam is active',
    palette: ['#F2E8C9', '#D9B25F', '#3B5BA5', '#FFFFFF'],
    skyline: 'stacked ivory ramparts with rotating mirror pylons',
    music_motif: 'processional choir over a slow brass ostinato',
    story_beat: { ko: '첫 세계축의 재가동', en: 'Restarting the first world axis' },
    regions: [
      { ko: '여명 성문', en: 'Dawnward Gate' }, { ko: '반사 회랑', en: 'Reflection Cloister' },
      { ko: '기계 성벽 상단', en: 'Rampart Crown' }, { ko: '등불 광장', en: 'Lanternfall Plaza' },
      { ko: '거울 종탑', en: 'Mirror Belfry' }, { ko: '축 관측소', en: 'Axis Observatory' },
      { ko: '침묵한 예배당', en: 'Hushed Chapel' }, { ko: '첫 축의 심부', en: 'Heart of the First Axis' },
    
      { ko: '서광 계단', en: 'Firstlight Stair' }, { ko: '프리즘 산책로', en: 'Prism Promenade' },
      { ko: '성벽 순환로', en: 'Rampart Circuit' }, { ko: '새벽종 길', en: 'Matins Way' },
      { ko: '굴절 정원', en: 'Refraction Garden' }, { ko: '등불지기 숙소', en: 'Lanternkeeper Quarters' },
      { ko: '은빛 수로', en: 'Silver Aqueduct' }, { ko: '첫 빛 전망대', en: 'First Light Overlook' },
    ],
    stages: [
      { objective: 'defense', twist: 'Hold three mirror pylons while the barrier recharges' },
      { objective: 'elite_hunt', twist: 'The elite only becomes vulnerable inside reflected light' },
      { objective: 'escort', twist: 'Guide a lantern-bearer whose light is the only damage source' },
      { objective: 'resource_control', twist: 'Capture prisms to redirect the beam grid' },
      { objective: 'timed_assault', twist: 'The gate seals when the rotating mirrors realign' },
      { objective: 'boss_break', twist: 'Break the shield by stacking three reflection angles' },
    ],
    side_stages: [
      { objective: 'survival', twist: 'Survive in shrinking lantern light' },
      { objective: 'timed_assault', twist: 'Beat the belfry chime across four courtyards' },
    ],
    enemies: [
      { ko: '성벽 자동기', en: 'Rampart Automaton', behaviour: 'raises a directional shield that only reflected light breaks' },
      { ko: '등불 잔영', en: 'Lantern Afterimage', behaviour: 'splits into dim copies that fade in direct light' },
    ],
    elite: { ko: '거울날 집행자', en: 'Mirrorblade Executor', behaviour: 'mirrors the player last used skill back at them' },
    boss: {
      ko: '첫 축의 수문장 아우렐', en: 'Aurel, Warden of the First Axis',
      phases: ['shield_lattice', 'reflected_judgement', 'axis_overload'],
      phase_rule: 'Each phase adds one more mirror the party must align before damage lands.',
    },
    restoration: ['relight_the_gate', 'restore_the_mirror_grid', 'reawaken_the_axis'],
    lore_sets: ['first_axis_records', 'lanternkeeper_letters', 'rampart_schematics'],
  },
  {
    id: 'con_verdia', order: 2,
    name: { ko: '숨결의 숲 베르디아', en: 'Verdia, Forest of Breath' },
    identity: { ko: '거대 식생과 생체 도시', en: 'A living city grown inside colossal flora' },
    mechanic: { id: 'mech_growth_bind', ko: '성장·속박·정화', en: 'Growth, binding and purification' },
    mechanic_rule: 'Roots grow each turn cycle: cleanse them to gain ground, ignore them and be bound.',
    relic_condition: 'while at least one root remains uncleansed',
    palette: ['#2F5D3A', '#8FCB6B', '#E7F0C9', '#5A3E2B'],
    skyline: 'cathedral canopies with bioluminescent vein-bridges',
    music_motif: 'breathing woodwinds over a heartbeat drum',
    story_beat: { ko: '잠든 생명의 회복', en: 'Reviving the sleeping life' },
    regions: [
      { ko: '뿌리 관문', en: 'Rootgate' }, { ko: '포자 습지', en: 'Sporefen' },
      { ko: '수관 다리', en: 'Canopy Span' }, { ko: '정화의 샘', en: 'Cleansing Spring' },
      { ko: '잠든 묘목원', en: 'Sleeping Nursery' }, { ko: '수액 정제소', en: 'Sap Refinery' },
      { ko: '속박의 덩굴굴', en: 'Bindvine Hollow' }, { ko: '숨결의 대수', en: 'Great Tree of Breath' },
    
      { ko: '이끼 계단길', en: 'Mosswalk Stair' }, { ko: '포자 시장', en: 'Sporemarket' },
      { ko: '뿌리 회랑', en: 'Root Colonnade' }, { ko: '수액 수로', en: 'Sapwater Channel' },
      { ko: '잎그늘 순환로', en: 'Leafshade Circuit' }, { ko: '밤빛 늪', en: 'Nightglow Marsh' },
      { ko: '씨앗 보관소', en: 'Seed Vault' }, { ko: '숨결 언덕', en: 'Breathwatch Rise' },
    ],
    stages: [
      { objective: 'resource_control', twist: 'Claim spring nodes to slow the root growth clock' },
      { objective: 'survival', twist: 'Binding roots convert every dodge into a cleanse window' },
      { objective: 'defense', twist: 'Protect saplings that convert cleansed roots into healing' },
      { objective: 'elite_hunt', twist: 'The elite regenerates unless its root anchor is purified first' },
      { objective: 'escort', twist: 'Carry spores that must be kept uncorrupted the whole route' },
      { objective: 'boss_break', twist: 'Purify three root crowns to open the break gauge' },
    ],
    side_stages: [
      { objective: 'timed_assault', twist: 'Outrun the bloom before the pollen closes the path' },
      { objective: 'resource_control', twist: 'Balance sap extraction against forest health' },
    ],
    enemies: [
      { ko: '덩굴 포박수', en: 'Bindvine Stalker', behaviour: 'roots the party in place until purified' },
      { ko: '포자 군체', en: 'Spore Colony', behaviour: 'multiplies every cycle it is left uncleansed' },
    ],
    elite: { ko: '부패한 수호목', en: 'Blighted Warden Tree', behaviour: 'heals from every uncleansed root on the field' },
    boss: {
      ko: '대수의 어머니 실바나', en: 'Silvana, Mother of the Great Tree',
      phases: ['creeping_bloom', 'binding_chorus', 'last_breath'],
      phase_rule: 'Each phase shortens the purification window while widening the bind radius.',
    },
    restoration: ['clear_the_blight', 'regrow_the_canopy', 'wake_the_great_tree'],
    lore_sets: ['seed_archive', 'canopy_songs', 'refinery_ledgers'],
  },
  {
    id: 'con_rubra', order: 3,
    name: { ko: '적맥 협곡 루브라', en: 'Rubra, Canyon of Red Veins' },
    identity: { ko: '붉은 협곡과 대용광로', en: 'A canyon threaded with the world great furnace' },
    mechanic: { id: 'mech_heat_shatter', ko: '열기 게이지·파쇄', en: 'Heat gauge and shatter' },
    mechanic_rule: 'Every action raises heat; venting at the right threshold shatters armour, overheating stuns you.',
    relic_condition: 'while the heat gauge sits above half',
    palette: ['#7A1F1F', '#E2611F', '#F2C14E', '#2B1A15'],
    skyline: 'basalt spires bleeding molten arteries',
    music_motif: 'anvil percussion under a low distorted drone',
    story_beat: { ko: '멈춘 심장의 재점화', en: 'Reigniting the stopped heart' },
    regions: [
      { ko: '적맥 입구', en: 'Redvein Mouth' }, { ko: '용광로 계단', en: 'Furnace Stair' },
      { ko: '재의 광장', en: 'Cinder Court' }, { ko: '균열 갱도', en: 'Fracture Shaft' },
      { ko: '단조 회랑', en: 'Forging Gallery' }, { ko: '식은 주형터', en: 'Cooled Castyard' },
      { ko: '증기 배출구', en: 'Ventway' }, { ko: '멈춘 심장부', en: 'The Stopped Heart' },
    
      { ko: '재의 하상', en: 'Ashbed Wash' }, { ko: '현무암 계단', en: 'Basalt Steps' },
      { ko: '열기 통로', en: 'Heatvent Run' }, { ko: '담금질 못', en: 'Quench Pool' },
      { ko: '붉은 협곡 다리', en: 'Redspan Bridge' }, { ko: '용광로 마을', en: 'Furnace Township' },
      { ko: '식은 용암밭', en: 'Cooled Flow Field' }, { ko: '불씨 전망대', en: 'Emberlook' },
    ],
    stages: [
      { objective: 'timed_assault', twist: 'Strike between vent cycles or lose the heat window' },
      { objective: 'boss_break', twist: 'Only a shatter at peak heat opens the break gauge' },
      { objective: 'defense', twist: 'Keep the furnace fed while enemies force overheat' },
      { objective: 'survival', twist: 'Heat rises passively; venting is the only safe rhythm' },
      { objective: 'resource_control', twist: 'Route molten flow between three casting basins' },
      { objective: 'elite_hunt', twist: 'The elite absorbs heat you fail to vent' },
    ],
    side_stages: [
      { objective: 'escort', twist: 'Move a cooling core through the hottest gallery' },
      { objective: 'survival', twist: 'Endure a full vent failure cascade' },
    ],
    enemies: [
      { ko: '용재 파쇄자', en: 'Slag Breaker', behaviour: 'armoured until shattered at high heat' },
      { ko: '불티 무리', en: 'Emberswarm', behaviour: 'accelerates the heat gauge on contact' },
    ],
    elite: { ko: '주형의 감독관', en: 'Castyard Overseer', behaviour: 'reforges its own armour unless shattered twice in one window' },
    boss: {
      ko: '심장로의 대장 이그니스', en: 'Ignis, Smith of the Heartforge',
      phases: ['stoking', 'white_heat', 'heart_reignition'],
      phase_rule: 'The safe vent window narrows each phase while shatter damage scales.',
    },
    restoration: ['clear_the_slag', 'restart_the_bellows', 'reignite_the_heart'],
    lore_sets: ['forge_tallies', 'ventkeeper_warnings', 'castyard_moulds'],
  },
  {
    id: 'con_anel', order: 4,
    name: { ko: '바람 평원 아넬', en: 'Anel, Plain of Winds' },
    identity: { ko: '부유 평원과 풍차 도시', en: 'Windmill towns adrift on a hovering plain' },
    mechanic: { id: 'mech_momentum_push', ko: '이동속도·밀쳐내기', en: 'Momentum and knockback' },
    mechanic_rule: 'Wind lanes grant speed but shove both sides; positioning beats raw damage.',
    relic_condition: 'while riding an active wind lane',
    palette: ['#BFD8E6', '#7FA650', '#E8E3D3', '#4A6C8C'],
    skyline: 'endless turning sails above a grass sea',
    music_motif: 'open fifths on strings with a rolling shaker pulse',
    story_beat: { ko: '흩어진 길의 연결', en: 'Rejoining the scattered roads' },
    regions: [
      { ko: '첫 바람목', en: 'Firstwind Post' }, { ko: '풍차 마을', en: 'Millhome' },
      { ko: '돌풍 회랑', en: 'Gust Corridor' }, { ko: '연 날리는 언덕', en: 'Kite Rise' },
      { ko: '끊긴 대로', en: 'Severed Highroad' }, { ko: '바람 저장고', en: 'Wind Granary' },
      { ko: '표류 정거장', en: 'Drift Station' }, { ko: '길잇는 첨탑', en: 'Roadbinder Spire' },
    
      { ko: '열두 풍차', en: 'Twelve Mills' }, { ko: '풀바다 오솔길', en: 'Grasssea Path' },
      { ko: '연 언덕', en: 'Kitewind Hill' }, { ko: '곡물 창고길', en: 'Granary Road' },
      { ko: '바람 갈림목', en: 'Windsplit Junction' }, { ko: '떠도는 다리', en: 'Drifting Span' },
      { ko: '방앗간 도랑', en: 'Millrace Ditch' }, { ko: '지평 관측소', en: 'Horizon Post' },
    ],
    stages: [
      { objective: 'escort', twist: 'A cart accelerates in wind lanes and must not overshoot' },
      { objective: 'resource_control', twist: 'Turn mills to redirect the lanes mid-fight' },
      { objective: 'timed_assault', twist: 'Chain wind lanes to reach the target before it lifts off' },
      { objective: 'survival', twist: 'Constant knockback makes standing still lethal' },
      { objective: 'defense', twist: 'Keep gusts off the rebuilt road segments' },
      { objective: 'boss_break', twist: 'Stagger the boss only by pushing it into a counter-gust' },
    ],
    side_stages: [
      { objective: 'elite_hunt', twist: 'The quarry flees along the fastest lane' },
      { objective: 'escort', twist: 'Two carts, opposite lanes, one party' },
    ],
    enemies: [
      { ko: '돌풍 기수', en: 'Gustrider', behaviour: 'charges only along an active wind lane' },
      { ko: '표류 파수병', en: 'Drift Sentinel', behaviour: 'knocks the party out of favourable lanes' },
    ],
    elite: { ko: '풍차 파괴자', en: 'Millbreaker', behaviour: 'destroys the mills that control the lanes' },
    boss: {
      ko: '길을 끊은 자 아넬로스', en: 'Anelos, the Road-Severer',
      phases: ['rising_gale', 'crossing_lanes', 'roadbinding'],
      phase_rule: 'Lanes reverse direction each phase, inverting safe positioning.',
    },
    restoration: ['raise_the_mills', 'relink_the_highroad', 'bind_the_roads'],
    lore_sets: ['millwright_notes', 'road_survey', 'kite_letters'],
  },
  {
    id: 'con_serene', order: 5,
    name: { ko: '별물결 해안 세레네', en: 'Serene, Coast of Starwaves' },
    identity: { ko: '별빛 해안과 수상 도시', en: 'A city on stilts beneath a mirrored night sea' },
    mechanic: { id: 'mech_tide_swap', ko: '파도 주기·위치 전환', en: 'Tide cycle and position swap' },
    mechanic_rule: 'The tide swaps arena halves on a fixed cycle; plan two positions ahead.',
    relic_condition: 'during the beat immediately after a tide swap',
    palette: ['#123B5C', '#3FA9C9', '#DCE9F2', '#F0C987'],
    skyline: 'lantern piers over a sky-reflecting sea',
    music_motif: 'tidal harp arpeggios with distant bell buoys',
    story_beat: { ko: '기억의 항로 복원', en: 'Restoring the sea road of memory' },
    regions: [
      { ko: '별빛 잔교', en: 'Starlight Pier' }, { ko: '조수 계단', en: 'Tidal Steps' },
      { ko: '수상 시장', en: 'Floating Market' }, { ko: '항로 부표', en: 'Searoad Buoys' },
      { ko: '가라앉은 등대', en: 'Sunken Lighthouse' }, { ko: '조개 골목', en: 'Shell Alley' },
      { ko: '기억의 해구', en: 'Memory Trench' }, { ko: '별물결 신전', en: 'Starwave Shrine' },
    
      { ko: '조수 산책로', en: 'Tidewalk' }, { ko: '등불 다리', en: 'Lantern Span' },
      { ko: '굴 양식장', en: 'Oyster Beds' }, { ko: '밤바다 계단', en: 'Nightsea Stair' },
      { ko: '별빛 반사장', en: 'Starmirror Flat' }, { ko: '어망 골목', en: 'Netmender Lane' },
      { ko: '해도 보관소', en: 'Chartroom' }, { ko: '파도 전망대', en: 'Wavewatch' },
    ],
    stages: [
      { objective: 'resource_control', twist: 'Hold buoys that survive only one tide phase' },
      { objective: 'survival', twist: 'The floor you stand on is submerged on the next swap' },
      { objective: 'escort', twist: 'A ferry crosses only during the low phase' },
      { objective: 'boss_break', twist: 'Break windows exist exclusively at tide reversal' },
      { objective: 'elite_hunt', twist: 'The elite teleports with the tide swap' },
      { objective: 'defense', twist: 'Protect the lighthouse through three full cycles' },
    ],
    side_stages: [
      { objective: 'timed_assault', twist: 'Clear the market between two tides' },
      { objective: 'survival', twist: 'Endure a doubled tide cadence' },
    ],
    enemies: [
      { ko: '조수 순찰자', en: 'Tidewatcher', behaviour: 'only attacks from the currently raised half' },
      { ko: '별빛 해파리', en: 'Starlight Medusa', behaviour: 'drifts to wherever the party will be after the swap' },
    ],
    elite: { ko: '난파 인양자', en: 'Wreck Salvager', behaviour: 'drags the party across the swap line' },
    boss: {
      ko: '항로를 삼킨 티델', en: 'Tidel, Devourer of the Sea Road',
      phases: ['ebb', 'crossing_tide', 'starwave_flood'],
      phase_rule: 'The swap interval halves each phase until two positions must be held at once.',
    },
    restoration: ['relight_the_lighthouse', 'mark_the_searoad', 'restore_the_shrine'],
    lore_sets: ['harbour_logs', 'buoy_charts', 'trench_echoes'],
  },
  {
    id: 'con_voltis', order: 6,
    name: { ko: '천뢰 제련도시 볼티스', en: 'Voltis, Thunderforge City' },
    identity: { ko: '전기 제련 도시', en: 'A smelting metropolis wired to captive lightning' },
    mechanic: { id: 'mech_conduction_chain', ko: '전도·연쇄·과부하', en: 'Conduction, chaining and overload' },
    mechanic_rule: 'Damage chains along conductive tiles; over-chaining overloads and stuns your own line.',
    relic_condition: 'while linked into a live conduction chain',
    palette: ['#1B2733', '#4FE0E8', '#C8B8FF', '#E8E45A'],
    skyline: 'transformer towers strung with arc-cables',
    music_motif: 'stuttering synth pulses over industrial clangs',
    story_beat: { ko: '에너지망 재구축', en: 'Rebuilding the energy lattice' },
    regions: [
      { ko: '변전 관문', en: 'Substation Gate' }, { ko: '아크 회랑', en: 'Arc Gallery' },
      { ko: '전도 격자', en: 'Conduction Grid' }, { ko: '축전 광장', en: 'Capacitor Square' },
      { ko: '과부하 구역', en: 'Overload Ward' }, { ko: '절연 골목', en: 'Insulator Row' },
      { ko: '뇌격 첨탑', en: 'Thunder Spire' }, { ko: '중앙 배전소', en: 'Central Exchange' },
    
      { ko: '변압기 골목', en: 'Transformer Row' }, { ko: '냉각탑 순환로', en: 'Coolant Circuit' },
      { ko: '전류 다리', en: 'Current Span' }, { ko: '제련 작업장', en: 'Smelting Floor' },
      { ko: '접지 마당', en: 'Earthing Yard' }, { ko: '케이블 육교', en: 'Cableway Bridge' },
      { ko: '계량실', en: 'Metering Hall' }, { ko: '방전 전망대', en: 'Discharge Overlook' },
    ],
    stages: [
      { objective: 'resource_control', twist: 'Own capacitors to decide which tiles conduct' },
      { objective: 'elite_hunt', twist: 'The elite is immune except while a chain passes through it' },
      { objective: 'timed_assault', twist: 'The grid discharges on a countdown you can advance' },
      { objective: 'defense', twist: 'Keep insulators intact or the chain hits your own line' },
      { objective: 'survival', twist: 'Every third chain overloads the field' },
      { objective: 'boss_break', twist: 'Break requires a chain of exactly four conductors' },
    ],
    side_stages: [
      { objective: 'resource_control', twist: 'Reroute power away from a failing ward' },
      { objective: 'elite_hunt', twist: 'Hunt inside a permanently overloaded grid' },
    ],
    enemies: [
      { ko: '전도 병기', en: 'Conductor Frame', behaviour: 'extends every chain by one tile' },
      { ko: '과부하 방전체', en: 'Overload Discharger', behaviour: 'detonates when a chain exceeds four links' },
    ],
    elite: { ko: '배전 감시자', en: 'Exchange Overseer', behaviour: 'reverses chain direction back into the party' },
    boss: {
      ko: '천뢰의 지배자 볼테아', en: 'Voltea, Sovereign of Thunder',
      phases: ['charging_grid', 'cascade', 'total_overload'],
      phase_rule: 'The chain length that breaks the boss also becomes the length that stuns the party.',
    },
    restoration: ['restore_the_substation', 'rewire_the_grid', 'stabilise_the_exchange'],
    lore_sets: ['grid_manifests', 'insulator_patents', 'arc_incident_logs'],
  },
  {
    id: 'con_hora', order: 7,
    name: { ko: '유리 사막 호라', en: 'Hora, the Glass Desert' },
    identity: { ko: '유리 사막과 거울 유적', en: 'Mirror ruins half-buried in vitrified sand' },
    mechanic: { id: 'mech_reflection_clone', ko: '반사·분신·시야', en: 'Reflection, clones and sightlines' },
    mechanic_rule: 'Enemies spawn clones; only the one casting a shadow is real.',
    relic_condition: 'while at least one of your reflections survives',
    palette: ['#E9D8A6', '#B9BFC9', '#8A6A4F', '#F7F3E8'],
    skyline: 'glass dunes throwing false horizons',
    music_motif: 'detuned glass harmonics over dry percussion',
    story_beat: { ko: '진짜 길 판별', en: 'Telling the true road from the false' },
    regions: [
      { ko: '유리 관문', en: 'Glass Threshold' }, { ko: '신기루 분지', en: 'Mirage Basin' },
      { ko: '거울 열주', en: 'Mirror Colonnade' }, { ko: '그림자 우물', en: 'Shadow Well' },
      { ko: '모래 시계탑', en: 'Sandglass Tower' }, { ko: '반사 미로', en: 'Reflection Maze' },
      { ko: '묻힌 대상로', en: 'Buried Caravan Road' }, { ko: '진실의 유적', en: 'Ruin of Truth' },
    
      { ko: '유리 평원', en: 'Glass Flats' }, { ko: '신기루 길', en: 'Mirage Road' },
      { ko: '모래시계 계곡', en: 'Hourglass Vale' }, { ko: '굴절 언덕', en: 'Refracted Dune' },
      { ko: '잊힌 우물', en: 'Forgotten Well' }, { ko: '대상 야영지', en: 'Caravan Camp' },
      { ko: '유리 첨탑', en: 'Glass Needle' }, { ko: '참된 지평', en: 'True Horizon' },
    ],
    stages: [
      { objective: 'elite_hunt', twist: 'Six identical elites, one shadow' },
      { objective: 'survival', twist: 'Clones inherit the damage you deal to the wrong target' },
      { objective: 'resource_control', twist: 'Occupy wells whose shadows expose the real enemies' },
      { objective: 'escort', twist: 'The guide is also duplicated; pick wrong and restart the leg' },
      { objective: 'timed_assault', twist: 'The mirage resets sightlines on a fixed beat' },
      { objective: 'boss_break', twist: 'Break only lands on the shadow-casting body' },
    ],
    side_stages: [
      { objective: 'survival', twist: 'No shadows at high noon' },
      { objective: 'defense', twist: 'Guard the true well among five false ones' },
    ],
    enemies: [
      { ko: '신기루 보행자', en: 'Mirage Walker', behaviour: 'spawns two clones on every hit taken' },
      { ko: '유리편 무리', en: 'Glassshard Flock', behaviour: 'reflects projectiles back along the sightline' },
    ],
    elite: { ko: '거울의 재판관', en: 'Judge of Mirrors', behaviour: 'swaps places with a clone whenever damaged' },
    boss: {
      ko: '진실을 가린 호라스', en: 'Horas, Veiler of Truth',
      phases: ['false_horizon', 'shattered_selves', 'unveiling'],
      phase_rule: 'Clone count rises each phase while the shadow tell grows shorter.',
    },
    restoration: ['clear_the_mirage', 'raise_the_sandglass', 'unveil_the_true_road'],
    lore_sets: ['caravan_manifests', 'mirror_glyphs', 'sandglass_measures'],
  },
  {
    id: 'con_nival', order: 8,
    name: { ko: '백빙 능선 니발', en: 'Nival, the White Ridge' },
    identity: { ko: '백빙 능선과 빙결 요새', en: 'A frozen fortress along an endless white ridge' },
    mechanic: { id: 'mech_freeze_timing', ko: '빙결 지대·파괴 타이밍', en: 'Freeze zones and break timing' },
    mechanic_rule: 'Frozen targets shatter for bonus damage, but only inside a two-beat window.',
    relic_condition: 'while a shatter window is open',
    palette: ['#DCEAF5', '#7FA8C9', '#2E4057', '#FFFFFF'],
    skyline: 'ice bastions under a permanent aurora',
    music_motif: 'sustained glass strings with a slow tolling bell',
    story_beat: { ko: '멈춘 시간 해빙', en: 'Thawing the halted hour' },
    regions: [
      { ko: '설벽 관문', en: 'Snowwall Gate' }, { ko: '빙결 성벽', en: 'Frozen Curtain' },
      { ko: '고드름 회랑', en: 'Icicle Gallery' }, { ko: '눈보라 안뜰', en: 'Blizzard Ward' },
      { ko: '얼어붙은 병영', en: 'Frozen Barracks' }, { ko: '해빙 온천', en: 'Thawing Springs' },
      { ko: '침묵의 빙하', en: 'Silent Glacier' }, { ko: '멈춘 시계 종루', en: 'Halted Belfry' },
    
      { ko: '눈보라 회랑', en: 'Snowdrift Colonnade' }, { ko: '얼음 다리', en: 'Icespan' },
      { ko: '극광 마당', en: 'Aurora Yard' }, { ko: '온천 계단', en: 'Hotspring Stair' },
      { ko: '서리 시장', en: 'Frostmarket' }, { ko: '설선 순환로', en: 'Snowline Circuit' },
      { ko: '침묵의 능선', en: 'Silent Ridgeway' }, { ko: '흰 전망대', en: 'Whitewatch' },
    ],
    stages: [
      { objective: 'boss_break', twist: 'Shatter windows open and close with the aurora pulse' },
      { objective: 'defense', twist: 'Thawed ground refreezes and traps your own line' },
      { objective: 'survival', twist: 'Standing still freezes the party in two beats' },
      { objective: 'resource_control', twist: 'Hold hot springs to keep shatter windows open' },
      { objective: 'escort', twist: 'A brazier must never be allowed to freeze' },
      { objective: 'elite_hunt', twist: 'The elite is invulnerable except while frozen' },
    ],
    side_stages: [
      { objective: 'timed_assault', twist: 'Race the refreeze across the glacier' },
      { objective: 'survival', twist: 'Whiteout removes every visual tell but the sound cue' },
    ],
    enemies: [
      { ko: '서리 파수병', en: 'Frost Sentry', behaviour: 'freezes the tile it dies on' },
      { ko: '빙하 포식자', en: 'Glacier Predator', behaviour: 'only staggers while frozen' },
    ],
    elite: { ko: '해빙 방해자', en: 'Thawbreaker', behaviour: 'refreezes any target about to be shattered' },
    boss: {
      ko: '멈춘 시간의 니발린', en: 'Nivalin of the Halted Hour',
      phases: ['first_frost', 'deep_freeze', 'thaw'],
      phase_rule: 'The shatter window shrinks from four beats to one across the fight.',
    },
    restoration: ['break_the_curtain', 'reopen_the_springs', 'thaw_the_belfry'],
    lore_sets: ['garrison_rolls', 'aurora_readings', 'glacier_core_samples'],
  },
  {
    id: 'con_kael', order: 9,
    name: { ko: '부유 군도 카엘', en: 'Kael, the Floating Archipelago' },
    identity: { ko: '부유 군도와 공중 항로', en: 'Sky-islands linked by fragile air routes' },
    mechanic: { id: 'mech_platform_fall', ko: '낙하 위험·플랫폼 이동', en: 'Fall risk and platform traversal' },
    mechanic_rule: 'Platforms drop out of the arena on a schedule; the fight is also the route.',
    relic_condition: 'while standing on higher ground than the target',
    palette: ['#9FD4E8', '#F2E2C4', '#5C8A72', '#3A4A6B'],
    skyline: 'islands trailing waterfalls into open sky',
    music_motif: 'airy pizzicato with rising harp glissandi',
    story_beat: { ko: '단절된 섬 결속', en: 'Binding the severed isles' },
    regions: [
      { ko: '계류장', en: 'Mooring Yard' }, { ko: '첫 도약대', en: 'First Leap' },
      { ko: '구름 다리', en: 'Cloudbridge' }, { ko: '낙하 협곡', en: 'Fallgap' },
      { ko: '풍력 승강장', en: 'Updraft Landing' }, { ko: '표류섬 시장', en: 'Driftisle Market' },
      { ko: '끊긴 항로', en: 'Severed Skyway' }, { ko: '군도의 심핵', en: 'Archipelago Core' },
    
      { ko: '밧줄 다리', en: 'Ropespan' }, { ko: '상승기류 계단', en: 'Updraft Stair' },
      { ko: '구름 정원', en: 'Cloud Garden' }, { ko: '폭포 가장자리', en: 'Fallsedge' },
      { ko: '부유섬 순환로', en: 'Driftisle Circuit' }, { ko: '계류탑', en: 'Mooring Tower' },
      { ko: '하늘시장 골목', en: 'Skymarket Lane' }, { ko: '열도 전망대', en: 'Archipelago Overlook' },
    ],
    stages: [
      { objective: 'timed_assault', twist: 'The arena shrinks island by island' },
      { objective: 'escort', twist: 'The escort cannot jump; you must build the bridge' },
      { objective: 'survival', twist: 'Only two platforms are ever safe at once' },
      { objective: 'resource_control', twist: 'Anchors stop islands from drifting apart' },
      { objective: 'elite_hunt', twist: 'The elite knocks targets off the edge instead of killing them' },
      { objective: 'boss_break', twist: 'Break the boss only from a higher island' },
    ],
    side_stages: [
      { objective: 'defense', twist: 'Hold the last bridge as the isles separate' },
      { objective: 'timed_assault', twist: 'Cross seven isles before the updraft dies' },
    ],
    enemies: [
      { ko: '항로 약탈자', en: 'Skyway Raider', behaviour: 'cuts the platform the party is standing on' },
      { ko: '상승기류 수호자', en: 'Updraft Guardian', behaviour: 'controls which islands remain reachable' },
    ],
    elite: { ko: '표류섬 파괴자', en: 'Driftisle Breaker', behaviour: 'destroys anchors to accelerate the collapse' },
    boss: {
      ko: '하늘을 가른 카엘루스', en: 'Kaelus, Sunderer of the Sky',
      phases: ['drifting_apart', 'collapsing_span', 'core_binding'],
      phase_rule: 'Each phase removes another island until only the core platform remains.',
    },
    restoration: ['anchor_the_isles', 'rebuild_the_skyway', 'bind_the_core'],
    lore_sets: ['mooring_registers', 'skyway_charts', 'driftisle_tales'],
  },
  {
    id: 'con_neris', order: 10,
    name: { ko: '심해 유적 네리스', en: 'Neris, the Abyssal Ruin' },
    identity: { ko: '심해 유적과 압력 도시', en: 'A pressure-city inside a drowned archive' },
    mechanic: { id: 'mech_pressure_vision', ko: '시야·압력·파동', en: 'Vision, pressure and wave pulses' },
    mechanic_rule: 'Pressure limits how long you can act; sonar pulses are the only way to see.',
    relic_condition: 'in the silence between two sonar pulses',
    palette: ['#0B2A3A', '#1F6F7A', '#7FD1C4', '#0A1418'],
    skyline: 'drowned colonnades lit by drifting bioluminescence',
    music_motif: 'submerged low drones punctuated by sonar pings',
    story_beat: { ko: '가라앉은 기록 인양', en: 'Raising the sunken record' },
    regions: [
      { ko: '수압 관문', en: 'Pressure Lock' }, { ko: '음파 회랑', en: 'Sonar Gallery' },
      { ko: '침몰 서고', en: 'Sunken Archive' }, { ko: '해구 계단', en: 'Trench Stair' },
      { ko: '발광 정원', en: 'Glowgarden' }, { ko: '압력 균열', en: 'Pressure Fracture' },
      { ko: '침묵의 종실', en: 'Silent Bellroom' }, { ko: '기록의 심부', en: 'Heart of Records' },
    
      { ko: '수압 계단', en: 'Pressure Stair' }, { ko: '잠긴 회랑', en: 'Flooded Colonnade' },
      { ko: '발광 정원길', en: 'Glowpath' }, { ko: '기록 서고', en: 'Record Stacks' },
      { ko: '해구 다리', en: 'Trench Span' }, { ko: '산호 골목', en: 'Coral Lane' },
      { ko: '침묵의 종탑길', en: 'Bellway' }, { ko: '심연 전망대', en: 'Abyss Overlook' },
    ],
    stages: [
      { objective: 'survival', twist: 'The pressure timer is the real health bar' },
      { objective: 'resource_control', twist: 'Hold vents that reset the pressure clock' },
      { objective: 'elite_hunt', twist: 'The elite is only visible during a sonar pulse' },
      { objective: 'escort', twist: 'The archive crate slows you and raises pressure' },
      { objective: 'defense', twist: 'Protect the sonar emitter or fight blind' },
      { objective: 'boss_break', twist: 'Break lands only on the pulse beat' },
    ],
    side_stages: [
      { objective: 'timed_assault', twist: 'One breath, one gallery' },
      { objective: 'survival', twist: 'The emitter is destroyed from the start' },
    ],
    enemies: [
      { ko: '압력 포식자', en: 'Pressure Feeder', behaviour: 'accelerates the pressure clock while nearby' },
      { ko: '음파 교란체', en: 'Sonar Jammer', behaviour: 'blanks the next pulse when ignored' },
    ],
    elite: { ko: '서고의 감시자', en: 'Archive Watcher', behaviour: 'moves only between pulses, never during them' },
    boss: {
      ko: '기록을 삼킨 네리아', en: 'Neria, Devourer of Records',
      phases: ['descent', 'crushing_dark', 'record_rising'],
      phase_rule: 'Pulse interval lengthens while pressure accelerates, forcing blind commitment.',
    },
    restoration: ['seal_the_fractures', 'restore_the_emitter', 'raise_the_records'],
    lore_sets: ['archive_indices', 'pressure_logs', 'glowgarden_studies'],
  },
  {
    id: 'con_tempora', order: 11,
    name: { ko: '시계 성채 템포라', en: 'Tempora, the Clockwork Bastion' },
    identity: { ko: '시계 성채', en: 'A fortress that runs on borrowed time' },
    mechanic: { id: 'mech_tempo_shift', ko: '속도 변화·턴 주기', en: 'Tempo shifts and turn cycles' },
    mechanic_rule: 'Zones speed up or slow down every actor inside them, including cooldowns.',
    relic_condition: 'inside a slowed tempo zone',
    palette: ['#3B2F4A', '#C9A227', '#E8E2D0', '#6E5A7A'],
    skyline: 'nested gear-towers with sweeping escapement arms',
    music_motif: 'metric-modulating clockwork ostinato',
    story_beat: { ko: '뒤틀린 순서 복원', en: 'Restoring the twisted order' },
    regions: [
      { ko: '태엽 관문', en: 'Mainspring Gate' }, { ko: '탈진기 회랑', en: 'Escapement Hall' },
      { ko: '분침 계단', en: 'Minute Stair' }, { ko: '역행 안뜰', en: 'Retrograde Court' },
      { ko: '진자 광장', en: 'Pendulum Plaza' }, { ko: '멈춘 공방', en: 'Stopped Workshop' },
      { ko: '시침 첨탑', en: 'Hour Spire' }, { ko: '순서의 중심', en: 'Core of Order' },
    
      { ko: '톱니 회랑', en: 'Gearwork Colonnade' }, { ko: '초침 계단', en: 'Second-hand Stair' },
      { ko: '태엽 마당', en: 'Winding Yard' }, { ko: '시계공 골목', en: 'Clockmaker Lane' },
      { ko: '균형추 다리', en: 'Counterweight Span' }, { ko: '정시 광장', en: 'On-the-hour Plaza' },
      { ko: '멈춘 시계탑', en: 'Halted Clocktower' }, { ko: '시간 전망대', en: 'Timewatch' },
    ],
    stages: [
      { objective: 'resource_control', twist: 'Own the zones that decide who acts twice' },
      { objective: 'boss_break', twist: 'The break gauge only fills in a slowed zone' },
      { objective: 'timed_assault', twist: 'Your cooldowns run at zone speed, not real time' },
      { objective: 'elite_hunt', twist: 'The elite always stands in the fastest zone' },
      { objective: 'survival', twist: 'Zones invert every cycle without warning' },
      { objective: 'defense', twist: 'The thing you defend ages at zone speed' },
    ],
    side_stages: [
      { objective: 'escort', twist: 'The escort moves at its own fixed tempo' },
      { objective: 'resource_control', twist: 'Three zones, one party, no overlap' },
    ],
    enemies: [
      { ko: '태엽 보병', en: 'Mainspring Infantry', behaviour: 'acts twice inside an accelerated zone' },
      { ko: '역행 감시자', en: 'Retrograde Watcher', behaviour: 'undoes the last action taken against it' },
    ],
    elite: { ko: '진자 처형자', en: 'Pendulum Executioner', behaviour: 'swaps the speed of two zones on every hit' },
    boss: {
      ko: '순서를 뒤튼 템포르', en: 'Tempor, Twister of Order',
      phases: ['winding', 'retrograde', 'restored_order'],
      phase_rule: 'Zone polarity flips faster each phase until acting early is a mistake.',
    },
    restoration: ['rewind_the_mainspring', 'align_the_escapement', 'restore_the_order'],
    lore_sets: ['escapement_diagrams', 'retrograde_testimony', 'clockwright_wills'],
  },
  {
    id: 'con_origin', order: 12,
    name: { ko: '세계선 균열 오리진', en: 'Origin, the Worldline Rift' },
    identity: { ko: '세계선 균열', en: 'The wound where all eleven worldlines meet' },
    mechanic: { id: 'mech_combined_rift', ko: '이전 11개 기믹 조합', en: 'Combination of the previous eleven mechanics' },
    mechanic_rule: 'Each encounter borrows two prior continent mechanics and forces them to interact.',
    relic_condition: 'while two borrowed mechanics are active at once',
    palette: ['#1A1030', '#8A5CF6', '#F2F0FF', '#2ED9C3'],
    skyline: 'fractured sky showing eleven other horizons at once',
    music_motif: 'every continent motif layered and phase-shifted',
    story_beat: { ko: '12개 파편 통합', en: 'Uniting the twelve shards' },
    regions: [
      { ko: '균열 입구', en: 'Rift Mouth' }, { ko: '중첩 회랑', en: 'Overlay Gallery' },
      { ko: '기억의 교차로', en: 'Memory Crossing' }, { ko: '파편 정원', en: 'Shard Garden' },
      { ko: '반향 광장', en: 'Echo Plaza' }, { ko: '무너진 세계선', en: 'Collapsed Worldline' },
      { ko: '통합 제단', en: 'Convergence Altar' }, { ko: '세계축의 끝', en: 'End of the World Axis' },
    
      { ko: '겹친 계단', en: 'Overlaid Stair' }, { ko: '열한 지평 회랑', en: 'Eleven Horizons Walk' },
      { ko: '파편 다리', en: 'Shardspan' }, { ko: '반향 골목', en: 'Echo Lane' },
      { ko: '무너진 광장', en: 'Collapsed Plaza' }, { ko: '경계 순환로', en: 'Boundary Circuit' },
      { ko: '최초의 길', en: 'The First Road' }, { ko: '세계선 전망대', en: 'Worldline Overlook' },
    ],
    stages: [
      { objective: 'boss_break', twist: 'Light reflection plus heat venting in one gauge' },
      { objective: 'survival', twist: 'Tide swaps inside a collapsing platform set' },
      { objective: 'resource_control', twist: 'Conduction chains routed through freeze zones' },
      { objective: 'elite_hunt', twist: 'Mirror clones that only act in accelerated zones' },
      { objective: 'escort', twist: 'A pressure-bound escort along wind lanes' },
      { objective: 'timed_assault', twist: 'Root growth counted in clockwork beats' },
    ],
    side_stages: [
      { objective: 'defense', twist: 'Defend against three continent mechanics at once' },
      { objective: 'survival', twist: 'All eleven mechanics, one minute each' },
    ],
    enemies: [
      { ko: '세계선 잔해', en: 'Worldline Remnant', behaviour: 'adopts the mechanic of the last continent visited' },
      { ko: '균열 포식자', en: 'Rift Devourer', behaviour: 'consumes a mechanic and turns it against the party' },
    ],
    elite: { ko: '중첩된 자아', en: 'Superposed Self', behaviour: 'copies the party own loadout and mechanics' },
    boss: {
      ko: '세계축의 파수 오리진', en: 'Origin, Keeper of the World Axis',
      phases: ['fracture', 'convergence', 'reunion'],
      phase_rule: 'Each phase fuses two more continent mechanics into a single solve.',
    },
    restoration: ['stabilise_the_rift', 'gather_the_shards', 'reunite_the_axis'],
    lore_sets: ['shard_catalogue', 'worldline_testimonies', 'convergence_rites'],
  },
]);

/** Four rotating world bosses. They roam across continents rather than living in one. */
export const WORLD_BOSSES = Object.freeze([
  {
    id: 'wb_stillfog_herald', name: { ko: '정지의 안개 전령', en: 'Herald of the Stilling Fog' },
    rotation_weeks: [1, 5, 9], mechanic_focus: ['mech_light_reflection', 'mech_pressure_vision'],
    phases: ['creeping_silence', 'fogfall', 'stillpoint'],
  },
  {
    id: 'wb_emberwake_colossus', name: { ko: '잿불 각성체', en: 'Emberwake Colossus' },
    rotation_weeks: [2, 6, 10], mechanic_focus: ['mech_heat_shatter', 'mech_conduction_chain'],
    phases: ['kindling', 'firestorm', 'cinder_collapse'],
  },
  {
    id: 'wb_tidebound_leviath', name: { ko: '조수에 묶인 레비아스', en: 'Tidebound Leviath' },
    rotation_weeks: [3, 7, 11], mechanic_focus: ['mech_tide_swap', 'mech_platform_fall'],
    phases: ['undertow', 'breaking_surf', 'deep_pull'],
  },
  {
    id: 'wb_hourless_regent', name: { ko: '시간 없는 섭정', en: 'The Hourless Regent' },
    rotation_weeks: [4, 8, 12], mechanic_focus: ['mech_tempo_shift', 'mech_reflection_clone'],
    phases: ['slow_hour', 'stolen_minute', 'no_hour'],
  },
]);

/** The single 1000 km endgame boss. DL-1: there is exactly one, and nothing after it. */
export const APEX_BOSS = Object.freeze({
  id: 'boss_apex_axis',
  name: { ko: '아펙스 액시스', en: 'Apex Axis' },
  unlock: { monthly_meters: 1_000_000, unlocks_per_user_month: 1 },
  phases: [
    'axis_awakening', 'twelvefold_trial', 'stillfog_convergence',
    'worldline_collapse', 'crown_of_the_runner',
  ],
  phase_rule: 'Every phase demands a different continent mechanic, ending with all twelve at once.',
  rewards: ['world_crown_title', 'apex_aura', 'profile_frame_crown', 'final_restoration_scene', 'permanent_codex_entry'],
});

/** Six challenge dungeon types shared across the world, each with its own rule. */
export const DUNGEON_TYPES = Object.freeze([
  { id: 'dgn_spire', rule: 'ascending floors, no healing between them' },
  { id: 'dgn_gauntlet', rule: 'fixed loadout chosen before entry' },
  { id: 'dgn_relay', rule: 'three characters, one health pool' },
  { id: 'dgn_siege', rule: 'defend while the objective moves' },
  { id: 'dgn_echo', rule: 'the arena replays your previous run as an enemy' },
  { id: 'dgn_convergence', rule: 'two continent mechanics chosen at random' },
]);

export const STORY_CHAPTERS = Object.freeze(CONTINENTS.map((c, i) => ({
  id: `chapter_${String(i + 1).padStart(2, '0')}_${c.id.replace('con_', '')}`,
  order: i + 1,
  continent_id: c.id,
  title: c.story_beat,
  // Non-linear: every chapter is understandable on its own and yields one of the 12 shards.
  shard_id: `shard_${String(i + 1).padStart(2, '0')}`,
  requires_previous_chapter: false,
})));

/**
 * Running courses.
 *
 * A region carries twelve courses: four distances crossed with three shapes. The distances
 * grow with the region's position in its continent, so the first region of a continent
 * offers a 1 km loop and the sixteenth offers a marathon — the world gets longer as you
 * travel it, rather than every region offering the same menu under a different name.
 *
 * DL-3 governs what a course may be. Surface is one of road, track, treadmill or indoor,
 * and nothing else. There is no elevation field: elevation is inert sensor metadata
 * elsewhere in the product and must never become a course property that rewards anything.
 */
export const COURSE_SHAPES = Object.freeze([
  { id: 'loop', ko: '순환', en: 'Loop', note: 'starts and finishes at the same point' },
  { id: 'out_and_back', ko: '왕복', en: 'Out and Back', note: 'turns at halfway' },
  { id: 'point_to_point', ko: '편도', en: 'Point to Point', note: 'finishes somewhere else' },
]);

/**
 * Four distances per region, indexed by the region's order within its continent.
 *
 * Whole metres throughout, with one exception: 42_195 is the marathon, and it is exact
 * for the same reason the Monthly Apex checkpoint is — a runner who covers the distance
 * should meet the number that names it, not a rounded neighbour.
 */
export const REGION_COURSE_DISTANCES = Object.freeze([
  [ 1_000,  2_000,  3_000,  5_000],
  [ 1_000,  2_000,  4_000,  6_000],
  [ 2_000,  3_000,  5_000,  8_000],
  [ 2_000,  4_000,  6_000, 10_000],
  [ 3_000,  5_000,  8_000, 10_000],
  [ 3_000,  5_000, 10_000, 12_000],
  [ 5_000,  8_000, 12_000, 15_000],
  [ 5_000, 10_000, 15_000, 20_000],
  [ 8_000, 12_000, 16_000, 21_000],
  [10_000, 15_000, 20_000, 25_000],
  [10_000, 16_000, 24_000, 30_000],
  [12_000, 20_000, 28_000, 32_000],
  [15_000, 21_000, 30_000, 35_000],
  [15_000, 25_000, 35_000, 42_195],
  [20_000, 30_000, 40_000, 45_000],
  [25_000, 35_000, 42_195, 50_000],
]);

/**
 * The surface a course runs on.
 *
 * A point-to-point course has to actually go somewhere, which a treadmill and a track do
 * not, so those are always road. Everything else takes the continent's own surface.
 */
export function courseSurface(shapeId, continentSurface) {
  return shapeId === 'point_to_point' ? 'road' : continentSurface;
}
