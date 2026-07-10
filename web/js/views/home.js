// Home: New Sesh CTA, resume-in-progress card, freshness stats, recent log.

import { h, add } from "../lib/dom.js";
import { getSessions, getCurrentSession } from "../lib/storage.js";
import { chooseIntent, chooseFamily } from "../engine/planner.js";

function daysAgoLabel(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function lastHeavyDays(sessions, predicate) {
  const s = sessions.find((x) => (x.blocks ?? []).some(predicate));
  if (!s) return null;
  return Math.floor((Date.now() - new Date(s.date)) / 86400000);
}

export function renderHome(root) {
  const sessions = getSessions();
  const current = getCurrentSession();

  const nextIntent = chooseIntent(sessions);
  const nextFamily = chooseFamily(sessions, {}, () => 0.5);
  const intentLabel = nextIntent === "big" ? "BIG DAY" : "TECH DAY";
  const familyLabel = nextFamily === "snatch" ? "snatch" : "clean & jerk";

  const heavySn = lastHeavyDays(sessions, (b) => b.family === "snatch" && b.slot === "comp" && b.topPct >= 0.85);
  const heavyCl = lastHeavyDays(sessions, (b) => b.family === "clean" && b.slot === "comp" && b.topPct >= 0.85);
  const squat = lastHeavyDays(sessions, (b) => b.slot === "squat");

  add(root,
    h("div", { class: "hero" },
      h("h1", { class: "tag-title" }, "OLY", h("span", { class: "tag-alt" }, "APP")),
      h("p", { class: "hero-sub" }, "Olympic weightlifting generator — programmed like a coach, not a dice roll.")
    ),

    current
      ? h("a", { class: "card card-resume", href: "#/session" },
          h("div", { class: "sticker sticker-hot" }, current.status === "started" ? "IN PROGRESS" : "DRAFT"),
          h("h2", {}, current.family === "snatch" ? "Snatch day" : "Clean & jerk day"),
          h("p", { class: "muted" }, `${current.minutes} min · ${current.intent === "big" ? "big day" : current.intent === "test" ? "max test" : "technique day"} · tap to open`)
        )
      : null,

    h("a", { class: "btn btn-primary btn-big", href: "#/generate" }, "NEW SESH"),
    h("p", { class: "hint-center" }, `Up next by rotation: ${intentLabel} · ${familyLabel}`),

    h("div", { class: "stat-row" },
      h("div", { class: "stat" }, h("b", {}, heavySn == null ? "—" : `${heavySn}d`), h("span", {}, "since heavy snatch")),
      h("div", { class: "stat" }, h("b", {}, heavyCl == null ? "—" : `${heavyCl}d`), h("span", {}, "since heavy C&J")),
      h("div", { class: "stat" }, h("b", {}, squat == null ? "—" : `${squat}d`), h("span", {}, "since squats"))
    ),

    h("h3", { class: "section-label" }, "Recent seshes"),
    sessions.length === 0
      ? h("p", { class: "muted empty" }, "Nothing logged yet. Generate your first sesh and get under the bar.")
      : sessions.slice(0, 3).map((s) =>
          h("div", { class: "card card-mini" },
            h("div", { class: "card-mini-head" },
              h("b", {}, s.family === "snatch" ? "Snatch day" : "Clean & jerk day"),
              h("span", { class: `chip chip-${s.intent}` }, s.intent)
            ),
            h("p", { class: "muted" },
              `${daysAgoLabel(s.date)} · ${(s.blocks ?? []).map((b) => b.name).join(" · ") || "no barbell work"}`
            )
          )
        )
  );
}
