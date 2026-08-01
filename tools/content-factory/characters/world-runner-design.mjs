/**
 * World runners — the 204 named people the player races against.
 *
 * Before this table the world had 108 pacers and every one of them was
 * `{ id: 'rvl_lumena_01_r1', pacer_index: 0 }`. That is a slot, not a runner: three of
 * them shared one crew's tactic, none had a face, a name, a home or a way of running, and
 * the launch count counted them anyway. The owner floor is 200+ *runners*, and it says in
 * so many words that a recolour is not a person.
 *
 * WHAT MAKES ONE RUNNER DIFFERENT FROM THE NEXT
 * ---------------------------------------------
 * Two kinds of field, and they are kept apart on purpose:
 *
 *   AUTHORED, one at a time, below — name, home region, race signature, and who they are.
 *   Those 204 × 4 fields are written, not generated, and the validator requires every
 *   signature and every introduction in the world to be distinct.
 *
 *   SPREAD, deterministically — base style, role and tendency. These come from
 *   `assignment()` rather than being typed 204 times, because typing them by hand is how
 *   you end up with sixty runners quietly sharing one combination and no way to notice.
 *   The spread uses a 23-length tendency cycle against a 24-length style cycle so the
 *   (style, role, tendency) triple cannot repeat inside 204 entries — and
 *   `tests/world-runners.test.mjs` proves that rather than asserting it.
 *
 * So a runner differs from every other runner on at least four axes: what they look like
 * (24 base styles, each its own build, age and gait), what they do in a race (8 roles),
 * how they do it (23 tendencies), and everything authored about them.
 *
 * CREW LINKAGE
 * ------------
 * The first 108 runners of the roster fill the existing 36 rival crews, three each, in
 * order. They are the same people — a crew is now a group of named runners rather than a
 * tactic with three empty seats. The remaining 96 are the open field: they fill open race
 * events, Global Event heats and the eight-runner race field.
 *
 * MECHANICAL NEUTRALITY
 * ---------------------
 * DL-5 again: role and tendency redistribute the shared race budget, they do not add to
 * it. A world runner record carries no core power field at all, and the validator fails if
 * one appears.
 */

import { ROLE_IDS } from '../../../packages/domain/race.mjs';
import { MY_RUNNER_BASE_STYLES } from './my-runner-design.mjs';

/**
 * 23 running tendencies — the shape of a race from the inside.
 *
 * 23 is prime against the 24 base styles and the 8 roles, which is the whole reason for
 * the number: it is what stops the assignment cycle from repeating.
 */
export const TENDENCIES = Object.freeze([
  { id: 'front_from_gun',    en: 'leads from the gun and makes the field come past' },
  { id: 'metronome',         en: 'runs one pace and does not acknowledge anyone else' },
  { id: 'negative_split',    en: 'holds back to halfway and runs the second half faster' },
  { id: 'sit_and_pounce',    en: 'sits on a shoulder and goes once, late' },
  { id: 'surge_repeat',      en: 'attacks in repeated short bursts until someone breaks' },
  { id: 'long_grind',        en: 'lifts the pace a fraction every kilometre and never drops it' },
  { id: 'late_lifter',       en: 'does nothing at all until the last quarter' },
  { id: 'pack_shelter',      en: 'hides in the field out of the wind for as long as possible' },
  { id: 'corner_attack',     en: 'takes time out of the field on every turn' },
  { id: 'shoulder_sitter',   en: 'picks one runner and refuses to leave their hip' },
  { id: 'gap_closer',        en: 'lets gaps open and then closes them in one move' },
  { id: 'early_break',       en: 'goes far too early on purpose and dares anyone to follow' },
  { id: 'midrace_gamble',    en: 'commits everything to a single move at halfway' },
  { id: 'last_lap_only',     en: 'is invisible until the final lap and then is not' },
  { id: 'steady_climb',      en: 'moves up one place at a time and never falls back' },
  { id: 'rhythm_breaker',    en: 'changes pace constantly to make the rhythm unusable' },
  { id: 'shadow_runner',     en: 'runs exactly one stride behind and matches everything' },
  { id: 'wide_lane',         en: 'runs wide in clean air and pays the distance for it' },
  { id: 'inside_rail',       en: 'takes the rail early and defends it the whole way' },
  { id: 'two_thirds_move',   en: 'makes one committed move at two thirds distance' },
  { id: 'finish_diver',      en: 'is beaten with fifty metres to go and often is not' },
  { id: 'talk_and_pace',     en: 'talks the whole way and is somehow still there at the end' },
  { id: 'silent_hunter',     en: 'says nothing, appears at your shoulder, and is gone' },
]);

