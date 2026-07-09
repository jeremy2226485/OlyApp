// Pure rules engine over the precedent library + recent logged history.
// Deliberately decoupled from the DOM/storage so the rules can be tuned and
// unit-tested independently of the UI. This is a straight port of the
// original WorkoutGenerator.swift — same nine v3 generation rules.

import {
  SQUAT_VARIANTS,
  TEMPO_VARIANTS,
  ACCESSORY_MOVES,
  snatchCompetitionLifts,
  cleanJerkCompetitionLifts,
  allPullVariants,
  familyForLiftName,
} from "./precedentLibrary.js";

const COMPETITION_CATEGORIES = new Set(["snatchFamily", "cleanJerkFamily"]);

// Cara's bar weight, used to convert a total working weight into per-side
// plate math. Adjust here if she switches to a different bar.
const BAR_WEIGHT = { kg: 15, lb: 33 };
const WORK_SET_COUNT = 3;

const HOUR_MS = 3600 * 1000;

function isRecent(dateStr, hours) {
  return Date.now() - new Date(dateStr).getTime() < hours * HOUR_MS;
}

function primaryCategories(session) {
  return new Set(session.primaryLifts.map((l) => l.category));
}

function sessionHasHeavyLift(session, liftName) {
  return session.primaryLifts.some(
    (l) => l.liftName.toLowerCase() === liftName.toLowerCase() && l.wasHeavy
  );
}

