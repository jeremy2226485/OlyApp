// App shell: hash router + service worker + opportunistic sync.

import { clear } from "./lib/dom.js";
import { syncNow } from "./lib/sync.js";
import { renderHome } from "./views/home.js";
import { renderGenerate } from "./views/generate.js";
import { renderSession } from "./views/session.js";
import { renderHistory } from "./views/history.js";
import { renderSettings } from "./views/settings.js";

const routes = {
  "": renderHome,
  "#/": renderHome,
  "#/generate": renderGenerate,
  "#/session": renderSession,
  "#/history": renderHistory,
  "#/settings": renderSettings,
};

function setMenuOpen(open) {
  const menu = document.getElementById("menu");
  const btn = document.getElementById("menu-btn");
  if (!menu || !btn) return;
  menu.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
  btn.textContent = open ? "✕" : "☰";
}

function render() {
  // Route on the path part only — "#/history?open=<id>" still renders history,
  // with the query left for the view to read (deep-linking a specific card).
  const path = (location.hash || "#/").split("?")[0];
  const view = routes[path] ?? renderHome;
  const app = clear(document.getElementById("app"));
  view(app);
  for (const link of document.querySelectorAll("[data-nav]")) {
    link.classList.toggle("active", link.getAttribute("href") === path);
  }
  setMenuOpen(false); // navigating closes the menu
  window.scrollTo(0, 0);
}

document.addEventListener("click", (e) => {
  const btn = document.getElementById("menu-btn");
  const menu = document.getElementById("menu");
  if (!btn || !menu) return;
  if (btn.contains(e.target)) {
    setMenuOpen(menu.hidden);
  } else if (e.target.closest("#menu a[data-nav]")) {
    setMenuOpen(false); // picking a link closes, even the already-active one
  } else if (!menu.hidden && !menu.contains(e.target)) {
    setMenuOpen(false); // tap outside dismisses
  }
});

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);
if (document.readyState !== "loading") render();

// Sync on open (fire-and-forget — local data already painted), and push local
// changes up whenever the app is backgrounded.
syncNow().then((r) => {
  if (r.state === "pulled") render();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") syncNow();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
