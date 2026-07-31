/**
 * Curated launch design table for the 12 continents of 에테르로드 (Aetherroad).
 *
 * This file is AUTHORED, not generated. It is the place where each continent earns its
 * right to exist: a distinct thing the road asks of a runner, a palette, a skyline, rival
 * crews who race it differently, a champion with a race plan, a restoration arc and a
 * story beat. `tools/content-factory/build.mjs` expands it into the canonical content
 * JSON, and `tools/content-validator` fails the build if any two continents, regions,
 * races or champions collapse into the same signature.
 *
 * RunningUp is a running race, not a combat game. There are no enemies here, no health,
 * no damage and no weapons: a rival is another runner, a champion is the fastest runner
 * on the continent, and the only thing that decides a race is how the field runs it.
 * `packages/domain/race.mjs` is the engine those words describe, and
 * `tools/direction-lock/scan.mjs` fails the build if combat vocabulary returns.
 *
 * Direction lock DL-4: 12 continents, >= 16 region nodes and >= 6 main races each,
 * >= 24 challenge races overall, every one reachable at launch. Nothing here may be marked
 * "coming soon", disabled or debug-only.
 */

/**
 * Race formats for a continent's main line. A continent must not repeat one twice.
 *
 * A format decides how the field is started and scored, never how fast anyone is: fitness
 * comes from the verified run ledger and nothing else (DL-5).
 */
export const RACE_FORMATS = Object.freeze([
  'time_trial', 'mass_start', 'handicap', 'pursuit', 'championship', 'relay', 'ladder',
]);

