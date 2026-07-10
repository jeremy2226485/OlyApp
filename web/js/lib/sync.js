// Optional cross-device sync backed by a private GitHub Gist (the user has a
// token). Last-write-wins on the whole backup — fine for one lifter moving
// between devices, not a multi-writer merge.
//
// v2 writes a NEW file inside the same auto-managed gist
// (olyapp-data-v2.json) so the old app's v1 file is left untouched.

import { exportAllData, importAllData, getLastModified } from "./storage.js";

const CONFIG_KEY = "olyapp.syncConfig";
const GIST_DESCRIPTION = "OlyApp data backup (auto-managed — do not rename or delete)";
const GIST_FILENAME = "olyapp-data-v2.json";
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

export function isSyncConfigured() {
  const c = getSyncConfig();
  return !!(c && c.token && c.gistId);
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

export async function connectSync(token) {
  setStatus("syncing", null);
  try {
    await githubFetch("/user", token);
    const gistId = await findOrCreateGist(token);
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ token, gistId }));
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

// Pure decision, unit-testable without mocking fetch.
export function resolveSyncDirection(localModified, remoteModified) {
  if (!remoteModified) return "push";
  if (!localModified) return "pull";
  return new Date(remoteModified) > new Date(localModified) ? "pull" : "push";
}

let inFlight = null;

export function syncNow() {
  if (!isSyncConfigured()) return Promise.resolve({ state: "unconfigured" });
  if (!inFlight) {
    inFlight = runSync().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function runSync() {
  const config = getSyncConfig();
  setStatus("syncing", null);
  try {
    const remote = await pullRemote(config);
    const direction = resolveSyncDirection(getLastModified(), remote?.lastModified ?? null);
    if (direction === "pull" && remote) {
      try {
        importAllData(remote, { at: remote.lastModified });
        setStatus("synced", "pulled");
        return { state: "pulled" };
      } catch {
        // Remote blob isn't a valid v2 export — replace it with ours.
      }
    }
    await pushRemote(config);
    setStatus("synced", "pushed");
    return { state: "pushed" };
  } catch (err) {
    setStatus("error", err.message);
    return { state: "error", message: err.message };
  }
}
