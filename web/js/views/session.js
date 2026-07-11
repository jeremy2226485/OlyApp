// Session detail: the generated plan as a live, per-set tracked workout.
// Draft -> Start -> check off sets (with make/miss on the comp lifts) ->
// Finish & log. Weights recompute in place when a missing max is entered.

import { h, add } from "../lib/dom.js";
import {
  getCurrentSession,
  setCurrentSession,
  clearCurrentSession,
  addSession,
  getSessions,
  getMaxValues,
  getSettings,
  setMax,
  getFamilyNote,
  setFamilyNote,
} from "../lib/storage.js";
import { syncNow } from "../lib/sync.js";
import { generateSession, toLoggedSession, rotateAccessoryMove } from "../engine/planner.js";
import { attachWeights } from "../engine/schemes.js";
import { loadForPercent, resolveMax, formatWeight } from "../engine/weights.js";
import { MAX_DEFINITIONS } from "../data/exercises.js";

const INTENT_LABEL = { big: "BIG DAY", little: "TECH DAY", test: "MAX TEST" };
const FAMILY_LABEL = { snatch: "Snatch", clean: "Clean", jerk: "Jerk", squat: "Squat" };

function persist(session) {
  setCurrentSession(session);
}

function repaint(root, session) {
  root.replaceChildren();
  paint(root, session);
}

export function renderSession(root) {
  const session = getCurrentSession();
  if (!session) {
    root.append(
      h("h1", { class: "tag-title tag-title-sm" }, "NO SESH"),
      h("p", { class: "muted empty" }, "Nothing on the bar yet."),
      h("a", { class: "btn btn-primary btn-big", href: "#/generate" }, "NEW SESH")
    );
    return;
  }
  paint(root, session);
}

function paint(root, session) {
  const settings = getSettings();
  const started = session.status === "started";

  // ── header ──
  root.append(
    h("div", { class: "session-head" },
      h("h1", { class: "tag-title tag-title-sm" }, session.family === "snatch" ? "SNATCH DAY" : "CLEAN & JERK DAY"),
      h("div", { class: "chip-row" },
        h("span", { class: `chip chip-${session.intent}` }, INTENT_LABEL[session.intent] ?? session.intent),
        h("span", { class: "chip" }, `${session.minutes} min`),
        started ? h("span", { class: "chip chip-hot" }, "IN PROGRESS") : h("span", { class: "chip" }, "draft")
      )
    )
  );

  // ── warm-up ──
  root.append(
    h("div", { class: "card" },
      h("h2", { class: "block-name" }, "Warm-up ", h("span", { class: "muted small" }, `~${session.warmup.minutes} min`)),
      h("ul", { class: "plain-list" }, session.warmup.general.map((g) => h("li", {}, g))),
      session.warmup.prepGroups.map((g) =>
        h("div", { class: "prep-group" },
          h("b", {}, `${g.lift} prep (required)`),
          h("ul", { class: "plain-list" }, g.drills.map((d) => h("li", {}, d)))
        )
      )
    )
  );

  // ── barbell blocks ──
  session.blocks.forEach((block, blockIdx) => {
    root.append(renderBlock(root, session, block, blockIdx, settings, started));
  });

  // ── accessory ──
  root.append(
    h("div", { class: "card" },
      h("h2", { class: "block-name" }, "Accessory circuit"),
      h("p", { class: "muted small" },
        `${session.accessory.rounds} rounds · ${session.accessory.emphasis}-emphasis · core folded in`),
      h("ul", { class: "acc-list" },
        session.accessory.moves.map((m, i) =>
          h("li", { class: "acc-row" },
            h("span", { class: "acc-text" },
              h("b", {}, m.name),
              h("span", { class: "muted" }, ` — ${m.rx}`),
              m.category.startsWith("core") ? h("span", { class: "chip chip-core" }, "core") : null
            ),
            h("button", {
              class: "acc-rotate",
              title: "Swap for an alternate",
              "aria-label": `Swap ${m.name} for an alternate`,
              onClick: () => {
                rotateAccessoryMove(session, i, new Set(session.generateOptions?.avoid ?? []));
                persist(session);
                repaint(root, session);
              },
            }, "⟳")
          )
        )
      )
    )
  );

  // ── actions ──
  if (!started) {
    root.append(
      h("button", {
        class: "btn btn-primary btn-big",
        onClick: () => {
          session.status = "started";
          session.startedAt = new Date().toISOString();
          persist(session);
          repaint(root, session);
        },
      }, "START WORKOUT"),
      h("button", {
        class: "btn btn-ghost",
        onClick: () => {
          const opts = session.generateOptions ?? {};
          const draft = generateSession(
            opts.minutes ?? session.minutes,
            getSessions(),
            getMaxValues(),
            getSettings(),
            { ...opts, testMax: opts.intent === "test" }
          );
          draft.status = "draft";
          draft.generateOptions = opts;
          persist(draft);
          repaint(root, draft);
        },
      }, "Reroll"),
      h("button", {
        class: "btn btn-ghost btn-danger",
        onClick: () => {
          clearCurrentSession();
          location.hash = "#/";
        },
      }, "Discard")
    );
  } else {
    root.append(
      h("button", {
        class: "btn btn-primary btn-big",
        onClick: () => finishSession(session),
      }, "FINISH & LOG"),
      h("button", {
        class: "btn btn-ghost btn-danger",
        onClick: () => {
          if (confirm("Discard this workout without logging it?")) {
            clearCurrentSession();
            location.hash = "#/";
          }
        },
      }, "Discard")
    );
  }
}

