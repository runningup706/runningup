/**
 * Curated launch roster — 12 playable runners.
 *
 * AUTHORED, not generated. Every runner shares the same Fitness Core budget earned by the
 * user's real running, and converts it differently. That conversion rule, the default race
 * signature, the four race techniques, the three specializations and the personal episodes
 * are what make a runner a runner rather than a recolour.
 *
 * There are no weapons, no attacks and no combat kits here. A runner's kit is what they
 * race in and a technique is a way of spending one effort budget across a race — never a
 * way of adding to it. `packages/domain/race.mjs` is the engine these words describe.
 *
 * Direction lock DL-4 / master # 7.4 / # 9.3:
 *   - 12 playable, all visible and trial-playable on launch day
 *   - >= 8 distinct running roles across the roster
 *   - deliberate diversity of body proportion, gender presentation, skin tone and age
 *   - no paid gacha: every runner is earned through world progress or achievements
 *   - `duplicate_similarity` is asserted by the validator, not by good intentions
 */

/**
 * The eight running roles. These are exactly the role ids `packages/domain/race.mjs`
 * converts into a cruise/stamina/kick shape, and they all spend one identical budget:
 * a role that holds pace better gives up finishing speed to do it.
 */
export const ROLES = Object.freeze([
  'vanguard', 'burst', 'sustained', 'control', 'counter', 'support', 'surger', 'grinder',
]);