export const CONTINENTS = Object.freeze([
  {
    id: 'con_lumena', order: 1,
    name: { ko: '시작의 성도 루메나', en: 'Lumena, Citadel of First Light' },
    identity: { ko: '빛의 성도와 기계 성벽', en: 'A cathedral-city of light behind machine ramparts' },
    // The trait ids mirror packages/domain/race.mjs CONTINENT_COURSES: the prose here and
    // the numbers there describe the same road, and the race tests assert the id sets match.
    race_trait: { id: 'trait_even_effort', ko: '균등 페이스', en: 'Even effort' },
    trait_rule: 'Wide processional avenues and long straights: the runner who holds one pace end to end is paid for it, and every correction costs more than it saves.',
    gear_condition: 'while the last two splits are within a second of each other',
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
    races: [
      { format: 'mass_start', twist: 'The whole field starts together on the widest avenue and nobody may be paced' },
      { format: 'pursuit', twist: 'The leader is released first and every metre of the gap must be closed on feel' },
      { format: 'relay', twist: 'Three legs handed over at the mirror pylons, and a dropped handover restarts the leg' },
      { format: 'ladder', twist: 'Four repetitions down the same straight, each one shorter and required to be quicker' },
      { format: 'time_trial', twist: 'One runner on the road at a time, no field to read and no pace to sit behind' },
      { format: 'championship', twist: 'The continent champion enters the field and takes the inside line at the bell' },
    ],
    challenges: [
      { format: 'fmt_even_pace', twist: 'Every split must land inside a two-second band or the run is void' },
      { format: 'fmt_progressive', twist: 'Each split has to be faster than the one before it, from the first metre' },
    ],
    rivals: [
      { ko: '성벽 페이스단', en: 'Rampart Pace Crew', tactic: 'sets a metronomic tempo from the gun and refuses to let it drift' },
      { ko: '등불 순환주자', en: 'Lantern Loop Runners', tactic: 'splits the lead between four runners so the front never tires' },
    ],
    elite_rival: { ko: '거울날 선두주자', en: 'Mirrorblade Frontrunner', tactic: 'copies whatever pace the player sets and holds it a half-second quicker' },
    champion: {
      ko: '첫 축의 수문장 아우렐', en: 'Aurel, Warden of the First Axis',
      race_plan: ['measured_opening', 'unbroken_middle', 'long_drive_home'],
      plan_rule: 'Every leg is run at the same effort, so beating her means being even for longer than she is.',
    },
    restoration: ['relight_the_gate', 'restore_the_mirror_grid', 'reawaken_the_axis'],
    lore_sets: ['first_axis_records', 'lanternkeeper_letters', 'rampart_schematics'],
  },
  {
    id: 'con_verdia', order: 2,
    name: { ko: '숨결의 숲 베르디아', en: 'Verdia, Forest of Breath' },
    identity: { ko: '거대 식생과 생체 도시', en: 'A living city grown inside colossal flora' },
    race_trait: { id: 'trait_soft_footing', ko: '무른 노면', en: 'Soft footing' },
    trait_rule: 'Canopy boardwalk and root-laced loam give a little under every footfall, so the same pace costs more here than anywhere else and the cost is paid the whole way.',
    gear_condition: 'while running on the yielding boardwalk sections',
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
    races: [
      { format: 'handicap', twist: 'Start positions are set by last month verified volume, so the fittest chases' },
      { format: 'time_trial', twist: 'The clock runs on loam that takes a fraction back from every stride' },
      { format: 'relay', twist: 'Legs are handed over at the springs, and the crew total is the only result' },
      { format: 'pursuit', twist: 'The quarry picks the softest line and the chaser has to accept it or lose ground' },
      { format: 'ladder', twist: 'Five repetitions with the recovery shortening rather than the repetition' },
      { format: 'championship', twist: 'The champion starts on the firm inside boardwalk and everyone else on loam' },
    ],
    challenges: [
      { format: 'fmt_progressive', twist: 'The surface softens leg by leg while the required pace tightens' },
      { format: 'fmt_pack_run', twist: 'The crew records the time of its last runner across the line, nobody else' },
    ],
    rivals: [
      { ko: '뿌리길 주자단', en: 'Rootway Runners', tactic: 'runs the firm outside line and accepts the extra distance for the footing' },
      { ko: '포자 지구력조', en: 'Spore Endurance Squad', tactic: 'starts slower than everyone and reels the field in over the last third' },
    ],
    elite_rival: { ko: '대수의 장거리주자', en: 'Great Tree Distance Runner', tactic: 'never changes gear, so the soft ground costs her less than it costs the field' },
    champion: {
      ko: '대수의 어머니 실바나', en: 'Silvana, Mother of the Great Tree',
      race_plan: ['patient_start', 'grinding_third_quarter', 'unhurried_finish'],
      plan_rule: 'She wins on the ground that punishes fading, so the runner who spends early never sees her again.',
    },
    restoration: ['clear_the_blight', 'regrow_the_canopy', 'wake_the_great_tree'],
    lore_sets: ['seed_archive', 'canopy_songs', 'refinery_ledgers'],
  },
  {
    id: 'con_rubra', order: 3,
    name: { ko: '적맥 협곡 루브라', en: 'Rubra, Canyon of Red Veins' },
    identity: { ko: '붉은 협곡과 대용광로', en: 'A canyon threaded with the world great furnace' },
    race_trait: { id: 'trait_late_heat', ko: '후반 열부하', en: 'Late heat load' },
    trait_rule: 'Radiant furnace heat builds along the canyon road and only bites in the back half, so a comfortable first half is exactly how this course is lost.',
    gear_condition: 'once the field has passed the halfway vent',
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
    races: [
      { format: 'ladder', twist: 'Repetitions run outward from the cool mouth toward the hottest gallery' },
      { format: 'championship', twist: 'The champion is handed the shaded line and the field runs the radiant side' },
      { format: 'mass_start', twist: 'The gun goes at the coolest hour and the heat arrives with the second half' },
      { format: 'time_trial', twist: 'Departure slots are ten minutes apart, so no two runners meet the same heat' },
      { format: 'handicap', twist: 'The head start is measured in degrees, not seconds: hotter starters leave first' },
      { format: 'pursuit', twist: 'The chaser sets off once the leader reaches the vent, with the worst of it ahead' },
    ],
    challenges: [
      { format: 'fmt_negative_split', twist: 'The second half must be quicker on the half that is twice as hot' },
      { format: 'fmt_blind_pace', twist: 'No watch and no split calls, on the one road where fading is invisible until late' },
    ],
    rivals: [
      { ko: '용재 지구력단', en: 'Slagfield Endurance Crew', tactic: 'holds a deliberately modest first half and spends everything after the vent' },
      { ko: '불티 선두조', en: 'Emberline Frontrunners', tactic: 'takes the race out fast and dares the field to follow into the heat' },
    ],
    elite_rival: { ko: '주형의 감독관', en: 'Castyard Overseer', tactic: 'reads the heat better than anyone and changes gear exactly once, at the vent' },
    champion: {
      ko: '심장로의 대장 이그니스', en: 'Ignis, Smith of the Heartforge',
      race_plan: ['cool_opening', 'vent_surge', 'furnace_finish'],
      plan_rule: 'He gives the first half away and takes it all back where the road is hottest.',
    },
    restoration: ['clear_the_slag', 'restart_the_bellows', 'reignite_the_heart'],
    lore_sets: ['forge_tallies', 'ventkeeper_warnings', 'castyard_moulds'],
  },
  {
    id: 'con_anel', order: 4,
    name: { ko: '바람 평원 아넬', en: 'Anel, Plain of Winds' },
    identity: { ko: '부유 평원과 풍차 도시', en: 'Windmill towns adrift on a hovering plain' },
    race_trait: { id: 'trait_alternating_wind', ko: '맞바람·뒷바람 교대', en: 'Alternating wind' },
    trait_rule: 'The highroad turns through a standing wind, so a headwind section is always followed by a tailwind one and effort spent fighting the first is never returned by the second.',
    gear_condition: 'while running into the headwind leg',
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
    races: [
      { format: 'relay', twist: 'Handovers land at the turns, so one crew member always draws the headwind legs' },
      { format: 'handicap', twist: 'Starting order is drawn so the slowest runner gets the tailwind opening' },
      { format: 'ladder', twist: 'Out into the wind and back with it, four times, and only the outbound half counts' },
      { format: 'time_trial', twist: 'A single loop that meets the wind from all four sides in turn' },
      { format: 'mass_start', twist: 'Shelter at the front of the pack is finite and openly contested' },
      { format: 'championship', twist: 'The champion is required to lead every headwind section unshielded' },
    ],
    challenges: [
      { format: 'fmt_even_pace', twist: 'Effort must stay level while the wind does not, so the pace cannot' },
      { format: 'fmt_last_runner', twist: 'The runner at the back of the pack at each mill leaves the course' },
    ],
    rivals: [
      { ko: '돌풍 선두조', en: 'Gustline Leaders', tactic: 'attacks on the tailwind sections and shelters through the headwind' },
      { ko: '표류 순환주자', en: 'Driftway Circuit Crew', tactic: 'rotates the lead every mill so no runner takes two headwinds in a row' },
    ],
    elite_rival: { ko: '풍차길 추격자', en: 'Millway Chaser', tactic: 'sits exactly one stride behind the leader for the whole headwind and comes past at the turn' },
    champion: {
      ko: '길을 끊은 자 아넬로스', en: 'Anelos, the Road-Severer',
      race_plan: ['sheltered_opening', 'exposed_middle', 'tailwind_kick'],
      plan_rule: 'He spends nothing until the wind is behind him, and the field is already committed by then.',
    },
    restoration: ['raise_the_mills', 'relink_the_highroad', 'bind_the_roads'],
    lore_sets: ['millwright_notes', 'road_survey', 'kite_letters'],
  },
  {
    id: 'con_serene', order: 5,
    name: { ko: '별물결 해안 세레네', en: 'Serene, Coast of Starwaves' },
    identity: { ko: '별빛 해안과 수상 도시', en: 'A city on stilts beneath a mirrored night sea' },
    race_trait: { id: 'trait_forced_surge', ko: '중반 강제 서지', en: 'Forced mid-race surge' },
    trait_rule: 'A single-file span crosses the middle of every route here, so the field is forced into one hard surge to reach it in position and whoever has nothing left for it runs the rest alone.',
    gear_condition: 'during the surge onto the narrow span',
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
    races: [
      { format: 'handicap', twist: 'Head starts are sized so the whole field arrives at the span together' },
      { format: 'time_trial', twist: 'The span is empty, so the surge is against nobody and has to be self-imposed' },
      { format: 'relay', twist: 'Every leg change happens on the pier, and the span is always someone second half' },
      { format: 'championship', twist: 'The champion enters the span first by right and the width does the rest' },
      { format: 'pursuit', twist: 'The gap has to be closed before the span or it cannot be closed at all' },
      { format: 'mass_start', twist: 'Eight runners, one span, and the order onto it is decided in the surge' },
    ],
    challenges: [
      { format: 'fmt_progressive', twist: 'Each pier section faster than the last, with the span in the middle of them' },
      { format: 'fmt_negative_split', twist: 'The surge sits in the first half and the second half still has to be quicker' },
    ],
    rivals: [
      { ko: '잔교 선착조', en: 'Pierhead Crew', tactic: 'sprints for the span from the gun and defends the front of the queue' },
      { ko: '부표 항로주자', en: 'Buoyline Runners', tactic: 'concedes the span and races the whole second half from the back' },
    ],
    elite_rival: { ko: '난파 인양 주자', en: 'Salvage Runner', tactic: 'times the surge later than anyone and arrives at the span at full speed' },
    champion: {
      ko: '항로를 삼킨 티델', en: 'Tidel, Devourer of the Sea Road',
      race_plan: ['drifting_opening', 'span_surge', 'held_lead'],
      plan_rule: 'One surge decides her race, and she never makes a second one.',
    },
    restoration: ['relight_the_lighthouse', 'mark_the_searoad', 'restore_the_shrine'],
    lore_sets: ['harbour_logs', 'buoy_charts', 'trench_echoes'],
  },
  {
    id: 'con_voltis', order: 6,
    name: { ko: '천뢰 제련도시 볼티스', en: 'Voltis, Thunderforge City' },
    identity: { ko: '전기 제련 도시', en: 'A smelting metropolis wired to captive lightning' },
    race_trait: { id: 'trait_tight_corners', ko: '급코너 연속', en: 'Tight corners' },
    trait_rule: 'The substation circuit turns constantly and indoors, so a long stride is repeatedly broken and re-found, and cadence matters more here than raw speed.',
    gear_condition: 'while holding the inside line through a corner',
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
    races: [
      { format: 'handicap', twist: 'Head starts are paid back in corners rather than seconds' },
      { format: 'pursuit', twist: 'The quarry disappears round every bend, so the gap is run on memory' },
      { format: 'ladder', twist: 'Each repetition adds one more corner to the same total distance' },
      { format: 'mass_start', twist: 'Eight abreast into a corner wide enough for three, and no contact allowed' },
      { format: 'time_trial', twist: 'The clock rewards the tightest line, which is also the roughest surface' },
      { format: 'championship', twist: 'The champion holds the inside for the first lap and must give it up for the last' },
    ],
    challenges: [
      { format: 'fmt_last_runner', twist: 'The back of the field leaves at every capacitor lap' },
      { format: 'fmt_pack_run', twist: 'The crew has to exit every corner together or the lap does not count' },
    ],
    rivals: [
      { ko: '변전 회로조', en: 'Substation Circuit Crew', tactic: 'shortens its stride before every bend and re-accelerates out of it' },
      { ko: '방전 추격조', en: 'Discharge Chasers', tactic: 'gives up ground on the straights to take the inside line into each corner' },
    ],
    elite_rival: { ko: '배전 감시자', en: 'Exchange Overseer', tactic: 'never loses cadence through a turn, so the field pays for corners that cost him nothing' },
    champion: {
      ko: '천뢰의 지배자 볼테아', en: 'Voltea, Sovereign of Thunder',
      race_plan: ['cadence_setting', 'corner_by_corner', 'straight_release'],
      plan_rule: 'She turns better than she runs, so the only place to beat her is the last straight.',
    },
    restoration: ['restore_the_substation', 'rewire_the_grid', 'stabilise_the_exchange'],
    lore_sets: ['grid_manifests', 'insulator_patents', 'arc_incident_logs'],
  },
  {
    id: 'con_hora', order: 7,
    name: { ko: '유리 사막 호라', en: 'Hora, the Glass Desert' },
    identity: { ko: '유리 사막과 거울 유적', en: 'Mirror ruins half-buried in vitrified sand' },
    race_trait: { id: 'trait_blind_pacing', ko: '페이스 판단 교란', en: 'Unreliable pace judgement' },
    trait_rule: 'False horizons across the glass flats make distance impossible to read, so a runner who paces by feel arrives early or late and only a disciplined plan survives.',
    gear_condition: 'while running with no reliable horizon in sight',
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
    races: [
      { format: 'pursuit', twist: 'The runner ahead may be a reflection, and chasing the wrong one costs the race' },
      { format: 'time_trial', twist: 'No distance markers exist, so the plan has to be written before the start' },
      { format: 'handicap', twist: 'Nobody is told the size of the head start they were given' },
      { format: 'relay', twist: 'Handover points are found by counting strides, not by seeing them' },
      { format: 'ladder', twist: 'Repetitions are called by time while the distance stays unknown' },
      { format: 'championship', twist: 'The champion knows the true line across the basin and does not share it' },
    ],
    challenges: [
      { format: 'fmt_blind_pace', twist: 'No watch on the one course where nothing else tells the truth either' },
      { format: 'fmt_even_pace', twist: 'Splits are graded afterwards, so evenness has to be believed rather than seen' },
    ],
    rivals: [
      { ko: '신기루 보행단', en: 'Mirage Walkers', tactic: 'runs entirely to a written schedule and ignores every runner around it' },
      { ko: '유리편 대상조', en: 'Glassshard Caravan', tactic: 'follows the true road it has memorised even when it looks longer' },
    ],
    elite_rival: { ko: '거울의 판별자', en: 'Judge of Mirrors', tactic: 'reads the real horizon off the shadows and never misjudges a distance' },
    champion: {
      ko: '진실을 가린 호라스', en: 'Horas, Veiler of Truth',
      race_plan: ['written_schedule', 'ignored_field', 'exact_arrival'],
      plan_rule: 'He runs the plan and not the race, and the plan is always correct.',
    },
    restoration: ['clear_the_mirage', 'raise_the_sandglass', 'unveil_the_true_road'],
    lore_sets: ['caravan_manifests', 'mirror_glyphs', 'sandglass_measures'],
  },
  {
    id: 'con_nival', order: 8,
    name: { ko: '백빙 능선 니발', en: 'Nival, the White Ridge' },
    identity: { ko: '백빙 능선과 빙결 요새', en: 'A frozen fortress along an endless white ridge' },
    race_trait: { id: 'trait_slow_opening', ko: '느린 초반', en: 'Slow opening' },
    trait_rule: 'Cold muscle and a hard indoor floor make the opening splits slower than they feel, so a runner who trusts the sensation of effort has already lost time before warming into the race.',
    gear_condition: 'during the opening splits before the field has warmed',
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
    races: [
      { format: 'championship', twist: 'The champion is allowed a warm-up and the rest of the field is not' },
      { format: 'mass_start', twist: 'Everyone goes off cold together and the first kilometre is a trap for all eight' },
      { format: 'time_trial', twist: 'The opening split is thrown away and only what follows is timed' },
      { format: 'handicap', twist: 'Head starts are given to whoever warms up slowest, measured beforehand' },
      { format: 'relay', twist: 'Every leg starts cold, so each handover repeats the same opening problem' },
      { format: 'pursuit', twist: 'The chaser starts warm and the leader started cold, and both know it' },
    ],
    challenges: [
      { format: 'fmt_progressive', twist: 'Each split faster than the last, beginning from a genuinely cold start' },
      { format: 'fmt_blind_pace', twist: 'Nothing to run to but feel, on the course where feel lies the most early' },
    ],
    rivals: [
      { ko: '서리 개막조', en: 'Frostline Openers', tactic: 'deliberately over-paces the first split to break through the cold early' },
      { ko: '빙하 후반조', en: 'Glacier Closers', tactic: 'accepts a slow opening without panic and runs the last third hardest' },
    ],
    elite_rival: { ko: '해빙 조절자', en: 'Thaw Regulator', tactic: 'holds an exact effort while cold, so she loses nothing to the opening the field loses' },
    champion: {
      ko: '멈춘 시간의 니발린', en: 'Nivalin of the Halted Hour',
      race_plan: ['cold_patience', 'warming_build', 'final_release'],
      plan_rule: 'She never fights the opening, which is why she is still there when everyone else has.',
    },
    restoration: ['break_the_curtain', 'reopen_the_springs', 'thaw_the_belfry'],
    lore_sets: ['garrison_rolls', 'aurora_readings', 'glacier_core_samples'],
  },
  {
    id: 'con_kael', order: 9,
    name: { ko: '부유 군도 카엘', en: 'Kael, the Floating Archipelago' },
    identity: { ko: '부유 군도와 공중 항로', en: 'Sky-islands linked by fragile air routes' },
    race_trait: { id: 'trait_negative_split', ko: '네거티브 스플릿', en: 'Negative split' },
    trait_rule: 'The sky-island oval is measured and still, and a second half run faster than the first is worth double here, so restraint at the start is the whole tactic.',
    gear_condition: 'while the second half is running quicker than the first',
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
    races: [
      { format: 'ladder', twist: 'Each repetition is required to be quicker than the one before or the set is void' },
      { format: 'relay', twist: 'Every leg is scored on its own second half, not on the crew total' },
      { format: 'time_trial', twist: 'The halfway split is published live and the second half is graded against it' },
      { format: 'handicap', twist: 'The head start is refunded to whoever runs the truest negative split' },
      { format: 'pursuit', twist: 'The leader is released slowly and only a faster finish ever closes it' },
      { format: 'championship', twist: 'The champion states her halfway target aloud and the field may match it' },
    ],
    challenges: [
      { format: 'fmt_pack_run', twist: 'The crew has to negative split together, measured on the last runner' },
      { format: 'fmt_negative_split', twist: 'The margin required grows with every lap of the oval' },
    ],
    rivals: [
      { ko: '항로 후반조', en: 'Skyway Closers', tactic: 'starts three seconds a lap slower than it finishes, every single race' },
      { ko: '상승기류 순환조', en: 'Updraft Circuit Crew', tactic: 'runs the first half in the pack and the second half alone at the front' },
    ],
    elite_rival: { ko: '표류섬 후반주자', en: 'Driftisle Closer', tactic: 'gives away more of the first half than looks survivable and always takes it back' },
    champion: {
      ko: '하늘을 가른 카엘루스', en: 'Kaelus, Sunderer of the Sky',
      race_plan: ['held_back_opening', 'measured_build', 'fastest_last_lap'],
      plan_rule: 'His last lap is his fastest, always, and the field has to survive to see it.',
    },
    restoration: ['anchor_the_isles', 'rebuild_the_skyway', 'bind_the_core'],
    lore_sets: ['mooring_registers', 'skyway_charts', 'driftisle_tales'],
  },
  {
    id: 'con_neris', order: 10,
    name: { ko: '심해 유적 네리스', en: 'Neris, the Abyssal Ruin' },
    identity: { ko: '심해 유적과 압력 도시', en: 'A pressure-city inside a drowned archive' },
    race_trait: { id: 'trait_pack_draft', ko: '집단 주행', en: 'Pack draft' },
    trait_rule: 'The pressure galleries hold air dense enough to feel, so running in a group is measurably cheaper than running alone and a runner who breaks clear early pays for the privilege.',
    gear_condition: 'while running inside the pack rather than off the front',
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
    races: [
      { format: 'time_trial', twist: 'Alone in the dense air, with nobody to share the front of it' },
      { format: 'handicap', twist: 'Head starts are set so the field converges into one pack by halfway' },
      { format: 'pursuit', twist: 'A lone leader against a pack that is cheaper to run in than to escape' },
      { format: 'relay', twist: 'Two runners share every leg and both times are recorded' },
      { format: 'mass_start', twist: 'Eight in one gallery, and whoever leads longest finishes worst' },
      { format: 'championship', twist: 'The champion is barred from the pack and must run the whole way clear of it' },
    ],
    challenges: [
      { format: 'fmt_last_runner', twist: 'Leaving the pack ends the run, so the back of it is the only safe place' },
      { format: 'fmt_blind_pace', twist: 'Sonar only, no clock, and the pack is the only reference left' },
    ],
    rivals: [
      { ko: '압력 집단조', en: 'Pressure Pack', tactic: 'never leads and never leaves, and finishes as one line of runners' },
      { ko: '음파 교대조', en: 'Sonar Rotation Crew', tactic: 'rotates the front runner every gallery so the cost is shared exactly' },
    ],
    elite_rival: { ko: '서고의 감시자', en: 'Archive Watcher', tactic: 'sits at the back of the pack all race and only shows herself in the last gallery' },
    champion: {
      ko: '기록을 삼킨 네리아', en: 'Neria, Devourer of Records',
      race_plan: ['pack_entry', 'shared_front', 'solo_departure'],
      plan_rule: 'She takes everything the pack gives and leaves it exactly one gallery from the finish.',
    },
    restoration: ['seal_the_fractures', 'restore_the_emitter', 'raise_the_records'],
    lore_sets: ['archive_indices', 'pressure_logs', 'glowgarden_studies'],
  },
  {
    id: 'con_tempora', order: 11,
    name: { ko: '시계 성채 템포라', en: 'Tempora, the Clockwork Bastion' },
    identity: { ko: '시계 성채', en: 'A fortress that runs on borrowed time' },
    race_trait: { id: 'trait_exact_pace', ko: '정밀 페이스', en: 'Exact pace' },
    trait_rule: 'Calibrated belts in the escapement hall hold the surface perfectly constant, so nothing is gifted and nothing is stolen: the result is exactly the pace the runner was able to hold.',
    gear_condition: 'while the belt speed is held without a single correction',
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
    races: [
      { format: 'handicap', twist: 'Belt speeds are set individually and never adjusted once the race begins' },
      { format: 'championship', twist: 'The champion belt is set to her exact season average and left there' },
      { format: 'ladder', twist: 'The belt steps up one notch per repetition and never steps back down' },
      { format: 'pursuit', twist: 'Two belts, one gap, and the only variable left is who can hold on' },
      { format: 'time_trial', twist: 'A published target pace, a belt that holds it, and no excuses available' },
      { format: 'mass_start', twist: 'Eight belts at one identical speed until the first runner steps off' },
    ],
    challenges: [
      { format: 'fmt_even_pace', twist: 'The belt makes evenness free, so the tolerance is a tenth of a second' },
      { format: 'fmt_progressive', twist: 'Every notch is announced in advance and none of them may be refused' },
    ],
    rivals: [
      { ko: '태엽 정속조', en: 'Mainspring Metronomes', tactic: 'sets a pace it can hold for the full distance and holds exactly that' },
      { ko: '역행 계측조', en: 'Retrograde Timekeepers', tactic: 'runs to a published target and treats every other runner as irrelevant' },
    ],
    elite_rival: { ko: '진자 정밀주자', en: 'Pendulum Precision Runner', tactic: 'holds a chosen pace to the tenth of a second for as long as the race lasts' },
    champion: {
      ko: '순서를 뒤튼 템포르', en: 'Tempor, Twister of Order',
      race_plan: ['declared_target', 'unvarying_belt', 'exact_finish'],
      plan_rule: 'He announces the time he intends to run and then runs it, so the only way past is to be genuinely faster.',
    },
    restoration: ['rewind_the_mainspring', 'align_the_escapement', 'restore_the_order'],
    lore_sets: ['escapement_diagrams', 'retrograde_testimony', 'clockwright_wills'],
  },
  {
    id: 'con_origin', order: 12,
    name: { ko: '세계선 균열 오리진', en: 'Origin, the Worldline Rift' },
    identity: { ko: '세계선 균열', en: 'The wound where all eleven worldlines meet' },
    race_trait: { id: 'trait_championship_composite', ko: '종합 챔피언십', en: 'Championship composite' },
    trait_rule: 'The worldline championship track gathers every earlier road into one lap each, so a runner meets the wind, the heat, the corners and the surge in a single race and nothing may be avoided twice.',
    gear_condition: 'while two borrowed course traits are in play at once',
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
    races: [
      { format: 'championship', twist: 'All eleven continent champions are in the field at once and none of them is pacing' },
      { format: 'time_trial', twist: 'Eleven laps, each borrowing a different continent road, one attempt at the set' },
      { format: 'handicap', twist: 'Head starts are computed from every continent result the runner has recorded' },
      { format: 'pursuit', twist: 'The gap is set on the wind lap and has to be closed on the heat lap' },
      { format: 'relay', twist: 'Each leg is a different borrowed road and no crew member may repeat one' },
      { format: 'ladder', twist: 'Eleven repetitions, one per worldline, and the last is the shortest and hardest' },
    ],
    challenges: [
      { format: 'fmt_pack_run', twist: 'The crew crosses eleven different roads and has to finish every one together' },
      { format: 'fmt_last_runner', twist: 'One runner leaves the course per worldline until a single runner remains' },
    ],
    rivals: [
      { ko: '세계선 종합조', en: 'Worldline All-Rounders', tactic: 'adopts whichever tactic the current lap rewards and abandons it at the boundary' },
      { ko: '균열 순환조', en: 'Rift Circuit Crew', tactic: 'runs one continent style per lap in a fixed rotation, whatever the field does' },
    ],
    elite_rival: { ko: '중첩된 자아', en: 'Superposed Self', tactic: 'mirrors the player own race plan lap for lap and finishes a stride ahead of it' },
    champion: {
      ko: '세계축의 파수 오리진', en: 'Origin, Keeper of the World Axis',
      race_plan: ['eleven_road_opening', 'convergence_middle', 'reunion_finish'],
      plan_rule: 'Every lap he is the second best runner on that road, and across eleven of them that is first.',
    },
    restoration: ['stabilise_the_rift', 'gather_the_shards', 'reunite_the_axis'],
    lore_sets: ['shard_catalogue', 'worldline_testimonies', 'convergence_rites'],
  },
]);

