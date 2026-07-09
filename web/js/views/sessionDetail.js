import { getCurrentSession, setCurrentSession, clearCurrentSession } from "../state.js";
import { addLoggedSession, addMax, getSessions, getMaxes } from "../storage.js";
import { buildPrimaryLift, toLoggedSession } from "../generator.js";
import {
  snatchCompetitionLifts,
  cleanJerkCompetitionLifts,
  allPullVariants,
  SQUAT_VARIANTS,
  ACCESSORY_MOVES,
} from "../precedentLibrary.js";
import { el } from "../ui.js";

export function render(root) {
  let session = getCurrentSession();
  if (!session) {
    root.appendChild(
      el("section", { class: "screen" }, [
        el("a", { href: "#/", class: "back-link" }, "‹ Home"),
        el("p", { class: "empty-state" }, "No generated session yet."),
        el("a", { href: "#/new", class: "btn btn-primary" }, "Generate one"),
      ])
    );
    return;
  }

  let completed = false;

  function persistAndRerender(patch) {
    session = { ...session, ...patch };
    setCurrentSession(session);
    rerender();
  }

  function rerender() {
    root.innerHTML = "";
    root.appendChild(buildView());
  }

  function saveMax(index, weight, unit) {
    const lift = session.primaryLifts[index];
    addMax({ liftName: lift.liftName, oneRepMax: weight, unit, dateSet: new Date().toISOString() });
    const increment = unit === "kg" ? 2.5 : 5;
    const estimated = Math.round((weight * lift.targetPercentRange[1]) / increment) * increment;
    const updatedLifts = [...session.primaryLifts];
    updatedLifts[index] = { ...lift, estimatedWorkingWeight: estimated, weightUnit: unit, needsMaxEntry: false };
    persistAndRerender({ primaryLifts: updatedLifts });
  }

  function swapPrimaryLift(index) {
    const current = session.primaryLifts[index];
    const poolByCategory = {
      snatchFamily: snatchCompetitionLifts(),
      cleanJerkFamily: cleanJerkCompetitionLifts(),
      squat: SQUAT_VARIANTS,
      pull: allPullVariants(),
    };
    const pool = poolByCategory[current.category] ?? [];
    const alternatives = pool.filter((l) => l.name !== current.liftName);
    if (!alternatives.length) return;
    const newTemplate = alternatives[Math.floor(Math.random() * alternatives.length)];
    const rebuilt = buildPrimaryLift(newTemplate, getSessions(), getMaxes(), session.isMaxTestDay && index === 0);
    const updatedLifts = [...session.primaryLifts];
    updatedLifts[index] = rebuilt;
    persistAndRerender({ primaryLifts: updatedLifts });
  }

  function swapAccessoryExercise(index) {
    const current = session.accessory.exercises[index];
    const selectedNames = new Set(session.accessory.exercises.map((e) => e.name));
    const alternatives = ACCESSORY_MOVES.filter((m) => m.category === current.category && !selectedNames.has(m.name));
    if (!alternatives.length) return;
    const move = alternatives[Math.floor(Math.random() * alternatives.length)];
    const updatedExercises = [...session.accessory.exercises];
    updatedExercises[index] = {
      name: move.name,
      prescription: `${session.accessory.rounds} rounds x ${move.typicalPrescription}`,
      category: move.category,
    };
    persistAndRerender({ accessory: { ...session.accessory, exercises: updatedExercises } });
  }

  function markComplete() {
    addLoggedSession(toLoggedSession(session));
    completed = true;
    clearCurrentSession();
    rerender();
  }

  function buildView() {
    return el("section", { class: "screen" }, [
      el("a", { href: "#/", class: "back-link" }, "‹ Home"),
      el("h2", {}, session.isMaxTestDay ? "Max Test Day" : `${session.requestedLengthMinutes} min Session`),

      warmupCard(session.warmup),
      ...session.primaryLifts.map((lift, i) => primaryLiftCard(lift, i, saveMax, swapPrimaryLift)),
      accessoryCard(session.accessory, swapAccessoryExercise),

      el(
        "button",
        {
          type: "button",
          class: "btn btn-primary btn-block",
          disabled: completed,
          onclick: markComplete,
        },
        completed ? "Logged" : "Mark Complete"
      ),
    ]);
  }

  root.appendChild(buildView());
}

