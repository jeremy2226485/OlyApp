import { getMaxes, addMax, updateMax, deleteMax, exportAllData, importAllData } from "../storage.js";
import { ALL_PRIMARY_LIFTS } from "../precedentLibrary.js";
import { el } from "../ui.js";
import {
  isSyncConfigured,
  getSyncStatus,
  connectSync,
  disconnectSync,
  syncNow,
} from "../sync.js";

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
        syncCard(),
        backupCard(),
      ])
    );
  }

  // Fire a sync after any local mutation. Best-effort: doesn't block the UI
  // (renderContent() already ran with the local change), just refreshes the
  // sync status line — and the data itself — once the sync settles.
  function syncAndRerender() {
    syncNow().then(() => renderContent());
  }

  function syncCard() {
    if (!isSyncConfigured()) {
      const tokenInput = el("input", {
        type: "password",
        placeholder: "GitHub personal access token",
        class: "text-input",
        autocomplete: "off",
      });
      return el("div", { class: "card" }, [
        el("h3", { class: "card-title" }, "Cloud Sync"),
        el(
          "p",
          { class: "muted small" },
          "Automatically syncs sessions and maxes across your devices (on open, reload, and every save) using a private GitHub Gist as storage — no server to maintain. Create a classic token at github.com/settings/tokens with only the \"gist\" scope checked, then paste it here. Using a token from the same GitHub account on another device finds this same backup automatically — no need to copy an ID around."
        ),
        el(
          "p",
          { class: "muted small" },
          "Note: this syncs the whole backup, last-save-wins — fine for using one phone at a time, not for editing two phones at once without syncing in between."
        ),
        tokenInput,
        el(
          "button",
          {
            type: "button",
            class: "btn btn-primary btn-block",
            onclick: async () => {
              const token = tokenInput.value.trim();
              if (!token) return;
              try {
                await connectSync(token);
              } catch (err) {
                alert(`Couldn't connect: ${err.message}`);
              }
              renderContent();
            },
          },
          "Connect"
        ),
      ]);
    }

    const status = getSyncStatus();
    return el("div", { class: "card" }, [
      el("h3", { class: "card-title" }, "Cloud Sync"),
      el("p", { class: "muted small" }, syncStatusText(status)),
      el("div", { class: "inline-input-row" }, [
        el(
          "button",
          {
            type: "button",
            class: "btn btn-secondary",
            onclick: () => syncAndRerender(),
          },
          "Sync Now"
        ),
        el(
          "button",
          {
            type: "button",
            class: "btn-link danger",
            onclick: () => {
              if (confirm("Disconnect cloud sync on this device? Your data stays put, it just stops syncing.")) {
                disconnectSync();
                renderContent();
              }
            },
          },
          "Disconnect"
        ),
      ]),
    ]);
  }

  function backupCard() {
    return el("div", { class: "card" }, [
      el("h3", { class: "card-title" }, "Backup & Restore"),
      el(
        "p",
        { class: "muted small" },
        isSyncConfigured()
          ? "Cloud Sync above handles cross-device sync automatically. This is still useful for a manual point-in-time snapshot."
          : "Data lives only on this device's browser storage. Export before switching phones or resetting this one, then import on the new device to bring it back — or set up Cloud Sync above to do this automatically."
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
          syncAndRerender();
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
            syncAndRerender();
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
            syncAndRerender();
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
            syncAndRerender();
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

function syncStatusText(status) {
  if (status.state === "syncing") return "Syncing…";
  if (status.state === "error") return `Sync failed: ${status.message}. Your data is safe locally — this just means it hasn't reached the cloud yet.`;
  if (status.state === "synced") {
    const when = status.at ? new Date(status.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
    return status.message === "pulled"
      ? `Connected — pulled newer data from another device at ${when}.`
      : `Connected — last synced at ${when}.`;
  }
  return "Connected — not yet synced on this device.";
}
