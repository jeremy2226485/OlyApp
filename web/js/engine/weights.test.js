import { test } from "node:test";
import assert from "node:assert/strict";
import { roundToIncrement, resolveMax, loadForPercent, formatWeight, DEFAULT_SETTINGS } from "./weights.js";

test("rounding respects the configured smallest jump", () => {
  assert.equal(roundToIncrement(87.3, 1), 87);
  assert.equal(roundToIncrement(87.3, 2.5), 87.5);
  assert.equal(roundToIncrement(86.24, 0.5), 86);
});

test("resolveMax prefers a real max and falls back to a flagged estimate", () => {
  const maxes = { snatch: 80 };
  const direct = resolveMax("snatch", maxes);
  assert.deepEqual([direct.value, direct.estimated], [80, false]);
  const est = resolveMax("powerSnatch", maxes);
  assert.equal(est.value, 80 * 0.85);
  assert.equal(est.estimated, true);
  assert.equal(est.from, "snatch");
  const missing = resolveMax("backSquat", maxes);
  assert.equal(missing.value, null);
});

test("loadForPercent never prescribes below the empty bar", () => {
  const w = loadForPercent(0.1, 60, { ...DEFAULT_SETTINGS, barWeight: 15 });
  assert.equal(w.total, 15);
  assert.equal(w.perSide, 0);
});

test("per-side math uses the configured bar weight", () => {
  const w = loadForPercent(0.8, 100, { ...DEFAULT_SETTINGS, barWeight: 20, increment: 1 });
  assert.equal(w.total, 80);
  assert.equal(w.perSide, 30);
});

test("formatWeight prints total and plates per side", () => {
  const s = { ...DEFAULT_SETTINGS, barWeight: 15 };
  assert.equal(formatWeight({ total: 60, perSide: 22.5, unit: "kg" }, s), "60 kg · +22.5/side");
  assert.equal(formatWeight({ total: 15, perSide: 0, unit: "kg" }, s), "bar (15 kg)");
});