function warmupCard(warmup) {
  return el("div", { class: "card" }, [
    el("h3", { class: "card-title" }, `Warm-Up (~${warmup.estimatedMinutes} min)`),
    el("ul", { class: "plain-list" }, warmup.generalPrep.map((item) => el("li", {}, item))),
    ...warmup.liftSpecificPrep.map((lift) => liftPrepGroup(lift)),
  ]);
}

function liftPrepGroup(lift) {
  return el("div", { class: "prep-group" }, [
    lift.requiredPrepDrills.length
      ? el("div", { class: "prep-required" }, [
          el("div", { class: "section-label prep-required-label" }, `Required — ${lift.liftName}`),
          el("ul", { class: "plain-list" }, lift.requiredPrepDrills.map((item) => el("li", {}, item))),
        ])
      : null,
    el("ul", { class: "plain-list" }, [el("li", {}, lift.buildUp)]),
  ]);
}

function primaryLiftCard(lift, index, onSaveMax, onSwap) {
  return el("div", { class: "card" }, [
    el("h3", { class: "card-title" }, lift.liftName),
    ...lift.technicalCues.map((cue) => el("p", { class: "cue-box" }, cue)),
    lift.isHeavyToday ? el("p", { class: "badge badge-heavy" }, "🔥 Heavy day") : null,
    el("ul", { class: "plain-list muted small" }, lift.buildSets.map((s) => el("li", {}, s))),
    el("p", { class: "work-sets" }, lift.workSetsDescription),
    lift.estimatedWorkingWeight != null
      ? el("p", { class: "estimate" }, `Estimated top set: ${lift.estimatedWorkingWeight} ${lift.weightUnit}`)
      : null,
    lift.tempoNote ? el("p", { class: "muted small" }, `⏱ ${lift.tempoNote}`) : null,
    lift.needsMaxEntry ? maxEntryPrompt(lift.liftName, (w, u) => onSaveMax(index, w, u)) : null,
    el("button", { type: "button", class: "btn-link", onclick: () => onSwap(index) }, "Swap Lift"),
  ]);
}

function maxEntryPrompt(liftName, onSave) {
  const weightInput = el("input", {
    type: "number",
    inputmode: "decimal",
    placeholder: "Weight",
    class: "text-input small",
  });
  const unitSelect = el("select", { class: "select-input" }, [
    el("option", { value: "kg" }, "KG"),
    el("option", { value: "lb" }, "LB"),
  ]);

  return el("details", { class: "max-prompt" }, [
    el("summary", {}, `No max on file for ${liftName} — tap to enter`),
    el("p", { class: "muted small" }, "Enter it now, estimate, or skip and add it later from Maxes."),
    el("div", { class: "inline-input-row" }, [
      weightInput,
      unitSelect,
      el(
        "button",
        {
          type: "button",
          class: "btn btn-secondary",
          onclick: () => {
            const weight = Number(weightInput.value);
            if (!weight || weight <= 0) return;
            onSave(weight, unitSelect.value);
          },
        },
        "Save"
      ),
    ]),
  ]);
}

function accessoryCard(accessory, onSwap) {
  return el("div", { class: "card" }, [
    el("h3", { class: "card-title" }, `Accessory — ${accessory.rounds} rounds, ${capitalize(accessory.emphasis)} emphasis`),
    el(
      "div",
      { class: "exercise-list" },
      accessory.exercises.map((ex, i) =>
        el("div", { class: "exercise-row" }, [
          el("div", {}, [
            el("div", {}, `${ex.category === "core" ? "🧘 " : ""}${ex.name}`),
            el("div", { class: "muted small" }, ex.prescription),
          ]),
          el("button", { type: "button", class: "icon-btn", title: "Swap", onclick: () => onSwap(i) }, "🔁"),
        ])
      )
    ),
  ]);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
