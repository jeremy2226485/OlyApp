// Accessory bank — carried over from the original class-derived library (the
// selection/pairing was good; only the barbell programming needed rework).
// Core stays folded into the accessory round, never a standalone finisher.
// Trunk-work prescriptions follow Everett: unweighted 10-30+, weighted 8-15,
// planks 20-30s weighted; HEAVY trunk work at most 2-3 days/week.

export const ACCESSORIES = [
  // Pulling
  { name: "Bent-Over Row", category: "pulling", rx: "10-12 reps" },
  { name: "Pendlay Row", category: "pulling", rx: "6-8 reps" },
  { name: "Bench-Supported DB Row", category: "pulling", rx: "10-12 reps/side" },
  { name: "Cable Row", category: "pulling", rx: "12-15 reps" },
  { name: "Chin-Up (banded if needed)", category: "pulling", rx: "6-10 reps" },
  { name: "Jumping Negatives", category: "pulling", rx: "5-6 reps" },

  // Pressing
  { name: "DB Strict Press", category: "pressing", rx: "8-10 reps" },
  { name: "Bench Press (paused)", category: "pressing", rx: "6-8 reps" },
  { name: "Push-Ups (weighted variant)", category: "pressing", rx: "10-15 reps" },
  { name: "Cable Press", category: "pressing", rx: "12-15 reps" },

  // Posterior chain / hinge
  { name: "RDL", category: "posterior", rx: "6-8 reps, moderate-heavy" },
  { name: "SLDL", category: "posterior", rx: "8 reps/side" },
  { name: "Back Extension (GHD bench)", category: "posterior", rx: "12-15 reps" },
  { name: "Glute Bridge", category: "posterior", rx: "15 reps" },
  { name: "Good Morning (light)", category: "posterior", rx: "8-10 reps, light" },
  { name: "Leg Press (light, high-rep)", category: "posterior", rx: "15-20 reps" },
  { name: "Hack Squat (light, high-rep)", category: "posterior", rx: "12-15 reps" },

  // Unilateral / stability
  { name: "Single-Arm Overhead Carry", category: "unilateral", rx: "30-40 ft/side" },
  { name: "Single-Arm Farmer Carry", category: "unilateral", rx: "40-50 ft/side" },
  { name: "KB Windmill", category: "unilateral", rx: "6-8 reps/side" },
  { name: "Reverse Lunge (front rack or overhead)", category: "unilateral", rx: "8 reps/side" },
  { name: "RFE Split Squat", category: "unilateral", rx: "8-10 reps/side" },
  { name: "Sandbag Carry", category: "unilateral", rx: "40-50 ft" },

  // Core — heavy (dynamic/weighted trunk flexion): big days, 2-3x/week max
  { name: "Weighted Sit-Up", category: "coreHeavy", rx: "8-12 reps, weighted" },
  { name: "GHD Sit-Up", category: "coreHeavy", rx: "10-12 reps" },
  { name: "Hanging Leg Raise", category: "coreHeavy", rx: "8-12 reps" },
  { name: "V-Ups", category: "coreHeavy", rx: "12-15 reps" },

  // Core — light (static/rotation/unweighted): little days
  { name: "Hollow Rocks", category: "coreLight", rx: "20-30 reps" },
  { name: "Weighted Plank", category: "coreLight", rx: "20-30 sec, add weight" },
  { name: "Side Plank Hip Raise", category: "coreLight", rx: "10 reps/side" },
  { name: "Ab-Saw", category: "coreLight", rx: "8-10 reps/side" },
  { name: "Russian Twist", category: "coreLight", rx: "10-12 reps/side" },
];

export function accessoriesByCategory(category) {
  return ACCESSORIES.filter((a) => a.category === category);
}
