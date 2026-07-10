# OlyApp

Generates a single Olympic weightlifting solo-training session on demand, based on
session length and recent training history — programmed the way a coach would, not a
dice roll. Built for Cara, an intermediate lifter who trains alone at a well-equipped
commercial gym.

**The app lives in [`web/`](web/)** — a static, no-build-step web app (vanilla
HTML/CSS/JS, installable as a home-screen PWA on iPhone), deployed straight from this
repo via GitHub Pages (`.github/workflows/deploy-pages.yml`). The earlier SwiftUI
prototype and the original v1 web generator were removed in the v2 rewrite; both are in
git history if ever needed.

## What the generator knows (v2)

The programming engine is built on the per-exercise "Programming" guidance from the
Catalyst Athletics exercise library and Greg Everett's program-design articles,
distilled into [`docs/catalyst-programming-notes.md`](docs/catalyst-programming-notes.md):

- **Big/little day alternation** — heavy comp lift + pull + squat days alternate with
  speed/technique/overhead days, like a real training week.
- **Non-linear loading schemes per lift and day intent** — sets across, ascending work
  with shrinking jumps and reps cut near the top, wave loading, heavy singles with
  back-off doubles, and RM top sets with back-offs computed from the day's top set.
  Warm-up ramps taper reps and abbreviate for lifts later in the session.
- **Catalyst percentage conventions** — pulls and deadlifts run off the snatch/clean
  max (80-110% / 80-120%); power variants off the power max (estimated from the full
  lift when not on file); snatch balance may exceed the best snatch.
- **Session order** — primers → competition lifts → receiving/overhead → pulls →
  squats → accessory with core folded in.
- **Reactive rules** — family rotation, 48h heavy-lift spacing, squat balance, misses
  capping the next heavy day at 85%, push/pull accessory alternation, heavy trunk work
  limited to 2-3 days/week.

Real weights (kg default, 15kg bar default, both configurable) with per-side plate
math are computed wherever a max is on file; missing maxes degrade to %-guidance with
an in-session entry prompt.

## Tracking

Sessions are tracked per set (done / missed on the competition lifts, actual weight
overrides), logged locally, and optionally synced across devices through a private
GitHub Gist (Settings → Cloud sync, needs a token with the `gist` scope). Logged
history is what drives the next generation.

## Development

```
cd web
npm test         # engine + sync unit tests (node --test, no dependencies)
python3 -m http.server 8123   # then open http://localhost:8123
```

No build step: edit, refresh, done. The engine (`web/js/engine/`) is pure JS with no
DOM dependencies so the programming rules stay unit-testable.
