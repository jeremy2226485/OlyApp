import { getSessions, deleteLoggedSession } from "../storage.js";
import { el, formatDate } from "../ui.js";
import { syncNow } from "../sync.js";

export function render(root) {
  renderContent();

  function renderContent() {
    root.innerHTML = "";
    const sessions = getSessions();

    root.appendChild(
      el("section", { class: "screen" }, [
        el("h2", {}, "History"),
        sessions.length ? frequencyCard(sessions) : null,
        sessions.length
          ? el("div", { class: "card-list" }, sessions.map((s) => sessionCard(s, renderContent)))
          : el("p", { class: "empty-state" }, "Completed sessions will show up here."),
      ])
    );
  }
}

function daysSinceHeavy(sessions, category) {
  const last = sessions.find((s) => s.primaryLifts.some((l) => l.category === category && l.wasHeavy));
  if (!last) return "—";
  const days = Math.floor((Date.now() - new Date(last.date).getTime()) / 86400000);
  return `${days}d ago`;
}

function lastLiftName(sessions, category) {
  for (const s of sessions) {
    const lift = s.primaryLifts.find((l) => l.category === category);
    if (lift) return lift.liftName;
  }
  return "—";
}

function frequencyCard(sessions) {
  return el("div", { class: "card" }, [
    el("h3", { class: "card-title" }, "Frequency"),
    statRow("Days since last heavy snatch", daysSinceHeavy(sessions, "snatchFamily")),
    statRow("Days since last heavy clean/jerk", daysSinceHeavy(sessions, "cleanJerkFamily")),
    statRow("Last squat variant", lastLiftName(sessions, "squat")),
    statRow("Last pull variant", lastLiftName(sessions, "pull")),
  ]);
}

function statRow(label, value) {
  return el("div", { class: "stat-row" }, [el("span", { class: "muted" }, label), el("strong", {}, value)]);
}

function sessionCard(session, onChange) {
  return el("div", { class: "card" }, [
    el("div", { class: "card-row" }, [
      el("strong", {}, formatDate(session.date)),
      el("span", { class: "muted" }, `${session.lengthMinutes} min`),
    ]),
    el(
      "ul",
      { class: "plain-list small" },
      session.primaryLifts.map((l) => el("li", {}, `${l.liftName} — ${l.setsReps} @ ${l.loadDescription}`))
    ),
    session.accessoryMoves.length ? el("div", { class: "muted small" }, session.accessoryMoves.join(", ")) : null,
    session.tempoOrPauseVariant
      ? el("div", { class: "muted small accent-text" }, session.tempoOrPauseVariant)
      : null,
    el(
      "button",
      {
        type: "button",
        class: "btn-link danger",
        onclick: () => {
          if (confirm("Delete this logged session?")) {
            deleteLoggedSession(session.id);
            syncNow();
            onChange();
          }
        },
      },
      "Delete"
    ),
  ]);
}
