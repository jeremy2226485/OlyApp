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
