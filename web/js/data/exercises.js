// Exercise library with per-lift programming knowledge distilled from the
// Catalyst Athletics exercise library and program-design articles (see
// docs/catalyst-programming-notes.md for the source notes and conventions).
//
// Every lift declares:
//  - maxRef:   which 1RM its percentages are calculated from. Pulls and
//              deadlifts are % of the SNATCH/CLEAN max (Catalyst convention),
//              not of a pull max.
//  - estFrom:  fallback estimate when that max isn't on file, e.g. a power
//              snatch max is ~85% of the snatch max.
//  - slot:     where the lift belongs in a session (Everett's exercise-order
//              rules): primer -> comp -> receiving/overhead -> pull -> squat.
//  - systemic: "big" lifts (heavy comp lifts, pulls, squats) vs "little"
//              (speed/technique/overhead) — drives big/little day alternation.
//  - loading:  one loading profile per day intent. `scheme` names a builder
//              in engine/schemes.js; params are percentages of maxRef's 1RM.

export const MAX_DEFINITIONS = [
  { key: "snatch", name: "Snatch" },
  { key: "clean", name: "Clean" },
  { key: "jerk", name: "Jerk" },
  { key: "powerSnatch", name: "Power Snatch", estFrom: { ref: "snatch", factor: 0.85 } },
  { key: "powerClean", name: "Power Clean", estFrom: { ref: "clean", factor: 0.85 } },
  { key: "backSquat", name: "Back Squat" },
  { key: "frontSquat", name: "Front Squat", estFrom: { ref: "backSquat", factor: 0.85 } },
  { key: "overheadSquat", name: "Overhead Squat", estFrom: { ref: "snatch", factor: 1.0 } },
  { key: "pushPress", name: "Push Press", estFrom: { ref: "jerk", factor: 0.8 } },
];

const SNATCH_CUE = null; // Cara hasn't added snatch cues yet — extensible on purpose.
export const CLEAN_CUE =
  "Control the pull. Smooth. Middle of foot balance. Push knees out, not just back. Smooth on the way up — slow until I'm near the top of my thigh.";
export const JERK_CUE =
  "Hips under shoulders. Piston. Lift knee. Reach the foot. Mindful of bending my back knee. Chin/head back. Split along the diagonal with a wider split stance. Turn back foot in the catch.";

// Required prep drills (physio/coach mandated) — grouped per lift, inserted
// into the lifting warm-up whenever the lift appears as a primary.
export const CLEAN_PREP = ["Tall muscle clean x5", "Tall clean x5"];
export const JERK_PREP = ["BTN push jerk in split x5", "Press in split x5", "Widen my split x5"];

