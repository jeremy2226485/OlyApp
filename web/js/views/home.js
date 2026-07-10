import { getSessions } from "../storage.js";
import { getCurrentSession } from "../state.js";
import { el, formatDate } from "../ui.js";

export function render(root) {
  const sessions = getSessions();
  const recent = sessions.slice(0, 3);
  const current = getCurrentSession();

  root.appendChild(
    el("section", { class: "screen" }, [
      current ? continueWorkoutCard(current) : el("a", { href: "#/new", class: "btn btn-primary btn-block" }, "+ New Session"),
      current && current.status !== "started"
        ? el("a", { href: "#/new", class: "btn-link" }, "Discard and generate a different session")
        : null,
      recent.length
        ? el("div", { class: "card-list" }, [
            el("h3", { class: "section-label" }, "Recent Sessions"),
            ...recent.map(sessionSummaryCard),
          ])
        : el("p", { class: "empty-state" }, "No sessions logged yet. Generate your first one above."),
    ])
  );
}

function continueWorkoutCard(current) {
  const isStarted = current.status === "started";
  return el(
    "a",
    { href: "#/session", class: "btn btn-primary btn-block" },
    isStarted ? "▶ Continue Workout" : "Review Generated Session"
  );
}

function sessionSummaryCard(session) {
  return el("div", { class: "card" }, [
    el("div", { class: "card-row" }, [
      el("strong", {}, formatDate(session.date)),
      el("span", { class: "muted" }, `${session.lengthMinutes} min`),
    ]),
    el("div", { class: "muted" }, session.primaryLifts.map((l) => l.liftName).join(" + ")),
    session.accessoryMoves.length
      ? el("div", { class: "muted small" }, session.accessoryMoves.join(", "))
      : null,
  ]);
}
