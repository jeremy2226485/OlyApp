// History: logged seshes with per-block top %s and make/miss counts.
// Cards expand in place (tap the header) to the full set-by-set record.

import { h, add } from "../lib/dom.js";
import { getSessions, deleteSession, getSettings } from "../lib/storage.js";
import { syncNow } from "../lib/sync.js";

function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function resultIcon(r) {
  if (r.missed) return h("span", { class: "hist-icon missed" }, "✗");
  if (r.done) return h("span", { class: "hist-icon made" }, "✓");
  return h("span", { class: "hist-icon skipped" }, "–");
}

function setLine(r, unit) {
  const pct = r.pct != null ? `${Math.round(r.pct * 100)}%` : "";
  const wt = r.weight != null ? `${r.weight} ${unit}` : "";
  const load = [pct, wt].filter(Boolean).join(" · ") || "by feel";
  return h("li", { class: "hist-set" }, resultIcon(r), `${load} ×${r.reps}`);
}

// Full record for one barbell block: warm-ups collapsed to a count, every
// work/back-off/attempt set listed with its make/miss/skip state.
function blockDetail(b, unit) {
  const results = b.setResults ?? [];
  const warmups = results.filter((r) => r.phase === "warmup");
  const work = results.filter((r) => r.phase !== "warmup");
  return h("div", { class: "hist-block" },
    h("b", {}, b.name),
    b.topPct != null ? h("span", { class: "muted small" }, ` — top ${Math.round(b.topPct * 100)}%` ) : null,
    h("ul", { class: "hist-sets" },
      warmups.length ? h("li", { class: "hist-set muted" }, `${warmups.length} warm-up sets`) : null,
      work.map((r) => setLine(r, unit))
    )
  );
}

function sessionCard(root, s) {
  const unit = s.unit ?? getSettings().unit;
  const summaryLines = (s.blocks ?? []).map((b) => {
    const work = (b.setResults ?? []).filter((r) => r.phase !== "warmup");
    const made = work.filter((r) => r.done && !r.missed).length;
    const missed = work.filter((r) => r.missed).length;
    const top = b.topPct != null ? ` @ ${Math.round(b.topPct * 100)}%` : "";
    const tally = work.length ? ` — ${made}/${work.length} made${missed ? `, ${missed} missed` : ""}` : "";
    return h("li", {}, h("b", {}, b.name), `${top}${tally}`);
  });

  const accMoves = s.accessory?.moves ?? [];
  const accDone = accMoves.filter((m) => m.done).length;
  const accSummary = accMoves.length
    ? `accessory: ${accMoves.map((m) => m.name).join(", ")}${accMoves.some((m) => "done" in m) ? ` (${accDone}/${accMoves.length} done)` : ""}`
    : "accessory: —";

  const detail = h("div", { class: "sesh-detail" },
    (s.blocks ?? []).map((b) => blockDetail(b, unit)),
    accMoves.length
      ? h("div", { class: "hist-block" },
          h("b", {}, `Accessory circuit${s.accessory.rounds ? ` — ${s.accessory.rounds} rounds` : ""}`),
          h("ul", { class: "hist-sets" },
            accMoves.map((m) =>
              h("li", { class: "hist-set" },
                resultIcon(m),
                `${m.name}${m.rx ? ` — ${m.rx}` : ""}`
              )
            )
          )
        )
      : null,
    h("button", {
      class: "btn btn-ghost btn-danger btn-small",
      onClick: (e) => {
        e.stopPropagation();
        if (!confirm("Delete this logged sesh?")) return;
        deleteSession(s.id);
        syncNow();
        root.replaceChildren();
        renderHistory(root);
      },
    }, "Delete this sesh")
  );
  detail.hidden = true;

  const chevron = h("span", { class: "chevron" }, "▸");
  const head = h("button", { class: "card-mini-head hist-head",
    onClick: () => {
      detail.hidden = !detail.hidden;
      chevron.textContent = detail.hidden ? "▸" : "▾";
    } },
    h("b", {}, `${fmtDate(s.date)} · ${s.family === "snatch" ? "Snatch day" : "Clean & jerk day"}`),
    h("span", { class: "hist-head-right" },
      h("span", { class: `chip chip-${s.intent}` }, s.intent),
      chevron
    )
  );

  return add(h("div", { class: "card" }),
    head,
    h("ul", { class: "plain-list" }, summaryLines),
    h("p", { class: "muted small" }, `${s.minutes} min · ${accSummary}`),
    detail
  );
}

export function renderHistory(root) {
  const sessions = getSessions();

  root.append(h("h1", { class: "tag-title tag-title-sm" }, "HISTORY"));

  if (!sessions.length) {
    root.append(h("p", { class: "muted empty" }, "No seshes logged yet."));
    return;
  }

  for (const s of sessions) {
    root.append(sessionCard(root, s));
  }
}
