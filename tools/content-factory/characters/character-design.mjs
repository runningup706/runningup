/**
 * Curated launch roster — 12 playable characters.
 *
 * AUTHORED, not generated. Every character shares the same Fitness Core budget earned by
 * the user's real running, and converts it differently. That conversion rule, the basic
 * attack, the two actives, the passive, the ultimate, the three specializations and the
 * personal episodes are what make a character a character rather than a recolour.
 *
 * Direction lock DL-4 / master # 7.4 / # 9.3:
 *   - 12 playable, all visible and trial-playable on launch day
 *   - >= 8 distinct combat roles across the roster
 *   - deliberate diversity of body proportion, gender presentation, skin tone and age
 *   - no paid gacha: every character is earned through world progress or achievements
 *   - `duplicate_similarity` is asserted by the validator, not by good intentions
 */

export const ROLES = Object.freeze([
  'vanguard', 'burst', 'sustained', 'control', 'barrier', 'support', 'counter', 'summon',
]);

export const CHARACTERS = Object.freeze([
  {
    id: 'chr_seon', order: 1,
    name: { ko: '선', en: 'Seon' },
    role: 'vanguard', secondary_role: 'counter',
    continent_affinity: 'con_lumena',
    presentation: { body: 'tall broad', gender: 'woman', skin: 'deep', age: 'late thirties' },
    silhouette: 'wide pauldrons, half-cape torn at the hem, tower shield on the back',
    weapon: 'tower shield and short spear',
    core_conversion: 'Endurance and Vitality convert into shield integrity rather than raw attack.',
    basic_attack: 'shield-forward jabs that build guard stacks',
    skill_1: { id: 'skl_seon_bulwark', name: { ko: '성벽 전개', en: 'Bulwark Deploy' }, effect: 'plants a shield wall that reflects the next telegraphed beam' },
    skill_2: { id: 'skl_seon_riposte', name: { ko: '반격 찌르기', en: 'Riposte Thrust' }, effect: 'converts a perfect guard into a break-gauge strike' },
    passive: { id: 'skl_seon_unbroken', name: { ko: '무너지지 않음', en: 'Unbroken' }, effect: 'guard stacks persist through phase transitions' },
    ultimate: { id: 'skl_seon_dawnwall', name: { ko: '여명의 벽', en: 'Dawnwall' }, effect: 'party-wide reflect window for three beats' },
    specializations: ['guard_stacking', 'reflect_timing', 'front_line_control'],
    episodes: ['the_gate_she_held', 'what_the_light_cost', 'first_axis_vigil'],
    unlock_path: 'starter_selectable',
  },
  {
    id: 'chr_yuwon', order: 2,
    name: { ko: '유원', en: 'Yuwon' },
    role: 'burst', secondary_role: 'summon',
    continent_affinity: 'con_voltis',
    presentation: { body: 'lean wiry', gender: 'man', skin: 'light', age: 'early twenties' },
    silhouette: 'asymmetric coat, cable-wrapped forearm, floating conductor drone',
    weapon: 'arc conductor gauntlet',
    core_conversion: 'Speed converts into chain length instead of attack rate.',
    basic_attack: 'short arcs that mark conductive targets',
    skill_1: { id: 'skl_yuwon_arcline', name: { ko: '아크 라인', en: 'Arcline' }, effect: 'chains damage across every marked target' },
    skill_2: { id: 'skl_yuwon_drone', name: { ko: '전도 드론', en: 'Conductor Drone' }, effect: 'summons a drone that extends chains by one link' },
    passive: { id: 'skl_yuwon_capacitor', name: { ko: '축전', en: 'Capacitance' }, effect: 'unspent chain links bank into the next skill' },
    ultimate: { id: 'skl_yuwon_overload', name: { ko: '과부하 방전', en: 'Total Overload' }, effect: 'detonates all banked links at once' },
    specializations: ['chain_extension', 'drone_control', 'burst_banking'],
    episodes: ['the_boy_who_wired_the_dark', 'grid_debt', 'what_the_spire_remembers'],
    unlock_path: 'starter_selectable',
  },
  {
    id: 'chr_hana', order: 3,
    name: { ko: '하나', en: 'Hana' },
    role: 'sustained', secondary_role: 'support',
    continent_affinity: 'con_verdia',
    presentation: { body: 'average', gender: 'woman', skin: 'medium', age: 'mid twenties' },
    silhouette: 'layered botanist coat, seed satchel, living staff that flowers as she fights',
    weapon: 'grafted living staff',
    core_conversion: 'Vitality converts into sustained damage-over-time rather than health.',
    basic_attack: 'seeding strikes that bloom two beats later',
    skill_1: { id: 'skl_hana_bloom', name: { ko: '개화', en: 'Bloom' }, effect: 'detonates all planted seeds early' },
    skill_2: { id: 'skl_hana_purify', name: { ko: '정화', en: 'Purify' }, effect: 'cleanses binds and converts them into growth stacks' },
    passive: { id: 'skl_hana_rooted', name: { ko: '뿌리내림', en: 'Rooted' }, effect: 'growth stacks never decay while standing still' },
    ultimate: { id: 'skl_hana_greatbreath', name: { ko: '대수의 숨결', en: 'Great Breath' }, effect: 'every seed on the field blooms and heals the party' },
    specializations: ['seed_timing', 'cleanse_conversion', 'field_control'],
    episodes: ['the_seed_she_kept', 'a_forest_that_forgot', 'breath_returned'],
    unlock_path: 'story_chapter_02',
  },
  {
    id: 'chr_dorin', order: 4,
    name: { ko: '도린', en: 'Dorin' },
    role: 'control', secondary_role: 'burst',
    continent_affinity: 'con_rubra',
    presentation: { body: 'stocky heavy', gender: 'man', skin: 'tan', age: 'fifties' },
    silhouette: 'smith apron over scarred arms, one mechanical shoulder, enormous tongs',
    weapon: 'forge tongs and molten ingot',
    core_conversion: 'Tempo converts into heat management headroom instead of attack speed.',
    basic_attack: 'heavy swings that raise the shared heat gauge',
    skill_1: { id: 'skl_dorin_vent', name: { ko: '증기 배출', en: 'Vent' }, effect: 'dumps heat to stun everything adjacent' },
    skill_2: { id: 'skl_dorin_quench', name: { ko: '담금질', en: 'Quench' }, effect: 'freezes the heat gauge for a full cycle' },
    passive: { id: 'skl_dorin_temper', name: { ko: '단련', en: 'Temper' }, effect: 'shatter damage scales with peak heat reached' },
    ultimate: { id: 'skl_dorin_heartforge', name: { ko: '심장로', en: 'Heartforge' }, effect: 'forces every enemy to peak heat and shatters at once' },
    specializations: ['heat_banking', 'shatter_windows', 'zone_denial'],
    episodes: ['the_fire_he_banked', 'apprentice_debt', 'the_heart_relit'],
    unlock_path: 'story_chapter_03',
  },
  {
    id: 'chr_ari', order: 5,
    name: { ko: '아리', en: 'Ari' },
    role: 'counter', secondary_role: 'vanguard',
    continent_affinity: 'con_anel',
    presentation: { body: 'slight agile', gender: 'non-binary', skin: 'olive', age: 'late teens' },
    silhouette: 'kite-cloth wings, wrapped shins, weightless stance',
    weapon: 'twin wind-blades',
    core_conversion: 'Pacing converts into counter windows instead of consistency bonuses.',
    basic_attack: 'lane-dashing slashes that gain damage with momentum',
    skill_1: { id: 'skl_ari_slipstream', name: { ko: '기류 타기', en: 'Slipstream' }, effect: 'rides a wind lane and reverses incoming knockback' },
    skill_2: { id: 'skl_ari_crosswind', name: { ko: '맞바람', en: 'Crosswind' }, effect: 'shoves an enemy into an opposing lane for bonus stagger' },
    passive: { id: 'skl_ari_momentum', name: { ko: '가속', en: 'Momentum' }, effect: 'each uninterrupted dash raises counter damage' },
    ultimate: { id: 'skl_ari_roadbind', name: { ko: '길 잇기', en: 'Roadbind' }, effect: 'locks every lane in the party favour for four beats' },
    specializations: ['momentum_chaining', 'knockback_reversal', 'lane_control'],
    episodes: ['the_road_that_broke', 'a_kite_for_the_lost', 'roads_rejoined'],
    unlock_path: 'story_chapter_04',
  },
  {
    id: 'chr_mirae', order: 6,
    name: { ko: '미래', en: 'Mirae' },
    role: 'support', secondary_role: 'control',
    continent_affinity: 'con_serene',
    presentation: { body: 'tall slender', gender: 'woman', skin: 'light', age: 'early thirties' },
    silhouette: 'tide-charts sewn into a long coat, lantern buoy at the hip',
    weapon: 'tide lantern and signal chain',
    core_conversion: 'Momentum converts into party repositioning instead of streak damage.',
    basic_attack: 'lantern sweeps that mark the next tide position',
    skill_1: { id: 'skl_mirae_ebb', name: { ko: '썰물', en: 'Ebb' }, effect: 'pulls the party to the safe half before the swap' },
    skill_2: { id: 'skl_mirae_signal', name: { ko: '신호등', en: 'Signal' }, effect: 'reveals the next two tide phases' },
    passive: { id: 'skl_mirae_navigator', name: { ko: '항해사', en: 'Navigator' }, effect: 'the party takes no damage during a swap she predicted' },
    ultimate: { id: 'skl_mirae_searoad', name: { ko: '항로 복원', en: 'Searoad Restored' }, effect: 'freezes the tide cycle entirely for three beats' },
    specializations: ['phase_prediction', 'party_repositioning', 'tempo_denial'],
    episodes: ['the_light_she_carried', 'charts_of_the_drowned', 'the_road_home'],
    unlock_path: 'story_chapter_05',
  },
  {
    id: 'chr_taeho', order: 7,
    name: { ko: '태호', en: 'Taeho' },
    role: 'barrier', secondary_role: 'sustained',
    continent_affinity: 'con_nival',
    presentation: { body: 'broad solid', gender: 'man', skin: 'medium', age: 'forties' },
    silhouette: 'fur-lined garrison coat, frost-rimed greatshield, slow deliberate stance',
    weapon: 'frost bastion shield',
    core_conversion: 'Resolve converts into barrier duration rather than long-term volume bonuses.',
    basic_attack: 'grounded shield bashes that chill the tile',
    skill_1: { id: 'skl_taeho_bastion', name: { ko: '빙벽', en: 'Ice Bastion' }, effect: 'raises a barrier that freezes attackers who strike it' },
    skill_2: { id: 'skl_taeho_thaw', name: { ko: '해빙', en: 'Thaw' }, effect: 'melts a freeze zone to open a shatter window early' },
    passive: { id: 'skl_taeho_garrison', name: { ko: '수비대', en: 'Garrison' }, effect: 'barriers refresh when an ally stands behind them' },
    ultimate: { id: 'skl_taeho_whitewall', name: { ko: '백빙 성벽', en: 'Whitewall' }, effect: 'encases the whole party in a shatter-immune barrier' },
    specializations: ['barrier_uptime', 'freeze_manipulation', 'ally_protection'],
    episodes: ['the_watch_he_kept', 'names_on_the_wall', 'the_hour_thawed'],
    unlock_path: 'story_chapter_08',
  },
  {
    id: 'chr_soye', order: 8,
    name: { ko: '소예', en: 'Soye' },
    role: 'summon', secondary_role: 'control',
    continent_affinity: 'con_hora',
    presentation: { body: 'petite', gender: 'woman', skin: 'deep', age: 'sixties' },
    silhouette: 'desert veil, mirror-shard bracelets, three drifting reflections',
    weapon: 'mirror shards',
    core_conversion: 'Speed converts into number of active reflections instead of attack rate.',
    basic_attack: 'shard throws that leave a standing reflection',
    skill_1: { id: 'skl_soye_split', name: { ko: '분신', en: 'Split' }, effect: 'reflections act independently for two beats' },
    skill_2: { id: 'skl_soye_shadowtell', name: { ko: '그림자 판별', en: 'Shadowtell' }, effect: 'exposes every enemy clone on the field' },
    passive: { id: 'skl_soye_manyselves', name: { ko: '여럿의 나', en: 'Many Selves' }, effect: 'damage taken is split among surviving reflections' },
    ultimate: { id: 'skl_soye_truemirror', name: { ko: '참된 거울', en: 'True Mirror' }, effect: 'all reflections strike the one real target simultaneously' },
    specializations: ['reflection_count', 'clone_exposure', 'damage_distribution'],
    episodes: ['the_woman_of_many_roads', 'what_the_glass_kept', 'the_true_path'],
    unlock_path: 'story_chapter_07',
  },
  {
    id: 'chr_jiwoo', order: 9,
    name: { ko: '지우', en: 'Jiwoo' },
    role: 'burst', secondary_role: 'counter',
    continent_affinity: 'con_kael',
    presentation: { body: 'athletic compact', gender: 'man', skin: 'light', age: 'late twenties' },
    silhouette: 'harness rig with grapple spools, one bare shoulder, always mid-motion',
    weapon: 'grapple lance',
    core_conversion: 'Endurance converts into aerial uptime instead of stamina.',
    basic_attack: 'descending lance strikes from height',
    skill_1: { id: 'skl_jiwoo_grapple', name: { ko: '갈고리', en: 'Grapple' }, effect: 'pulls himself to a higher platform and strikes down' },
    skill_2: { id: 'skl_jiwoo_anchor', name: { ko: '고정', en: 'Anchor' }, effect: 'stops one platform from falling for a cycle' },
    passive: { id: 'skl_jiwoo_highground', name: { ko: '고지', en: 'High Ground' }, effect: 'damage scales with height above the target' },
    ultimate: { id: 'skl_jiwoo_skyfall', name: { ko: '하늘 낙하', en: 'Skyfall' }, effect: 'a single strike from maximum altitude' },
    specializations: ['height_advantage', 'platform_denial', 'burst_positioning'],
    episodes: ['the_isles_he_left', 'anchor_and_rope', 'sky_rejoined'],
    unlock_path: 'story_chapter_09',
  },
  {
    id: 'chr_narae', order: 10,
    name: { ko: '나래', en: 'Narae' },
    role: 'control', secondary_role: 'support',
    continent_affinity: 'con_neris',
    presentation: { body: 'average', gender: 'non-binary', skin: 'medium', age: 'mid thirties' },
    silhouette: 'pressure suit with a sonar collar, cable tether, deliberate slow gait',
    weapon: 'sonar emitter',
    core_conversion: 'Tempo converts into pulse frequency instead of cooldown reduction.',
    basic_attack: 'directed pulses that reveal and stagger',
    skill_1: { id: 'skl_narae_pulse', name: { ko: '음파 파동', en: 'Sonar Pulse' }, effect: 'reveals everything and resets the pressure clock' },
    skill_2: { id: 'skl_narae_tether', name: { ko: '연결선', en: 'Tether' }, effect: 'links an ally to share pressure relief' },
    passive: { id: 'skl_narae_deeplung', name: { ko: '심폐', en: 'Deep Lung' }, effect: 'the party pressure clock runs slower near her' },
    ultimate: { id: 'skl_narae_recordrise', name: { ko: '기록 인양', en: 'Records Rising' }, effect: 'suspends pressure entirely and reveals the whole arena' },
    specializations: ['pulse_economy', 'pressure_relief', 'reveal_control'],
    episodes: ['what_the_deep_kept', 'a_tether_for_two', 'the_archive_surfaces'],
    unlock_path: 'story_chapter_10',
  },
  {
    id: 'chr_eunseo', order: 11,
    name: { ko: '은서', en: 'Eunseo' },
    role: 'sustained', secondary_role: 'barrier',
    continent_affinity: 'con_tempora',
    presentation: { body: 'tall lean', gender: 'woman', skin: 'pale', age: 'ageless clockwork-marked' },
    silhouette: 'escapement arm in place of a left forearm, pendulum at the belt, metronomic walk',
    weapon: 'escapement blade',
    core_conversion: 'Pacing converts into tempo-zone authority instead of split consistency.',
    basic_attack: 'strikes locked to the arena beat for bonus damage',
    skill_1: { id: 'skl_eunseo_slowzone', name: { ko: '감속 구역', en: 'Slow Zone' }, effect: 'creates a zone where enemies act at half rate' },
    skill_2: { id: 'skl_eunseo_retrograde', name: { ko: '역행', en: 'Retrograde' }, effect: 'undoes the last enemy action taken' },
    passive: { id: 'skl_eunseo_metronome', name: { ko: '메트로놈', en: 'Metronome' }, effect: 'on-beat actions never miss their break window' },
    ultimate: { id: 'skl_eunseo_restoredorder', name: { ko: '순서 복원', en: 'Restored Order' }, effect: 'the party acts twice while everything else is stopped' },
    specializations: ['zone_authority', 'action_reversal', 'beat_precision'],
    episodes: ['the_hour_she_lost', 'wound_and_rewound', 'order_restored'],
    unlock_path: 'story_chapter_11',
  },
  {
    id: 'chr_haru', order: 12,
    name: { ko: '하루', en: 'Haru' },
    role: 'vanguard', secondary_role: 'summon',
    continent_affinity: 'con_origin',
    presentation: { body: 'youthful slight', gender: 'boy', skin: 'medium', age: 'twelve' },
    silhouette: 'oversized coat inherited from someone taller, shard-lantern, eleven faint echoes',
    weapon: 'worldline shard',
    core_conversion: 'The full Fitness Core is split evenly across whichever two continent mechanics are active.',
    basic_attack: 'shard strikes that borrow the current arena mechanic',
    skill_1: { id: 'skl_haru_borrow', name: { ko: '빌린 기억', en: 'Borrowed Memory' }, effect: 'copies one continent mechanic for the fight' },
    skill_2: { id: 'skl_haru_echo', name: { ko: '메아리', en: 'Echo' }, effect: 'summons an echo of a previously used character skill' },
    passive: { id: 'skl_haru_convergence', name: { ko: '수렴', en: 'Convergence' }, effect: 'gains a stack each time two mechanics interact' },
    ultimate: { id: 'skl_haru_reunion', name: { ko: '재회', en: 'Reunion' }, effect: 'all twelve shards strike as one' },
    specializations: ['mechanic_borrowing', 'echo_summoning', 'convergence_stacking'],
    episodes: ['the_coat_too_big', 'eleven_voices', 'the_axis_reunited'],
    unlock_path: 'story_chapter_12',
  },
]);

