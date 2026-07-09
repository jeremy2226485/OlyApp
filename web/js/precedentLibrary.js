// Static template bank derived from ~50 screenshots of an in-person Olympic
// weightlifting class, cross-referenced against Catalyst Athletics and
// Torokhtiy programming philosophy. The generator samples from this bank
// rather than treating it as literal history.

export const CLEAN_CUE =
  "Control the pull. Smooth. Middle of foot balance. Push knees out, not just back. Smooth on the way up — slow until I'm near the top of my thigh.";
export const JERK_CUE =
  "Hips under shoulders. Piston. Lift knee. Reach the foot. Mindful of bending my back knee. Chin/head back. Split along the diagonal with a wider split stance. Turn back foot in the catch.";

export const CLEAN_PREP_DRILLS = ["Tall muscle clean", "Tall clean"];
export const JERK_PREP_DRILLS = ["Behind-the-neck push jerk in split", "Press in split", "Widen my split"];

function lift(name, category, opts = {}) {
  return {
    name,
    category,
    buildPattern: opts.buildPattern ?? [0.4, 0.5, 0.6, 0.7],
    workSetPercentRange: opts.workSetPercentRange ?? [0.75, 0.88],
    technicalCues: opts.technicalCues ?? [],
    requiredPrepDrills: opts.requiredPrepDrills ?? [],
    isComplex: opts.isComplex ?? false,
  };
}

export const SNATCH_FAMILY = [
  lift("Snatch", "snatchFamily", { buildPattern: [0.4, 0.5, 0.6, 0.7], workSetPercentRange: [0.75, 0.88] }),
  lift("Hang Snatch", "snatchFamily", { buildPattern: [0.4, 0.5, 0.6], workSetPercentRange: [0.65, 0.78] }),
  lift("Power Snatch", "snatchFamily", { buildPattern: [0.4, 0.5, 0.6, 0.65], workSetPercentRange: [0.65, 0.8] }),
  lift("Snatch Balance", "snatchFamily", { buildPattern: [0.3, 0.4, 0.5], workSetPercentRange: [0.6, 0.8] }),
  lift("Snatch Complex", "snatchFamily", { buildPattern: [0.3, 0.4, 0.5], workSetPercentRange: [0.55, 0.7], isComplex: true }),
  lift("Snatch Pull", "pull", { buildPattern: [0.5, 0.6, 0.7, 0.8], workSetPercentRange: [0.85, 1.05] }),
  lift("Snatch Grip Deadlift", "pull", { buildPattern: [0.5, 0.6, 0.7], workSetPercentRange: [0.9, 1.15] }),
];

export const CLEAN_JERK_FAMILY = [
  lift("Clean", "cleanJerkFamily", {
    buildPattern: [0.4, 0.5, 0.6, 0.7],
    workSetPercentRange: [0.75, 0.88],
    technicalCues: [CLEAN_CUE],
    requiredPrepDrills: CLEAN_PREP_DRILLS,
  }),
  lift("Power Clean", "cleanJerkFamily", {
    buildPattern: [0.4, 0.5, 0.6, 0.65],
    workSetPercentRange: [0.68, 0.82],
    technicalCues: [CLEAN_CUE],
    requiredPrepDrills: CLEAN_PREP_DRILLS,
  }),
  lift("Clean and Jerk", "cleanJerkFamily", {
    buildPattern: [0.3, 0.4, 0.5, 0.6],
    workSetPercentRange: [0.65, 0.82],
    technicalCues: [CLEAN_CUE, JERK_CUE],
    requiredPrepDrills: [...CLEAN_PREP_DRILLS, ...JERK_PREP_DRILLS],
    isComplex: true,
  }),
  lift("Clean Complex", "cleanJerkFamily", {
    buildPattern: [0.3, 0.4, 0.5],
    workSetPercentRange: [0.55, 0.7],
    technicalCues: [CLEAN_CUE],
    requiredPrepDrills: CLEAN_PREP_DRILLS,
    isComplex: true,
  }),
  lift("Jerk From Rack", "cleanJerkFamily", {
    buildPattern: [0.4, 0.5, 0.6, 0.7],
    workSetPercentRange: [0.75, 0.9],
    technicalCues: [JERK_CUE],
    requiredPrepDrills: JERK_PREP_DRILLS,
  }),
  lift("Clean Pull", "pull", { buildPattern: [0.5, 0.6, 0.7, 0.8], workSetPercentRange: [0.85, 1.05] }),
];

export const SQUAT_VARIANTS = [
  lift("Back Squat", "squat", { buildPattern: [0.4, 0.5, 0.6, 0.7], workSetPercentRange: [0.75, 0.9] }),
  lift("Front Squat", "squat", { buildPattern: [0.4, 0.5, 0.6, 0.65], workSetPercentRange: [0.7, 0.85] }),
  lift("Overhead Squat", "squat", { buildPattern: [0.3, 0.4, 0.5], workSetPercentRange: [0.5, 0.7] }),
];

export const ALL_PRIMARY_LIFTS = [...SNATCH_FAMILY, ...CLEAN_JERK_FAMILY, ...SQUAT_VARIANTS];