export const CHARACTERS = Object.freeze([
  {
    id: 'chr_seon', order: 1,
    name: { ko: '선', en: 'Seon' },
    role: 'vanguard', secondary_role: 'counter',
    continent_affinity: 'con_lumena',
    presentation: { body: 'tall broad', gender: 'woman', skin: 'deep', age: 'late thirties' },
    silhouette: 'high shoulders, half-cape torn at the hem, race number pinned square',
    race_kit: 'rigid plated road shoes and a weighted pacing band',
    core_conversion: 'Endurance and Vitality convert into a higher sustainable cruise rather than a finishing sprint.',
    race_signature: 'goes to the front from the gun and makes the field come to her',
    technique_open: { id: 'tec_seon_bulwark', name: { ko: '성벽 페이스', en: 'Bulwark Pace' }, effect: 'locks the opening pace and refuses to let the field raise it' },
    technique_mid: { id: 'tec_seon_riposte', name: { ko: '되받아치기', en: 'Riposte' }, effect: 'answers a rival surge within one split instead of letting the gap open' },
    technique_habit: { id: 'tec_seon_unbroken', name: { ko: '무너지지 않음', en: 'Unbroken' }, effect: 'holds the same effort through the split where the field usually fades' },
    technique_finish: { id: 'tec_seon_dawnwall', name: { ko: '여명의 벽', en: 'Dawnwall' }, effect: 'lifts the pace with a lap still to run and holds it to the line' },
    specializations: ['front_running', 'even_effort', 'surge_answering'],
    episodes: ['the_gate_she_held', 'what_the_light_cost', 'first_axis_vigil'],
    unlock_path: 'starter_selectable',
  },
  {
    id: 'chr_yuwon', order: 2,
    name: { ko: '유원', en: 'Yuwon' },
    role: 'burst', secondary_role: 'surger',
    continent_affinity: 'con_voltis',
    presentation: { body: 'lean wiry', gender: 'man', skin: 'light', age: 'early twenties' },
    silhouette: 'asymmetric singlet, cable-wrapped forearm, spikes slung at the hip',
    core_conversion: 'Speed converts into repeatable short accelerations instead of a higher cruise.',
    race_kit: 'featherweight track spikes and a lap-count wristband',
    race_signature: 'sits calm for most of the race and changes gear without warning',
    technique_open: { id: 'tec_yuwon_arcline', name: { ko: '아크 라인', en: 'Arcline' }, effect: 'takes the shortest line through every early corner to bank distance' },
    technique_mid: { id: 'tec_yuwon_relay', name: { ko: '전도 릴레이', en: 'Conductor Relay' }, effect: 'trades the lead with a crewmate so neither of them leads twice in a row' },
    technique_habit: { id: 'tec_yuwon_capacitor', name: { ko: '축전', en: 'Capacitance' }, effect: 'every split run under target banks into the strength of his last one' },
    technique_finish: { id: 'tec_yuwon_overload', name: { ko: '과부하 스퍼트', en: 'Total Overload' }, effect: 'spends everything banked in a single closing sprint' },
    specializations: ['gear_changes', 'corner_lines', 'finish_banking'],
    episodes: ['the_boy_who_wired_the_dark', 'grid_debt', 'what_the_spire_remembers'],
    unlock_path: 'starter_selectable',
  },
  {
    id: 'chr_hana', order: 3,
    name: { ko: '하나', en: 'Hana' },
    role: 'sustained', secondary_role: 'support',
    continent_affinity: 'con_verdia',
    presentation: { body: 'average', gender: 'woman', skin: 'medium', age: 'mid twenties' },
    silhouette: 'layered botanist wind shell, seed satchel, worn trail-free road flats',
    core_conversion: 'Vitality converts into a pace that decays less over distance rather than into a faster opening.',
    race_kit: 'cushioned long-distance flats and a hand-written split card',
    race_signature: 'runs the whole race at one effort and is still holding it when others are not',
    technique_open: { id: 'tec_hana_bloom', name: { ko: '개화', en: 'Bloom' }, effect: 'starts a full second per kilometre under target and grows into it' },
    technique_mid: { id: 'tec_hana_clear', name: { ko: '정리', en: 'Clear Ground' }, effect: 'moves off the softest line early so the back half is run on firm footing' },
    technique_habit: { id: 'tec_hana_rooted', name: { ko: '뿌리내림', en: 'Rooted' }, effect: 'never varies cadence, so soft ground costs her less than it costs the field' },
    technique_finish: { id: 'tec_hana_greatbreath', name: { ko: '대수의 숨결', en: 'Great Breath' }, effect: 'closes at the pace she opened with, which by then is the fastest on the road' },
    specializations: ['pace_decay_resistance', 'line_choice', 'long_distance'],
    episodes: ['the_seed_she_kept', 'a_forest_that_forgot', 'breath_returned'],
    unlock_path: 'story_chapter_02',
  },
  {
    id: 'chr_dorin', order: 4,
    name: { ko: '도린', en: 'Dorin' },
    role: 'control', secondary_role: 'burst',
    continent_affinity: 'con_rubra',
    presentation: { body: 'stocky heavy', gender: 'man', skin: 'tan', age: 'fifties' },
    silhouette: 'smith apron traded for a vest, one mechanical shoulder, heavy-heeled gait',
    core_conversion: 'Tempo converts into heat tolerance headroom instead of raw turnover.',
    race_kit: 'ventilated heat-race singlet and a forearm split chart',
    race_signature: 'reads the road temperature and decides the race at one chosen point',
    technique_open: { id: 'tec_dorin_vent', name: { ko: '배출 구간', en: 'Vent Section' }, effect: 'runs the opening deliberately under pace to keep something for the hot half' },
    technique_mid: { id: 'tec_dorin_quench', name: { ko: '담금질', en: 'Quench' }, effect: 'takes one full split at recovery effort and gives back less than it looks' },
    technique_habit: { id: 'tec_dorin_temper', name: { ko: '단련', en: 'Temper' }, effect: 'the hotter the second half is, the less of his pace it takes' },
    technique_finish: { id: 'tec_dorin_heartforge', name: { ko: '심장로', en: 'Heartforge' }, effect: 'attacks at the hottest point of the course rather than the last' },
    specializations: ['heat_tolerance', 'attack_timing', 'pace_reserve'],
    episodes: ['the_fire_he_banked', 'apprentice_debt', 'the_heart_relit'],
    unlock_path: 'story_chapter_03',
  },
  {
    id: 'chr_ari', order: 5,
    name: { ko: '아리', en: 'Ari' },
    role: 'counter', secondary_role: 'vanguard',
    continent_affinity: 'con_anel',
    presentation: { body: 'slight agile', gender: 'non-binary', skin: 'olive', age: 'late teens' },
    silhouette: 'kite-cloth vest, wrapped shins, weightless upright carriage',
    core_conversion: 'Pacing converts into shelter economy: the same effort buys more when run behind someone.',
    race_kit: 'wind-cut racing vest and thin road shoes with no plate',
    race_signature: 'shelters until the wind turns and comes past on the first tailwind metre',
    technique_open: { id: 'tec_ari_slipstream', name: { ko: '기류 타기', en: 'Slipstream' }, effect: 'holds a stride off the leader through every exposed section' },
    technique_mid: { id: 'tec_ari_crosswind', name: { ko: '맞바람 넘기기', en: 'Crosswind' }, effect: 'forces a rival to lead into the wind by refusing to come through' },
    technique_habit: { id: 'tec_ari_momentum', name: { ko: '가속', en: 'Momentum' }, effect: 'every uninterrupted kilometre raises what the closing move is worth' },
    technique_finish: { id: 'tec_ari_roadbind', name: { ko: '길 잇기', en: 'Roadbind' }, effect: 'goes at the last turn out of the wind and never leads before it' },
    specializations: ['drafting', 'wind_reading', 'late_attack'],
    episodes: ['the_road_that_broke', 'a_kite_for_the_lost', 'roads_rejoined'],
    unlock_path: 'story_chapter_04',
  },
  {
    id: 'chr_mirae', order: 6,
    name: { ko: '미래', en: 'Mirae' },
    role: 'support', secondary_role: 'control',
    continent_affinity: 'con_serene',
    presentation: { body: 'tall slender', gender: 'woman', skin: 'light', age: 'early thirties' },
    silhouette: 'tide-charts sewn into a long shell, lantern buoy clipped at the hip',
    core_conversion: 'Momentum converts into crew positioning rather than into her own finishing speed.',
    race_kit: 'all-weather crew shell and a printed course profile',
    race_signature: 'puts her crew where the race is about to be decided before it is',
    technique_open: { id: 'tec_mirae_ebb', name: { ko: '썰물', en: 'Ebb' }, effect: 'moves the crew to the front of the field before the narrow section' },
    technique_mid: { id: 'tec_mirae_signal', name: { ko: '신호등', en: 'Signal' }, effect: 'calls the surge one split before it is needed so nobody is caught cold' },
    technique_habit: { id: 'tec_mirae_navigator', name: { ko: '항해사', en: 'Navigator' }, effect: 'the crew never loses ground at a bottleneck she has read in advance' },
    technique_finish: { id: 'tec_mirae_searoad', name: { ko: '항로 복원', en: 'Searoad Restored' }, effect: 'leads the crew out at a pace they can all hold to the line' },
    specializations: ['crew_positioning', 'bottleneck_reading', 'surge_calling'],
    episodes: ['the_light_she_carried', 'charts_of_the_drowned', 'the_road_home'],
    unlock_path: 'story_chapter_05',
  },
  {
    id: 'chr_taeho', order: 7,
    name: { ko: '태호', en: 'Taeho' },
    role: 'grinder', secondary_role: 'sustained',
    continent_affinity: 'con_nival',
    presentation: { body: 'broad solid', gender: 'man', skin: 'medium', age: 'forties' },
    silhouette: 'fur-lined warm-up over a plain vest, slow deliberate turnover',
    core_conversion: 'Resolve converts into the length of time a pace can be held, never into how fast it is.',
    race_kit: 'insulated cold-start layers and blunt-lugged winter road shoes',
    race_signature: 'accepts a slow opening without panic and is unchanged forty minutes later',
    technique_open: { id: 'tec_taeho_bastion', name: { ko: '빙벽 개시', en: 'Ice Bastion Start' }, effect: 'gives away the cold opening splits on purpose rather than forcing them' },
    technique_mid: { id: 'tec_taeho_thaw', name: { ko: '해빙', en: 'Thaw' }, effect: 'lifts to target pace only once the field has stopped getting faster' },
    technique_habit: { id: 'tec_taeho_garrison', name: { ko: '수비대', en: 'Garrison' }, effect: 'the longer the race runs, the smaller his pace loss becomes relative to the field' },
    technique_finish: { id: 'tec_taeho_whitewall', name: { ko: '백빙 마무리', en: 'Whitewall' }, effect: 'finishes at the pace he has run all day and passes whoever has slowed' },
    specializations: ['cold_starts', 'ultra_distance', 'fade_resistance'],
    episodes: ['the_watch_he_kept', 'names_on_the_wall', 'the_hour_thawed'],
    unlock_path: 'story_chapter_08',
  },
  {
    id: 'chr_soye', order: 8,
    name: { ko: '소예', en: 'Soye' },
    role: 'surger', secondary_role: 'control',
    continent_affinity: 'con_hora',
    presentation: { body: 'petite', gender: 'woman', skin: 'deep', age: 'sixties' },
    silhouette: 'desert veil over a race vest, mirror-shard bracelets, short quick cadence',
    core_conversion: 'Speed converts into how many mid-race accelerations she can make rather than how fast one is.',
    race_kit: 'sun-shell race vest and low-stack desert road shoes',
    race_signature: 'attacks repeatedly in the middle of the race until somebody fails to follow',
    technique_open: { id: 'tec_soye_split', name: { ko: '분할', en: 'Split the Field' }, effect: 'makes an early move purely to see who is willing to respond' },
    technique_mid: { id: 'tec_soye_shadowtell', name: { ko: '그림자 판별', en: 'Shadowtell' }, effect: 'reads real distance off the shadows where the horizon cannot be trusted' },
    technique_habit: { id: 'tec_soye_manyselves', name: { ko: '여럿의 나', en: 'Many Selves' }, effect: 'each acceleration costs her less than the one before it' },
    technique_finish: { id: 'tec_soye_truemirror', name: { ko: '참된 거울', en: 'True Mirror' }, effect: 'makes a final move at the exact point the course stops lying about distance' },
    specializations: ['repeated_surges', 'distance_judgement', 'field_selection'],
    episodes: ['the_woman_of_many_roads', 'what_the_glass_kept', 'the_true_path'],
    unlock_path: 'story_chapter_07',
  },
  {
    id: 'chr_jiwoo', order: 9,
    name: { ko: '지우', en: 'Jiwoo' },
    role: 'burst', secondary_role: 'counter',
    continent_affinity: 'con_kael',
    presentation: { body: 'athletic compact', gender: 'man', skin: 'light', age: 'late twenties' },
    silhouette: 'harness-strapped race vest, one bare shoulder, always mid-motion',
    core_conversion: 'Endurance converts into how late the closing sprint can be started, not into cruise pace.',
    race_kit: 'oval racing spikes and a bare-minimum split watch',
    race_signature: 'holds position all race and produces one very late, very fast lap',
    technique_open: { id: 'tec_jiwoo_grapple', name: { ko: '따라붙기', en: 'Grapple On' }, effect: 'takes whatever position the leaders open with and refuses to lose it' },
    technique_mid: { id: 'tec_jiwoo_anchor', name: { ko: '고정', en: 'Anchor' }, effect: 'covers one rival move per lap and makes no move of his own' },
    technique_habit: { id: 'tec_jiwoo_highground', name: { ko: '고지', en: 'High Ground' }, effect: 'the later the sprint begins, the more of it he still has' },
    technique_finish: { id: 'tec_jiwoo_skyfall', name: { ko: '하늘 낙하', en: 'Skyfall' }, effect: 'a single closing sprint from the last two hundred metres' },
    specializations: ['closing_sprint', 'position_holding', 'move_covering'],
    episodes: ['the_isles_he_left', 'anchor_and_rope', 'sky_rejoined'],
    unlock_path: 'story_chapter_09',
  },
  {
    id: 'chr_narae', order: 10,
    name: { ko: '나래', en: 'Narae' },
    role: 'control', secondary_role: 'support',
    continent_affinity: 'con_neris',
    presentation: { body: 'average', gender: 'non-binary', skin: 'medium', age: 'mid thirties' },
    silhouette: 'compression suit with a collar mic, deliberate slow-building gait',
    core_conversion: 'Tempo converts into how often the pack can rotate its front runner without losing speed.',
    race_kit: 'humidity-shedding pack suit and a shared-cadence collar metronome',
    race_signature: 'organises whoever is around them into a working group and shares the front',
    technique_open: { id: 'tec_narae_pulse', name: { ko: '박자 신호', en: 'Cadence Pulse' }, effect: 'sets a cadence the whole pack can hold and calls it out loud' },
    technique_mid: { id: 'tec_narae_tether', name: { ko: '연결선', en: 'Tether' }, effect: 'pairs a struggling runner with a stronger one so neither drops' },
    technique_habit: { id: 'tec_narae_deeplung', name: { ko: '심폐', en: 'Deep Lung' }, effect: 'every runner near them spends slightly less to hold the same pace' },
    technique_finish: { id: 'tec_narae_recordrise', name: { ko: '기록 인양', en: 'Records Rising' }, effect: 'breaks the pack open one section from the finish, having led least of anyone' },
    specializations: ['pack_work', 'front_rotation', 'group_economy'],
    episodes: ['what_the_deep_kept', 'a_tether_for_two', 'the_archive_surfaces'],
    unlock_path: 'story_chapter_10',
  },
  {
    id: 'chr_eunseo', order: 11,
    name: { ko: '은서', en: 'Eunseo' },
    role: 'sustained', secondary_role: 'grinder',
    continent_affinity: 'con_tempora',
    presentation: { body: 'tall lean', gender: 'woman', skin: 'pale', age: 'ageless clockwork-marked' },
    silhouette: 'escapement brace on the left forearm, pendulum at the belt, metronomic walk',
    core_conversion: 'Pacing converts into precision: the gap between her target pace and her actual pace.',
    race_kit: 'calibrated belt shoes and a pendulum cadence weight',
    race_signature: 'declares the time she intends to run and then runs exactly that',
    technique_open: { id: 'tec_eunseo_slowzone', name: { ko: '감속 구간', en: 'Slow Section' }, effect: 'runs the first section a published amount under target and never more' },
    technique_mid: { id: 'tec_eunseo_retrograde', name: { ko: '역행 보정', en: 'Retrograde Correction' }, effect: 'gives back exactly the time a split ran fast, rather than keeping it' },
    technique_habit: { id: 'tec_eunseo_metronome', name: { ko: '메트로놈', en: 'Metronome' }, effect: 'no split of hers ever differs from her target by more than a tenth' },
    technique_finish: { id: 'tec_eunseo_restoredorder', name: { ko: '순서 복원', en: 'Restored Order' }, effect: 'arrives on the declared time to the second, whatever the field did' },
    specializations: ['pace_precision', 'split_correction', 'target_running'],
    episodes: ['the_hour_she_lost', 'wound_and_rewound', 'order_restored'],
    unlock_path: 'story_chapter_11',
  },
  {
    id: 'chr_haru', order: 12,
    name: { ko: '하루', en: 'Haru' },
    role: 'vanguard', secondary_role: 'surger',
    continent_affinity: 'con_origin',
    presentation: { body: 'youthful slight', gender: 'boy', skin: 'medium', age: 'twelve' },
    silhouette: 'oversized warm-up inherited from someone taller, shard-lantern, eleven faint echoes',
    core_conversion: 'The full Fitness Core is split evenly across whichever two course traits are in play.',
    race_kit: 'borrowed shoes a size too large and a worldline shard on a lace',
    race_signature: 'runs whichever way the road in front of him rewards, and changes at every boundary',
    technique_open: { id: 'tec_haru_borrow', name: { ko: '빌린 주법', en: 'Borrowed Style' }, effect: 'adopts the tactic the opening road rewards instead of his own' },
    technique_mid: { id: 'tec_haru_echo', name: { ko: '메아리', en: 'Echo' }, effect: 'repeats a move a rival already made, one section later and better' },
    technique_habit: { id: 'tec_haru_convergence', name: { ko: '수렴', en: 'Convergence' }, effect: 'gains a little each time two course traits overlap in the same section' },
    technique_finish: { id: 'tec_haru_reunion', name: { ko: '재회', en: 'Reunion' }, effect: 'finishes using every style he borrowed, one per remaining section' },
    specializations: ['style_borrowing', 'move_echoing', 'trait_stacking'],
    episodes: ['the_coat_too_big', 'eleven_voices', 'the_axis_reunited'],
    unlock_path: 'story_chapter_12',
  },
]);

