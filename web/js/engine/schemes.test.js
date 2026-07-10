import { test } from "node:test";
import assert from "node:assert/strict";
import {
  warmupRamp,
  setsAcross,
  ascendDoubles,
  wave,
  heavySingle,
  rmBackoff,
  maxTest,
  buildSets,
  attachWeights,
} from "./schemes.js";
import { loadForPercent, DEFAULT_SETTINGS } from "./weights.js";

test("warm-up ramp starts with the empty bar and tapers reps as weight climbs", () => {
  const ramp = warmupRamp(0.75);
  assert.equal(ramp[0].isBar, true);
  assert.equal(ramp[0].reps, 5);
  const steps = ramp.slice(1);
  for (let i = 1; i < steps.length; i++) {
    assert.ok(steps[i].pct > steps[i - 1].pct, "ramp ascends");
    assert.ok(steps[i].reps <= steps[i - 1].reps, "reps never increase up the ramp");
  }
  assert.ok(steps.at(-1).pct <= 0.71, "ramp stays below first work set");
});

test("abbreviated ramp (mid-session lift) is short and has no bar set", () => {
  const ramp = warmupRamp(0.9, { abbreviated: true });
  assert.ok(ramp.length <= 2);
  assert.ok(!ramp.some((s) => s.isBar));
});

test("setsAcross is flat — the standard 75% x 2 x 5 shape", () => {
  const sets = setsAcross({ pct: 0.75, reps: 2, sets: 5 });
  assert.equal(sets.length, 5);
  assert.ok(sets.every((s) => s.pct === 0.75 && s.reps === 2));
});

test("ascendDoubles shrinks jumps near the top and cuts reps on the last set", () => {
  const sets = ascendDoubles({ start: 0.7, top: 0.82, sets: 5, reps: 2 });
  assert.equal(sets[0].pct, 0.7);
  assert.equal(sets.at(-1).pct, 0.82);
  const jumps = sets.slice(1).map((s, i) => s.pct - sets[i].pct);
  for (let i = 1; i < jumps.length; i++) {
    assert.ok(jumps[i] <= jumps[i - 1] + 1e-9, "jumps shrink as the bar gets heavier");
  }
  assert.equal(sets.at(-1).reps, 1, "top set drops to a single");
  assert.ok(sets.at(-1).isTop);
});

test("wave loading repeats with a nudge up on wave two", () => {
  const sets = wave({ low: 0.72, high: 0.82, waves: 2 });
  assert.equal(sets.length, 6);
  assert.deepEqual(
    sets.map((s) => s.reps),
    [2, 2, 1, 2, 2, 1]
  );
  assert.ok(sets[3].pct > sets[0].pct, "second wave starts heavier");
  assert.ok(sets[5].pct > sets[2].pct, "second wave tops heavier");
  assert.equal(sets[5].isTop, true);
});

test("heavySingle climbs doubles->singles to a top single, then backs off", () => {
  const sets = heavySingle({ start: 0.75, top: 0.9, backoffPct: 0.8, backoffSets: 2 });
  const work = sets.filter((s) => s.phase === "work");
  const backoff = sets.filter((s) => s.phase === "backoff");
  assert.equal(work.at(-1).pct, 0.9);
  assert.equal(work.at(-1).reps, 1);
  assert.ok(work.at(-1).isTop);
  assert.equal(backoff.length, 2);
  assert.ok(backoff.every((s) => s.pct === 0.8 && s.reps === 2));
  // Reps never increase while climbing.
  for (let i = 1; i < work.length; i++) assert.ok(work[i].reps <= work[i - 1].reps);
});

test("rmBackoff computes back-offs from the day's top set, not the 1RM", () => {
  const sets = rmBackoff({ top: 0.87, reps: 3, backoffs: [0.95, 0.9] });
  const top = sets.find((s) => s.isTop);
  assert.equal(top.pct, 0.87);
  const backoffs = sets.filter((s) => s.phase === "backoff");
  assert.equal(backoffs[0].pct, Math.round(0.87 * 0.95 * 100) / 100);
  assert.equal(backoffs[1].pct, Math.round(0.87 * 0.9 * 100) / 100);
  assert.ok(backoffs.every((s) => s.reps === 3), "back-offs keep the same reps");
});

test("maxTest ends in open PR attempts with no fixed percent", () => {
  const sets = maxTest({});
  const attempts = sets.filter((s) => s.phase === "attempt");
  assert.equal(attempts.length, 2);
  assert.ok(attempts.every((s) => s.pct === null && s.reps === 1));
  assert.equal(sets.filter((s) => s.phase === "work").at(-1).pct, 0.95);
});

test("buildSets applies a miss-derived top cap across scheme param shapes", () => {
  const capped = buildSets({ scheme: "heavySingle", start: 0.75, top: 0.92, backoffPct: 0.8, backoffSets: 1 }, { topCap: 0.85 });
  const maxPct = Math.max(...capped.filter((s) => s.pct != null).map((s) => s.pct));
  assert.ok(maxPct <= 0.85);
});

test("attachWeights adds rounded totals and per-side plate math", () => {
  const settings = { ...DEFAULT_SETTINGS, barWeight: 15, increment: 1 };
  const sets = attachWeights(setsAcross({ pct: 0.75, reps: 2, sets: 1 }), 80, settings, loadForPercent);
  assert.equal(sets[0].weight.total, 60); // 80 * .75
  assert.equal(sets[0].weight.perSide, 22.5); // (60-15)/2
});

test("without a max, sets keep percents and get no weights", () => {
  const sets = attachWeights(setsAcross({ pct: 0.75, reps: 2, sets: 1 }), null, DEFAULT_SETTINGS, loadForPercent);
  assert.equal(sets[0].weight, undefined);
  assert.equal(sets[0].pct, 0.75);
});
