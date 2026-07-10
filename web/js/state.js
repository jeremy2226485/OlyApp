// Holds the in-progress generated (not-yet-logged) session, in localStorage
// rather than sessionStorage — sessionStorage can be cleared by iOS more
// aggressively for an installed home-screen web app than a regular Safari
// tab (backgrounding/switching away and back isn't guaranteed to preserve
// it), which was losing Cara's generated workout when she switched tabs.
// localStorage doesn't have that problem and matches how sessions/maxes are
// already persisted.
//
// A freshly generated session is a "draft" — still swappable, not yet
// committed to. Calling startCurrentSession() locks it in as "started" (see
// sessionDetail.js), at which point it's "the current workout": reachable
// from Home from anywhere in the app, and safe to walk away from and come
// back to later since it's durably saved either way.

const KEY = "olyapp.currentSession";

export function setCurrentSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function getCurrentSession() {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearCurrentSession() {
  localStorage.removeItem(KEY);
}

export function startCurrentSession(session) {
  const started = { ...session, status: "started", startedAt: new Date().toISOString() };
  setCurrentSession(started);
  return started;
}
