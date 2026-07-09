import { getMaxes, addMax, updateMax, deleteMax, exportAllData, importAllData } from "../storage.js";
import { ALL_PRIMARY_LIFTS } from "../precedentLibrary.js";
import { el } from "../ui.js";

export function render(root) {
  let showAddForm = false;
  let editingId = null;

  renderContent();

  function renderContent() {
    root.innerHTML = "";
    const maxes = getMaxes();

    root.appendChild(
      el("section", { class: "screen" }, [
        el("div", { class: "screen-header-row" }, [
          el("h2", {}, "Maxes"),
          el(
            "button",
            {
              type: "button",
              class: "btn btn-secondary",
              onclick: () => {
                showAddForm = !showAddForm;
                renderContent();
              },
            },
            showAddForm ? "Cancel" : "+ Add"
          ),
        ]),
        showAddForm ? addForm() : null,
        maxes.length
          ? el("div", { class: "card-list" }, maxes.map((m) => maxRow(m)))
          : el(
              "p",
              { class: "empty-state" },
              "Maxes are added the first time a lift shows up as a primary lift, or add one manually."
            ),
        backupCard(),
      ])
    );
  }

  function backupCard() {
    return el("div", { class: "card" }, [
      el("h3", { class: "card-title" }, "Backup & Restore"),
      el(
        "p",
        { class: "muted small" },
        "Data lives only on this device's browser storage — it isn't synced anywhere. Export before switching phones or resetting this one, then import on the new device to bring it back."
      ),
      el("div", { class: "inline-input-row" }, [
        el("button", { type: "button", class: "btn btn-secondary", onclick: handleExport }, "Export Data"),
        el("button", { type: "button", class: "btn btn-secondary", onclick: handleImport }, "Import Data"),
      ]),
    ]);
  }

  function handleExport() {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = el("a", { href: url, download: `olyapp-backup-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const input = el("input", { type: "file", accept: "application/json", class: "visually-hidden" });
    input.addEventListener("change", () => {
      const file = input.files[0];
      document.body.removeChild(input);
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          const count = `${data.sessions?.length ?? 0} sessions, ${data.maxes?.length ?? 0} maxes`;
          if (!confirm(`Replace all data on this device with the backup (${count})?`)) return;
          importAllData(data);
          renderContent();
        } catch (err) {
          alert(`Couldn't import that file: ${err.message}`);
        }
      };
      reader.readAsText(file);
    });
    document.body.appendChild(input);
    input.click();
  }

  function addForm() {
    const liftSelect = el(
      "select",
      { class: "select-input" },
      ALL_PRIMARY_LIFTS.map((l) => el("option", { value: l.name }, l.name))
    );
    const weightInput = el("input", {
      type: "number",
      inputmode: "decimal",
      placeholder: "Weight",
      class: "text-input",
    });
    const unitSelect = el("select", { class: "select-input" }, [
      el("option", { value: "kg" }, "KG"),
      el("option", { value: "lb" }, "LB"),
    ]);

    return el("div", { class: "card" }, [
      el("label", { class: "field-label" }, "Lift"),
      liftSelect,
      el("label", { class: "field-label" }, "Weight"),
      el("div", { class: "inline-input-row" }, [weightInput, unitSelect]),
      el(
        "button",
        {
          type: "button",
          class: "btn btn-primary btn-block",
          onclick: () => {
            const weight = Number(weightInput.value);
            if (!weight || weight <= 0) return;
            addMax({
              liftName: liftSelect.value,
              oneRepMax: weight,
              unit: unitSelect.value,
              dateSet: new Date().toISOString(),
            });
            showAddForm = false;
            renderContent();
          },
        },
        "Save"
      ),
    ]);
  }

  function maxRow(max) {
    if (editingId === max.id) return editForm(max);

    return el("div", { class: "card card-row-between" }, [
      el(
        "button",
        {
          type: "button",
          class: "row-btn",
          onclick: () => {
            editingId = max.id;
            renderContent();
          },
        },
        [el("strong", {}, max.liftName), el("span", { class: "muted" }, ` ${max.oneRepMax} ${max.unit}`)]
      ),
      el(
        "button",
        {
          type: "button",
          class: "btn-link danger",
          onclick: () => {
            deleteMax(max.id);
            renderContent();
          },
        },
        "Delete"
      ),
    ]);
  }

  function editForm(max) {
    const weightInput = el("input", {
      type: "number",
      inputmode: "decimal",
      value: String(max.oneRepMax),
      class: "text-input",
    });
    const unitSelect = el("select", { class: "select-input" }, [
      el("option", { value: "kg" }, "KG"),
      el("option", { value: "lb" }, "LB"),
    ]);
    unitSelect.value = max.unit;

    return el("div", { class: "card" }, [
      el("strong", {}, max.liftName),
      el("div", { class: "inline-input-row" }, [weightInput, unitSelect]),
      el("div", { class: "muted small" }, `Set on ${new Date(max.dateSet).toLocaleDateString()}`),
      el(
        "button",
        {
          type: "button",
          class: "btn btn-primary",
          onclick: () => {
            const weight = Number(weightInput.value);
            if (!weight || weight <= 0) return;
            updateMax(max.id, { oneRepMax: weight, unit: unitSelect.value });
            editingId = null;
            renderContent();
          },
        },
        "Save"
      ),
      el(
        "button",
        {
          type: "button",
          class: "btn-link",
          onclick: () => {
            editingId = null;
            renderContent();
          },
        },
        "Cancel"
      ),
    ]);
  }
}
