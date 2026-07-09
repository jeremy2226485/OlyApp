// Client-side persistence. No backend required for the core app — everything
// lives in localStorage on the device. Optional cloud sync (sync.js) is a
// thin layer on top that reads/writes through exportAllData/importAllData;
// this file stays the single source of truth either way.

const SESSIONS_KEY = "olyapp.sessions";
const MAXES_KEY = "olyapp.maxes";
const LAST_MODIFIED_KEY = "olyapp.lastModified";

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Bumped on every local mutation so sync.js can tell whether this device's
// copy or the remote copy is more recent. Import paths that are themselves
// applying a remote/backup snapshot pass `at` explicitly so they record that
// snapshot's timestamp rather than "now" (see importAllData below).
export function getLastModified() {
  return localStorage.getItem(LAST_MODIFIED_KEY);
}

function touchLastModified(at = new Date().toISOString()) {
  localStorage.setItem(LAST_MODIFIED_KEY, at);
  return at;
}

export function getSessions() {
  const sessions = readJSON(SESSIONS_KEY, []);
  return sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function addLoggedSession(session) {
  const sessions = readJSON(SESSIONS_KEY, []);
  sessions.push({ id: uid(), ...session });
  writeJSON(SESSIONS_KEY, sessions);
  touchLastModified();
}

export function deleteLoggedSession(id) {
  const sessions = readJSON(SESSIONS_KEY, []).filter((s) => s.id !== id);
  writeJSON(SESSIONS_KEY, sessions);
  touchLastModified();
}

export function getMaxes() {
  const maxes = readJSON(MAXES_KEY, []);
  return maxes.sort((a, b) => a.liftName.localeCompare(b.liftName));
}

export function addMax(max) {
  const maxes = readJSON(MAXES_KEY, []);
  maxes.push({ id: uid(), ...max });
  writeJSON(MAXES_KEY, maxes);
  touchLastModified();
}

export function updateMax(id, patch) {
  const maxes = readJSON(MAXES_KEY, []);
  const idx = maxes.findIndex((m) => m.id === id);
  if (idx === -1) return;
  maxes[idx] = { ...maxes[idx], ...patch };
  writeJSON(MAXES_KEY, maxes);
  touchLastModified();
}

export function deleteMax(id) {
  const maxes = readJSON(MAXES_KEY, []).filter((m) => m.id !== id);
  writeJSON(MAXES_KEY, maxes);
  touchLastModified();
}

export function findMaxByLiftName(liftName) {
  return getMaxes().find((m) => m.liftName.toLowerCase() === liftName.toLowerCase());
}

// Backup/restore + sync payload shape. `lastModified` is what sync.js uses
// to decide whether the local copy or a remote copy is newer.
export function exportAllData() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    lastModified: getLastModified(),
    sessions: readJSON(SESSIONS_KEY, []),
    maxes: readJSON(MAXES_KEY, []),
  };
}

// `options.at`: when applying a remote/backup snapshot (sync pull, file
// import), record that snapshot's own timestamp instead of "now" — otherwise
// every pull would look like a brand-new local edit and immediately trigger
// a redundant push right back up.
export function importAllData(data, options = {}) {
  if (!data || !Array.isArray(data.sessions) || !Array.isArray(data.maxes)) {
    throw new Error("That file doesn't look like an OlyApp export.");
  }
  writeJSON(SESSIONS_KEY, data.sessions);
  writeJSON(MAXES_KEY, data.maxes);
  touchLastModified(options.at ?? new Date().toISOString());
}
