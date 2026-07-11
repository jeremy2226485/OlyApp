import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateSession,
  chooseIntent,
  chooseFamily,
  missCapFor,
  toLoggedSession,
  rotateAccessoryMove,
} from "./planner.js";

const rng = () => 0.01; // deterministic picks

function loggedSession({ daysAgo = 1, family = "snatch", intent = "big", blocks = [], accessory } = {}) {
  return {
    date: new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString(),
    minutes: 90,
    family,
    intent,
    blocks,
    accessory: accessory ?? { emphasis: "pulling", moves: [] },
  };
}

const MAXES = { snatch: 80, clean: 100, jerk: 105, backSquat: 130, frontSquat: 110 };

test("big and little days alternate per the week-structure rule", () => {
  assert.equal(chooseIntent([]), "big");
  assert.equal(chooseIntent([loggedSession({ intent: "big" })]), "little");
  assert.equal(chooseIntent([loggedSession({ intent: "little" })]), "big");
  // Fully rested overrides the alternation.
  assert.equal(chooseIntent([loggedSession({ intent: "big", daysAgo: 4 })]), "big");
  assert.equal(chooseIntent([], { testMax: true }), "test");
});

test("competition family rotates snatch <-> clean", () => {
  assert.equal(chooseFamily([loggedSession({ family: "snatch" })], {}, rng), "clean");
  assert.equal(chooseFamily([loggedSession({ family: "clean" })], {}, rng), "snatch");
  assert.equal(chooseFamily([loggedSession({ family: "snatch" })], { family: "snatch" }, rng), "snatch");
});

test("big day builds comp -> pull -> squat in Everett's session order", () => {
  const session = generateSession(90, [loggedSession({ family: "clean", intent: "little" })], MAXES, {}, {}, rng);
  assert.equal(session.intent, "big");
  assert.equal(session.family, "snatch");
  const slots = session.blocks.map((b) => b.slot);
  assert.deepEqual(slots, ["comp", "pull", "squat"]);
  assert.equal(session.blocks[0].exerciseId, "snatch");
  // Heavy day comp lift climbs to a heavy single ~90%, not a linear ramp.
  const work = session.blocks[0].sets.filter((s) => s.phase === "work");
  assert.equal(work.at(-1).pct, 0.9);
  assert.equal(work.at(-1).reps, 1);
  const backoffs = session.blocks[0].sets.filter((s) => s.phase === "backoff");
  assert.ok(backoffs.length >= 1, "heavy single day includes back-off volume");
});

test("little day uses technique/speed variants and receiving work, no heavy singles", () => {
  const session = generateSession(75, [loggedSession({ family: "clean", intent: "big" })], MAXES, {}, {}, rng);
  assert.equal(session.intent, "little");
  assert.equal(session.family, "snatch");
  assert.ok(session.blocks.every((b) => (b.topPct ?? 0) < 0.9 || b.slot === "receiving"));
  const comp = session.blocks.find((b) => b.slot === "comp");
  assert.ok(["powerSnatch", "hangSnatch", "snatchComplex", "powerSnatchHangSnatch"].includes(comp.exerciseId));
  assert.ok(session.blocks.some((b) => b.slot === "receiving"), "little day includes receiving/overhead work");
});

test("45-minute session trims to fewer barbell blocks", () => {
  const long = generateSession(90, [], MAXES, {}, {}, rng);
  const short = generateSession(45, [], MAXES, {}, {}, rng);
  assert.ok(short.blocks.length < long.blocks.length);
  assert.ok(short.blocks.some((b) => b.slot === "comp"), "comp lift always survives the trim");
});

test("weights carry per-side plate math from the configured bar", () => {
  const session = generateSession(90, [], MAXES, { barWeight: 15, unit: "kg", increment: 1 }, {}, rng);
  const withWeight = session.blocks[0].sets.find((s) => s.weight && s.pct > 0);
  assert.ok(withWeight);
  assert.equal(withWeight.weight.perSide, (withWeight.weight.total - 15) / 2);
});

test("missing max degrades to percent-only sets and flags the block", () => {
  const session = generateSession(90, [], {}, {}, {}, rng);
  const comp = session.blocks[0];
  assert.equal(comp.maxInfo.value, null);
  assert.ok(comp.sets.every((s) => s.weight === undefined));
});

test("48h heavy rule drops a repeat heavy comp lift to technique work", () => {
  const history = [
    loggedSession({
      daysAgo: 1,
      family: "clean",
      intent: "little", // forces today big
      blocks: [{ exerciseId: "snatch", slot: "comp", topPct: 0.9 }],
    }),
  ];
  const session = generateSession(90, history, MAXES, {}, { family: "snatch", compExerciseId: "snatch" }, rng);
  const comp = session.blocks.find((b) => b.exerciseId === "snatch");
  assert.notEqual(comp.intentUsed, "heavy");
  assert.ok(comp.topPct < 0.85);
});

test("heavy squat within 48h forces a lighter pause-squat variant", () => {
  const history = [
    loggedSession({
      daysAgo: 1,
      family: "clean",
      intent: "little",
      blocks: [{ exerciseId: "backSquat", slot: "squat", topPct: 0.87 }],
    }),
  ];
  const session = generateSession(90, history, MAXES, {}, {}, rng);
  const squat = session.blocks.find((b) => b.slot === "squat");
  assert.ok(squat, "big day still squats");
  assert.ok(["pauseBackSquat", "pauseFrontSquat"].includes(squat.exerciseId));
  assert.ok(squat.topPct < 0.75);
});

