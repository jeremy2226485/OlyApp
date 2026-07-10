// Settings: units + bar weight + rounding, 1RM editor, gist sync, backup.

import { h } from "../lib/dom.js";
import {
  getSettings,
  saveSettings,
  getMaxes,
  setMax,
  exportAllData,
  importAllData,
} from "../lib/storage.js";
import { connectSync, disconnectSync, isSyncConfigured, syncNow, getSyncStatus } from "../lib/sync.js";
import { MAX_DEFINITIONS } from "../data/exercises.js";

export function renderSettings(root) {
  const settings = getSettings();
  const maxes = getMaxes();

  root.append(h("h1", { class: "tag-title tag-title-sm" }, "SETTINGS"));

  // ── bar & units ──
  const barInput = h("input", {
    class: "input input-inline", type: "number", inputmode: "decimal", value: String(settings.barWeight),
    onChange: (e) => saveSettings({ barWeight: Number(e.target.value) || 15 }),
  });
  const incInput = h("input", {
    class: "input input-inline", type: "number", inputmode: "decimal", step: "0.5", value: String(settings.increment),
    onChange: (e) => saveSettings({ increment: Number(e.target.value) || 1 }),
  });
  const unitSeg = h("div", { class: "seg" },
    ["kg", "lb"].map((u) =>
      h("button", {
        class: `seg-btn${settings.unit === u ? " active" : ""}`,
        onClick: (e) => {
          saveSettings({ unit: u, barWeight: u === "kg" ? 15 : 35 });
          root.replaceChildren();
          renderSettings(root);
        },
      }, u)
    )
  );

  root.append(
    h("div", { class: "card" },
      h("h2", { class: "block-name" }, "Bar & units"),
      h("label", { class: "field-label" }, "Unit"),
      unitSeg,
      h("label", { class: "field-label" }, `Bar weight (${settings.unit})`),
      barInput,
      h("label", { class: "field-label" }, `Smallest weight jump (${settings.unit})`),
      incInput,
      h("p", { class: "hint" }, "Weights are rounded to the smallest jump; plate math shows what to load per side of this bar.")
    )
  );

  // ── maxes ──
  const maxRows = MAX_DEFINITIONS.map((def) => {
    const existing = maxes[def.key];
    const input = h("input", {
      class: "input input-inline", type: "number", inputmode: "decimal",
      value: existing ? String(existing.value) : "",
      placeholder: def.estFrom ? "auto-estimated" : "—",
      onChange: (e) => {
        const v = Number(e.target.value);
        setMax(def.key, v > 0 ? v : null);
        syncNow();
      },
    });
    const meta = existing
      ? `set ${new Date(existing.dateSet).toLocaleDateString()}`
      : def.estFrom
        ? `est. ${Math.round(def.estFrom.factor * 100)}% of ${MAX_DEFINITIONS.find((d) => d.key === def.estFrom.ref)?.name}`
        : "not set";
    return h("div", { class: "max-row" },
      h("div", {}, h("b", {}, def.name), h("span", { class: "muted small" }, ` ${meta}`)),
      input
    );
  });
  root.append(
    h("div", { class: "card" },
      h("h2", { class: "block-name" }, `1RMs (${settings.unit})`),
      h("p", { class: "hint" }, "Percentages for pulls & deadlifts run off the snatch/clean max — Catalyst convention — so those don't need their own entry."),
      maxRows
    )
  );

  // ── sync ──
  const status = getSyncStatus();
  const syncCard = h("div", { class: "card" }, h("h2", { class: "block-name" }, "Cloud sync"));
  if (isSyncConfigured()) {
    syncCard.append(
      h("p", { class: "hint" }, `Connected — private GitHub gist. Last: ${status.state}${status.message ? ` (${status.message})` : ""}`),
      h("button", { class: "btn btn-small", onClick: async (e) => {
        e.target.textContent = "Syncing…";
        const r = await syncNow();
        e.target.textContent = r.state === "error" ? `Error: ${r.message}`.slice(0, 60) : `Done (${r.state})`;
      } }, "Sync now"),
      h("button", { class: "btn btn-ghost btn-danger btn-small", onClick: () => {
        disconnectSync();
        root.replaceChildren();
        renderSettings(root);
      } }, "Disconnect")
    );
  } else {
    const tokenInput = h("input", { class: "input", type: "password", placeholder: "GitHub token (gist scope)" });
    const msg = h("p", { class: "hint" }, "Paste a GitHub personal access token with the gist scope. Data lives in a private gist on your account.");
    syncCard.append(
      msg,
      tokenInput,
      h("button", { class: "btn btn-small", onClick: async (e) => {
        const token = tokenInput.value.trim();
        if (!token) return;
        e.target.textContent = "Connecting…";
        try {
          await connectSync(token);
          root.replaceChildren();
          renderSettings(root);
        } catch (err) {
          e.target.textContent = "Connect";
          msg.textContent = `Failed: ${err.message}`;
        }
      } }, "Connect")
    );
  }
  root.append(syncCard);

  // ── backup ──
  root.append(
    h("div", { class: "card" },
      h("h2", { class: "block-name" }, "Backup"),
      h("button", { class: "btn btn-small", onClick: () => {
        const blob = new Blob([JSON.stringify(exportAllData(), null, 2)], { type: "application/json" });
        const a = h("a", { href: URL.createObjectURL(blob), download: `olyapp-backup-${new Date().toISOString().slice(0, 10)}.json` });
        a.click();
        URL.revokeObjectURL(a.href);
      } }, "Export JSON"),
      h("label", { class: "btn btn-ghost btn-small", style: "display:inline-block" }, "Import JSON",
        h("input", { type: "file", accept: "application/json", style: "display:none", onChange: async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          try {
            importAllData(JSON.parse(await file.text()));
            syncNow();
            root.replaceChildren();
            renderSettings(root);
          } catch (err) {
            alert(`Import failed: ${err.message}`);
          }
        } })
      )
    )
  );
}
