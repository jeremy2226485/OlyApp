// Loading-scheme builders — the "how effort escalates" engine.
//
// The old generator interpolated N evenly-spaced sets between a lower and
// upper percent, every lift the same way. Real programming (see
// docs/catalyst-programming-notes.md) escalates differently per day intent:
// sets across at one weight, ascending work with shrinking jumps and reps cut
// as the bar gets heavy, waves, heavy singles past a flat zone, and RM top
// sets followed by back-offs calculated from the day's top set.
//
// Builders are pure percent logic: they return ordered set descriptors
// ({phase, pct, reps, isTop, note}) and know nothing about kg. Weights are
// attached separately (attachWeights) so all of this is unit-testable.

function r01(pct) {
  return Math.round(pct * 100) / 100;
}

function set(phase, pct, reps, extra = {}) {
  return { phase, pct: pct == null ? null : r01(pct), reps, ...extra };
}

// Warm-up ramp: empty bar, then a few jumps from a fixed ladder below the
// first work set, reps cut as weight climbs so no fatigue is banked before
// the work sets (Everett's warm-up guidance). Lifts later in the session get
// an abbreviated ramp — the lifter is already hot.
export function warmupRamp(firstWorkPct, { abbreviated = false } = {}) {
  const LADDER = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  let steps = LADDER.filter((p) => p <= firstWorkPct - 0.04);
  steps = steps.slice(-(abbreviated ? 2 : 4));
  const repsFor = (p) => (p < 0.5 ? 4 : p < 0.65 ? 3 : p < 0.8 ? 2 : 1);
  const ramp = steps.map((p) => set("warmup", p, repsFor(p)));
  if (!abbreviated) ramp.unshift(set("warmup", 0, 5, { isBar: true }));
  return ramp;
}

// Flat "sets across": the standard Catalyst prescription shape (75% x 2 x 5).
export function setsAcross({ pct, reps, sets, repsLabel }) {
  return Array.from({ length: sets }, () => set("work", pct, reps, { repsLabel }));
}

// Ascending work: jumps shrink as the bar gets heavier (ease-out curve), and
// when the climb spans enough ground the last set(s) drop a rep — effort
// escalates instead of a linear march of identical sets.
export function ascendDoubles({ start, top, sets = 5, reps = 2, repsLabel }) {
  const out = [];
  const span = top - start;
  for (let i = 0; i < sets; i++) {
    const t = sets === 1 ? 1 : i / (sets - 1);
    const eased = 1 - Math.pow(1 - t, 1.7);
    const pct = start + span * eased;
    let r = reps;
    if (span >= 0.08 && i === sets - 1) r = Math.max(1, reps - 1);
    out.push(set("work", pct, r, { repsLabel, isTop: i === sets - 1 }));
  }
  return out;
}

// Classic wave loading: (low x2, mid x2, high x1) repeated, second wave
// nudged up 2-3% — the drop between waves lets the top of wave two exceed
// what a straight climb would allow.
export function wave({ low, high, waves = 2, repsLabel }) {
  const mid = (low + high) / 2;
  const out = [];
  for (let w = 0; w < waves; w++) {
    const bump = w * 0.025;
    out.push(set("work", low + bump, 2, { repsLabel }));
    out.push(set("work", mid + bump, 2, { repsLabel }));
    out.push(set("work", high + bump, 1, { repsLabel, isTop: w === waves - 1 }));
  }
  return out;
}

// Big-day competition lift: doubles through the flat zone, singles as the
// jumps shrink toward a heavy single (~88-93% — heavy, NOT a max attempt),
// then optional back-off doubles to bank quality volume at a weight that
// still moves fast.
export function heavySingle({ start, top, backoffPct, backoffSets = 0, repsLabel }) {
  const span = top - start;
  const out = [
    set("work", start, 2, { repsLabel }),
    set("work", start + span * 0.4, 2, { repsLabel }),
    set("work", start + span * 0.65, 1, { repsLabel }),
    set("work", start + span * 0.85, 1, { repsLabel }),
    set("work", top, 1, { repsLabel, isTop: true, note: "Heavy single for the day — crisp, not a grind" }),
  ];
  for (let i = 0; i < backoffSets; i++) {
    out.push(set("backoff", backoffPct, 2, { repsLabel, note: i === 0 ? "Back-off — speed and precision" : undefined }));
  }
  return out;
}

// RM-style top set + back-offs: climb to one heavy set of N, then take 95% /
// 90% OF THE DAY'S TOP WEIGHT for the same reps (Catalyst RM notation).
export function rmBackoff({ top, reps, backoffs = [0.95, 0.9], repsLabel }) {
  const out = [
    set("work", top * 0.86, reps, { repsLabel }),
    set("work", top * 0.94, reps, { repsLabel }),
    set("work", top, reps, { repsLabel, isTop: true, note: `Top ${reps} for the day` }),
  ];
  for (const b of backoffs) {
    out.push(set("backoff", top * b, reps, { repsLabel, note: `${Math.round(b * 100)}% of today's top set` }));
  }
  return out;
}

// Explicit 1RM test day (only when requested — never a default): controlled
// singles to 95%, then open PR attempts with small jumps.
export function maxTest({ repsLabel } = {}) {
  return [
    set("work", 0.8, 1, { repsLabel }),
    set("work", 0.85, 1, { repsLabel }),
    set("work", 0.9, 1, { repsLabel }),
    set("work", 0.95, 1, { repsLabel }),
    set("attempt", null, 1, { repsLabel, isTop: true, note: "PR attempt — small jump (+1-2kg)" }),
    set("attempt", null, 1, { repsLabel, isTop: true, note: "PR attempt — keep adding small amounts while it moves well" }),
  ];
}

const BUILDERS = { setsAcross, ascendDoubles, wave, heavySingle, rmBackoff, maxTest };

// Build a lift's full set list (warm-up ramp + work) from its loading profile.
export function buildSets(loading, { abbreviated = false, topCap = null } = {}) {
  const params = { ...loading };
  if (topCap != null) {
    for (const k of ["top", "high", "pct"]) {
      if (params[k] != null) params[k] = Math.min(params[k], topCap);
    }
    if (params.start != null && params.top != null) params.start = Math.min(params.start, params.top - 0.05);
    if (params.low != null && params.high != null) params.low = Math.min(params.low, params.high - 0.08);
  }
  const builder = BUILDERS[params.scheme];
  if (!builder) throw new Error(`Unknown scheme: ${params.scheme}`);
  const work = builder(params);
  const firstWork = work.find((s) => s.pct != null)?.pct ?? 0.7;
  const ramp = warmupRamp(firstWork, { abbreviated });
  return [...ramp, ...work];
}

// Attach real weights when a max is available. Sets keep their percent either
// way, so the UI degrades to %-only guidance when no max is on file.
export function attachWeights(sets, oneRepMax, settings, loadForPercent) {
  return sets.map((s) => {
    if (oneRepMax == null) return { ...s };
    if (s.isBar) {
      return { ...s, weight: { total: settings.barWeight, perSide: 0, unit: settings.unit } };
    }
    if (s.pct == null) return { ...s };
    return { ...s, weight: loadForPercent(s.pct, oneRepMax, settings) };
  });
}

// Rough time cost per set (incl. rest), for the planner's session budgeting.
export function estimateMinutes(sets) {
  return Math.round(
    sets.reduce((sum, s) => sum + (s.phase === "warmup" ? 1.2 : s.phase === "attempt" ? 3 : s.pct >= 0.85 ? 2.8 : 2.2), 0)
  );
}