function pickRandom(arr) {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

function roundToIncrement(value, increment) {
  return Math.round(value / increment) * increment;
}

// Per-side plate math: how much to add to each side of the bar to hit a
// given total weight (plates load symmetrically).
function perSideWeight(totalWeight, unit) {
  const barWeight = BAR_WEIGHT[unit] ?? BAR_WEIGHT.kg;
  return Math.max(0, (totalWeight - barWeight) / 2);
}

// MARK: - Rule 7: session length -> block count

export function sessionStructure(minutes) {
  if (minutes < 50) return "single";
  if (minutes < 75) return "primaryPlusSecondary";
  return "dualPrimary";
}

// Rule 8: warm-up scaled to session length, ~5-10 min.
export function warmupDuration(minutes) {
  return Math.round(Math.min(10, Math.max(5, minutes * 0.11)));
}

export function accessoryRounds(minutes, structure) {
  if (structure === "single") return 3;
  if (structure === "primaryPlusSecondary") return minutes < 65 ? 2 : 3;
  return 3;
}

export function accessoryMovementCount(minutes) {
  return minutes >= 80 ? 4 : 3;
}

// MARK: - Rule 1: rotate primary lift family

export function chooseCompetitionFamily(lastSession) {
  if (!lastSession) return Math.random() < 0.5 ? "snatchFamily" : "cleanJerkFamily";
  const cats = primaryCategories(lastSession);
  const hadSnatch = cats.has("snatchFamily");
  const hadCleanJerk = cats.has("cleanJerkFamily");
  if (hadSnatch && !hadCleanJerk) return "cleanJerkFamily";
  if (hadCleanJerk && !hadSnatch) return "snatchFamily";
  return Math.random() < 0.5 ? "snatchFamily" : "cleanJerkFamily";
}

export function chooseLiftTemplate(pool, history, avoid) {
  const available = pool.filter((l) => !avoid.has(l.name));
  const recentNames = new Set(history.slice(0, 3).flatMap((s) => s.primaryLifts.map((l) => l.liftName)));
  const fresh = available.filter((l) => !recentNames.has(l.name));
  const candidates = fresh.length ? fresh : available;
  return pickRandom(candidates) ?? pool[0];
}

// MARK: - Rule 2: squat balance + secondary slot (squat or pull)

function sessionsAgo(history, predicate) {
  const idx = history.findIndex(predicate);
  return idx === -1 ? null : idx;
}

export function chooseSecondaryTemplate(history, avoid) {
  const squatAgo = sessionsAgo(history, (s) => s.primaryLifts.some((l) => l.category === "squat"));
  const pullAgo = sessionsAgo(history, (s) => s.primaryLifts.some((l) => l.category === "pull"));
  const preferSquat = (squatAgo ?? Infinity) >= (pullAgo ?? Infinity);

  if (preferSquat) {
    const lastHeavySquat = history.find((s) =>
      s.primaryLifts.some((l) => (l.liftName === "Back Squat" || l.liftName === "Front Squat") && l.wasHeavy)
    );
    const mustGoLight = lastHeavySquat ? isRecent(lastHeavySquat.date, 48) : false;
    const pool = mustGoLight ? SQUAT_VARIANTS.filter((l) => l.workSetPercentRange[1] < 0.75) : SQUAT_VARIANTS;
    const filtered = pool.filter((l) => !avoid.has(l.name));
    return pickRandom(filtered) ?? SQUAT_VARIANTS.find((l) => l.name === "Overhead Squat");
  } else {
    const pool = allPullVariants().filter((l) => !avoid.has(l.name));
    return pickRandom(pool) ?? allPullVariants()[0];
  }
}

// MARK: - Rule 4 (intensity spacing) + rule 6 (tempo variety) + prep drill/cue wiring

export function buildPrimaryLift(template, history, maxes, testMax) {
  const recentHeavyOnThisLift = history.some(
    (s) => isRecent(s.date, 48) && sessionHasHeavyLift(s, template.name)
  );

  let [lower, upper] = template.workSetPercentRange;
  if (testMax) {
    [lower, upper] = [0.9, 1.03];
  } else if (recentHeavyOnThisLift) {
    const cappedUpper = Math.min(upper, 0.8);
    lower = Math.min(lower, cappedUpper);
    upper = Math.max(lower + 0.02, cappedUpper);
  }
  const isHeavyToday = testMax || upper >= 0.85;

  // Rule 6: if the same lift landed at a near-identical top % recently,
  // prefer varying via tempo/pause rather than only changing load.
  let tempoNote = null;
  if (!testMax) {
    const priorEntry = history.flatMap((s) => s.primaryLifts).find((l) => l.liftName === template.name);
    if (priorEntry && priorEntry.topPercent != null && Math.abs(priorEntry.topPercent - upper) < 0.05) {
      const options = TEMPO_VARIANTS.filter((t) => t.appliesTo.includes(template.category));
      tempoNote = pickRandom(options)?.name ?? null;
    }
  }

  const max = maxes.find((m) => m.liftName.toLowerCase() === template.name.toLowerCase());
  const increment = max ? (max.unit === "kg" ? 2.5 : 5) : 5;

  const buildSets = ["Bar x5", ...template.buildPattern.map((pct) => {
    if (max) {
      const weight = roundToIncrement(max.oneRepMax * pct, increment);
      const perSide = perSideWeight(weight, max.unit);
      return `${weight} ${max.unit} (${perSide} ${max.unit}/side) — ${Math.round(pct * 100)}%`;
    }
    return `${Math.round(pct * 100)}%`;
  })];

  // 3 ascending work sets across the target percent range (was 5 — too many
  // per Cara's feedback), each resolved to an actual weight + per-side plate
  // math once a max is on file, not just a percent.
  const setPercents =
    WORK_SET_COUNT === 1
      ? [upper]
      : Array.from({ length: WORK_SET_COUNT }, (_, i) => lower + ((upper - lower) * i) / (WORK_SET_COUNT - 1));

  const workSets = setPercents.map((percent) => {
    if (!max) return { percent, weight: null, perSide: null, unit: null };
    const weight = roundToIncrement(max.oneRepMax * percent, increment);
    return { percent, weight, perSide: perSideWeight(weight, max.unit), unit: max.unit };
  });

  const estimatedWorkingWeight = workSets[workSets.length - 1].weight;

  const workSetsDescription = testMax
    ? "Work up in small jumps to a new 1RM attempt"
    : `${WORK_SET_COUNT} sets building to a top set at ${Math.round(lower * 100)}-${Math.round(upper * 100)}%`;

  return {
    liftName: template.name,
    category: template.category,
    buildSets,
    workSets,
    workSetsDescription,
    targetPercentRange: [lower, upper],
    estimatedWorkingWeight,
    weightUnit: max ? max.unit : null,
    tempoNote,
    technicalCues: template.technicalCues,
    requiredPrepDrills: template.requiredPrepDrills,
    needsMaxEntry: !max,
    isHeavyToday,
  };
}

// MARK: - Rule 8 (warm-up) + required prep drills
//
// Required prep drills (e.g. the physio's mandatory Jerk/Clean inclusions)
// are kept grouped per lift — never interleaved with another lift's drills
// or with the general prep — and they're additive content within the same
// overall time budget (rule 8), not on top of it: the general prep list is
// trimmed to make room rather than letting the warm-up run long.

const FULL_GENERAL_PREP = [
  "Bike or row, 2-3 min easy",
  "Banded shoulder dislocates + pass-throughs",
  "Cossack squats x8/side",
  "Empty-bar good morning + RDL + back squat complex x5",
];
const MIN_GENERAL_PREP_ITEMS = 2;

export function buildWarmup(primaryLifts, minutes) {
  const liftSpecificPrep = primaryLifts.map((lift) => ({
    liftName: lift.liftName,
    requiredPrepDrills: lift.requiredPrepDrills.map((d) => `${d} x5`),
    buildUp: `${lift.liftName} build-up: ` + lift.buildSets.join(" -> "),
  }));

  const requiredDrillCount = liftSpecificPrep.reduce((sum, group) => sum + group.requiredPrepDrills.length, 0);
  const maxTrim = FULL_GENERAL_PREP.length - MIN_GENERAL_PREP_ITEMS;
  const trimCount = Math.min(Math.floor(requiredDrillCount / 2), maxTrim);
  const generalPrep = trimCount > 0 ? FULL_GENERAL_PREP.slice(0, FULL_GENERAL_PREP.length - trimCount) : FULL_GENERAL_PREP;

  return { generalPrep, liftSpecificPrep, estimatedMinutes: minutes };
}

// MARK: - Rule 3 (push/pull balance) + rule 5 (core folded into accessory)

function lastAccessoryEmphasis(history) {
  const last = history[0];
  if (!last) return null;
  const names = new Set(last.accessoryMoves);
  const pullingCount = ACCESSORY_MOVES.filter((m) => m.category === "pulling" && names.has(m.name)).length;
  const pressingCount = ACCESSORY_MOVES.filter((m) => m.category === "pressing" && names.has(m.name)).length;
  if (pullingCount === 0 && pressingCount === 0) return null;
  return pullingCount >= pressingCount ? "pulling" : "pressing";
}

export function buildAccessoryRound(history, rounds, movementCount, avoid) {
  const lastEmphasis = lastAccessoryEmphasis(history);
  const todayEmphasis = lastEmphasis === "pressing" ? "pulling" : "pressing";

  const emphasisPool = ACCESSORY_MOVES.filter((m) => m.category === todayEmphasis && !avoid.has(m.name));
  const corePool = ACCESSORY_MOVES.filter((m) => m.category === "core" && !avoid.has(m.name));
  const supportPool = ACCESSORY_MOVES.filter(
    (m) => ["posteriorChain", "unilateral"].includes(m.category) && !avoid.has(m.name)
  );

  const selected = [];
  const emphasisMove = pickRandom(emphasisPool);
  if (emphasisMove) selected.push(emphasisMove);
  // Core is always one of the rotating movements within the round(s) — never
  // a separate finisher section (rule 5).
  const coreMove = pickRandom(corePool);
  if (coreMove) selected.push(coreMove);
  while (selected.length < movementCount) {
    const remaining = [...supportPool, ...emphasisPool].filter((m) => !selected.includes(m));
    const next = pickRandom(remaining);
    if (!next) break;
    selected.push(next);
  }

  const exercises = selected.map((move) => ({
    name: move.name,
    prescription: `${rounds} rounds x ${move.typicalPrescription}`,
    category: move.category,
  }));

  return { rounds, exercises, emphasis: todayEmphasis };
}

// MARK: - Entry point

export function generate(lengthMinutes, history, maxes, options = {}) {
  const testMax = options.testMax ?? false;
  const avoid = options.avoidMovements ?? new Set();
  const specifiedNames = options.specifiedLifts ?? [];

  const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastSession = sortedHistory[0] ?? null;

  const structure = sessionStructure(lengthMinutes);
  const warmupMinutes = warmupDuration(lengthMinutes);
  const slotCount = structure === "single" ? 1 : 2;

  // Rule 1: rotate competition-lift family vs. the most recent logged session.
  function autoCompTemplate() {
    const family = chooseCompetitionFamily(lastSession);
    const pool = family === "snatchFamily" ? snatchCompetitionLifts() : cleanJerkCompetitionLifts();
    return chooseLiftTemplate(pool, sortedHistory, avoid);
  }

  // "Which lift(s) today" override: explicit choices fill their category's
  // slot directly (skipping rotation/selection, not the load/spacing rules
  // in buildPrimaryLift below), leaving any remaining slot on auto-pick.
  const specifiedTemplates = specifiedNames.map((name) => familyForLiftName(name)).filter(Boolean).slice(0, slotCount);
  const specifiedComp = specifiedTemplates.find((t) => COMPETITION_CATEGORIES.has(t.category)) ?? null;
  const specifiedSecondary = specifiedTemplates.find((t) => !COMPETITION_CATEGORIES.has(t.category)) ?? null;

  let primaryTemplates;
  if (slotCount === 1) {
    primaryTemplates = [specifiedComp ?? specifiedSecondary ?? autoCompTemplate()];
  } else {
    const comp = specifiedComp ?? autoCompTemplate();
    const secondary = specifiedSecondary ?? chooseSecondaryTemplate(sortedHistory, avoid);
    primaryTemplates = [comp, secondary];
  }

  const primaryLifts = primaryTemplates.map((template, i) =>
    buildPrimaryLift(template, sortedHistory, maxes, testMax && i === 0)
  );

  const warmup = buildWarmup(primaryLifts, warmupMinutes);

  const rounds = accessoryRounds(lengthMinutes, structure);
  const movementCount = accessoryMovementCount(lengthMinutes);
  const accessory = buildAccessoryRound(sortedHistory, rounds, movementCount, avoid);

  return {
    requestedLengthMinutes: lengthMinutes,
    date: new Date().toISOString(),
    warmup,
    primaryLifts,
    accessory,
    isMaxTestDay: testMax,
  };
}

export function toLoggedSession(generated) {
  const primaryLifts = generated.primaryLifts.map((lift) => {
    let loadDescription;
    if (lift.estimatedWorkingWeight != null && lift.weightUnit) {
      loadDescription = `${lift.estimatedWorkingWeight} ${lift.weightUnit}`;
    } else {
      loadDescription = `${Math.round(lift.targetPercentRange[0] * 100)}-${Math.round(lift.targetPercentRange[1] * 100)}%`;
    }
    return {
      liftName: lift.liftName,
      category: lift.category,
      setsReps: lift.workSetsDescription,
      loadDescription,
      topPercent: lift.targetPercentRange[1],
      wasHeavy: lift.targetPercentRange[1] >= 0.85 || generated.isMaxTestDay,
      notes: lift.tempoNote,
    };
  });
  const accessoryMoves = generated.accessory.exercises.map((e) => e.name);
  const tempoOrPauseVariant = generated.primaryLifts.map((l) => l.tempoNote).find(Boolean) ?? null;

  return {
    date: generated.date,
    lengthMinutes: generated.requestedLengthMinutes,
    primaryLifts,
    accessoryMoves,
    tempoOrPauseVariant,
  };
}
