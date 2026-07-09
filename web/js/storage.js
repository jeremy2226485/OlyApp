// Client-side persistence. No backend for v1 — everything lives in
// localStorage on the device, mirroring the spec's "no backend needed."

const SESSIONS_KEY = "olyapp.sessions";
const MAXES_KEY = "olyapp.maxes";

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

export function getSessions() {
  const sessions = readJSON(SESSIONS_KEY, []);
  return sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function addLoggedSession(session) {
  const sessions = readJSON(SESSIONS_KEY, []);
  sessions.push({ id: uid(), ...session });
  writeJSON(SESSIONS_KEY, sessions);
}

export function deleteLoggedSession(id) {
  const sessions = readJSON(SESSIONS_KEY, []).filter((s) => s.id !== id);
  writeJSON(SESSIONS_KEY, sessions);
}

export function getMaxes() {
  const maxes = readJSON(MAXES_KEY, []);
  return maxes.sort((a, b) => a.liftName.localeCompare(b.liftName));
}

export function addMax(max) {
  const maxes = readJSON(MAXES_KEY, []);
  maxes.push({ id: uid(), ...max });
  writeJSON(MAXES_KEY, maxes);
}

export function updateMax(id, patch) {
  const maxes = readJSON(MAXES_KEY, []);
  const idx = maxes.findIndex((m) => m.id === id);
  if (idx === -1) return;
  maxes[idx] = { ...maxes[idx], ...patch };
  writeJSON(MAXES_KEY, maxes);
}

export function deleteMax(id) {
  const maxes = readJSON(MAXES_KEY, []).filter((m) => m.id !== id);
  writeJSON(MAXES_KEY, maxes);
}

export function findMaxByLiftName(liftName) {
  return getMaxes().find((m) => m.liftName.toLowerCase() === liftName.toLowerCase());
}