/** 12 companions — expedition partners, never a second roster of runners. */
export const COMPANIONS = Object.freeze([
  { id: 'cmp_lantern_moth', name: { ko: '등불나방', en: 'Lantern Moth' }, continent_id: 'con_lumena', expedition: 'light_survey' },
  { id: 'cmp_seed_vole', name: { ko: '씨앗들쥐', en: 'Seed Vole' }, continent_id: 'con_verdia', expedition: 'reseeding' },
  { id: 'cmp_cinder_hound', name: { ko: '잿불 사냥개', en: 'Cinder Hound' }, continent_id: 'con_rubra', expedition: 'ore_scenting' },
  { id: 'cmp_kite_hawk', name: { ko: '연매', en: 'Kite Hawk' }, continent_id: 'con_anel', expedition: 'lane_mapping' },
  { id: 'cmp_buoy_otter', name: { ko: '부표 수달', en: 'Buoy Otter' }, continent_id: 'con_serene', expedition: 'searoad_marking' },
  { id: 'cmp_arc_beetle', name: { ko: '아크 딱정벌레', en: 'Arc Beetle' }, continent_id: 'con_voltis', expedition: 'grid_repair' },
  { id: 'cmp_glass_fennec', name: { ko: '유리 페넥', en: 'Glass Fennec' }, continent_id: 'con_hora', expedition: 'shadow_finding' },
  { id: 'cmp_frost_ptarmigan', name: { ko: '설뇌조', en: 'Frost Ptarmigan' }, continent_id: 'con_nival', expedition: 'thaw_scouting' },
  { id: 'cmp_drift_ray', name: { ko: '표류 가오리', en: 'Drift Ray' }, continent_id: 'con_kael', expedition: 'skyway_ferrying' },
  { id: 'cmp_sonar_eel', name: { ko: '음파 뱀장어', en: 'Sonar Eel' }, continent_id: 'con_neris', expedition: 'deep_salvage' },
  { id: 'cmp_gear_marten', name: { ko: '태엽 담비', en: 'Gear Marten' }, continent_id: 'con_tempora', expedition: 'clock_winding' },
  { id: 'cmp_shard_sparrow', name: { ko: '파편 참새', en: 'Shard Sparrow' }, continent_id: 'con_origin', expedition: 'shard_gathering' },
]);