export function snatchCompetitionLifts() {
  return SNATCH_FAMILY.filter((l) => l.category === "snatchFamily");
}
export function cleanJerkCompetitionLifts() {
  return CLEAN_JERK_FAMILY.filter((l) => l.category === "cleanJerkFamily");
}
export function allPullVariants() {
  return [...SNATCH_FAMILY, ...CLEAN_JERK_FAMILY].filter((l) => l.category === "pull");
}
export function familyForLiftName(name) {
  return ALL_PRIMARY_LIFTS.find((l) => l.name.toLowerCase() === name.toLowerCase());
}

export const TEMPO_VARIANTS = [
  { name: "2-4 sec pause at the bottom of the squat", appliesTo: ["squat"] },
  { name: "3 sec pause just below the knee", appliesTo: ["pull"] },
  { name: "3-4 count slow eccentric", appliesTo: ["squat", "pull"] },
  { name: "Only first rep paused", appliesTo: ["squat"] },
];

// Confirmed equipment: barbells + plates, two power racks w/ pull-up bars,
// dumbbells, kettlebells, bands + straps, slam/wall balls, ab/back extension
// bench, GHD-style bench, leg press/hack squat sled, cable functional
// trainer, AirBike, rower, SkiErg, sandbags, plyo box, stability ball,
// treadmill, chains.
export const ACCESSORY_MOVES = [
  // Pulling
  { name: "Bent-Over Row", category: "pulling", typicalPrescription: "10-12 reps" },
  { name: "Pendlay Row", category: "pulling", typicalPrescription: "6-8 reps" },
  { name: "Bench-Supported DB Row", category: "pulling", typicalPrescription: "10-12 reps/side" },
  { name: "Cable Row", category: "pulling", typicalPrescription: "12-15 reps" },
  { name: "Chin-Up (banded if needed)", category: "pulling", typicalPrescription: "6-10 reps" },
  { name: "Jumping Negatives", category: "pulling", typicalPrescription: "5-6 reps" },

  // Pressing
  { name: "DB Strict Press", category: "pressing", typicalPrescription: "8-10 reps" },
  { name: "Bench Press (paused)", category: "pressing", typicalPrescription: "6-8 reps" },
  { name: "Push-Ups (weighted variant)", category: "pressing", typicalPrescription: "10-15 reps" },
  { name: "Cable Press", category: "pressing", typicalPrescription: "12-15 reps" },

  // Posterior chain / hinge
  { name: "RDL", category: "posteriorChain", typicalPrescription: "8-10 reps" },
  { name: "SLDL", category: "posteriorChain", typicalPrescription: "8 reps/side" },
  { name: "Back Extension (GHD-style bench)", category: "posteriorChain", typicalPrescription: "12-15 reps" },
  { name: "Glute Bridge", category: "posteriorChain", typicalPrescription: "15 reps" },
  { name: "Good Morning", category: "posteriorChain", typicalPrescription: "10 reps" },
  { name: "Leg Press (light, high-rep)", category: "posteriorChain", typicalPrescription: "15-20 reps" },
  { name: "Hack Squat (light, high-rep)", category: "posteriorChain", typicalPrescription: "12-15 reps" },

  // Unilateral / stability
  { name: "Single-Arm Overhead Carry", category: "unilateral", typicalPrescription: "30-40 ft/side" },
  { name: "Single-Arm Farmer Carry", category: "unilateral", typicalPrescription: "40-50 ft/side" },
  { name: "KB Windmill", category: "unilateral", typicalPrescription: "6-8 reps/side" },
  { name: "Reverse Lunge (front rack or overhead)", category: "unilateral", typicalPrescription: "8 reps/side" },
  { name: "RFE Split Squat", category: "unilateral", typicalPrescription: "8-10 reps/side" },
  { name: "Bouncing OHS Walk", category: "unilateral", typicalPrescription: "20-30 ft" },
  { name: "Sandbag Carry", category: "unilateral", typicalPrescription: "40-50 ft" },

  // Core (at least one required per accessory round)
  { name: "Hollow Rocks", category: "core", typicalPrescription: "20-30 reps" },
  { name: "Hollow-Ups", category: "core", typicalPrescription: "10-15 reps" },
  { name: "V-Ups", category: "core", typicalPrescription: "12-15 reps" },
  { name: "Ab-Saw", category: "core", typicalPrescription: "8-10 reps/side" },
  { name: "Side Plank Hip Raise", category: "core", typicalPrescription: "10 reps/side" },
  { name: "Weighted Plank", category: "core", typicalPrescription: "30-45 sec" },
  { name: "GHD-Style Sit-Up", category: "core", typicalPrescription: "10-12 reps" },

  // Conditioning-flavored — used sparingly; not part of default rotation pools.
  { name: "KB Swings", category: "conditioning", typicalPrescription: "15-20 reps" },
  { name: "Box Jumps", category: "conditioning", typicalPrescription: "8-10 reps" },
  { name: "Wall Ball / Slam Ball", category: "conditioning", typicalPrescription: "15 reps" },
  { name: "AirBike / Rower / SkiErg Interval", category: "conditioning", typicalPrescription: "20-30 sec" },
];
