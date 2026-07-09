// Post-workout stretches per training day, matched to the muscles worked.
// Shown on the Day screen. Swap freely — name + one-line cue each.
export const stretchesByDay = {
  'Mon — Push': [
    { name: 'Doorway Chest Stretch', cue: 'Forearm on the frame, step through until you feel the chest open. 30s/side.' },
    { name: 'Cross-Body Shoulder', cue: 'Pull one arm across your chest with the other hand. 30s/side.' },
    { name: 'Overhead Triceps', cue: 'Reach a hand down your back, gently press the elbow. 30s/side.' },
    { name: 'Wall Pec Stretch', cue: 'Palm flat on a wall behind you, turn away from the arm. 30s/side.' },
  ],
  'Wed — Pull': [
    { name: 'Lat Hang / Reach', cue: 'Hold a bar or frame overhead, sink your hips back to lengthen the lats. 30s.' },
    { name: 'Doorway Biceps', cue: 'Arm back on the frame, palm forward, rotate your body away. 30s/side.' },
    { name: 'Standing Forward Fold', cue: 'Hinge and hang, let your back and neck decompress. 30s.' },
    { name: 'Cross-Body Rear Delt', cue: 'Arm across the chest, ease it in with the opposite hand. 30s/side.' },
  ],
  'Fri — Legs': [
    { name: 'Standing Quad', cue: 'Heel to glute, knees together, tuck the hips. 30s/side.' },
    { name: 'Hamstring Hinge', cue: 'Hinge over one straight leg, keep the back flat. 30s/side.' },
    { name: 'Figure-4 Glute', cue: 'Ankle over the opposite knee, sit back into it. 30s/side.' },
    { name: 'Wall Calf Stretch', cue: 'Back leg straight, heel down, lean into the wall. 30s/side.' },
  ],
}

export function stretchesFor(day) {
  return stretchesByDay[day] ?? []
}