test("repeated misses cap the next heavy day at 85%", () => {
  const history = [
    loggedSession({
      daysAgo: 3,
      family: "snatch",
      intent: "big",
      blocks: [
        {
          exerciseId: "snatch",
          slot: "comp",
          topPct: 0.9,
          setResults: [
            { phase: "work", pct: 0.87, missed: true },
            { phase: "work", pct: 0.9, missed: true },
          ],
        },
      ],
    }),
  ];
  assert.equal(missCapFor(history, "snatch"), 0.85);
  const session = generateSession(90, history, MAXES, {}, { family: "snatch", compExerciseId: "snatch" }, rng);
  const comp = session.blocks.find((b) => b.exerciseId === "snatch");
  assert.ok(comp.topPct <= 0.85);
  assert.match(comp.note, /misses/i);
});

test("test day works to opens PR attempts on the comp lift only", () => {
  const session = generateSession(90, [], MAXES, {}, { testMax: true, family: "snatch" }, rng);
  assert.equal(session.isTest, true);
  const comp = session.blocks.find((b) => b.slot === "comp");
  assert.ok(comp.sets.some((s) => s.phase === "attempt"));
  const others = session.blocks.filter((b) => b.slot !== "comp");
  assert.ok(others.every((b) => !b.sets.some((s) => s.phase === "attempt")));
});

test("accessory folds core in and alternates emphasis; heavy core only on big days", () => {
  const history = [loggedSession({ intent: "little", accessory: { emphasis: "pulling", moves: [] } })];
  const session = generateSession(90, history, MAXES, {}, {}, rng);
  assert.equal(session.accessory.emphasis, "pressing");
  const cats = session.accessory.moves.map((m) => m.category);
  assert.ok(cats.includes("coreHeavy") || cats.includes("coreLight"), "core folded into the round");
  const little = generateSession(90, [loggedSession({ intent: "big" })], MAXES, {}, {}, rng);
  assert.ok(!little.accessory.moves.some((m) => m.category === "coreHeavy"), "little day keeps core light/static");
});

test("clean/jerk prep drills and cues ride along on the block", () => {
  const session = generateSession(90, [loggedSession({ family: "snatch", intent: "little" })], MAXES, {}, { compExerciseId: "cleanAndJerk" }, rng);
  const comp = session.blocks.find((b) => b.exerciseId === "cleanAndJerk");
  assert.ok(comp.cues.length >= 2);
  assert.ok(session.warmup.prepGroups.some((g) => g.drills.some((d) => /tall muscle clean/i.test(d))));
  assert.ok(session.warmup.prepGroups.some((g) => g.drills.some((d) => /split/i.test(d))));
});

test("rotateAccessoryMove cycles same-category alternates, skipping used and avoided", () => {
  const session = generateSession(90, [], MAXES, {}, {}, rng);
  const idx = 0;
  const before = session.accessory.moves[idx];
  const others = new Set(session.accessory.moves.filter((_, i) => i !== idx).map((m) => m.name));

  rotateAccessoryMove(session, idx);
  const after = session.accessory.moves[idx];
  assert.notEqual(after.name, before.name, "move changes");
  assert.equal(after.category, before.category, "stays in the same category");
  assert.ok(after.rx, "prescription carried over");
  assert.ok(!others.has(after.name), "doesn't duplicate another move in the round");

  // Avoided alternates are skipped.
  const avoided = new Set([session.accessory.moves[idx].name]);
  rotateAccessoryMove(session, idx, avoided);
  assert.ok(!avoided.has(session.accessory.moves[idx].name));

  // Cycling far enough comes back around within the category without ever
  // duplicating a move currently in the round.
  for (let i = 0; i < 20; i++) {
    rotateAccessoryMove(session, idx);
    const names = session.accessory.moves.map((m) => m.name);
    assert.equal(new Set(names).size, names.length, "no duplicates in the round");
    assert.equal(session.accessory.moves[idx].category, before.category);
  }

  // Out-of-range index is a no-op, not a crash.
  const snapshot = JSON.stringify(session.accessory.moves);
  rotateAccessoryMove(session, 99);
  assert.equal(JSON.stringify(session.accessory.moves), snapshot);
});

test("toLoggedSession round-trips the fields the planner reads back", () => {
  const session = generateSession(90, [], MAXES, { unit: "kg" }, {}, rng);
  session.blocks[0].sets.forEach((s) => (s.done = true));
  session.accessory.moves[0].done = true;
  const logged = toLoggedSession(session);
  assert.equal(logged.family, session.family);
  assert.equal(logged.intent, session.intent);
  assert.equal(logged.unit, "kg");
  assert.equal(logged.blocks[0].topPct, session.blocks[0].topPct);
  assert.ok(logged.blocks[0].setResults.every((r) => typeof r.done === "boolean"));
  assert.equal(logged.accessory.moves[0].done, true);
  assert.equal(logged.accessory.moves[1].done, false);
  assert.ok(logged.accessory.moves.every((m) => m.rx), "prescriptions preserved in the log");
  assert.equal(logged.accessory.rounds, session.accessory.rounds);
});
