// per-day accent colors; fallback is the app's base green
const DAY_ACCENTS = {
  'Mon — Push': '#ee7a52',
  'Wed — Pull': '#58a6ff',
  'Fri — Legs': '#4cc38a',
}

export function dayAccent(day) {
  return DAY_ACCENTS[day] ?? '#4cc38a'
}
