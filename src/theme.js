// per-day accents, tuned to the red/black/white sports palette;
// fallback (lock screen, history/export buttons) is the brand red.
// Cardio and Core are pseudo-days: they keep an accent (finisher cards,
// History) but have no Home button — left out of days[] in exercises.json,
// they only ever appear as finishers on the other days.
const DAY_ACCENTS = {
  'Mon — Push': '#ff3b3b',
  'Wed — Pull': '#3b9dff',
  'Fri — Legs': '#2ee66e',
  Custom: '#ff8a3d',
  Cardio: '#ffb02e',
  Core: '#a97bff',
}

export function dayAccent(day) {
  return DAY_ACCENTS[day] ?? '#ff3b3b'
}

// display label = just the workout name ("Mon — Push" → "Push"); the data
// string keeps the weekday so History / theme keys / exercises.json don't ripple
export function dayLabel(day) {
  const i = day.indexOf('—')
  return i === -1 ? day : day.slice(i + 1).trim()
}

// per-day mega-button background photos, served from public/days/ (runtime URL,
// so Jon can swap the files without a rebuild)
const DAY_IMAGES = {
  'Mon — Push': 'push.jpg',
  'Wed — Pull': 'pull.jpg',
  'Fri — Legs': 'leg.jpg',
  // Custom reuses the (now Home-button-less) cardio photo for now — drop a
  // public/days/custom.jpg to give it its own without a rebuild.
  Custom: 'cardio.jpg',
}

export function dayImage(day) {
  return DAY_IMAGES[day] ?? 'push.jpg'
}
