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
import { familyForLiftName, SQUAT_VARIANTS, ACCESSORY_MOVES, CLEAN_CUE, JERK_CUE } from "./precedentLibrary.js";

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

test("Hack Squat is in the posterior-chain accessory pool", () => {
  const hackSquat = ACCESSORY_MOVES.find((m) => m.name === "Hack Squat (light, high-rep)");
  assert.ok(hackSquat);
  assert.equal(hackSquat.category, "posteriorChain");
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

test("warm-up automatically includes required prep drills, grouped per lift", () => {
  const cleanTemplate = familyForLiftName("Clean");
  const squatTemplate = SQUAT_VARIANTS.find((l) => l.name === "Back Squat");
  const cleanLift = buildPrimaryLift(cleanTemplate, [], [], false);
  const squatLift = buildPrimaryLift(squatTemplate, [], [], false);
  const warmup = buildWarmup([cleanLift, squatLift], 8);

  assert.equal(warmup.liftSpecificPrep.length, 2);
  const cleanGroup = warmup.liftSpecificPrep.find((g) => g.liftName === "Clean");
  assert.deepEqual(cleanGroup.requiredPrepDrills, ["Tall muscle clean x5", "Tall clean x5"]);
  assert.ok(cleanGroup.buildUp.startsWith("Clean build-up:"));

  const squatGroup = warmup.liftSpecificPrep.find((g) => g.liftName === "Back Squat");
  assert.deepEqual(squatGroup.requiredPrepDrills, []);
  assert.ok(squatGroup.buildUp.startsWith("Back Squat build-up:"));
});

test("general warm-up prep is present alongside required drills, not replaced by them", () => {
  const template = familyForLiftName("Clean");
  const lift = buildPrimaryLift(template, [], [], false);
  const warmup = buildWarmup([lift], 8);
  assert.ok(warmup.generalPrep.length > 0);
});

test("general prep is untouched when no lift has required prep drills", () => {
  const template = SQUAT_VARIANTS.find((l) => l.name === "Back Squat");
  const lift = buildPrimaryLift(template, [], [], false);
  const warmup = buildWarmup([lift], 8);
  assert.equal(warmup.generalPrep.length, 4);
});

test("general prep is trimmed to make room when required prep drills are present", () => {
  const cleanTemplate = familyForLiftName("Clean"); // 2 required drills
  const cleanLift = buildPrimaryLift(cleanTemplate, [], [], false);
  const cleanOnlyWarmup = buildWarmup([cleanLift], 8);
  assert.equal(cleanOnlyWarmup.generalPrep.length, 3);

  const complexTemplate = familyForLiftName("Clean and Jerk"); // 5 required drills
  const complexLift = buildPrimaryLift(complexTemplate, [], [], false);
  const complexWarmup = buildWarmup([complexLift], 8);
  assert.equal(complexWarmup.generalPrep.length, 2);
});

test("general prep never trims below 2 items regardless of how many drills are required", () => {
  const cleanTemplate = familyForLiftName("Clean and Jerk");
  const jerkTemplate = familyForLiftName("Jerk From Rack");
  const lifts = [
    buildPrimaryLift(cleanTemplate, [], [], false),
    buildPrimaryLift(jerkTemplate, [], [], false),
  ];
  const warmup = buildWarmup(lifts, 10);
  assert.ok(warmup.generalPrep.length >= 2);
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

// Work sets: 3 (not 5), each resolved to weight + per-side plate math once a max exists

test("work sets description says 3 sets, not 5", () => {
  const template = familyForLiftName("Snatch");
  const lift = buildPrimaryLift(template, [], [], false);
  assert.match(lift.workSetsDescription, /^3 sets building to/);
});

test("3 ascending work sets are produced regardless of max presence", () => {
  const template = familyForLiftName("Snatch");
  const withoutMax = buildPrimaryLift(template, [], [], false);
  assert.equal(withoutMax.workSets.length, 3);
  assert.ok(withoutMax.workSets.every((s) => s.weight === null && s.perSide === null));
  assert.ok(withoutMax.workSets[0].percent < withoutMax.workSets[2].percent);

  const max = { liftName: "Snatch", oneRepMax: 60, unit: "kg" };
  const withMax = buildPrimaryLift(template, [], [max], false);
  assert.equal(withMax.workSets.length, 3);
  assert.ok(withMax.workSets.every((s) => s.weight != null && s.perSide != null));
});

test("work set weight and per-side plate math are computed correctly", () => {
  const template = SQUAT_VARIANTS.find((l) => l.name === "Back Squat"); // range [0.75, 0.9]
  const max = { liftName: "Back Squat", oneRepMax: 100, unit: "kg" };
  const lift = buildPrimaryLift(template, [], [max], false);

  assert.deepEqual(
    lift.workSets.map((s) => s.weight),
    [75, 82.5, 90]
  );
  assert.deepEqual(
    lift.workSets.map((s) => s.perSide),
    [30, 33.75, 37.5]
  );
  // Top (last) work set is the reported estimated working weight.
  assert.equal(lift.estimatedWorkingWeight, 90);
});

test("per-side math never goes negative when the target weight is under an empty bar", () => {
  const template = SQUAT_VARIANTS.find((l) => l.name === "Overhead Squat"); // range [0.5, 0.7], light
  const max = { liftName: "Overhead Squat", oneRepMax: 20, unit: "kg" }; // very light max
  const lift = buildPrimaryLift(template, [], [max], false);
  assert.ok(lift.workSets.every((s) => s.perSide >= 0));
});

test("build-up ramp shows per-side plate math once a max is on file", () => {
  const template = familyForLiftName("Back Squat");
  const max = { liftName: "Back Squat", oneRepMax: 100, unit: "kg" };
  const lift = buildPrimaryLift(template, [], [max], false);
  assert.ok(lift.buildSets.some((s) => s.includes("/side")));

  const liftNoMax = buildPrimaryLift(template, [], [], false);
  assert.ok(liftNoMax.buildSets.every((s) => !s.includes("/side")));
});

// Manual "which lift(s) today" override

test("specified lift fills the single-session slot instead of auto-rotation", () => {
  const session = generate(45, [], [], { specifiedLifts: ["Snatch Balance"] });
  assert.equal(session.primaryLifts.length, 1);
  assert.equal(session.primaryLifts[0].liftName, "Snatch Balance");
});

test("specified competition lift and specified secondary lift both honored in a dual-primary session", () => {
  const session = generate(90, [], [], { specifiedLifts: ["Power Snatch", "Front Squat"] });
  const names = session.primaryLifts.map((l) => l.liftName);
  assert.ok(names.includes("Power Snatch"));
  assert.ok(names.includes("Front Squat"));
});

test("specifying only a secondary-category lift leaves the competition slot on auto-pick", () => {
  const session = generate(90, [], [], { specifiedLifts: ["Clean Pull"] });
  const names = session.primaryLifts.map((l) => l.liftName);
  assert.ok(names.includes("Clean Pull"));
  assert.equal(session.primaryLifts.length, 2);
});

test("unrecognized specified lift name is ignored, falling back to auto-selection", () => {
  const session = generate(45, [], [], { specifiedLifts: ["Not A Real Lift"] });
  assert.equal(session.primaryLifts.length, 1);
  assert.ok(session.primaryLifts[0].liftName.length > 0);
});

// Optional true 1RM-finder day

test("test-max day uses the max-finder ladder", () => {
  const template = familyForLiftName("Snatch");
  const lift = buildPrimaryLift(template, [], [], true);
  assert.deepEqual(lift.targetPercentRange, [0.9, 1.03]);
  assert.equal(lift.isHeavyToday, true);
});
