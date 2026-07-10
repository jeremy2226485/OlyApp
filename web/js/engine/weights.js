// Weight math: percent-of-max -> actual barbell load, rounded to the gym's
// smallest real jump, with per-side plate math. Bar weight and rounding
// increment are user settings (kg + 15kg bar by default).

import { MAX_DEFINITIONS } from "../data/exercises.js";

export const DEFAULT_SETTINGS = {
  unit: "kg",
  barWeight: 15,
  increment: 1, // smallest total-weight jump: 0.5kg change plates per side
};

export function roundToIncrement(value, increment) {
  if (!increment || increment <= 0) increment = 1;
  return Math.round(value / increment) * increment;
}

// Resolve the working 1RM for a maxRef key. Falls back to an estimate from a
// related max (e.g. power snatch ~85% of snatch) — flagged so the UI can show
// it as an estimate and prompt for the real number.
export function resolveMax(maxRef, maxes) {
  const direct = maxes[maxRef];
  if (direct != null && direct > 0) return { value: direct, estimated: false, ref: maxRef };

  const def = MAX_DEFINITIONS.find((d) => d.key === maxRef);
  if (def?.estFrom) {
    const base = maxes[def.estFrom.ref];
    if (base != null && base > 0) {
      return { value: base * def.estFrom.factor, estimated: true, ref: maxRef, from: def.estFrom.ref };
    }
  }
  return { value: null, estimated: false, ref: maxRef };
}

export function loadForPercent(pct, oneRepMax, settings) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const raw = oneRepMax * pct;
  // Never prescribe below the empty bar.
  const total = Math.max(s.barWeight, roundToIncrement(raw, s.increment));
  return {
    total,
    perSide: Math.max(0, (total - s.barWeight) / 2),
    unit: s.unit,
  };
}

export function formatWeight(w, settings) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const trim = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ""));
  if (w.total <= s.barWeight) return `bar (${trim(s.barWeight)} ${s.unit})`;
  return `${trim(w.total)} ${s.unit} · +${trim(w.perSide)}/side`;
}