/** 12 companions — expedition partners, not combat clones of the roster. */
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
 * Cosmetic slot budget. Eight equipable cosmetics per character = 96 at launch.
 * Every one is power 0 by construction: the content validator asserts that no cosmetic
 * record carries any stat field at all.
 */
export const COSMETIC_SLOTS = Object.freeze([
  'outfit', 'hair', 'weapon_skin', 'cape', 'aura', 'footstep', 'victory_pose', 'profile_frame',
]);

/**
 * Relic themes — six per continent = 72 sidegrade relics at launch.
 *
 * Each theme is expressed as a STRUCTURED trade (`from` -> `to`) rather than as prose, so
 * the content validator can compare relics by what they actually do. Two relics that move
 * the same budget in the same direction are duplicates even if their descriptions differ;
 * two that move it in opposite directions are distinct even if their wording overlaps.
 */
export const RELIC_THEMES = Object.freeze([
  { suffix: 'ward', from: 'attack_budget', to: 'guard_uptime' },
  { suffix: 'edge', from: 'guard_budget', to: 'break_damage' },
  { suffix: 'pulse', from: 'resource_generation', to: 'cooldown_rate' },
  { suffix: 'anchor', from: 'mobility', to: 'zone_authority' },
  { suffix: 'echo', from: 'action_value', to: 'repeated_action' },
  { suffix: 'tide', from: 'early_fight_weight', to: 'late_fight_weight' },
]);
