// Holds the in-progress generated (not-yet-logged) session in memory, with a
// sessionStorage backup so a page refresh on the Session Detail screen
// doesn't lose it.

const KEY = "olyapp.currentSession";
let currentSession = null;

export function setCurrentSession(session) {
  currentSession = session;
  sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function getCurrentSession() {
  if (currentSession) return currentSession;
  const raw = sessionStorage.getItem(KEY);
  if (raw) {
    currentSession = JSON.parse(raw);
    return currentSession;
  }
  return null;
}

export function clearCurrentSession() {
  currentSession = null;
  sessionStorage.removeItem(KEY);
}
