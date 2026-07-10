// Session planner: turns (requested minutes + logged history + maxes +
// settings) into a complete session, following the structural rules from
// docs/catalyst-programming-notes.md:
//
//  - Big/little day alternation (Week Structure): heavy comp lift + pull +
//    squat days alternate with speed/technique/overhead days.
//  - Family rotation: snatch day vs clean & jerk day.
//  - Exercise order: primer -> comp lift -> receiving/overhead -> pull ->
//    squat -> accessory (+ core folded in).
//  - 48h heavy-lift spacing, squat balance, push/pull accessory alternation.
//  - Misses feedback: repeated misses at a percent cap the next heavy day.

import {
  exerciseById,
  COMP_POOLS,
  RECEIVING_POOLS,
  PULL_POOLS,
  SQUAT_POOL,
} from "../data/exercises.js";
import { ACCESSORIES } from "../data/accessories.js";
import { buildSets, attachWeights, estimateMinutes } from "./schemes.js";
import { resolveMax, loadForPercent, DEFAULT_SETTINGS } from "./weights.js";

const DAY_MS = 24 * 3600 * 1000;

function daysSince(dateStr) {
  return (Date.now() - new Date(dateStr).getTime()) / DAY_MS;
}

function pick(arr, rng) {
  if (!arr.length) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

// ── Day intent (big / little) ─────────────────────────────────────────

export function chooseIntent(history, options = {}) {
  if (options.testMax) return "test";
  if (options.intent && options.intent !== "auto") return options.intent;
  const last = history[0];
  if (!last) return "big";
  // Fully rested (3+ days off) — always fine to go big.
  if (daysSince(last.date) >= 3) return "big";
  if (last.intent === "big" || last.intent === "test") return "little";
  // Two little days in a row -> big.
  return "big";
}

// ── Family rotation (snatch day vs clean & jerk day) ──────────────────

export function chooseFamily(history, options = {}, rng = Math.random) {
  if (options.family && options.family !== "auto") return options.family;
  const last = history.find((s) => s.family === "snatch" || s.family === "clean");
  if (!last) return rng() < 0.5 ? "snatch" : "clean";
  return last.family === "snatch" ? "clean" : "snatch";
}

// ── History interrogation ─────────────────────────────────────────────

function liftTrainedHeavyWithin(history, exerciseId, hours) {
  return history.some(
    (s) =>
      daysSince(s.date) * 24 < hours &&
      (s.blocks ?? []).some((b) => b.exerciseId === exerciseId && b.topPct != null && b.topPct >= 0.85)
  );
}

function heavySquatWithin(history, hours) {
  return history.some(
    (s) =>
      daysSince(s.date) * 24 < hours &&
      (s.blocks ?? []).some((b) => b.slot === "squat" && b.topPct != null && b.topPct >= 0.75)
  );
}

// Misses feedback: if the last logged outing of this lift had 2+ missed work
// sets, cap the next heavy exposure at 85% and flag technique focus.
export function missCapFor(history, exerciseId) {
  for (const s of history) {
    const block = (s.blocks ?? []).find((b) => b.exerciseId === exerciseId);
    if (!block) continue;
    const misses = (block.setResults ?? []).filter((r) => r.phase !== "warmup" && r.missed).length;
    return misses >= 2 ? 0.85 : null;
  }
  return null;
}

function recentExerciseIds(history, n = 3) {
  return new Set(history.slice(0, n).flatMap((s) => (s.blocks ?? []).map((b) => b.exerciseId)));
}

// ── Block construction ────────────────────────────────────────────────

function intentKeyFor(exercise, dayIntent) {
  // Map the day intent onto the loading profiles this lift actually has.
  const prefs =
    dayIntent === "test"
      ? ["test", "heavy", "moderate", "technique"]
      : dayIntent === "big"
        ? ["heavy", "moderate", "technique"]
        : ["moderate", "technique", "heavy"];
  return prefs.find((k) => exercise.loading[k]);
}

function buildBlock(exercise, dayIntent, ctx, { capOverride = null } = {}) {
  const { maxes, settings, history, abbreviated } = ctx;
  const intentUsed = intentKeyFor(exercise, dayIntent);
  const loading = exercise.loading[intentUsed];
  const missCap = missCapFor(history, exercise.id);
  const topCap = missCap != null || capOverride != null ? Math.min(missCap ?? 1, capOverride ?? 1) : null;

  let sets = buildSets(loading, { abbreviated, topCap });
  const maxInfo = resolveMax(exercise.maxRef, maxes);
  sets = attachWeights(sets, maxInfo.value, settings, loadForPercent);

  const workPcts = sets.filter((s) => s.phase !== "warmup" && s.pct != null).map((s) => s.pct);
  const topPct = workPcts.length ? Math.max(...workPcts) : null;

  return {
    exerciseId: exercise.id,
    name: exercise.name,
    slot: exercise.slot,
    family: exercise.family,
    intentUsed,
    sets,
    topPct,
    isHeavy: dayIntent === "test" || (topPct != null && topPct >= 0.85 && exercise.slot === "comp"),
    tempo: exercise.tempo ?? null,
    cues: exercise.cues ?? [],
    prepDrills: exercise.prepDrills ?? [],
    note: missCap
      ? `Capped at ${Math.round(topCap * 100)}% — misses last time; make every rep crisp.`
      : capOverride
        ? `Kept light — this lift went heavy within the last 48h.`
        : (loading.note ?? null),
    programmingNote: exercise.note,
    maxRef: exercise.maxRef,
    maxInfo,
    estMinutes: estimateMinutes(sets),
  };
}

function selectFromPool(ids, ctx, { preferFresh = true } = {}) {
  const { avoid, history, rng } = ctx;
  let pool = ids.map(exerciseById).filter(Boolean).filter((e) => !avoid.has(e.id) && !avoid.has(e.name));
  if (!pool.length) return null;
  if (preferFresh) {
    const recent = recentExerciseIds(history);
    const fresh = pool.filter((e) => !recent.has(e.id));
    if (fresh.length) pool = fresh;
  }
  return pick(pool, rng);
}

// ── Accessory round ───────────────────────────────────────────────────

function heavyCoreCountThisWeek(history) {
  return history.filter(
    (s) => daysSince(s.date) <= 7 && (s.accessory?.moves ?? []).some((m) => m.category === "coreHeavy")
  ).length;
}

export function buildAccessory(history, dayIntent, minutes, avoid, rng) {
  const last = history[0];
  const lastEmphasis = last?.accessory?.emphasis ?? null;
  const emphasis = lastEmphasis === "pulling" ? "pressing" : "pulling";

  // Everett: heavy (weighted/dynamic) trunk work only 2-3x/week, on bigger
  // days; static/light core otherwise. Core always folded into the round.
  const coreCat = dayIntent === "big" && heavyCoreCountThisWeek(history) < 3 ? "coreHeavy" : "coreLight";

  const usable = (cat) => ACCESSORIES.filter((a) => a.category === cat && !avoid.has(a.name));
  const moves = [];
  const emphasisMove = pick(usable(emphasis), rng);
  if (emphasisMove) moves.push(emphasisMove);
  const coreMove = pick(usable(coreCat), rng);
  if (coreMove) moves.push(coreMove);

  const supportPool = [...usable("posterior"), ...usable("unilateral"), ...usable(emphasis)].filter(
    (m) => !moves.includes(m)
  );
  const movementCount = minutes >= 75 ? 4 : 3;
  while (moves.length < movementCount && supportPool.length) {
    const next = pick(supportPool, rng);
    moves.push(next);
    supportPool.splice(supportPool.indexOf(next), 1);
  }

  const rounds = minutes >= 60 ? 3 : 2;
  return { rounds, emphasis, moves };
}

// Swap one accessory move for the next alternate in the same category,
// cycling deterministically and skipping moves already in the round and
// anything on today's avoid list. Mutates and returns the session.
export function rotateAccessoryMove(session, index, avoid = new Set()) {
  const current = session.accessory.moves[index];
  if (!current) return session;
  const used = new Set(session.accessory.moves.map((m) => m.name));
  const pool = ACCESSORIES.filter((a) => a.category === current.category && !avoid.has(a.name));
  const at = pool.findIndex((a) => a.name === current.name);
  for (let step = 1; step <= pool.length; step++) {
    const cand = pool[(at + step + pool.length) % pool.length];
    if (cand.name !== current.name && !used.has(cand.name)) {
      session.accessory.moves[index] = { name: cand.name, rx: cand.rx, category: cand.category };
      break;
    }
  }
  return session;
}

// ── Warm-up ───────────────────────────────────────────────────────────

const GENERAL_PREP = [
  "Bike or row, 2-3 min easy",
  "Banded shoulder dislocates + pass-throughs",
  "Cossack squats x8/side",
  "Empty-bar good morning + RDL + back squat complex x5",
];
const MIN_GENERAL_PREP = 2;

export function buildWarmup(blocks, minutes) {
  // Required prep drills stay grouped per lift; general prep is trimmed to
  // keep the warm-up inside its time budget rather than stacking on top.
  const prepGroups = blocks
    .filter((b) => (b.prepDrills ?? []).length)
    .map((b) => ({ lift: b.name, drills: b.prepDrills }));
  const seen = new Set();
  const dedupedGroups = prepGroups
    .map((g) => ({ lift: g.lift, drills: g.drills.filter((d) => !seen.has(d) && seen.add(d)) }))
    .filter((g) => g.drills.length);

  const drillCount = dedupedGroups.reduce((n, g) => n + g.drills.length, 0);
  const trim = Math.min(Math.floor(drillCount / 2), GENERAL_PREP.length - MIN_GENERAL_PREP);
  return {
    general: GENERAL_PREP.slice(0, GENERAL_PREP.length - trim),
    prepGroups: dedupedGroups,
    minutes: Math.round(Math.min(10, Math.max(5, minutes * 0.11))),
  };
}

// ── Entry point ───────────────────────────────────────────────────────

export function generateSession(minutes, history, maxes, settings = {}, options = {}, rng = Math.random) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
  const avoid = new Set(options.avoid ?? []);

  const dayIntent = chooseIntent(sortedHistory, options);
  const family = chooseFamily(sortedHistory, options, rng);
  const ctx = { maxes, settings: s, history: sortedHistory, avoid, rng, abbreviated: false };

  const blocks = [];

  // 1. Competition-lift slot. Big/test days pull from the "big" pool, little
  //    days from the technique/speed pool. Explicit user choice wins.
  const isBigDay = dayIntent === "big" || dayIntent === "test";
  let compExercise = options.compExerciseId ? exerciseById(options.compExerciseId) : null;
  if (!compExercise) {
    const poolIds = COMP_POOLS[family][isBigDay ? "big" : "little"];
    compExercise = selectFromPool(poolIds, ctx, { preferFresh: !isBigDay });
  }
  // 48h heavy spacing: same comp lift trained >=85% within 48h -> drop to a
  // technique exposure today instead of another heavy one.
  let compIntent = dayIntent;
  let compCap = null;
  if (isBigDay && compExercise && liftTrainedHeavyWithin(sortedHistory, compExercise.id, 48)) {
    compIntent = "little";
    compCap = 0.8;
  }
  if (compExercise) blocks.push(buildBlock(compExercise, compIntent, ctx, { capOverride: compCap }));

  ctx.abbreviated = true; // everything after the first barbell lift ramps short

  // 2. Remaining barbell blocks by time budget & day shape.
  const WARMUP_MIN = Math.round(Math.min(10, Math.max(5, minutes * 0.11)));
  const ACCESSORY_MIN = minutes >= 60 ? 18 : 12;
  let budget = minutes - WARMUP_MIN - ACCESSORY_MIN - (blocks[0]?.estMinutes ?? 0);

  const addBlock = (exercise, intent) => {
    if (!exercise) return false;
    if (blocks.some((b) => b.exerciseId === exercise.id)) return false;
    const block = buildBlock(exercise, intent, ctx);
    if (block.estMinutes > budget + 3) return false;
    blocks.push(block);
    budget -= block.estMinutes;
    return true;
  };

  if (isBigDay) {
    // Big day: pull + squat (order per Everett: pulls, then squats). Squat
    // balance rule: a heavy squat within 48h drops today's squat to a lighter
    // pause/technique exposure.
    const pull = selectFromPool(PULL_POOLS[family], ctx);
    if (budget >= 10) addBlock(pull, dayIntent === "test" ? "big" : dayIntent);

    const squatHeavyRecently = heavySquatWithin(sortedHistory, 48);
    const squatPool = squatHeavyRecently ? ["pauseBackSquat", "pauseFrontSquat"] : SQUAT_POOL;
    const squat = selectFromPool(squatPool, ctx);
    if (budget >= 10) addBlock(squat, squatHeavyRecently ? "little" : "big");
  } else {
    // Little day: receiving/overhead work after the comp variant.
    const receiving = selectFromPool(RECEIVING_POOLS[family], ctx);
    if (budget >= 8) addBlock(receiving, "little");
    // Long little sessions get a second technique piece from the comp pool.
    if (budget >= 14) {
      const extra = selectFromPool(COMP_POOLS[family].little, ctx);
      addBlock(extra, "little");
    }
  }

  const accessory = buildAccessory(sortedHistory, isBigDay ? "big" : "little", minutes, avoid, rng);
  const warmup = buildWarmup(blocks, minutes);

  return {
    date: new Date().toISOString(),
    minutes,
    family,
    intent: dayIntent,
    isTest: dayIntent === "test",
    warmup,
    blocks,
    accessory,
    settings: { unit: s.unit, barWeight: s.barWeight, increment: s.increment },
  };
}

// Convert a (possibly partially tracked) session into the logged shape the
// planner reads back as history.
export function toLoggedSession(session, results = {}) {
  return {
    date: session.date,
    minutes: session.minutes,
    family: session.family,
    intent: session.intent,
    blocks: session.blocks.map((b) => ({
      exerciseId: b.exerciseId,
      name: b.name,
      slot: b.slot,
      topPct: b.topPct,
      intentUsed: b.intentUsed,
      setResults: (results[b.exerciseId] ?? b.sets).map((s2) => ({
        phase: s2.phase,
        pct: s2.pct,
        reps: s2.reps,
        weight: s2.weight?.total ?? null,
        done: !!s2.done,
        missed: !!s2.missed,
      })),
    })),
    accessory: {
      emphasis: session.accessory.emphasis,
      moves: session.accessory.moves.map((m) => ({ name: m.name, category: m.category })),
    },
  };
}
