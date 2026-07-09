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

All data (sessions, maxes) lives in this browser's `localStorage` first — that's still the source of truth on every device, and the app works fully offline-first regardless of sync state. Two ways to get it off a single device:

- **Export / Import** (Maxes screen): a manual, one-tap JSON download / re-upload. Zero setup, zero external accounts. Good for an occasional point-in-time backup.
- **Cloud Sync** (Maxes screen, see below): automatic, using a private GitHub Gist as storage.

### Cloud Sync

`js/sync.js` implements sync against a private GitHub Gist, using the GitHub REST API directly from the browser (GitHub's API supports CORS for exactly this kind of client-side use — no proxy/backend needed).

**Why a Gist and not real File System / local autosave:** browsers (Safari on iOS in particular) don't let a webpage silently write to a file on the device — that's blocked for security reasons everywhere, not a Safari-specific gap. The only way to get *automatic* (not manually re-triggered) sync is some network-reachable store, and a Gist is the lightest-weight one that doesn't require standing up a backend.

**Setup (once per device):** Settings → Developer settings → Personal access tokens → **Tokens (classic)** on GitHub, generate one with only the **`gist`** scope checked, paste it into the Cloud Sync card on the Maxes screen. A token from the *same GitHub account* on a second device automatically finds the first device's backup gist (matched by a fixed description, `js/sync.js`'s `GIST_DESCRIPTION`) — no gist ID or link needs to be copied around.

**When it syncs:** on every app open/reload (`js/main.js`, fire-and-forget on boot, re-renders the current screen if it pulled newer data) and after every local mutation (add/edit/delete a max, delete a session, Mark Complete, import) — a strict superset of "open/reload/complete." `js/storage.js` tracks a `lastModified` timestamp bumped on every mutation; `resolveSyncDirection()` in `js/sync.js` (unit-tested in `sync.test.js`) compares local vs. remote and pulls or pushes whichever is older.

**Conflict model — last-write-wins on the whole backup, not a field-level merge.** Safe for "use phone A today, phone B tomorrow." *Not* safe for editing on two devices at the same time without syncing in between — whichever device syncs second overwrites the other's unsynced changes wholesale. This is a deliberate simplification for a single person's own training log, not a general multi-writer sync system.

**Failure handling:** sync is always best-effort. A bad/expired token, no network, or a deleted gist just shows an error status on the Maxes screen — local data is untouched and the app keeps working normally either way.

**Token storage:** the PAT lives in this browser's `localStorage` (`olyapp.syncConfig`), scoped only to `gist` if you followed the setup instructions above (can't touch repos or anything else on the account). It never leaves the device except in Authorization headers sent directly to `api.github.com`.

## Notable behaviors added post-v1

- **kg is the default unit** everywhere a weight is entered (max entry, both inline on Session Detail and on the Maxes screen).
- **"Specific lift(s) today"** on New Session lets Cara pick up to 2 lifts from a dropdown (grouped by category) to override the automatic rotation for that session; `generate()`'s `specifiedLifts` option fills whichever slot(s) match the chosen lift's category (competition vs. squat/pull) and leaves any remaining slot on auto-pick. The load/intensity-spacing rules in `buildPrimaryLift` still apply even to an explicitly chosen lift — an explicit pick overrides *which* lift is trained, not the safety capping on *how heavy*.
- **"Avoid a movement today"** is now a dropdown (grouped: Primary Lifts / Accessory Moves) instead of free text, so it can't drift out of sync with what the generator actually recognizes.
- **"Swap Lift" on Session Detail** is a dropdown (defaulted to the currently displayed lift) plus an explicit Swap button, not a random-cycle button — she picks exactly what she wants instead of re-clicking and hoping.
- **Physio-mandated prep drills** (Jerk: behind-the-neck push jerk in split / press in split / widen my split; Clean: tall muscle clean / tall clean, 5x each) render in a visually distinct "Required — `<lift>`" block within the warm-up card, grouped per lift and never interleaved with the general warm-up or another lift's drills. `buildWarmup()`'s `liftSpecificPrep` is structured per-lift (`{ liftName, requiredPrepDrills, buildUp }`) rather than a flat string list, specifically so the UI can group it. The general prep list is trimmed (down to a floor of 2 items) in proportion to how many required drills are present, so the required drills are additive *within* the rule-8 time budget rather than silently making the real warm-up run longer than the displayed estimate.
- **Cloud Sync** — see above.
