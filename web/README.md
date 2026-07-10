# OlyApp — web

Static, no-build-step web app. Vanilla HTML/CSS/JS (ES modules, no bundler, no
framework), data persisted client-side in `localStorage` with optional gist sync.
Installable to an iPhone home screen as a PWA for an app-like icon and offline shell.

## Run locally

Any static file server works — ES module imports don't work from `file://`.

```bash
cd web
python3 -m http.server 8080
# or: npx http-server -p 8080 -s
```

Open `http://localhost:8080`.

## Run the tests

Pure-logic tests for the programming engine and sync decision logic, using Node's
built-in test runner — no dependencies to install.

```bash
cd web
npm test
```

## Architecture

- `js/data/exercises.js` — the exercise library with per-lift programming knowledge:
  which max its percentages reference (pulls run off the snatch/clean max, Catalyst
  convention), estimate fallbacks (power snatch ≈ 85% of snatch), session slot
  (primer / comp / receiving / pull / squat), big-vs-little systemic load, and one
  loading profile per day intent. Sourced from `../docs/catalyst-programming-notes.md`.
- `js/data/accessories.js` — the accessory bank (pulling / pressing / posterior /
  unilateral + a heavy/light core split per Everett's trunk-work guidance).
- `js/engine/schemes.js` — loading-scheme builders: sets across, ascending work with
  shrinking jumps, waves, heavy single + back-off doubles, RM top set + back-offs
  computed from the day's top set, 1RM test, and warm-up ramps (rep-tapered, and
  abbreviated for lifts later in the session). Pure percent logic, no kg.
- `js/engine/weights.js` — max resolution (with flagged estimates), rounding to the
  configured smallest jump, per-side plate math off the configured bar weight
  (defaults: kg, 15kg bar, 1kg jumps).
- `js/engine/planner.js` — session assembly: big/little day alternation, snatch↔C&J
  family rotation, 48h heavy-lift spacing, squat balance, miss-derived intensity
  caps, time budgeting by session length, warm-up with required prep drills grouped
  per lift, accessory round with core folded in.
- `js/lib/storage.js` — `localStorage` persistence (schema v2: settings, maxes keyed
  by lift, logged sessions, in-progress session).
- `js/lib/sync.js` — optional cloud sync via a private GitHub Gist (token with `gist`
  scope, entered in Settings). Last-write-wins on the whole backup; v2 writes
  `olyapp-data-v2.json` inside the same auto-managed gist, leaving any v1 file
  untouched. Syncs on app open, on backgrounding, and after key mutations.
- `js/views/` — Home, Generate (length / day type / focus / avoid), Session (per-set
  check-off, make/miss on competition lifts, actual-weight overrides, inline max
  entry), History (per-block top % and make/miss tallies), Settings (units, bar
  weight, smallest jump, 1RMs, sync, backup export/import).

The engine has no DOM/storage dependencies — the same files the tests exercise
directly.

## Deploying (GitHub Pages)

`.github/workflows/deploy-pages.yml` runs the tests and deploys `web/` on every push
to `main` or the feature branch. One-time setup: repo → Settings → Pages → set
**Source** to **GitHub Actions**. The live URL is `https://<owner>.github.io/<repo>/`.

## Installing on an iPhone

Open the deployed URL in Safari → Share → **Add to Home Screen**. It launches
full-screen using the manifest/service-worker here for the icon and offline caching.

## In-workout flow

A generated session is a **draft** — reroll or discard freely, weights recompute if a
missing max is entered inline. **Start workout** locks it in as the current workout
(durable across tab switches, app switches and reloads — it lives in `localStorage`).
Each set is tapped off as done; competition-lift sets can be marked as misses (two
misses at ≥85% cap that lift's next heavy day at 85%). Tapping a set's weight records
what was actually lifted. **Finish & log** writes the session to history (offering to
save a new 1RM if an attempt beat the stored max), which drives the next generation.