/**
 * Cosmetic slot budget. Eight equipable cosmetics per runner = 96 at launch.
 * Every one is power 0 by construction: the content validator asserts that no cosmetic
 * record carries any stat field at all.
 */
export const COSMETIC_SLOTS = Object.freeze([
  'outfit', 'hair', 'shoe_skin', 'jacket', 'aura', 'footstep', 'finish_pose', 'profile_frame',
]);

/**
 * Gear themes — six per continent = 72 sidegrade gear sets at launch.
 *
 * A gear set moves part of one running axis into another. The axes are exactly the three
 * `packages/domain/race.mjs` resolves a race on — cruise, stamina and kick — so a gear set
 * is directly consumable by the race engine rather than being prose about one.
 *
 * The six themes are the six ordered pairs over three axes, which is why no two of them
 * can be the same trade: the set is complete and closed by construction. Each theme is
 * expressed STRUCTURALLY (`from` -> `to`) rather than as description, so the content
 * validator can compare gear sets by what they actually do.
 */
export const GEAR_THEMES = Object.freeze([
  { suffix: 'stride',  from: 'kick',    to: 'cruise'  },
  { suffix: 'reserve', from: 'cruise',  to: 'stamina' },
  { suffix: 'finish',  from: 'stamina', to: 'kick'    },
  { suffix: 'tempo',   from: 'stamina', to: 'cruise'  },
  { suffix: 'closer',  from: 'cruise',  to: 'kick'    },
  { suffix: 'anchor',  from: 'kick',    to: 'stamina' },
]);