export const EXERCISES = [
  // ── Competition lifts ────────────────────────────────────────────────
  {
    id: "snatch",
    name: "Snatch",
    family: "snatch",
    slot: "comp",
    maxRef: "snatch",
    systemic: "big",
    repCap: 3,
    loading: {
      heavy: { scheme: "heavySingle", start: 0.75, top: 0.9, backoffPct: 0.8, backoffSets: 2 },
      moderate: { scheme: "wave", low: 0.72, high: 0.82, waves: 2 },
      technique: { scheme: "setsAcross", pct: 0.7, reps: 2, sets: 5 },
      test: { scheme: "maxTest" },
    },
    note: "Catalyst: 1-3 reps at 70-100%. Heavy singles past the flat zone on big days; waves or sets across otherwise.",
  },
  {
    id: "clean",
    name: "Clean",
    family: "clean",
    slot: "comp",
    maxRef: "clean",
    systemic: "big",
    repCap: 3,
    cues: [CLEAN_CUE],
    prepDrills: CLEAN_PREP,
    loading: {
      heavy: { scheme: "heavySingle", start: 0.75, top: 0.9, backoffPct: 0.8, backoffSets: 2 },
      moderate: { scheme: "wave", low: 0.72, high: 0.82, waves: 2 },
      technique: { scheme: "setsAcross", pct: 0.7, reps: 2, sets: 5 },
      test: { scheme: "maxTest" },
    },
    note: "Catalyst: 1-3 reps at 70-100%.",
  },
  {
    id: "cleanAndJerk",
    name: "Clean & Jerk",
    family: "clean",
    slot: "comp",
    maxRef: "clean",
    systemic: "big",
    repCap: 2,
    repsLabel: "1+1",
    cues: [CLEAN_CUE, JERK_CUE],
    prepDrills: [...CLEAN_PREP, ...JERK_PREP],
    loading: {
      heavy: { scheme: "heavySingle", start: 0.72, top: 0.88, backoffPct: 0.78, backoffSets: 2, repsLabel: "1+1" },
      moderate: { scheme: "wave", low: 0.7, high: 0.8, waves: 2, repsLabel: "1+1" },
      technique: { scheme: "setsAcross", pct: 0.68, reps: 1, sets: 5, repsLabel: "1+1" },
      test: { scheme: "maxTest", repsLabel: "1+1" },
    },
    note: "Catalyst: 70-100%, reps notated clean+jerk (1+1). Slightly lower top than clean alone — the jerk limits.",
  },
  {
    id: "jerkFromRack",
    name: "Jerk (from rack)",
    family: "jerk",
    slot: "comp",
    maxRef: "jerk",
    systemic: "little",
    repCap: 3,
    cues: [JERK_CUE],
    prepDrills: JERK_PREP,
    loading: {
      heavy: { scheme: "heavySingle", start: 0.75, top: 0.9, backoffPct: 0.8, backoffSets: 2 },
      moderate: { scheme: "wave", low: 0.72, high: 0.82, waves: 2 },
      technique: { scheme: "setsAcross", pct: 0.7, reps: 2, sets: 5 },
      test: { scheme: "maxTest" },
    },
    note: "Catalyst: jerks 1-3 reps at 70-100%; overhead work is systemically 'little' even when intense.",
  },

  // ── Power & hang variants (lighter-day / speed work) ─────────────────
  {
    id: "powerSnatch",
    name: "Power Snatch",
    family: "snatch",
    slot: "comp",
    maxRef: "powerSnatch",
    systemic: "little",
    repCap: 3,
    loading: {
      heavy: { scheme: "heavySingle", start: 0.75, top: 0.88, backoffPct: 0.78, backoffSets: 1 },
      moderate: { scheme: "ascendDoubles", start: 0.7, top: 0.82, sets: 5 },
      technique: { scheme: "setsAcross", pct: 0.7, reps: 2, sets: 5 },
    },
    note: "Catalyst: 1-3 reps at 70-100% of best POWER snatch. Speed and aggression in both pulls; meets the bar in the turnover.",
  },
  {
    id: "powerClean",
    name: "Power Clean",
    family: "clean",
    slot: "comp",
    maxRef: "powerClean",
    systemic: "little",
    repCap: 3,
    cues: [CLEAN_CUE],
    prepDrills: CLEAN_PREP,
    loading: {
      heavy: { scheme: "heavySingle", start: 0.75, top: 0.88, backoffPct: 0.78, backoffSets: 1 },
      moderate: { scheme: "ascendDoubles", start: 0.7, top: 0.82, sets: 5 },
      technique: { scheme: "setsAcross", pct: 0.7, reps: 2, sets: 5 },
    },
    note: "Catalyst: 1-3 reps, % of best power clean.",
  },
  {
    id: "hangSnatch",
    name: "Hang Snatch",
    family: "snatch",
    slot: "comp",
    maxRef: "snatch",
    systemic: "little",
    repCap: 3,
    loading: {
      moderate: { scheme: "ascendDoubles", start: 0.68, top: 0.78, sets: 5 },
      technique: { scheme: "setsAcross", pct: 0.72, reps: 2, sets: 5 },
    },
    note: "Catalyst: 1-3 reps. Technique ≤75-80%; lighter-day guideline 70-80%. Trains RFD, complete pull, aggressive turnover.",
  },
  {
    id: "hangClean",
    name: "Hang Clean",
    family: "clean",
    slot: "comp",
    maxRef: "clean",
    systemic: "little",
    repCap: 3,
    cues: [CLEAN_CUE],
    prepDrills: CLEAN_PREP,
    loading: {
      moderate: { scheme: "ascendDoubles", start: 0.68, top: 0.78, sets: 5 },
      technique: { scheme: "setsAcross", pct: 0.72, reps: 2, sets: 5 },
    },
    note: "Catalyst: 1-3 reps, 70-80% guideline for lighter days.",
  },
  {
    id: "powerCleanPowerJerk",
    name: "Power Clean + Power Jerk",
    family: "clean",
    slot: "comp",
    maxRef: "powerClean",
    systemic: "little",
    repCap: 2,
    repsLabel: "1+1",
    cues: [CLEAN_CUE, JERK_CUE],
    prepDrills: [...CLEAN_PREP, ...JERK_PREP],
    loading: {
      moderate: { scheme: "ascendDoubles", start: 0.65, top: 0.78, sets: 5, repsLabel: "1+1" },
      technique: { scheme: "setsAcross", pct: 0.65, reps: 1, sets: 5, repsLabel: "1+1" },
    },
    note: "Catalyst: 1-3 reps, 60% to max power clean. Good lighter-day C&J stand-in.",
  },

  // ── Complexes (preparatory / technique emphasis) ─────────────────────
  {
    id: "snatchComplex",
    name: "Snatch Pull + Snatch",
    family: "snatch",
    slot: "comp",
    maxRef: "snatch",
    systemic: "little",
    repCap: 2,
    repsLabel: "1+1",
    loading: {
      moderate: { scheme: "setsAcross", pct: 0.68, reps: 1, sets: 5, repsLabel: "1+1" },
      technique: { scheme: "setsAcross", pct: 0.62, reps: 1, sets: 5, repsLabel: "1+1" },
    },
    note: "Catalyst complexes: pre-fatigue the pull before the lift; load limited by weakest piece, ~55-70%.",
  },
  {
    id: "powerSnatchHangSnatch",
    name: "Power Snatch + Hang Snatch",
    family: "snatch",
    slot: "comp",
    maxRef: "snatch",
    systemic: "little",
    repCap: 2,
    repsLabel: "1+1",
    loading: {
      moderate: { scheme: "setsAcross", pct: 0.62, reps: 1, sets: 5, repsLabel: "1+1" },
      technique: { scheme: "setsAcross", pct: 0.58, reps: 1, sets: 5, repsLabel: "1+1" },
    },
    note: "Catalyst: teaches receiving the bar at the same height — stay connected, don't drop under.",
  },
  {
    id: "cleanComplex",
    name: "Clean Pull + Clean",
    family: "clean",
    slot: "comp",
    maxRef: "clean",
    systemic: "little",
    repCap: 2,
    repsLabel: "1+1",
    cues: [CLEAN_CUE],
    prepDrills: CLEAN_PREP,
    loading: {
      moderate: { scheme: "setsAcross", pct: 0.68, reps: 1, sets: 5, repsLabel: "1+1" },
      technique: { scheme: "setsAcross", pct: 0.62, reps: 1, sets: 5, repsLabel: "1+1" },
    },
    note: "Catalyst complexes: moderate weights in preparatory phases.",
  },

  // ── Receiving position / overhead strength (mid-session) ─────────────
  {
    id: "snatchBalance",
    name: "Snatch Balance",
    family: "snatch",
    slot: "receiving",
    maxRef: "snatch",
    systemic: "little",
    repCap: 3,
    loading: {
      heavy: { scheme: "heavySingle", start: 0.78, top: 0.95, backoffSets: 0 },
      moderate: { scheme: "ascendDoubles", start: 0.7, top: 0.85, sets: 5 },
      technique: { scheme: "setsAcross", pct: 0.65, reps: 3, sets: 4 },
    },
    note: "Catalyst: 1-3 reps, 70-100%+ of snatch — exceeding best snatch builds receiving confidence. Mid-session placement.",
  },
  {
    id: "overheadSquat",
    name: "Overhead Squat",
    family: "snatch",
    slot: "receiving",
    maxRef: "overheadSquat",
    systemic: "little",
    repCap: 5,
    loading: {
      heavy: { scheme: "rmBackoff", top: 0.88, reps: 2, backoffs: [0.92] },
      moderate: { scheme: "ascendDoubles", start: 0.7, top: 0.82, sets: 4, reps: 3 },
      technique: { scheme: "setsAcross", pct: 0.65, reps: 3, sets: 4 },
    },
    note: "Catalyst: 1-3 reps (to 5). The basic snatch receiving-position strength lift.",
  },
  {
    id: "snatchPushPress",
    name: "Snatch Push Press",
    family: "snatch",
    slot: "receiving",
    maxRef: "snatch",
    systemic: "little",
    repCap: 5,
    loading: {
      moderate: { scheme: "ascendDoubles", start: 0.75, top: 0.95, sets: 4, reps: 4 },
      technique: { scheme: "setsAcross", pct: 0.7, reps: 5, sets: 4 },
    },
    note: "Catalyst: 2-5 reps, can exceed best snatch. Overhead position strength; pairs with OHS.",
  },
  {
    id: "pushPress",
    name: "Push Press",
    family: "jerk",
    slot: "receiving",
    maxRef: "pushPress",
    systemic: "little",
    repCap: 6,
    loading: {
      heavy: { scheme: "rmBackoff", top: 0.88, reps: 3, backoffs: [0.92] },
      moderate: { scheme: "ascendDoubles", start: 0.72, top: 0.84, sets: 4, reps: 4 },
      technique: { scheme: "setsAcross", pct: 0.7, reps: 5, sets: 4 },
    },
    note: "Catalyst: 1-6 reps. Trains the jerk's dip/drive and leg-to-arm timing; builds overhead strength.",
  },
  {
    id: "btnPowerJerk",
    name: "Power Jerk Behind the Neck",
    family: "jerk",
    slot: "receiving",
    maxRef: "jerk",
    systemic: "little",
    repCap: 3,
    cues: [JERK_CUE],
    loading: {
      moderate: { scheme: "ascendDoubles", start: 0.65, top: 0.8, sets: 5 },
      technique: { scheme: "setsAcross", pct: 0.65, reps: 3, sets: 4 },
    },
    note: "Catalyst: 1-3 reps 70-100% of variant; BTN bar path is directly vertical — confidence and position builder.",
  },

  // ── Pulls & deadlifts (% of the COMPETITION lift's max) ──────────────
  {
    id: "snatchPull",
    name: "Snatch Pull",
    family: "snatch",
    slot: "pull",
    maxRef: "snatch",
    systemic: "big",
    repCap: 5,
    loading: {
      heavy: { scheme: "ascendDoubles", start: 0.9, top: 1.02, sets: 4, reps: 3 },
      moderate: { scheme: "setsAcross", pct: 0.9, reps: 3, sets: 4 },
    },
    note: "Catalyst: 2-5 reps at 80-110% of best SNATCH. Technique-limited lifters should bias heavier (Trouble with Pulls).",
  },
  {
    id: "cleanPull",
    name: "Clean Pull",
    family: "clean",
    slot: "pull",
    maxRef: "clean",
    systemic: "big",
    repCap: 5,
    loading: {
      heavy: { scheme: "ascendDoubles", start: 0.9, top: 1.02, sets: 4, reps: 3 },
      moderate: { scheme: "setsAcross", pct: 0.9, reps: 3, sets: 4 },
    },
    note: "Catalyst: 2-5 reps at 80-110% of best CLEAN.",
  },
  {
    id: "snatchHighPull",
    name: "Snatch High-Pull",
    family: "snatch",
    slot: "pull",
    maxRef: "snatch",
    systemic: "big",
    repCap: 5,
    loading: {
      moderate: { scheme: "setsAcross", pct: 0.78, reps: 4, sets: 4 },
    },
    note: "Catalyst: 2-5 reps at 70-90% of snatch — elbow height limits load. Trains vertical finish + arm mechanics.",
  },
  {
    id: "snatchDeadlift",
    name: "Snatch Deadlift",
    family: "snatch",
    slot: "pull",
    maxRef: "snatch",
    systemic: "big",
    repCap: 6,
    loading: {
      heavy: { scheme: "ascendDoubles", start: 0.95, top: 1.1, sets: 4, reps: 4 },
      moderate: { scheme: "setsAcross", pct: 0.95, reps: 5, sets: 3 },
    },
    note: "Catalyst: 2-6 reps at 80-120% of snatch. Slower — posture, position, balance focus.",
  },
  {
    id: "cleanDeadlift",
    name: "Clean Deadlift",
    family: "clean",
    slot: "pull",
    maxRef: "clean",
    systemic: "big",
    repCap: 6,
    loading: {
      heavy: { scheme: "ascendDoubles", start: 0.95, top: 1.1, sets: 4, reps: 4 },
      moderate: { scheme: "setsAcross", pct: 0.95, reps: 5, sets: 3 },
    },
    note: "Catalyst: 2-6 reps at 80-120% of clean.",
  },

  // ── Squats (near the end of the session) ─────────────────────────────
  {
    id: "backSquat",
    name: "Back Squat",
    family: "squat",
    slot: "squat",
    maxRef: "backSquat",
    systemic: "big",
    repCap: 5,
    loading: {
      heavy: { scheme: "rmBackoff", top: 0.87, reps: 3, backoffs: [0.95, 0.9] },
      moderate: { scheme: "setsAcross", pct: 0.78, reps: 5, sets: 4 },
      technique: { scheme: "setsAcross", pct: 0.65, reps: 5, sets: 3 },
    },
    note: "Catalyst: 1-5 reps (to 10 early prep). RM day style: top set then back-offs at 95%/90% of the day's top.",
  },
  {
    id: "frontSquat",
    name: "Front Squat",
    family: "squat",
    slot: "squat",
    maxRef: "frontSquat",
    systemic: "big",
    repCap: 5,
    loading: {
      heavy: { scheme: "rmBackoff", top: 0.88, reps: 2, backoffs: [0.95, 0.9] },
      moderate: { scheme: "setsAcross", pct: 0.78, reps: 4, sets: 4 },
      technique: { scheme: "setsAcross", pct: 0.65, reps: 4, sets: 3 },
    },
    note: "Catalyst: 1-5 reps, always fewer than back squat. Upright trunk + quad strength for the clean.",
  },
  {
    id: "pauseBackSquat",
    name: "Pause Back Squat",
    family: "squat",
    slot: "squat",
    maxRef: "backSquat",
    systemic: "big",
    repCap: 3,
    tempo: "2-3s pause in the bottom",
    loading: {
      moderate: { scheme: "setsAcross", pct: 0.72, reps: 3, sets: 4 },
      technique: { scheme: "setsAcross", pct: 0.62, reps: 3, sets: 3 },
    },
    note: "Catalyst: 2-3 reps most common, never >5; ~80-90% of normal squat loading. 2-3s pause kills the stretch reflex.",
  },
  {
    id: "pauseFrontSquat",
    name: "Pause Front Squat",
    family: "squat",
    slot: "squat",
    maxRef: "frontSquat",
    systemic: "big",
    repCap: 3,
    tempo: "2-3s pause in the bottom",
    loading: {
      moderate: { scheme: "setsAcross", pct: 0.72, reps: 3, sets: 4 },
      technique: { scheme: "setsAcross", pct: 0.62, reps: 3, sets: 3 },
    },
    note: "Catalyst: programmed like pause back squats; pairing a pause rep with normal reps keeps the bounce timing trained.",
  },
];

export function exerciseById(id) {
  return EXERCISES.find((e) => e.id === id);
}

export function exercisesBySlot(slot) {
  return EXERCISES.filter((e) => e.slot === slot);
}

// Competition-day pools per family rotation (snatch day vs clean & jerk day).
export const COMP_POOLS = {
  snatch: {
    big: ["snatch"],
    little: ["powerSnatch", "hangSnatch", "snatchComplex", "powerSnatchHangSnatch"],
  },
  clean: {
    big: ["clean", "cleanAndJerk"],
    little: ["powerClean", "hangClean", "powerCleanPowerJerk", "cleanComplex", "jerkFromRack"],
  },
};

// Receiving/overhead pools matched to the day's family so warm-up positions carry over.
export const RECEIVING_POOLS = {
  snatch: ["snatchBalance", "overheadSquat", "snatchPushPress"],
  clean: ["pushPress", "btnPowerJerk", "jerkFromRack"],
};

export const PULL_POOLS = {
  snatch: ["snatchPull", "snatchHighPull", "snatchDeadlift"],
  clean: ["cleanPull", "cleanDeadlift"],
};

export const SQUAT_POOL = ["backSquat", "frontSquat", "pauseBackSquat", "pauseFrontSquat"];
