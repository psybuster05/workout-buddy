import { lbsToDisplay } from './units.js'

// Session summaries, per tracking mode:
//   weighted  — "3×8 @ 45 lbs", mixed "10×30, 8×35 lbs"
//   reps-only — "3×8", mixed "8, 6, 5 reps"
//   time      — "3×30s", mixed "30s, 25s, 20s" (seconds live in the reps field)
//   cardio    — "32 min · 2.1 mi", multi "32 + 18 min · 3.4 mi"
//               (minutes live in the reps field, miles in weight; 0 mi = unrecorded)
// `unit` is the DISPLAY unit ('lbs'|'kg') — stored weights are always lbs;
// only the weighted branch converts (cardio's weight field is miles).
// Epley estimate — shared so the live overload nudge and the PR agree on which
// set is "harder". Noisy past ~8 reps, so it ranks sets but is never shown as a
// standalone 1RM number (see personalRecord).
export function estimated1RM(weight, reps) {
  return weight * (1 + reps / 30)
}

export function formatSession(s, mode = 'weighted', unit = 'lbs', perSide = false) {
  const reps = new Set(s.sets.map((x) => x.reps))
  let base
  if (mode === 'cardio') {
    const mins = s.sets.map((x) => x.reps).join(' + ')
    const miles = Math.round(s.sets.reduce((sum, x) => sum + (x.weight || 0), 0) * 10) / 10
    base = miles > 0 ? `${mins} min · ${miles} mi` : `${mins} min`
  } else if (mode === 'time') {
    base = reps.size === 1
      ? `${s.sets.length}×${s.sets[0].reps}s`
      : s.sets.map((x) => `${x.reps}s`).join(', ')
  } else if (mode === 'reps-only') {
    base = reps.size === 1
      ? `${s.sets.length}×${s.sets[0].reps}`
      : s.sets.map((x) => x.reps).join(', ') + ' reps'
  } else {
    const weights = new Set(s.sets.map((x) => x.weight))
    base = reps.size === 1 && weights.size === 1
      ? `${s.sets.length}×${s.sets[0].reps} @ ${lbsToDisplay(s.sets[0].weight, unit)} ${unit}`
      : s.sets.map((x) => `${x.reps}×${lbsToDisplay(x.weight, unit)}`).join(', ') + ` ${unit}`
  }
  // unilateral lifts log per side — mark it so history can't be mistaken for a total
  if (perSide) base += ' /side'
  // F flag if any set in the session was taken to failure
  return s.sets.some((x) => x.failure) ? `${base} · F` : base
}

// Personal record across every logged WORKING set of an exercise (warmups
// excluded), per tracking mode:
//   weighted  — best working set as real weight×reps (ranked by est. 1RM, but
//               printed as its actual numbers) + heaviest weight lifted
//   reps-only — most reps in a set
//   time      — longest hold (seconds)
//   cardio    — longest single entry (minutes) + best distance (miles, if any logged)
export function personalRecord(sessions, mode = 'weighted', unit = 'lbs') {
  const sets = sessions.flatMap((s) => s.sets).filter((x) => !x.warmup)
  if (sets.length === 0) return null
  if (mode === 'cardio') {
    const longest = Math.max(...sets.map((x) => x.reps))
    const bestMi = Math.max(...sets.map((x) => x.weight || 0))
    return bestMi > 0 ? `longest ${longest} min · best ${bestMi} mi` : `longest ${longest} min`
  }
  if (mode === 'time') return `best ${Math.max(...sets.map((x) => x.reps))}s`
  if (mode === 'reps-only') return `best ${Math.max(...sets.map((x) => x.reps))} reps`
  const topWeight = Math.max(...sets.map((x) => x.weight))
  if (topWeight === 0) return null
  // hardest set by Epley, shown as its real reps/weight — no invented 1RM number
  const best = sets.reduce((a, b) =>
    estimated1RM(b.weight, b.reps) > estimated1RM(a.weight, a.reps) ? b : a
  )
  return `best ${lbsToDisplay(best.weight, unit)} ${unit} × ${best.reps} · top ${lbsToDisplay(topWeight, unit)} ${unit}`
}

// True elapsed time of a workout, excluding paused spans. Handles old records
// with no pause fields (pausedMs ?? 0, no pausedAt). Frozen when ended, and
// frozen at the pause instant while paused; otherwise counts up to `now`.
export function workoutElapsed(w, now = Date.now()) {
  if (!w) return 0
  const paused = w.pausedMs ?? 0
  const end = w.endedAt ?? w.pausedAt ?? now
  return Math.max(0, end - w.startedAt - paused)
}

// elapsed workout time: mm:ss, or h:mm:ss once past an hour
export function formatDuration(ms) {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
