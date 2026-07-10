# Programming knowledge base (distilled from Catalyst Athletics)

Collected July 2026 from the Catalyst Athletics exercise library and program-design
articles (Greg Everett). Direct crawling of catalystathletics.com was blocked from the
build environment, so this was assembled from indexed page content per-exercise plus
the program-design articles. It drives `web/js/data/exercises.js` and
`web/js/engine/schemes.js` — update those if you update this.

## Percentage reference conventions

- Percentages are of the 1RM of **the exercise itself**, EXCEPT snatch/clean **pulls,
  high-pulls and deadlifts**, which are percentages of the lifter's best **snatch or
  clean** (not of a pull max).
- Power variants are % of best **power** snatch/clean/jerk. When no power max is on
  file, a reasonable estimate is ~85% of the full lift's max.

## Per-exercise prescriptions (exercise library "Programming" sections)

| Exercise | Reps/set | Load | Notes |
|---|---|---|---|
| Snatch | 1-3 | 70-100% | Trained in some form 2-3+ days/week |
| Clean | 1-3 | 70-100% | |
| Jerk (split) | 1-3 | 70-100% | |
| Clean & Jerk | 1+1 style | 70-100% | Reps notated clean+jerk (e.g. 1+1) |
| Power snatch / power clean / power jerk | 1-3 | 70-100% of best power variant | Lighter day variation; speed/aggression |
| Hang snatch / hang clean | 1-3 | technique ≤75-80%; aggression 75%+; lighter-day ~70-80% | Postural strength from the hang |
| Muscle snatch / muscle clean | 3-5 (singles/doubles when heavy) | ~50-65% of snatch/clean | Technique primer early in session, e.g. 60% 3x4 |
| Tall snatch / tall clean | 2-3 | ~25-30(-35)% | Technique primer, lighter is better |
| Snatch balance | 1-3 | 70-100%+ of snatch | Mid-session: after speed/technique lifts, before pulls/squats; exceeding best snatch builds confidence |
| Overhead squat | 1-3 (to 5) | heavy relative to snatch | Most basic receiving-position strength lift |
| Snatch push press | 2-5 | ~75-100%+ of snatch | Overhead strength; also feeds OHS complexes |
| Snatch pull / clean pull | 2-5 | 80-110% of snatch/clean | Technically-limited lifters should go heavier than the % suggests |
| Snatch/clean high-pull | 2-5 | 70-90% | Elbow height limits load |
| Snatch/clean deadlift | 2-6 | 80-120% | Slower; posture/position focus |
| Back squat | 1-5 (to 10 in early prep) | heavy | Near end of session |
| Front squat | 1-5, fewer than back squat | heavy | Upright posture, quad strength |
| Pause squats | 2-3 (never >5) | ~80-90% of the normal squat's load | 2-3s pause kills the stretch reflex; longer adds only trunk work |
| Push press | 1-6 | ~75-85% of jerk | Dip/drive + overhead strength |
| Power jerk / BTN jerk | 1-3 | 70-100% of variant | BTN easier to position — confidence builder |
| Push jerk BTN in split (prep drill) | 3-5 | empty bar to 60-70% of jerk | Teaching/remediation |
| RDL | 3-8 | ~40-70% of back squat | Posterior chain support |
| Good morning | 5-10 | light-moderate | High DOMS cost — program with care |
| Trunk work | unweighted 10-30+, weighted 8-15, planks 20-30s (add weight) | | Ab work every training day; *heavy* trunk only 2-3 days/week |

## Session order (Exercise Order article + per-exercise placement notes)

1. Technique primers / speed work (muscle & tall variants) — first, while fresh.
2. Competition lifts and fast variants (snatch, clean & jerk, power variants).
3. Receiving-position / overhead strength (snatch balance, OHS, push press, jerk work).
4. Pulls / deadlifts.
5. Squats — near the end, after everything speed/technique dependent.
6. Trunk + accessory work last.

Minimise setup changes (e.g. OHS directly after pulls rather than sandwiched between).

## Day structure ("The Week Structure")

Alternate **big** and **little** days when training >3 days/week:

- **Big** = heavy snatch or clean & jerk + pulls + squats — the systemically taxing work.
- **Little** = speed/technique/overhead work (jerk drills, OHS, snatch balance, push
  press) — inherently limited intensity even when effort is high.
- ~3 sessions/week: days can be roughly equal (rest day before each).

## Set/rep escalation (from Catalyst program prescriptions)

Work sets are **not** a linear ramp of identical reps:

- Standard notation is *sets across*: `75% x 2 x 5` = 5 sets of 2 at the same weight.
- Heavy days: work **up in singles/doubles** past the flat zone — jumps get smaller as
  the bar gets heavier, reps drop to 1 near the top, and the top is a *heavy single*
  (~88-93%), not an everyday max.
- Waves: `(72%x2, 77%x2, 82%x1) x 2` with the second wave nudged up 2-3%.
- RM days (squats): work to a heavy set of N ("nRM for the day"), then back-off sets at
  95% and 90% **of that day's top set**, same reps.
- Warm-up: empty bar first, then a few larger jumps with reps cut as weight climbs so
  fatigue doesn't accumulate before work sets.
- True 1RM testing is an explicit, occasional session type — never the default.

## Complexes (Getting Started with the Basics)

Best in preparatory phases. Purpose is to pre-fatigue an element of the lift (e.g. pull
+ snatch) or to force correct receiving height (power + hang variations). Load is
limited by the weakest piece of the complex — moderate weights, ~55-70%.

## Pulls caveat (The Trouble with Pulls)

For technique-limited lifters the standard 80-105% pull range is too light to drive
strength; the app biases pull loading toward the top of the range and lets the user
push above it.
