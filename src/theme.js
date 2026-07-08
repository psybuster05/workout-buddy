// per-day accents, tuned to the red/black/white sports palette;
// fallback (lock screen, history/export buttons) is the brand red
const DAY_ACCENTS = {
  'Mon — Push': '#ff3b3b',
  'Wed — Pull': '#3b9dff',
  'Fri — Legs': '#2ee66e',
}

export function dayAccent(day) {
  return DAY_ACCENTS[day] ?? '#ff3b3b'
}

// spelled-out day labels for the Home mega-buttons (data stays "Mon — Push")
const DAY_LABELS = {
  'Mon — Push': 'Monday — Push',
  'Wed — Pull': 'Wednesday — Pull',
  'Fri — Legs': 'Friday — Legs',
}

export function dayLabel(day) {
  return DAY_LABELS[day] ?? day
}

// per-day mega-button background photos, served from public/days/ (runtime URL,
// so Jon can swap the files without a rebuild)
const DAY_IMAGES = {
  'Mon — Push': 'push.jpg',
  'Wed — Pull': 'pull.jpg',
  'Fri — Legs': 'leg.jpg',
}

export function dayImage(day) {
  return DAY_IMAGES[day] ?? 'push.jpg'
}
