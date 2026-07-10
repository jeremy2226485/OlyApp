// History: logged sessions with per-block top %s and make/miss counts.

import { h } from "../lib/dom.js";
import { getSessions, deleteSession } from "../lib/storage.js";
import { syncNow } from "../lib/sync.js";

function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function renderHistory(root) {
  const sessions = getSessions();

  root.append(h("h1", { class: "tag-title tag-title-sm" }, "HISTORY"));

  if (!sessions.length) {
    root.append(h("p", { class: "muted empty" }, "No sessions logged yet."));
    return;
  }

  for (const s of sessions) {
    const blockLines = (s.blocks ?? []).map((b) => {
      const results = b.setResults ?? [];
      const work = results.filter((r) => r.phase !== "warmup");
      const made = work.filter((r) => r.done && !r.missed).length;
      const missed = work.filter((r) => r.missed).length;
      const top = b.topPct != null ? ` @ ${Math.round(b.topPct * 100)}%` : "";
      const tally = work.length ? ` — ${made}/${work.length} made${missed ? `, ${missed} missed` : ""}` : "";
      return h("li", {}, h("b", {}, b.name), `${top}${tally}`);
    });

    root.append(
      h("div", { class: "card" },
        h("div", { class: "card-mini-head" },
          h("b", {}, `${fmtDate(s.date)} · ${s.family === "snatch" ? "Snatch day" : "Clean & jerk day"}`),
          h("span", { class: `chip chip-${s.intent}` }, s.intent)
        ),
        h("ul", { class: "plain-list" }, blockLines),
        h("p", { class: "muted small" },
          `${s.minutes} min · accessory: ${(s.accessory?.moves ?? []).map((m) => m.name).join(", ") || "—"}`),
        h("button", {
          class: "btn btn-ghost btn-danger btn-small",
          onClick: () => {
            if (!confirm("Delete this logged session?")) return;
            deleteSession(s.id);
            syncNow();
            renderHistory(root.replaceChildren() ?? root);
          },
        }, "Delete")
      )
    );
  }
}
