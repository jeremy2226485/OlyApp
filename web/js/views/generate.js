// New Session: length, day type, family, optional main-lift pick, avoid list.

import { h, add } from "../lib/dom.js";
import { getSessions, getMaxValues, getSettings, setCurrentSession, getCurrentSession } from "../lib/storage.js";
import { generateSession, chooseIntent, chooseFamily } from "../engine/planner.js";
import { COMP_POOLS, exerciseById, EXERCISES } from "../data/exercises.js";
import { ACCESSORIES } from "../data/accessories.js";

export function renderGenerate(root) {
  const sessions = getSessions();
  const state = {
    minutes: 90,
    intent: "auto",
    family: "auto",
    compExerciseId: "",
    avoid: new Set(),
  };

  const autoIntent = chooseIntent(sessions);
  const autoFamily = chooseFamily(sessions, {}, () => 0.5);

  // ── length ──
  const minutesInput = h("input", {
    class: "input input-minutes",
    type: "number",
    inputmode: "numeric",
    min: "30",
    max: "150",
    value: String(state.minutes),
    onInput: (e) => {
      state.minutes = Math.max(30, Math.min(150, Number(e.target.value) || 90));
    },
  });
  const presets = h("div", { class: "chip-row" },
    [45, 60, 75, 90].map((m) =>
      h("button", {
        class: "chip chip-btn",
        onClick: () => {
          state.minutes = m;
          minutesInput.value = String(m);
        },
      }, `${m}′`)
    )
  );

  // ── day type / family ──
  function segmented(options, get, set) {
    const wrap = h("div", { class: "seg" });
    for (const [value, label] of options) {
      const btn = h("button", { class: "seg-btn", dataset: { value } , onClick: () => { set(value); update(); } }, label);
      wrap.append(btn);
    }
    function update() {
      for (const b of wrap.children) b.classList.toggle("active", b.dataset.value === get());
      onDayTypeChange();
    }
    wrap.update = update;
    return wrap;
  }

  const intentSeg = segmented(
    [
      ["auto", `Auto (${autoIntent === "big" ? "big" : "tech"})`],
      ["big", "Big"],
      ["little", "Technique"],
      ["test", "Test 1RM"],
    ],
    () => state.intent,
    (v) => (state.intent = v)
  );
  const familySeg = segmented(
    [
      ["auto", `Auto (${autoFamily === "snatch" ? "snatch" : "C&J"})`],
      ["snatch", "Snatch"],
      ["clean", "Clean & Jerk"],
    ],
    () => state.family,
    (v) => {
      state.family = v;
      state.compExerciseId = "";
    }
  );

  // ── optional specific main lift ──
  const liftSelect = h("select", {
    class: "input",
    onChange: (e) => (state.compExerciseId = e.target.value),
  });
  function onDayTypeChange() {
    if (!liftSelect) return;
    const fam = state.family === "auto" ? autoFamily : state.family;
    const intent = state.intent === "auto" ? autoIntent : state.intent;
    const big = intent === "big" || intent === "test";
    const ids = intent === "test" ? COMP_POOLS[fam].big : COMP_POOLS[fam][big ? "big" : "little"];
    const keep = state.compExerciseId;
    liftSelect.replaceChildren(
      h("option", { value: "" }, "Auto-pick main lift"),
      ...ids.map((id) => h("option", { value: id, selected: id === keep }, exerciseById(id).name))
    );
    if (![...liftSelect.options].some((o) => o.value === keep)) state.compExerciseId = "";
  }

  // ── avoid list ──
  const avoidChips = h("div", { class: "chip-row" });
  const avoidable = [
    ...EXERCISES.map((e) => e.name),
    ...ACCESSORIES.map((a) => a.name),
  ];
  const avoidSelect = h("select", { class: "input", onChange: (e) => {
    const name = e.target.value;
    if (!name) return;
    // Map display name back to the exercise id where one exists.
    const ex = EXERCISES.find((x) => x.name === name);
    state.avoid.add(ex ? ex.id : name);
    e.target.value = "";
    paintAvoid();
  } },
    h("option", { value: "" }, "Avoid a movement today…"),
    ...avoidable.map((n) => h("option", { value: n }, n))
  );
  function paintAvoid() {
    avoidChips.replaceChildren(
      ...[...state.avoid].map((idOrName) => {
        const label = exerciseById(idOrName)?.name ?? idOrName;
        return h("button", { class: "chip chip-avoid", onClick: () => { state.avoid.delete(idOrName); paintAvoid(); } }, `${label} ✕`);
      })
    );
  }

  function doGenerate() {
    const draft = generateSession(
      state.minutes,
      sessions,
      getMaxValues(),
      getSettings(),
      {
        intent: state.intent,
        family: state.family,
        testMax: state.intent === "test",
        compExerciseId: state.compExerciseId || undefined,
        avoid: [...state.avoid],
      }
    );
    draft.status = "draft";
    draft.generateOptions = {
      intent: state.intent,
      family: state.family,
      compExerciseId: state.compExerciseId || undefined,
      avoid: [...state.avoid],
      minutes: state.minutes,
    };
    setCurrentSession(draft);
    location.hash = "#/session";
  }

  const inProgress = getCurrentSession()?.status === "started";

  add(root,
    h("h1", { class: "tag-title tag-title-sm" }, "NEW SESSION"),
    inProgress
      ? h("p", { class: "callout callout-warn" }, "A workout is already in progress — generating a new one will replace it. ", h("a", { href: "#/session" }, "Resume instead"))
      : null,
    h("div", { class: "card" },
      h("label", { class: "field-label" }, "Session length (minutes)"),
      minutesInput,
      presets
    ),
    h("div", { class: "card" },
      h("label", { class: "field-label" }, "Day type"),
      intentSeg,
      h("p", { class: "hint" }, "Big = heavy comp lift + pull + squat. Technique = speed/positions + overhead work. Auto alternates them like a real week."),
      h("label", { class: "field-label" }, "Focus"),
      familySeg,
      h("label", { class: "field-label" }, "Main lift (optional)"),
      liftSelect
    ),
    h("div", { class: "card" },
      h("label", { class: "field-label" }, "Avoid today (optional)"),
      avoidSelect,
      avoidChips
    ),
    h("button", { class: "btn btn-primary btn-big", onClick: doGenerate }, "GENERATE")
  );

  intentSeg.update();
  familySeg.update();
  onDayTypeChange();
}
