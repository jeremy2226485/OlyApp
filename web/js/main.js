import { render as renderHome } from "./views/home.js";
import { render as renderNewSession } from "./views/newSession.js";
import { render as renderSessionDetail } from "./views/sessionDetail.js";
import { render as renderHistory } from "./views/history.js";
import { render as renderMaxes } from "./views/maxes.js";
import { syncNow } from "./sync.js";

const routes = {
  "#/": renderHome,
  "#/new": renderNewSession,
  "#/session": renderSessionDetail,
  "#/history": renderHistory,
  "#/maxes": renderMaxes,
};

const root = document.getElementById("app");
const navLinks = document.querySelectorAll("[data-nav]");

function currentRoute() {
  return location.hash || "#/";
}

function updateNavActiveState() {
  const route = currentRoute();
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === route);
  });
}

function renderRoute() {
  const route = currentRoute();
  const renderFn = routes[route] ?? renderHome;
  root.innerHTML = "";
  renderFn(root);
  updateNavActiveState();
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", renderRoute);
window.addEventListener("DOMContentLoaded", renderRoute);

if (document.readyState !== "loading") {
  renderRoute();
}

// Sync on open/reload. Fire-and-forget: the current route already rendered
// from local data above, so this can't block first paint. If the sync pulls
// newer data from another device, re-render whatever route is still active
// so it doesn't sit stale until the next navigation.
syncNow().then((result) => {
  if (result.state === "pulled") renderRoute();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // Offline installability is a nice-to-have; ignore registration failures.
    });
  });
}