/**
 * Four rotating open race events. They move across continents rather than living in one,
 * so a runner meets them wherever they are that month.
 */
export const OPEN_RACE_EVENTS = Object.freeze([
  {
    id: 'orv_stillfog_mile', name: { ko: '정지의 안개 마일', en: 'The Stilling Fog Mile' },
    rotation_weeks: [1, 5, 9], trait_focus: ['trait_even_effort', 'trait_pack_draft'],
    race_plan: ['silent_opening', 'fogfall_middle', 'stillpoint_finish'],
  },
  {
    id: 'orv_emberwake_ten', name: { ko: '잿불 10K', en: 'Emberwake Ten' },
    rotation_weeks: [2, 6, 10], trait_focus: ['trait_late_heat', 'trait_tight_corners'],
    race_plan: ['kindling_opening', 'firestorm_middle', 'cinder_finish'],
  },
  {
    id: 'orv_tidebound_half', name: { ko: '조수 하프', en: 'Tidebound Half' },
    rotation_weeks: [3, 7, 11], trait_focus: ['trait_forced_surge', 'trait_negative_split'],
    race_plan: ['undertow_opening', 'breaking_surf_middle', 'deep_pull_finish'],
  },
  {
    id: 'orv_hourless_marathon', name: { ko: '시간 없는 마라톤', en: 'The Hourless Marathon' },
    rotation_weeks: [4, 8, 12], trait_focus: ['trait_exact_pace', 'trait_blind_pacing'],
    race_plan: ['slow_hour_opening', 'stolen_minute_middle', 'no_hour_finish'],
  },
]);