/**
 * Deterministic (style, role, tendency) spread.
 *
 * Style cycles every 24, role every 8, tendency every 23. Because 23 is coprime with both
 * 24 and 8, the triple's period is lcm(24, 8, 23) = 552, comfortably past 204. Changing 23
 * to 24 would collapse the period to 24 and silently give 8.5 runners per combination.
 */
export function assignment(index) {
  return {
    base_style_id: MY_RUNNER_BASE_STYLES[index % MY_RUNNER_BASE_STYLES.length].id,
    role: ROLE_IDS[index % ROLE_IDS.length],
    tendency_id: TENDENCIES[index % TENDENCIES.length].id,
  };
}

/**
 * The roster, 17 per continent, in world order.
 *
 * Each row: [ english name, korean name, home region 1-16, race signature, who they are ].
 *
 * The signature is what you see them do on the course. The introduction is why. Both are
 * required to be unique across all 204 by the content validator, because "runs strongly"
 * written 204 times is the same failure as a recolour.
 */
export const WORLD_RUNNER_ROSTERS = Object.freeze({
  con_lumena: [
    ['Halvard', '할바르', 3, 'takes the front on the first ramp and never gives it back', 'kept the citadel wall for thirty years and only started racing at forty'],
    ['Isolde', '이졸데', 1, 'runs the whole race a half step off the leader shoulder', 'archivist who memorised every split ever recorded on this course'],
    ['Pell', '펠', 7, 'attacks every time the road turns toward the light', 'lamp-lighter who has run the same route before dawn since childhood'],
    ['Corven', '코르벤', 12, 'lets the field go and reels it in one runner per kilometre', 'former bell-ringer, counts the whole race in fours'],
    ['Aurel', '아우렐', 5, 'goes at halfway with everything and either wins or walks in', 'the only runner in Lumena who has done both, in consecutive years'],
    ['Sabine', '사빈', 9, 'runs wide in clean air and still finishes ahead', 'refuses to race on the inside after a fall she will not discuss'],
    ['Tobiah', '토비아', 2, 'holds the rail from the first metre and dares anyone to come round', 'stonemason, built the ramp the race starts on'],
    ['Marisol', '마리솔', 15, 'talks to whoever is next to her for forty minutes and then goes', 'runs to have somewhere to talk, and is annoyed to be good at it'],
    ['Ordric', '오드릭', 6, 'changes pace every two hundred metres to break the rhythm', 'trained as a chorister, hears the field breathing out of time'],
    ['Yvette', '이베트', 11, 'does absolutely nothing until the last kilometre', 'a night-shift medic who runs on four hours of sleep and prefers it'],
    ['Deshan', '데샨', 4, 'closes every gap the moment it opens, all race long', 'was a message runner between the ramparts before there were races'],
    ['Livia', '리비아', 14, 'moves up one place at a time and never once falls back', 'keeps a written record of every place she has finished in, since she was nine'],
    ['Casimir', '카시미르', 8, 'sits in the field out of the wind and is invisible until he is not', 'a quiet man who has never given an interview'],
    ['Renata', '레나타', 10, 'commits to one enormous move at two thirds and holds on', 'gilder by trade, describes the last third of a race as the part worth doing'],
    ['Emeric', '에머릭', 16, 'is beaten with fifty metres left and usually is not', 'lost the continental title by a hundredth and has not mentioned it since'],
    ['Solenne', '솔렌', 13, 'runs one pace from gun to line regardless of who does what', 'the pace-setter every Lumena runner learned to hate and then imitate'],
    ['Baruch', '바루크', 5, 'appears at your shoulder without a sound and is gone again', 'nobody in the citadel knows what he does when he is not racing'],
  ],
  con_verdia: [
    ['Anaya', '아나야', 2, 'leads the whole way down the root corridors where it is narrow', 'grew up on the canopy walkways and finds flat ground unsettling'],
    ['Fenn', '펜', 8, 'runs one pace through terrain that punishes anyone who cannot', 'forest surveyor, has walked every metre of this course at least twice'],
    ['Odile', '오딜', 5, 'starts at the back of the field on purpose and finishes at the front', 'a botanist who treats the first half as data collection'],
    ['Ravi', '라비', 13, 'holds until the last quarter and then makes it look easy', 'the youngest continental medallist Verdia has produced'],
    ['Thessaly', '테살리', 1, 'surges out of every bend under the low branches', 'runs bent forward from habit and never straightened up'],
    ['Ilan', '일란', 10, 'grinds the pace up a fraction every kilometre for an hour', 'tends the sap channels, works in hour-long blocks, races in them too'],
    ['Bryony', '브라이오니', 6, 'goes far too early and dares the field to come with her', 'has won this way twice and lost this way nine times, and is unmoved'],
    ['Kemal', '케말', 15, 'shelters in the pack until the forest opens out', 'a woodcutter with a runner build he did not ask for'],
    ['Noor', '누르', 3, 'attacks every corner where the roots make it technical', 'the only person who has raced the spore season five years running'],
    ['Silas', '실라스', 12, 'picks one runner at the start and never leaves their hip', 'will tell you exactly who he is racing and it is never the leader'],
    ['Amaranth', '아마란스', 7, 'lets the gap go and closes it in one move, twice a race', 'a mycologist who describes racing in terms of networks'],
    ['Gideon', '기드온', 16, 'climbs the placings one at a time and stays there', 'started running at fifty-one because the walk to work was too short'],
    ['Perrine', '페린', 4, 'never runs two consecutive kilometres at the same pace', 'says a steady pace is a decision to stop thinking'],
    ['Osric', '오스릭', 9, 'is one stride behind you the whole way and matching everything', 'a tracker, and he does not consider this a metaphor'],
    ['Junia', '유니아', 11, 'runs the outside line through the whole forest section', 'lost a season to a collision and now pays the extra distance gladly'],
    ['Torbin', '토르빈', 14, 'holds the inside root line and defends it from the gun', 'the shortest route through Verdia is his and he knows it'],
    ['Meret', '메레트', 6, 'makes one move at two thirds and never a second one', 'a bloomfall weaver who races three times a year and wins one'],
  ],
  con_rubra: [
    ['Kestrel', '케스트럴', 4, 'takes the canyon lead before the heat builds and holds it', 'a furnace hand who considers the race the cool part of the day'],
    ['Vasco', '바스코', 9, 'runs a metronome pace in conditions that make it absurd', 'holds the continental record for consistency and none for speed'],
    ['Idris', '이드리스', 1, 'runs the first half in the shade and the second half harder', 'reads the canyon shadow like a course map, because it is one'],
    ['Nerys', '네리스', 12, 'sits and does nothing until the last long straight', 'the most patient runner in Rubra and by some distance the least popular'],
    ['Ozias', '오지아스', 7, 'attacks in short bursts until the field stops answering', 'a slag-hauler with an engine for a chest and no tactical sense at all'],
    ['Calla', '칼라', 15, 'lifts the pace every kilometre for the whole distance', 'ran her first race to prove a point and has not stopped'],
    ['Rhodes', '로데스', 2, 'goes at three kilometres and is never seen again, either way', 'has finished first and last in the same event, a year apart'],
    ['Zephyrine', '제피린', 11, 'hides from the canyon wind behind whoever is largest', 'the smallest runner on the continent and entirely unembarrassed by it'],
    ['Malachi', '말라카이', 5, 'takes a full second out of the field on every switchback', 'grew up running messages down the canyon and never learned to brake'],
    ['Faye', '페이', 14, 'chooses one rival before the gun and shadows them all day', 'keeps a list, and everyone on the continent knows they are on it'],
    ['Ambrose', '앰브로스', 3, 'lets the gap open in the heat and closes it in the cool', 'a kiln master who understands exactly what temperature does to a person'],
    ['Sable', '세이블', 10, 'moves up one place per kilometre without ever surging', 'has never led a race before the final kilometre and has won six'],
    ['Ignatz', '이그나츠', 8, 'breaks the rhythm every time the field settles into one', 'openly says he would rather ruin a race than lose a slow one'],
    ['Delphine', '델핀', 16, 'runs a stride back, matching, and never comes past until the end', 'the quietest runner in the field and the one nobody wants behind them'],
    ['Roque', '로케', 6, 'runs the wide line where the canyon floor is smoother', 'lost two toenails to the inside line and made a decision'],
    ['Wren', '렌', 13, 'takes the rail at the first bend and holds it for an hour', 'the only Rubra runner to lead a race from the gun and finish first'],
    ['Baltasar', '발타사르', 9, 'makes his single move at two thirds and it is always decisive', 'a former champion who now races twice a year and is still the favourite'],
  ],
  con_anel: [
    ['Sorrel', '소렐', 1, 'takes the front and uses her body as a windbreak for nobody', 'a windmill keeper who has never once run with a tailwind by choice'],
    ['Alder', '앨더', 8, 'holds one pace across a plain that changes direction constantly', 'reads wind the way other runners read splits'],
    ['Marta', '마르타', 14, 'runs the first half into the wind and the second half home', 'plans every race around the forecast and is right about it'],
    ['Cyrus', '키루스', 5, 'waits until the last stretch where the wind finally drops', 'a mill mechanic with an unnerving sense of when to move'],
    ['Linnea', '린네아', 11, 'surges repeatedly in the gusts until the field gives up', 'races only on the windiest days and skips the calm ones'],
    ['Dagfinn', '다그핀', 3, 'lifts the pace a little every kilometre for the whole plain', 'the tallest runner on the continent and the worst possible shape for it'],
    ['Ottilie', '오틸리', 16, 'goes early into a headwind, which everyone agrees is madness', 'has won exactly once doing this and considers it settled'],
    ['Reuben', '루벤', 6, 'sits behind the largest runner in the field and stays there', 'entirely open about the tactic and unapologetic'],
    ['Ines', '이네스', 12, 'attacks on every bend where the crosswind changes side', 'a sailmaker, and she races the way she trims'],
    ['Kwame', '콰메', 2, 'picks the strongest runner and rides their shoulder all day', 'says he has never chosen wrong and the record supports him'],
    ['Petra', '페트라', 9, 'lets the wind open a gap and closes it when it turns', 'the only runner here who treats a headwind as an opportunity'],
    ['Ansel', '안셀', 15, 'moves up steadily on the exposed sections and never drops back', 'has finished in the top ten of every race he has ever entered'],
    ['Hilde', '힐데', 4, 'changes pace with every gust until the rhythm is unusable', 'the field describes racing her as running in a storm, twice'],
    ['Vidar', '비다르', 10, 'runs a stride behind, out of the wind, silent, all the way', 'a weather-watcher who spends his working life waiting'],
    ['Talia', '탈리아', 7, 'runs wide where the ground is firm and pays for the distance', 'has calculated the cost exactly and finds it worth paying'],
    ['Osgood', '오스굿', 13, 'takes the inside line at the first mill and holds it home', 'ran his first race at sixty and has not missed one since'],
    ['Nadia', '나디아', 5, 'commits at two thirds where the plain drops away', 'the fastest final third on the continent and no patience for the first two'],
  ],
  con_serene: [
    ['Coral', '코랄', 2, 'leads across the stilt walkways where nobody dares come past', 'grew up on the planks and does not look down, ever'],
    ['Nikolai', '니콜라이', 9, 'holds one pace across surfaces that change under him', 'a bridge inspector, and it shows in his footing'],
    ['Sirin', '시린', 6, 'runs the tide-out half slow and the tide-in half hard', 'times every race to the tide table and has never been wrong'],
    ['Emrys', '엠리스', 13, 'does nothing at all until the last causeway', 'a net-mender with an hour of patience and thirty seconds of speed'],
    ['Tova', '토바', 1, 'attacks on every wet section until the field stops following', 'the only runner who genuinely prefers the boards soaked'],
    ['Lucien', '루시앙', 16, 'raises the pace a fraction each kilometre for the whole coast', 'a lighthouse keeper who counts in hours, not minutes'],
    ['Marisa', '마리사', 4, 'goes at the first bridge, which is far too early, deliberately', 'has never finished worse than fifth doing something everyone calls stupid'],
    ['Bram', '브람', 11, 'tucks in behind the field where the spray is worst', 'openly hates the cold and races anyway'],
    ['Yuki', '유키', 8, 'takes time out of everyone on the tight harbour turns', 'a dock runner, and the corners are the part she trains'],
    ['Elio', '엘리오', 3, 'chooses one runner at the start and stays on their hip all race', 'says he only needs to beat one person and he is usually right'],
    ['Saskia', '사스키아', 15, 'lets a gap go over the water and shuts it on land', 'a swimmer first, and it is visible in how little the wet bothers her'],
    ['Hadrian', '하드리안', 5, 'moves up one place per causeway and never once falls back', 'started running at forty-eight and has beaten people half his age'],
    ['Wynne', '윈', 12, 'never holds a pace long enough for anyone to settle into it', 'accused of ruining races, and has said she intends to'],
    ['Kofi', '코피', 7, 'runs one stride back, matching stride for stride, in silence', 'a phosphor diver used to holding his breath and his tongue'],
    ['Iris', '아이리스', 10, 'takes the wide outer boards where the surface is dry', 'fell once at nineteen and has run wide every race since'],
    ['Stellan', '스텔란', 14, 'holds the inner rail from the gun across every bridge', 'the shortest line through Serene, and he has never given it up'],
    ['Anouk', '아누크', 6, 'makes one move at two thirds, out of the harbour, and goes', 'a night fisher who races before sleeping and after working'],
  ],
  con_voltis: [
    ['Vex', '벡스', 5, 'takes the front through the smelter district and holds it', 'a line technician who runs the route she inspects'],
    ['Aurelio', '아우렐리오', 12, 'runs a pace so even it reads as a machine fault', 'says the city is full of rhythm and most people ignore it'],
    ['Nnamdi', '느남디', 3, 'runs the industrial half controlled and the open half fast', 'a grounding engineer with an unusual amount of patience'],
    ['Sela', '셀라', 10, 'sits in and does nothing until the final underpass', 'the field has learned to watch her and it has not helped'],
    ['Brandt', '브란트', 7, 'surges in short repeated bursts until the field breaks', 'a smelter hand who trains in ninety-second intervals because his shift does'],
    ['Ilya', '일리야', 1, 'lifts the pace fractionally every kilometre and never eases', 'holds the longest unbroken sequence of finishes on the continent'],
    ['Rosalind', '로잘린드', 14, 'goes at two kilometres and hangs on for the other eighteen', 'has been told to stop doing this by three separate coaches'],
    ['Tam', '탐', 9, 'runs in the shelter of the field until the wind funnels stop', 'small, quiet, and consistently in the top ten'],
    ['Dov', '도브', 6, 'takes time out of everyone on the tight foundry corners', 'a courier before the races existed and unchanged since'],
    ['Priya', '프리야', 16, 'locks onto one runner and does not leave their shoulder', 'chooses the person she thinks will win and is right about half the time'],
    ['Milo', '밀로', 2, 'lets the field go on the climbs and takes it all back after', 'a cable rigger with legs built for exactly one thing'],
    ['Ingrid', '잉그리드', 13, 'climbs the order one place at a time for the whole race', 'has never been in the lead before the last kilometre of anything'],
    ['Kaspar', '카스파르', 4, 'changes pace so often that nobody can use his rhythm', 'has said the point is to make the race unpleasant, and means it'],
    ['Lior', '리오르', 11, 'runs one stride behind, matching, without a word, for an hour', 'a signal operator, used to watching one thing for a very long time'],
    ['Femi', '페미', 8, 'runs wide where the tram rails make the inside line dangerous', 'lost a shoe to a rail groove and made a permanent decision'],
    ['Astrid', '아스트리드', 15, 'takes the inside from the gun and defends it through the city', 'the most aggressive first kilometre in Voltis and she is fifty-three'],
    ['Ruslan', '루슬란', 6, 'makes his one move where the district opens onto the flats', 'a former champion who now races once a year and is still dangerous'],
  ],
  con_hora: [
    ['Zahra', '자흐라', 1, 'leads out across the glass flats where the footing is worst', 'a mirror-ruin surveyor who knows which panels hold'],
    ['Emeka', '에메카', 8, 'holds a single pace through heat that removes everyone else', 'the most heat-adapted runner in the world and entirely undramatic about it'],
    ['Lior-Nes', '리오르네스', 15, 'runs the sun half easy and the shadow half hard', 'plans every race around where the ruins throw shade'],
    ['Camila', '카밀라', 5, 'waits out the whole desert and goes on the last flat', 'has finished second more times than anyone and is still trying'],
    ['Ardashir', '아르다시르', 12, 'attacks in bursts across the vitrified sections', 'a glass-walker, and the surface that frightens the field is his home'],
    ['Neve', '네베', 3, 'grinds the pace up kilometre by kilometre in forty degrees', 'started racing to escape a job and stayed for the heat'],
    ['Yusuf', '유수프', 10, 'goes early into open sun, which no reasonable person does', 'has explained why several times and nobody has been convinced'],
    ['Tirza', '티르자', 7, 'runs in the shadow of the field until the ruins end', 'the field calls it hiding and she calls it thinking'],
    ['Bekele', '베켈레', 14, 'takes time out of the field on every ruin corner', 'grew up racing between the mirror walls where there is no straight line'],
    ['Sofiya', '소피야', 2, 'picks one runner and shadows them across the whole desert', 'will not say who until afterwards, and sometimes not then'],
    ['Ravel', '라벨', 11, 'lets gaps open in the heat and closes them all at once', 'a heat-haze forecaster who races on the days he predicts worst'],
    ['Oona', '오나', 6, 'moves up one place at a time and holds every one of them', 'has never dropped a place in the second half of any race, ever'],
    ['Mikhail', '미하일', 16, 'refuses to hold any pace for more than a kilometre', 'says the desert already changes constantly and he is only matching it'],
    ['Chidi', '치디', 9, 'runs one stride back in total silence for the entire distance', 'a silica spinner, and the quietest person in the field by a margin'],
    ['Runa', '루나', 4, 'runs wide on the packed sand where the glass is thinnest', 'has cut her feet twice and does not intend to a third time'],
    ['Amir', '아미르', 13, 'takes the inside line through the ruins from the first metre', 'the shortest route through Hora belongs to him and always has'],
    ['Delia', '델리아', 8, 'makes one move where the last ruin gives way to open sand', 'a night runner forced into daylight racing and getting used to it'],
  ],
  con_nival: [
    ['Bjorn', '비외른', 2, 'takes the ridge front and breaks the snow for the whole field', 'a ridge warden who has done this for other people for twenty years'],
    ['Solveig', '솔베이그', 9, 'holds one pace across ground that never repeats', 'the most technically consistent runner on the continent'],
    ['Nils', '닐스', 16, 'runs the exposed half controlled and the sheltered half hard', 'reads wind chill the way others read a split'],
    ['Aino', '아이노', 6, 'does nothing at all until the last descent', 'a rescue volunteer who is very hard to hurry'],
    ['Erlend', '에를렌', 13, 'attacks repeatedly on the drifts until the field stops answering', 'runs best when the conditions are worst and knows it'],
    ['Mira', '미라', 4, 'lifts the pace a fraction each kilometre in falling snow', 'holds the continental long-distance record and does not mention it'],
    ['Havard', '호바르', 11, 'goes early on the ridge, which is close to reckless', 'has been rescued once and it has changed nothing'],
    ['Sanna', '산나', 7, 'runs behind whoever is breaking trail for as long as possible', 'entirely open that this is the correct thing to do'],
    ['Rurik', '루릭', 1, 'takes seconds out of the field on every switchback descent', 'grew up on the ridge and has never run on flat ground'],
    ['Ylva', '윌바', 14, 'locks onto one runner and matches them stride for stride all day', 'has never once been shaken off, in any race'],
    ['Tarjei', '타르예이', 10, 'lets the gap go in the whiteout and closes it when it clears', 'a snow forecaster with a very specific kind of patience'],
    ['Freya', '프레이야', 3, 'moves up one place per kilometre and never loses one back', 'sixty-one, and has beaten every age group she has ever been in'],
    ['Anders', '안데르스', 15, 'changes pace constantly so nobody can find a rhythm', 'says the ridge does the same and he is only being honest'],
    ['Kaia', '카이아', 8, 'runs one stride behind in silence for the whole ridge', 'the field describes her as a shadow with better footing'],
    ['Sigurd', '시구르드', 12, 'runs wide where the cornices are unsafe on the inside', 'lost a friend to a cornice and will not go near one'],
    ['Elin', '엘린', 5, 'holds the inside ridge line from the gun and never yields it', 'the boldest line on the continent and she has never fallen'],
    ['Torvald', '토르발', 9, 'makes one move where the ridge drops to the valley floor', 'a former champion who now paces others and still finishes top five'],
  ],
  con_kael: [
    ['Aeryn', '에린', 3, 'leads across the rope bridges where nobody will pass', 'a bridge rigger, and the wobble does not register for her'],
    ['Callum', '칼럼', 10, 'holds one pace across gaps that make the field hesitate', 'has crossed every bridge in the archipelago at full speed'],
    ['Nia', '니아', 7, 'runs the exposed crossings easy and the island sections hard', 'plans races island by island, out loud, to anyone nearby'],
    ['Teodor', '테오도르', 14, 'does nothing until the final island and then does everything', 'the most anticlimactic first hour and the fastest last ten minutes'],
    ['Suri', '수리', 1, 'attacks on every bridge until someone refuses to follow', 'the field has stopped following and she keeps doing it'],
    ['Rafe', '라페', 12, 'lifts the pace a fraction on every island for the whole route', 'a route surveyor who has measured all of it personally'],
    ['Halla', '할라', 5, 'goes on the first bridge, which is thirty kilometres too early', 'has done this eleven times and won twice, which she says is enough'],
    ['Devesh', '데베시', 9, 'shelters in the field over every exposed crossing', 'openly frightened of the height and races anyway, every time'],
    ['Marion', '마리옹', 16, 'takes time out of everyone at every bridge anchor turn', 'grew up on a tether and treats corners as free distance'],
    ['Otso', '옷소', 4, 'picks one runner at the gun and stays at their elbow all route', 'says the archipelago is too dangerous to race alone and means it'],
    ['Lumi', '루미', 11, 'lets the gap open over the water and closes it on solid ground', 'a wind-reader who knows exactly when the crossings calm'],
    ['Gareth', '가레스', 6, 'climbs one place per island and does not surrender any of them', 'has finished every race he has entered, which nobody else here can say'],
    ['Vespera', '베스페라', 13, 'never runs two bridges at the same pace', 'says predictability on a rope bridge is how people fall'],
    ['Jun', '준', 2, 'runs one stride behind, in silence, over every crossing', 'a tether-maker, and he trusts his own work absolutely'],
    ['Adaeze', '아다에제', 8, 'runs the wide anchor line where the boards are newest', 'inspects the bridges professionally and races the safe side'],
    ['Kestrin', '케스트린', 15, 'takes the inside anchor from the gun and never gives it up', 'the fastest line across the archipelago and it belongs to him'],
    ['Beatrix', '베아트릭스', 7, 'makes one move on the last crossing and it decides the race', 'races twice a year, wins one, and is unbothered about the other'],
  ],
  con_neris: [
    ['Thal', '탈', 4, 'leads through the pressure corridors where the field slows', 'an archive diver who is entirely comfortable at depth'],
    ['Reva', '레바', 11, 'holds one pace in an environment designed to prevent it', 'has never varied a split by more than two seconds in her life'],
    ['Odalys', '오달리스', 8, 'runs the deep half controlled and the shallow half hard', 'reads pressure gradients the way other runners read hills'],
    ['Pieter', '피터르', 15, 'waits out the whole ruin and goes in the last chamber', 'the field knows exactly what he will do and cannot prevent it'],
    ['Nyx', '닉스', 2, 'attacks in bursts through the flooded sections', 'a salvage runner who treats water as an ally'],
    ['Ekon', '에콘', 9, 'raises the pace a fraction every chamber for the whole ruin', 'the longest sustained effort anyone here has recorded'],
    ['Isaura', '이사우라', 6, 'goes in the second chamber, which is absurdly early', 'has won this way exactly once and considers it proof'],
    ['Roald', '로알', 13, 'stays in the field where the current is weakest', 'a pressure engineer, and he does the arithmetic constantly'],
    ['Sunniva', '순니바', 1, 'takes time out of everyone on the archive spiral turns', 'trained in the spiral and has never lost a metre in one'],
    ['Bao', '바오', 10, 'chooses one runner and matches them through the entire ruin', 'does not consider this tactics, only company'],
    ['Verity', '베리티', 7, 'lets the current open a gap and closes it in the still water', 'a lume-thread weaver with an unusual sense of timing'],
    ['Idris-Ka', '이드리스카', 16, 'moves up one place per chamber and never falls back', 'has raced here for nineteen years and improved every one of them'],
    ['Marek', '마레크', 3, 'never lets the field settle into any rhythm at all', 'says the depths already do this and he is being consistent'],
    ['Aisling', '아슬링', 12, 'runs one stride behind in complete silence, the whole way', 'nobody has heard her breathe in a race and it unsettles people'],
    ['Enitan', '에니탄', 5, 'runs the wide chamber line where the floor is sound', 'lost a season to a collapsed section and now checks everything'],
    ['Kasimir', '카시미르', 14, 'holds the inner spiral from the gun and defends it all race', 'the shortest route through the archive and he found it first'],
    ['Petra-Vey', '페트라베이', 9, 'makes one move where the ruin opens to the pressure hall', 'a quiet former record-holder who races for the hall section alone'],
  ],
  con_tempora: [
    ['Auberon', '오베론', 5, 'leads from the gun and sets a pace to a stated schedule', 'a clockmaster who announces his splits before the race and hits them'],
    ['Winsome', '윈섬', 12, 'runs an exactly even pace and will not be argued out of it', 'the most literal runner on the continent and proud of it'],
    ['Estel', '에스텔', 3, 'runs the first half under schedule and the second half over', 'has explained the arithmetic to anyone who will listen'],
    ['Roderick', '로데릭', 10, 'does nothing for fifty minutes and everything for four', 'a bell-keeper who understands exactly when a thing must happen'],
    ['Ilse', '일제', 7, 'attacks on every hour mark on the course, literally', 'the course has hour markers because she asked for them'],
    ['Anselm', '안셀름', 14, 'winds the pace up a fraction every kilometre for the distance', 'describes himself as a mainspring and nobody has corrected him'],
    ['Perpetua', '페르페투아', 1, 'goes at four minutes and holds on for fifty more', 'has done this every race for eleven years and won three'],
    ['Godfrey', '고드프리', 8, 'sits in the field and refuses to lead a single metre', 'says leading is a waste of a resource and he is not wrong'],
    ['Lisbet', '리스벳', 16, 'takes time out of the field on every bastion corner', 'a courier through the clockwork district, corners are her commute'],
    ['Emory', '에모리', 6, 'locks onto one rival at the gun and does not leave them', 'names the rival in advance, which they universally hate'],
    ['Sylvain', '실뱅', 13, 'lets a gap open on schedule and closes it on schedule', 'has a written plan and follows it exactly, including the losses'],
    ['Nell', '넬', 4, 'moves up one place every five minutes for the whole race', 'sixty-four, and she has done this in every race for a decade'],
    ['Bertrand', '베르트랑', 11, 'refuses to run two kilometres at the same pace, on principle', 'says a fortress running on borrowed time should not keep to one'],
    ['Ottoline', '오톨린', 2, 'runs one stride back matching everything, without a sound', 'a movement assembler used to very small, very quiet work'],
    ['Cassius', '카시우스', 9, 'runs the wide line where the cobbles are even', 'turned an ankle at twenty-two and has run wide ever since'],
    ['Verena', '베레나', 15, 'holds the inside from the first metre to the last', 'has led every race she has entered and finished most of them'],
    ['Thibault', '티보', 6, 'makes his single move on the hour, whatever the hour is', 'a former champion who now races only when the timing amuses him'],
  ],
  con_origin: [
    ['Ashwin', '아슈윈', 3, 'leads into the rift and does not look back once', 'the first runner to complete the worldline course, and he will not discuss it'],
    ['Nemesia', '네메시아', 10, 'runs one pace through terrain that is not consistent with itself', 'a rift surveyor whose job is to notice when the ground disagrees'],
    ['Corwin', '코윈', 7, 'runs the fractured half controlled and the stable half hard', 'has mapped which sections are which and shares the map freely'],
    ['Saoirse', '사오르시', 14, 'does nothing until the convergence and then everything', 'the most patient runner in the world by a considerable margin'],
    ['Yannick', '야닉', 1, 'attacks at every seam until the field stops following', 'says the seams are the only interesting part of the course'],
    ['Ilaria', '일라리아', 8, 'lifts the pace a fraction every kilometre through the rift', 'holds the fastest recorded time on the Apex Axis approach'],
    ['Dmitri', '드미트리', 5, 'goes at the first fracture, thirty kilometres from the line', 'has finished first once and last four times, and prefers the story'],
    ['Nour', '누르오', 12, 'shelters in the field through the unstable sections', 'entirely rational about a course that is not'],
    ['Bexley', '벡슬리', 16, 'takes time out of the field at every worldline turn', 'the turns are where the geometry stops working and she likes it'],
    ['Ragnar', '라그나르', 9, 'picks one runner at the gun and shadows them into the rift', 'says nobody should be alone in there and does something about it'],
    ['Talise', '탈리세', 6, 'lets the rift open a gap and closes it where it stabilises', 'a fracture analyst who knows exactly where the ground settles'],
    ['Orin', '오린', 13, 'moves up one place at a time from the back of the field', 'has started last, deliberately, in every race for six years'],
    ['Zaida', '자이다', 2, 'never holds a pace long enough for the rift to match it', 'has a theory about this that nobody has managed to disprove'],
    ['Lucius', '루시우스', 11, 'runs one stride back through the whole rift in total silence', 'the only person who has run the Axis approach without a light'],
    ['Marguerite', '마르게리트', 4, 'runs the wide line where the fractures are shallowest', 'has never taken a risk in a race and has never failed to finish'],
    ['Sevastian', '세바스티안', 15, 'takes the inner seam from the gun and holds it to the Axis', 'the shortest and worst line through Origin, and it is his'],
    ['Ondine', '온딘', 8, 'makes one move at the convergence and it settles the race', 'races once a year, at the Axis, and has never been beaten there'],
  ],
});
