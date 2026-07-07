// per-day accents, tuned to the red/black/white sports palette;
// fallback (lock screen, history/export buttons) is the brand red
const DAY_ACCENTS = {
  'Mon — Push': '#ff3b3b',
  'Wed — Pull': '#f5f5f7',
  'Fri — Legs': '#93a5b8',
}

export function dayAccent(day) {
  return DAY_ACCENTS[day] ?? '#ff3b3b'
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
