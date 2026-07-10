import { getSessions, getMaxes } from "../storage.js";
import { generate } from "../generator.js";
import { getCurrentSession, setCurrentSession } from "../state.js";
import { ALL_PRIMARY_LIFTS, ACCESSORY_MOVES } from "../precedentLibrary.js";
import { el } from "../ui.js";

const PRESETS = [45, 60, 90];
const MAX_SPECIFIED_LIFTS = 2;

const LIFT_CATEGORY_LABELS = {
  snatchFamily: "Snatch Family",
  cleanJerkFamily: "Clean & Jerk Family",
  squat: "Squat",
  pull: "Pulls",
};

export function render(root) {
  const current = getCurrentSession();
  if (current && current.status === "started") {
    root.appendChild(
      el("section", { class: "screen" }, [
        el("a", { href: "#/", class: "back-link" }, "‹ Home"),
        el("h2", {}, "New Session"),
        el(
          "p",
          { class: "empty-state" },
          "You have a workout in progress. Complete or discard it before generating a new one."
        ),
        el("a", { href: "#/session", class: "btn btn-primary btn-block" }, "▶ Continue Workout"),
      ])
    );
    return;
  }

  let length = 90;
  const specifiedLifts = new Set();
  const avoidSet = new Set();

  const lengthLabel = el("div", { class: "length-readout" }, `${length} min`);

  const slider = el("input", {
    type: "range",
    min: "20",
    max: "120",
    step: "5",
    value: String(length),
    class: "slider",
    oninput: (e) => {
      length = Number(e.target.value);
      lengthLabel.textContent = `${length} min`;
      syncPresetButtons();
    },
  });

  const presetButtons = PRESETS.map((preset) =>
    el(
      "button",
      {
        type: "button",
        class: "chip-btn",
        onclick: () => {
          length = preset;
          slider.value = String(preset);
          lengthLabel.textContent = `${preset} min`;
          syncPresetButtons();
        },
      },
      `${preset}`
    )
  );

  function syncPresetButtons() {
    presetButtons.forEach((btn, i) => btn.classList.toggle("active", PRESETS[i] === length));
  }
  syncPresetButtons();

  let testMax = false;
  const testMaxToggle = el("input", {
    type: "checkbox",
    onchange: (e) => {
      testMax = e.target.checked;
    },
  });

  const liftSelect = groupedLiftSelect("Choose a lift…");
  const liftSection = pickerSection({
    label: "Specific lift(s) today",
    hint: `Optional — pick up to ${MAX_SPECIFIED_LIFTS}. Leave empty to let the generator rotate as usual.`,
    select: liftSelect,
    items: specifiedLifts,
    maxItems: MAX_SPECIFIED_LIFTS,
  });

  const avoidSelect = avoidMovementSelect("Choose a movement…");
  const avoidSection = pickerSection({
    label: "Avoid a movement today",
    select: avoidSelect,
    items: avoidSet,
  });

  const generateBtn = el(
    "button",
    {
      type: "button",
      class: "btn btn-primary btn-block",
      onclick: () => {
        const history = getSessions();
        const maxes = getMaxes();
        const session = generate(length, history, maxes, {
          testMax,
          avoidMovements: avoidSet,
          specifiedLifts: [...specifiedLifts],
        });
        setCurrentSession({ ...session, status: "draft" });
        location.hash = "#/session";
      },
    },
    "Generate Session"
  );

  root.appendChild(
    el("section", { class: "screen" }, [
      el("a", { href: "#/", class: "back-link" }, "‹ Home"),
      el("h2", {}, "New Session"),

      el("div", { class: "field-group" }, [
        el("label", { class: "field-label" }, "Session Length"),
        el("div", { class: "length-row" }, [lengthLabel, ...presetButtons]),
        slider,
      ]),

      el("div", { class: "field-group" }, [
        el("label", { class: "field-label checkbox-label" }, [testMaxToggle, " Test a 1RM today?"]),
      ]),

      liftSection,
      avoidSection,

      generateBtn,
    ])
  );
}

// Reusable dropdown-plus-removable-chips picker used by both the "specific
// lift(s)" and "avoid a movement" fields.
function pickerSection({ label, hint, select, items, maxItems }) {
  const chipRow = el("div", { class: "chip-row" });

  function renderChips() {
    chipRow.innerHTML = "";
    [...items].sort().forEach((name) => {
      chipRow.appendChild(
        el("span", { class: "tag" }, [
          name,
          el(
            "button",
            {
              type: "button",
              class: "tag-remove",
              onclick: () => {
                items.delete(name);
                renderChips();
              },
            },
            "×"
          ),
        ])
      );
    });
  }
  renderChips();

  const addBtn = el(
    "button",
    {
      type: "button",
      class: "btn btn-secondary",
      onclick: () => {
        const value = select.value;
        if (!value) return;
        if (maxItems && items.size >= maxItems) return;
        items.add(value);
        select.value = "";
        renderChips();
      },
    },
    "Add"
  );

  return el("div", { class: "field-group" }, [
    el("label", { class: "field-label" }, label),
    el("div", { class: "inline-input-row" }, [select, addBtn]),
    hint ? el("p", { class: "muted small" }, hint) : null,
    chipRow,
  ]);
}

function groupedLiftSelect(placeholder) {
  const groups = new Map();
  for (const lift of ALL_PRIMARY_LIFTS) {
    const label = LIFT_CATEGORY_LABELS[lift.category] ?? lift.category;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(lift.name);
  }
  const optgroups = [...groups.entries()].map(([label, names]) =>
    el(
      "optgroup",
      { label },
      names.map((name) => el("option", { value: name }, name))
    )
  );
  return el("select", { class: "select-input" }, [el("option", { value: "" }, placeholder), ...optgroups]);
}

function avoidMovementSelect(placeholder) {
  const primaryNames = ALL_PRIMARY_LIFTS.map((l) => l.name).sort();
  const accessoryNames = ACCESSORY_MOVES.map((m) => m.name).sort();
  return el("select", { class: "select-input" }, [
    el("option", { value: "" }, placeholder),
    el(
      "optgroup",
      { label: "Primary Lifts" },
      primaryNames.map((name) => el("option", { value: name }, name))
    ),
    el(
      "optgroup",
      { label: "Accessory Moves" },
      accessoryNames.map((name) => el("option", { value: name }, name))
    ),
  ]);
}
