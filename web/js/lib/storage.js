// Client-side persistence (schema v2 — fresh start for the rebuilt app; v1
// data from the previous generator is intentionally not migrated).
// Everything lives in localStorage; sync.js layers optional gist backup on
// top through exportAllData/importAllData.

const KEYS = {
  settings: "olyapp.v2.settings",
  maxes: "olyapp.v2.maxes",
  sessions: "olyapp.v2.sessions",
  current: "olyapp.v2.current",
  familyNotes: "olyapp.v2.familyNotes",
  lastModified: "olyapp.v2.lastModified",
};

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

function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

export function getLastModified() {
  return localStorage.getItem(KEYS.lastModified);
}

function touch(at = new Date().toISOString()) {
  localStorage.setItem(KEYS.lastModified, at);
}

// ── Settings ──────────────────────────────────────────────────────────

export const SETTINGS_DEFAULTS = { unit: "kg", barWeight: 15, increment: 1 };

export function getSettings() {
  return { ...SETTINGS_DEFAULTS, ...readJSON(KEYS.settings, {}) };
}

export function saveSettings(patch) {
  writeJSON(KEYS.settings, { ...getSettings(), ...patch });
  touch();
}

// ── Maxes (keyed by maxRef: snatch, clean, backSquat, ...) ────────────

export function getMaxes() {
  return readJSON(KEYS.maxes, {});
}

// Flat {key: value} view for the planner.
export function getMaxValues() {
  const out = {};
  for (const [k, v] of Object.entries(getMaxes())) {
    if (v && v.value > 0) out[k] = v.value;
  }
  return out;
}

export function setMax(key, value) {
  const maxes = getMaxes();
  if (value == null || !(value > 0)) delete maxes[key];
  else maxes[key] = { value, dateSet: new Date().toISOString() };
  writeJSON(KEYS.maxes, maxes);
  touch();
}

// ── Lift-family notes ─────────────────────────────────────────────────
// One free-text note per lift family (snatch / clean / jerk / squat) that
// persists across workouts — the same note shows on every lift in that
// family, so "quicker elbows on the turnover" written under power clean is
// there next clean day too.

export function getFamilyNotes() {
  return readJSON(KEYS.familyNotes, {});
}

export function getFamilyNote(family) {
  return getFamilyNotes()[family] ?? "";
}

export function setFamilyNote(family, text) {
  const notes = getFamilyNotes();
  if (text && text.trim()) notes[family] = text;
  else delete notes[family];
  writeJSON(KEYS.familyNotes, notes);
  touch();
}

// ── Logged sessions ───────────────────────────────────────────────────

export function getSessions() {
  return readJSON(KEYS.sessions, []).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function addSession(session) {
  const sessions = readJSON(KEYS.sessions, []);
  sessions.push({ id: uid(), ...session });
  writeJSON(KEYS.sessions, sessions);
  touch();
}

export function deleteSession(id) {
  writeJSON(KEYS.sessions, readJSON(KEYS.sessions, []).filter((s) => s.id !== id));
  touch();
}

// ── Current (in-progress) session ─────────────────────────────────────
// localStorage, not sessionStorage — iOS clears sessionStorage aggressively
// for installed home-screen web apps, which lost in-progress workouts before.

export function getCurrentSession() {
  return readJSON(KEYS.current, null);
}

export function setCurrentSession(session) {
  writeJSON(KEYS.current, session);
}

export function clearCurrentSession() {
  localStorage.removeItem(KEYS.current);
}

// ── Backup / sync payload ─────────────────────────────────────────────

export function exportAllData() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    lastModified: getLastModified(),
    settings: readJSON(KEYS.settings, {}),
    maxes: readJSON(KEYS.maxes, {}),
    sessions: readJSON(KEYS.sessions, []),
    familyNotes: readJSON(KEYS.familyNotes, {}),
  };
}

export function importAllData(data, options = {}) {
  if (!data || data.version !== 2 || !Array.isArray(data.sessions)) {
    throw new Error("Not an OlyApp v2 export.");
  }
  writeJSON(KEYS.settings, data.settings ?? {});
  writeJSON(KEYS.maxes, data.maxes ?? {});
  writeJSON(KEYS.sessions, data.sessions);
  writeJSON(KEYS.familyNotes, data.familyNotes ?? {});
  // Record the snapshot's own timestamp so a sync pull doesn't immediately
  // look like a fresh local edit and push right back up.
  touch(options.at ?? new Date().toISOString());
}
