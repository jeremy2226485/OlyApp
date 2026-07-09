import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sessionStructure,
  warmupDuration,
  chooseCompetitionFamily,
  chooseSecondaryTemplate,
  buildPrimaryLift,
  buildWarmup,
  buildAccessoryRound,
  generate,
} from "./generator.js";
import { familyForLiftName, SQUAT_VARIANTS, CLEAN_CUE, JERK_CUE } from "./precedentLibrary.js";

function loggedSession({ date, primaryLifts = [], accessoryMoves = [] }) {
  return { date, primaryLifts, accessoryMoves };
}

function liftEntry(liftName, category, topPercent) {
  return { liftName, category, topPercent, wasHeavy: topPercent >= 0.85 };
}

// Rule 7: session length -> block count

test("sessionStructure buckets length correctly", () => {
  assert.equal(sessionStructure(45), "single");
  assert.equal(sessionStructure(60), "primaryPlusSecondary");
  assert.equal(sessionStructure(90), "dualPrimary");
  assert.equal(sessionStructure(30), "single");
  assert.equal(sessionStructure(120), "dualPrimary");
});

test("generate produces one primary lift for a single-structure length", () => {
  const session = generate(45, [], []);
  assert.equal(session.primaryLifts.length, 1);
  assert.ok(session.accessory.exercises.length > 0);
});

test("generate produces two primary lifts for a dual-primary length", () => {
  const session = generate(90, [], []);
  assert.equal(session.primaryLifts.length, 2);
});

// Rule 8: warm-up scales with session length

test("warmupDuration stays within 5-10 minutes", () => {
  for (let minutes = 20; minutes <= 120; minutes += 5) {
    const duration = warmupDuration(minutes);
    assert.ok(duration >= 5 && duration <= 10, `duration ${duration} out of bounds for ${minutes}min`);
  }
});

// Rule 1: rotate primary lift family

test("family rotates away from snatch after a snatch session", () => {
  const last = loggedSession({
    date: new Date().toISOString(),
    primaryLifts: [liftEntry("Snatch", "snatchFamily", 0.8)],
  });
  assert.equal(chooseCompetitionFamily(last), "cleanJerkFamily");
});

test("family rotates away from clean/jerk after a clean session", () => {
  const last = loggedSession({
    date: new Date().toISOString(),
    primaryLifts: [liftEntry("Clean", "cleanJerkFamily", 0.8)],
  });
  assert.equal(chooseCompetitionFamily(last), "snatchFamily");
});

// Rule 2: squat balance

test("squat balance avoids heavy squat within 48 hours", () => {
  const recent = loggedSession({
    date: new Date(Date.now() - 3600 * 1000).toISOString(),
    primaryLifts: [liftEntry("Back Squat", "squat", 0.88)],
  });
  for (let i = 0; i < 25; i++) {
    const template = chooseSecondaryTemplate([recent], new Set());
    if (template.category === "squat") {
      assert.ok(template.workSetPercentRange[1] < 0.75, `expected light squat, got ${template.name}`);
    }
  }
});

// Rule 4: intensity spacing

test("intensity spacing caps a heavy lift trained within 48 hours", () => {
  const recent = loggedSession({
    date: new Date(Date.now() - 3600 * 1000).toISOString(),
    primaryLifts: [liftEntry("Back Squat", "squat", 0.88)],
  });
  const template = SQUAT_VARIANTS.find((l) => l.name === "Back Squat");
  const result = buildPrimaryLift(template, [recent], [], false);
  assert.ok(result.targetPercentRange[1] <= 0.8);
  assert.equal(result.isHeavyToday, false);
});

test("intensity spacing does not cap a lift trained over 48 hours ago", () => {
  const old = loggedSession({
    date: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    primaryLifts: [liftEntry("Back Squat", "squat", 0.88)],
  });
  const template = SQUAT_VARIANTS.find((l) => l.name === "Back Squat");
  const result = buildPrimaryLift(template, [old], [], false);
  assert.deepEqual(result.targetPercentRange, template.workSetPercentRange);
});

// Rule 5: core always folded into accessory round

test("accessory round always includes a core movement", () => {
  for (let i = 0; i < 25; i++) {
    const round = buildAccessoryRound([], 3, 4, new Set());
    assert.ok(round.exercises.some((e) => e.category === "core"));
  }
});

// Rule 3: push/pull balance alternates

test("accessory emphasis flips from pulling to pressing", () => {
  const pullingSession = loggedSession({
    date: new Date().toISOString(),
    accessoryMoves: ["Bent-Over Row", "Pendlay Row", "Hollow Rocks"],
  });
  const round = buildAccessoryRound([pullingSession], 3, 3, new Set());
  assert.equal(round.emphasis, "pressing");
});

// Manual "avoid X today" override

test("avoided movement is never selected in accessory round", () => {
  const round = buildAccessoryRound([], 3, 4, new Set(["Hollow Rocks"]));
  assert.ok(!round.exercises.some((e) => e.name === "Hollow Rocks"));
});

// Technical cues + required prep drills

test("Clean carries its cue and required prep drills", () => {
  const template = familyForLiftName("Clean");
  assert.deepEqual(template.requiredPrepDrills, ["Tall muscle clean", "Tall clean"]);
  assert.ok(template.technicalCues.includes(CLEAN_CUE));
});

test("Jerk From Rack carries its cue and required prep drills", () => {
  const template = familyForLiftName("Jerk From Rack");
  assert.deepEqual(template.requiredPrepDrills, [
    "Behind-the-neck push jerk in split",
    "Press in split",
    "Widen my split",
  ]);
  assert.ok(template.technicalCues.includes(JERK_CUE));
});

test("warm-up automatically includes required prep drills", () => {
  const template = familyForLiftName("Clean");
  const lift = buildPrimaryLift(template, [], [], false);
  const warmup = buildWarmup([lift], 8);
  assert.ok(warmup.liftSpecificPrep.some((s) => s.startsWith("Tall muscle clean")));
  assert.ok(warmup.liftSpecificPrep.some((s) => s.startsWith("Tall clean")));
});

// Lazy 1RM entry

test("needsMaxEntry is true when no max is on file", () => {
  const template = familyForLiftName("Snatch");
  const lift = buildPrimaryLift(template, [], [], false);
  assert.equal(lift.needsMaxEntry, true);
  assert.equal(lift.estimatedWorkingWeight, null);
});

test("estimated weight is computed once a max is on file", () => {
  const template = familyForLiftName("Back Squat");
  const max = { liftName: "Back Squat", oneRepMax: 200, unit: "lb" };
  const lift = buildPrimaryLift(template, [], [max], false);
  assert.equal(lift.needsMaxEntry, false);
  assert.ok(lift.estimatedWorkingWeight != null);
});

// Optional true 1RM-finder day

test("test-max day uses the max-finder ladder", () => {
  const template = familyForLiftName("Snatch");
  const lift = buildPrimaryLift(template, [], [], true);
  assert.deepEqual(lift.targetPercentRange, [0.9, 1.03]);
  assert.equal(lift.isHeavyToday, true);
});
