import { getSessions, getMaxes } from "../storage.js";
import { generate } from "../generator.js";
import { setCurrentSession } from "../state.js";
import { el } from "../ui.js";

const PRESETS = [45, 60, 90];

export function render(root) {
  let length = 90;
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

  const avoidInput = el("input", { type: "text", placeholder: "e.g. Snatch Balance", class: "text-input" });
  const chipRow = el("div", { class: "chip-row" });

  function renderChips() {
    chipRow.innerHTML = "";
    [...avoidSet].sort().forEach((name) => {
      chipRow.appendChild(
        el("span", { class: "tag" }, [
          name,
          el(
            "button",
            {
              type: "button",
              class: "tag-remove",
              onclick: () => {
                avoidSet.delete(name);
                renderChips();
              },
            },
            "×"
          ),
        ])
      );
    });
  }

  const addAvoidBtn = el(
    "button",
    {
      type: "button",
      class: "btn btn-secondary",
      onclick: () => {
        const trimmed = avoidInput.value.trim();
        if (!trimmed) return;
        avoidSet.add(trimmed);
        avoidInput.value = "";
        renderChips();
      },
    },
    "Add"
  );

  const generateBtn = el(
    "button",
    {
      type: "button",
      class: "btn btn-primary btn-block",
      onclick: () => {
        const history = getSessions();
        const maxes = getMaxes();
        const session = generate(length, history, maxes, { testMax, avoidMovements: avoidSet });
        setCurrentSession(session);
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

      el("div", { class: "field-group" }, [
        el("label", { class: "field-label" }, "Avoid a movement today"),
        el("div", { class: "inline-input-row" }, [avoidInput, addAvoidBtn]),
        chipRow,
      ]),

      generateBtn,
    ])
  );
}