function renderBlock(root, session, block, blockIdx, settings, started) {
  const isCompLift = block.slot === "comp";
  const card = h("div", { class: "card card-block" });

  card.append(
    h("div", { class: "block-head" },
      h("h2", { class: "block-name" }, block.name),
      h("span", { class: `chip chip-${block.intentUsed === "heavy" || block.intentUsed === "test" ? "big" : "little"}` }, block.intentUsed)
    )
  );
  if (block.tempo) card.append(h("p", { class: "note" }, `Tempo: ${block.tempo}`));
  if (block.note) card.append(h("p", { class: "note" }, block.note));
  for (const cue of block.cues ?? []) {
    card.append(h("p", { class: "cue" }, "✎ ", cue));
  }

  // Family notes: one free-text note per lift family, persisted across
  // workouts — the same note appears on every lift in this family.
  const famLabel = FAMILY_LABEL[block.family] ?? block.family;
  const existingNote = getFamilyNote(block.family);
  let noteTimer;
  const noteArea = h("textarea", {
    class: "input notes-input",
    rows: "2",
    placeholder: `Notes for all ${famLabel.toLowerCase()}-family lifts — sticks around next sesh`,
    onInput: (e) => {
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => setFamilyNote(block.family, e.target.value), 500);
    },
    onChange: (e) => {
      clearTimeout(noteTimer);
      setFamilyNote(block.family, e.target.value);
      syncNow();
    },
  }, existingNote);
  card.append(
    h("details", { class: "why notes", open: !!existingNote },
      h("summary", {}, `✎ ${famLabel} notes`),
      noteArea
    )
  );

  // Max status: missing -> inline entry; estimated -> badge.
  const maxDef = MAX_DEFINITIONS.find((d) => d.key === block.maxRef);
  if (block.maxInfo?.value == null) {
    const input = h("input", { class: "input input-inline", type: "number", inputmode: "decimal", placeholder: `1RM ${maxDef?.name ?? block.maxRef} (${settings.unit})` });
    card.append(
      h("div", { class: "max-entry" },
        h("p", { class: "note" }, "No max on file — enter one to see real weights, or train by feel at the listed %."),
        h("div", { class: "row" },
          input,
          h("button", {
            class: "btn btn-small",
            onClick: () => {
              const v = Number(input.value);
              if (!(v > 0)) return;
              setMax(block.maxRef, v);
              reattachWeights(session, settings);
              persist(session);
              repaint(root, session);
            },
          }, "Save max")
        )
      )
    );
  } else if (block.maxInfo.estimated) {
    const fromName = MAX_DEFINITIONS.find((d) => d.key === block.maxInfo.from)?.name ?? block.maxInfo.from;
    card.append(h("p", { class: "note small" }, `Weights estimated from your ${fromName} max — log a real ${maxDef?.name ?? block.maxRef} max in Settings to tighten them.`));
  }

  // ── sets ──
  const list = h("div", { class: "set-list" });
  block.sets.forEach((s, setIdx) => {
    list.append(renderSetRow(root, session, block, s, setIdx, settings, started, isCompLift));
  });
  card.append(list);

  if (block.programmingNote) {
    const details = h("details", { class: "why" },
      h("summary", {}, "Why this scheme?"),
      h("p", {}, block.programmingNote)
    );
    card.append(details);
  }
  return card;
}

