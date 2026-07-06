const KEY = 'workout-tracker:v1'
const UNIT = 'lbs'

// local date, not toISOString() — a 9pm workout must not roll into tomorrow (UTC)
function todayISO() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const store = JSON.parse(raw)
      if (store && Array.isArray(store.sessions)) return store
    }
  } catch {
    // corrupt JSON or storage blocked — fall through to an empty store
  }
  return { schemaVersion: 1, sessions: [] }
}

function saveStore(store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // quota/private-mode failure: keep going on in-memory state rather than
    // crashing mid-workout; the set still shows in the current session
  }
}

// Append a set to today's session for this exercise, creating the session on
// the first set. Writes through to localStorage immediately so nothing is lost
// if Safari kills the tab mid-workout. Returns the updated session.
export function logSet(exerciseId, set) {
  const store = loadStore()
  const date = todayISO()
  let session = store.sessions.find((s) => s.exerciseId === exerciseId && s.date === date)
  if (!session) {
    session = { exerciseId, date, unit: UNIT, sets: [] }
    store.sessions.push(session)
  }
  session.sets.push(set)
  saveStore(store)
  return session
}

export function todaySession(exerciseId) {
  const date = todayISO()
  return (
    loadStore().sessions.find((s) => s.exerciseId === exerciseId && s.date === date) ?? null
  )
}

export function exportJSON() {
  return JSON.stringify(loadStore(), null, 2)
}

// Most recent session from a previous day — "last time", not today's sets.
export function lastSession(exerciseId) {
  const date = todayISO()
  const prior = loadStore().sessions.filter(
    (s) => s.exerciseId === exerciseId && s.date < date
  )
  if (prior.length === 0) return null
  return prior.reduce((a, b) => (a.date > b.date ? a : b))
}
