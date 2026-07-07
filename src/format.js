// Session summaries, per tracking mode:
//   weighted  — "3×8 @ 45 lbs", mixed "10×30, 8×35 lbs"
//   reps-only — "3×8", mixed "8, 6, 5 reps"
//   time      — "3×30s", mixed "30s, 25s, 20s" (seconds live in the reps field)
export function formatSession(s, mode = 'weighted') {
  const reps = new Set(s.sets.map((x) => x.reps))
  if (mode === 'time') {
    if (reps.size === 1) return `${s.sets.length}×${s.sets[0].reps}s`
    return s.sets.map((x) => `${x.reps}s`).join(', ')
  }
  if (mode === 'reps-only') {
    if (reps.size === 1) return `${s.sets.length}×${s.sets[0].reps}`
    return s.sets.map((x) => x.reps).join(', ') + ' reps'
  }
  const weights = new Set(s.sets.map((x) => x.weight))
  if (reps.size === 1 && weights.size === 1) {
    return `${s.sets.length}×${s.sets[0].reps} @ ${s.sets[0].weight} ${s.unit}`
  }
  return s.sets.map((x) => `${x.reps}×${x.weight}`).join(', ') + ` ${s.unit}`
}