function renderSetRow(root, session, block, s, setIdx, settings, started, isCompLift) {
  const phaseLabel = s.phase === "warmup" ? "warm" : s.phase === "backoff" ? "b/off" : s.phase === "attempt" ? "PR" : "work";
  const repsText = s.repsLabel ? `${s.repsLabel}${s.reps > 1 ? ` ×${s.reps}` : ""}` : `×${s.reps}`;

  let loadText;
  if (s.actualWeight != null) loadText = `${s.actualWeight} ${settings.unit} (actual)`;
  else if (s.isBar) loadText = `bar (${settings.barWeight} ${settings.unit})`;
  else if (s.pct == null) loadText = "small jumps — tap to set kg";
  else if (s.weight) loadText = formatWeight(s.weight, settings);
  else loadText = `${Math.round(s.pct * 100)}%`;

  const pctText = s.pct != null && !s.isBar ? `${Math.round(s.pct * 100)}%` : "";

  const row = h("div", {
    class: `set-row phase-${s.phase}${s.done ? " done" : ""}${s.missed ? " missed" : ""}${s.isTop ? " top-set" : ""}`,
  });

  const toggleDone = () => {
    if (!started) return;
    s.done = !s.done;
    if (!s.done) s.missed = false;
    persist(session);
    row.classList.toggle("done", s.done);
    row.classList.toggle("missed", !!s.missed);
    check.textContent = s.done ? (s.missed ? "✗" : "✓") : "";
  };

  const check = h("button", { class: "set-check", onClick: toggleDone }, s.done ? (s.missed ? "✗" : "✓") : "");

  const weightEl = h("button", {
    class: "set-load",
    onClick: (e) => {
      e.stopPropagation();
      if (!started) return;
      const v = prompt(`Actual weight for this set (${settings.unit})`, s.actualWeight ?? s.weight?.total ?? "");
      if (v === null) return;
      const n = Number(v);
      s.actualWeight = n > 0 ? n : null;
      persist(session);
      repaint(root, session);
    },
  }, loadText);

  add(row,
    h("span", { class: "set-phase" }, phaseLabel),
    h("span", { class: "set-pct" }, pctText),
    weightEl,
    h("span", { class: "set-reps" }, repsText),
    isCompLift && started && s.phase !== "warmup"
      ? h("button", {
          class: "set-miss",
          title: "Mark missed",
          onClick: (e) => {
            e.stopPropagation();
            s.missed = !s.missed;
            if (s.missed) s.done = true;
            persist(session);
            repaint(root, session);
          },
        }, "miss")
      : null,
    check
  );
  if (s.note) row.append(h("span", { class: "set-note" }, s.note));
  return row;
}

// Recompute weights for every block after a max changes (percents are stored
// on the sets, so this is lossless).
function reattachWeights(session, settings) {
  const maxes = getMaxValues();
  for (const block of session.blocks) {
    const info = resolveMax(block.maxRef, maxes);
    block.maxInfo = info;
    block.sets = attachWeights(block.sets, info.value, settings, loadForPercent);
  }
}

function finishSession(session) {
  // If a PR attempt beat the stored max, offer to save the new number.
  const maxes = getMaxValues();
  for (const block of session.blocks) {
    const best = Math.max(
      0,
      ...block.sets.filter((s) => s.done && !s.missed && s.actualWeight != null).map((s) => s.actualWeight)
    );
    const current = maxes[block.maxRef];
    if (best > 0 && (current == null || best > current) && block.slot === "comp") {
      if (confirm(`New best ${block.name}: ${best}. Save as your 1RM?`)) {
        setMax(block.maxRef, best);
      }
    }
  }
  addSession(toLoggedSession(session));
  clearCurrentSession();
  location.hash = "#/history";
}
