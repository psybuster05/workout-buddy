// "3×8 @ 45 lbs" when every set matches, "10×30, 8×35 lbs" otherwise
export function formatSession(s) {
  const reps = new Set(s.sets.map((x) => x.reps))
  const weights = new Set(s.sets.map((x) => x.weight))
  if (reps.size === 1 && weights.size === 1) {
    return `${s.sets.length}×${s.sets[0].reps} @ ${s.sets[0].weight} ${s.unit}`
  }
  return s.sets.map((x) => `${x.reps}×${x.weight}`).join(', ') + ` ${s.unit}`
}
