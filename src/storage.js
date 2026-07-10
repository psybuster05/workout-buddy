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
      if (store && Array.isArray(store.sessions)) {
        // workouts added later — backfill for stores written before it existed
        if (!Array.isArray(store.workouts)) store.workouts = []
        return store
      }
    }
  } catch {
    // corrupt JSON or storage blocked — fall through to an empty store
  }
  return { schemaVersion: 1, sessions: [], workouts: [] }
}

// listeners fire after every successful local write so the sync layer can push
// to the cloud without every mutator having to know about it
const listeners = new Set()

export function onStoreChange(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function saveStore(store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // quota/private-mode failure: keep going on in-memory state rather than
    // crashing mid-workout; the set still shows in the current session
  }
  for (const cb of listeners) cb(store)
}

// Overwrite the whole store (used by cloud-sync merge and JSON import), then
// notify listeners. Kept separate from the granular mutators.
export function replaceStore(store) {
  saveStore(store)
}

// Read-modify-write helper for the granular mutators: load the store, let fn
// mutate it in place (and optionally return a value), then persist + notify.
function mutate(fn) {
  const store = loadStore()
  const result = fn(store)
  saveStore(store)
  return result
}

// Append a set to today's session for this exercise, creating the session on
// the first set. Writes through to localStorage immediately so nothing is lost
// if Safari kills the tab mid-workout. Returns the updated session.
export function logSet(exerciseId, set) {
  const date = todayISO()
  return mutate((store) => {
    let session = store.sessions.find((s) => s.exerciseId === exerciseId && s.date === date)
    if (!session) {
      session = { exerciseId, date, unit: UNIT, sets: [] }
      store.sessions.push(session)
    }
    session.sets.push(set)
    return session
  })
}

// Remove the most recent set from today's session (in-workout undo of an
// accidental entry). Drops the session entirely if that empties it, so we
// never leave a zero-set session behind. Returns the remaining sets.
export function deleteLastSet(exerciseId) {
  const date = todayISO()
  return mutate((store) => {
    const session = store.sessions.find(
      (s) => s.exerciseId === exerciseId && s.date === date
    )
    if (!session || session.sets.length === 0) return []
    session.sets.pop()
    if (session.sets.length === 0) {
      store.sessions = store.sessions.filter((s) => s !== session)
    }
    return session.sets
  })
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

// --- whole-day workout tracking (start/stop time). One record per date. ---

export function todayWorkout() {
  const date = todayISO()
  return loadStore().workouts.find((w) => w.date === date) ?? null
}

// Begin (or restart) today's workout — stamps startedAt, clears endedAt.
export function startWorkout(day) {
  const date = todayISO()
  return mutate((store) => {
    let workout = store.workouts.find((w) => w.date === date)
    if (!workout) {
      workout = { date, day, startedAt: 0, endedAt: null }
      store.workouts.push(workout)
    }
    workout.day = day
    workout.startedAt = Date.now()
    workout.endedAt = null
    return workout
  })
}

// Stop today's workout — stamps endedAt so duration is frozen.
export function finishWorkout() {
  const date = todayISO()
  return mutate((store) => {
    const workout = store.workouts.find((w) => w.date === date)
    if (!workout) return null
    workout.endedAt = Date.now()
    return workout
  })
}

// Remove one logged session (accidental entries). A session is uniquely
// identified by exercise + date since logSet keeps one per exercise per day.
export function deleteSession(exerciseId, date) {
  mutate((store) => {
    store.sessions = store.sessions.filter(
      (s) => !(s.exerciseId === exerciseId && s.date === date)
    )
  })
}

// Remove one whole-day workout record (the timer entry). Leaves that day's
// exercise sessions alone — they're deleted separately from the exercise list.
export function deleteWorkout(date) {
  mutate((store) => {
    store.workouts = store.workouts.filter((w) => w.date !== date)
  })
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
