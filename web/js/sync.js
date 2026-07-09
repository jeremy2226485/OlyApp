// Optional automatic cross-device sync, backed by a private GitHub Gist as
// a free JSON blob store. Entirely best-effort on top of storage.js — local
// data in localStorage is always the source of truth for this device; a
// failed or never-configured sync never blocks anything, it just means this
// device's data stays local until the next successful sync.
//
// Concurrency note: this is last-write-wins on the *whole* backup, not a
// field-level merge. Safe for "use phone A today, phone B tomorrow." Not
// safe for editing on two unsynced devices at the same time — whichever
// syncs second overwrites the other's changes. Fine for one person's own
// training log, not a general-purpose multi-writer sync.

import { exportAllData, importAllData, getLastModified } from "./storage.js";

const CONFIG_KEY = "olyapp.syncConfig";
const GIST_DESCRIPTION = "OlyApp data backup (auto-managed — do not rename or delete)";
const GIST_FILENAME = "olyapp-data.json";
const API = "https://api.github.com";

let lastStatus = { state: "idle", message: null, at: null };

function setStatus(state, message) {
  lastStatus = { state, message, at: new Date().toISOString() };
}

export function getSyncStatus() {
  return lastStatus;
}

export function getSyncConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY));
  } catch {
    return null;
  }
}

function saveSyncConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function isSyncConfigured() {
  const config = getSyncConfig();
  return !!(config && config.token && config.gistId);
}

export function disconnectSync() {
  localStorage.removeItem(CONFIG_KEY);
  setStatus("idle", null);
}

async function githubFetch(path, token, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
  return res.json();
}

async function findOrCreateGist(token) {
  const gists = await githubFetch("/gists", token);
  const existing = gists.find((g) => g.description === GIST_DESCRIPTION);
  if (existing) return existing.id;

  const created = await githubFetch("/gists", token, {
    method: "POST",
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: { [GIST_FILENAME]: { content: JSON.stringify(exportAllData(), null, 2) } },
    }),
  });
  return created.id;
}

// Connects this device: validates the token, finds this account's existing
// backup gist (so a second device using a token from the same GitHub
// account automatically finds the first device's data) or creates one, then
// runs an initial sync.
export async function connectSync(token) {
  setStatus("syncing", null);
  try {
    await githubFetch("/user", token);
    const gistId = await findOrCreateGist(token);
    saveSyncConfig({ token, gistId });
    return await runSync();
  } catch (err) {
    setStatus("error", err.message);
    throw err;
  }
}

async function pullRemote(config) {
  const gist = await githubFetch(`/gists/${config.gistId}`, config.token);
  const file = gist.files[GIST_FILENAME];
  if (!file) return null;
  try {
    return JSON.parse(file.content);
  } catch {
    return null;
  }
}

async function pushRemote(config) {
  await githubFetch(`/gists/${config.gistId}`, config.token, {
    method: "PATCH",
    body: JSON.stringify({
      files: { [GIST_FILENAME]: { content: JSON.stringify(exportAllData(), null, 2) } },
    }),
  });
}

// Pure decision, kept separate from the network calls so it's unit-testable
// without mocking fetch.
export function resolveSyncDirection(localModified, remoteModified) {
  if (!remoteModified) return "push";
  if (!localModified) return "pull";
  return new Date(remoteModified) > new Date(localModified) ? "pull" : "push";
}

let syncInFlight = null;

// Safe to call anytime, from anywhere, as often as you like — no-ops if
// sync isn't configured, and overlapping calls coalesce into one request.
export function syncNow() {
  if (!isSyncConfigured()) return Promise.resolve({ state: "unconfigured" });
  if (!syncInFlight) {
    syncInFlight = runSync().finally(() => {
      syncInFlight = null;
    });
  }
  return syncInFlight;
}

async function runSync() {
  const config = getSyncConfig();
  setStatus("syncing", null);
  try {
    const remote = await pullRemote(config);
    const direction = resolveSyncDirection(getLastModified(), remote?.lastModified ?? null);
    if (direction === "pull" && remote) {
      importAllData(remote, { at: remote.lastModified });
      setStatus("synced", "pulled");
      return { state: "pulled" };
    }
    await pushRemote(config);
    setStatus("synced", "pushed");
    return { state: "pushed" };
  } catch (err) {
    setStatus("error", err.message);
    return { state: "error", message: err.message };
  }
}
