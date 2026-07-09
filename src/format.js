// Session summaries, per tracking mode:
//   weighted  — "3×8 @ 45 lbs", mixed "10×30, 8×35 lbs"
//   reps-only — "3×8", mixed "8, 6, 5 reps"
//   time      — "3×30s", mixed "30s, 25s, 20s" (seconds live in the reps field)
export function formatSession(s, mode = 'weighted') {
  const reps = new Set(s.sets.map((x) => x.reps))
  let base
  if (mode === 'time') {
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
      ? `${s.sets.length}×${s.sets[0].reps} @ ${s.sets[0].weight} ${s.unit}`
      : s.sets.map((x) => `${x.reps}×${x.weight}`).join(', ') + ` ${s.unit}`
  }
  // F flag if any set in the session was taken to failure
  return s.sets.some((x) => x.failure) ? `${base} · F` : base
}

// Personal record across every logged set of an exercise, per tracking mode:
//   weighted  — estimated 1RM (Epley: w·(1+reps/30)) + heaviest weight lifted
//   reps-only — most reps in a set
//   time      — longest hold (seconds)
export function personalRecord(sessions, mode = 'weighted') {
  const sets = sessions.flatMap((s) => s.sets)
  if (sets.length === 0) return null
  if (mode === 'time') return `best ${Math.max(...sets.map((x) => x.reps))}s`
  if (mode === 'reps-only') return `best ${Math.max(...sets.map((x) => x.reps))} reps`
  const est1rm = Math.max(...sets.map((x) => x.weight * (1 + x.reps / 30)))
  const topWeight = Math.max(...sets.map((x) => x.weight))
  if (topWeight === 0) return null
  return `est. 1RM ${Math.round(est1rm)} lbs · top ${topWeight} lbs`
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
