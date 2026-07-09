# OlyApp — web

Static, no-build-step web app. Vanilla HTML/CSS/JS (ES modules, no bundler, no framework), data persisted client-side in `localStorage`. Installable to an iPhone home screen as a PWA for an app-like icon and offline shell.

## Run locally

Any static file server works — this is not a Node/build-tool project, it just needs to be served over HTTP (ES module imports don't work from `file://`).

```bash
cd web
npx http-server -p 8080 -s
# or: python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Run the tests

Pure-logic tests for the generator rules (`generator.test.js`), using Node's built-in test runner — no dependencies to install.

```bash
cd web
npm test
```

## Architecture

- `js/storage.js` — `localStorage` persistence for logged sessions and lifter maxes.
- `js/precedentLibrary.js` — the seed template bank: primary lift templates, accessory movement bank, tempo/pause variants, Cara's Clean/Jerk cues + required prep drills.
- `js/generator.js` — `generate()`, a pure rules engine implementing all nine v3 generation rules (family rotation, squat balance, push/pull balance, intensity spacing, core-folded-into-accessory, tempo variety, length-based block scaling, scaled warm-up with auto-inserted prep drills, lazy 1RM handling). No DOM/storage dependencies — same file the tests exercise directly.
- `js/state.js` — holds the in-progress generated (not-yet-logged) session across the New Session → Session Detail hand-off.
- `js/ui.js` — a tiny `el()` hyperscript-style DOM builder used by every view instead of `innerHTML`, so user-entered text (avoid-movement names, etc.) can never be interpreted as markup.
- `js/main.js` — hash-based router (`#/`, `#/new`, `#/session`, `#/history`, `#/maxes`) wiring the bottom tab bar to the five views.
- `js/views/` — the five screens: Home, New Session, Session Detail, History, Maxes.

## Deploying (GitHub Pages)

A workflow at `.github/workflows/deploy-pages.yml` runs the tests and deploys the `web/` folder on every push to `main` or this feature branch — no Mac, no local build step, just `git push`.

**One-time setup** (do this once in the GitHub repo settings, not per-deploy):

1. Repo → **Settings → Pages**.
2. Under "Build and deployment", set **Source** to **GitHub Actions**.

After that, every push that touches `web/**` triggers a deploy automatically, and the Actions tab shows the live URL (`https://<owner>.github.io/<repo>/`).

## Installing on an iPhone

Open the deployed URL in Safari → Share → **Add to Home Screen**. It launches full-screen with no browser chrome, using the manifest/service-worker in this folder for the app icon and basic offline caching of the app shell.

## Data safety

All data (sessions, maxes) lives only in this browser's `localStorage` — there's no backend, so nothing syncs across devices. A device reset, a switch to a new phone, or clearing Safari website data loses it. The Maxes screen has an **Export Data** / **Import Data** pair (`js/storage.js`: `exportAllData` / `importAllData`) that round-trips everything to/from a JSON file, so a backup taken before switching phones can be re-imported on the new one. There's no automatic cloud sync — this is a manual, user-triggered backup, matching the "no backend for v1" decision.

## Notable behaviors added post-v1

- **kg is the default unit** everywhere a weight is entered (max entry, both inline on Session Detail and on the Maxes screen).
- **"Specific lift(s) today"** on New Session lets Cara pick up to 2 lifts from a dropdown (grouped by category) to override the automatic rotation for that session; `generate()`'s `specifiedLifts` option fills whichever slot(s) match the chosen lift's category (competition vs. squat/pull) and leaves any remaining slot on auto-pick. The load/intensity-spacing rules in `buildPrimaryLift` still apply even to an explicitly chosen lift — an explicit pick overrides *which* lift is trained, not the safety capping on *how heavy*.
- **"Avoid a movement today"** is now a dropdown (grouped: Primary Lifts / Accessory Moves) instead of free text, so it can't drift out of sync with what the generator actually recognizes.
- **Physio-mandated prep drills** (Jerk: behind-the-neck push jerk in split / press in split / widen my split; Clean: tall muscle clean / tall clean, 5x each) render in a visually distinct "Required — `<lift>`" block within the warm-up card, grouped per lift and never interleaved with the general warm-up or another lift's drills. `buildWarmup()`'s `liftSpecificPrep` is structured per-lift (`{ liftName, requiredPrepDrills, buildUp }`) rather than a flat string list, specifically so the UI can group it.