/**
 * The single 1000 km endgame race. DL-1: there is exactly one, and nothing after it.
 *
 * It is a race, not a fight — five legs across the world axis, one entry per user-month,
 * and the reward for finishing it is the World Crown and the closing restoration scene.
 */
export const APEX_RACE = Object.freeze({
  id: 'race_apex_axis',
  name: { ko: '아펙스 액시스', en: 'Apex Axis' },
  unlock: { monthly_meters: 1_000_000, unlocks_per_user_month: 1 },
  legs: [
    'axis_awakening', 'twelvefold_trial', 'stillfog_convergence',
    'worldline_collapse', 'crown_of_the_runner',
  ],
  leg_rule: 'Every leg is run on a different continent road, ending with all twelve in one lap.',
  rewards: ['world_crown_title', 'apex_aura', 'profile_frame_crown', 'final_restoration_scene', 'permanent_codex_entry'],
});

/** Six challenge race formats shared across the world, each with its own rule. */
export const CHALLENGE_FORMATS = Object.freeze([
  { id: 'fmt_even_pace', rule: 'every split must land inside a published tolerance band' },
  { id: 'fmt_negative_split', rule: 'the second half has to be faster than the first' },
  { id: 'fmt_progressive', rule: 'each split has to be faster than the split before it' },
  { id: 'fmt_pack_run', rule: 'the crew is scored on its last runner across the line' },
  { id: 'fmt_last_runner', rule: 'the runner at the back leaves the course each lap' },
  { id: 'fmt_blind_pace', rule: 'no watch and no split calls until the finish' },
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
