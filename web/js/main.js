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

function render() {
  const view = routes[location.hash] ?? renderHome;
  const app = clear(document.getElementById("app"));
  view(app);
  for (const link of document.querySelectorAll("[data-nav]")) {
    const active = link.getAttribute("href") === (location.hash || "#/");
    link.classList.toggle("active", active);
  }
  window.scrollTo(0, 0);
}

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
