import data from './data/exercises.json'

const KEY = 'workout-tracker:v1'
const UNIT = 'lbs'

// exercises marked defaultOff in exercises.json start disabled until the user
// enables them in Day-screen edit mode
const DEFAULT_OFF_IDS = data.exercises.filter((e) => e.defaultOff).map((e) => e.id)

// The Custom day starts as a lean full-body template: the first exercise of
// each lifting day (one Push / one Pull / one Legs). Its membership lives in a
// separate `custom` map so it's independent of the home-day `disabled` state.
const CUSTOM_DEFAULT_IDS = ['Mon — Push', 'Wed — Pull', 'Fri — Legs']
  .map((d) => data.exercises.find((e) => e.day === d)?.id)
  .filter(Boolean)

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
        // workouts / disabled / notes added later — backfill for older stores
        if (!Array.isArray(store.workouts)) store.workouts = []
        if (!store.disabled || typeof store.disabled !== 'object' || Array.isArray(store.disabled))
          store.disabled = {}
        if (!store.notes || typeof store.notes !== 'object' || Array.isArray(store.notes))
          store.notes = {}
        if (!store.custom || typeof store.custom !== 'object' || Array.isArray(store.custom))
          store.custom = {}
        if (
          !store.bodyweight ||
          typeof store.bodyweight !== 'object' ||
          Array.isArray(store.bodyweight)
        )
          store.bodyweight = {}
        return seedCustom(seedDefaultOff(store))
      }
    }
  } catch {
    // corrupt JSON or storage blocked — fall through to an empty store
  }
  return seedCustom(
    seedDefaultOff({
      schemaVersion: 1,
      sessions: [],
      workouts: [],
      disabled: {},
      notes: {},
      custom: {},
      bodyweight: {},
    })
  )
}

// In-memory backfill (persisted on the next mutation): defaultOff exercises
// with no explicit toggle read as disabled. at: 0 means any real user toggle
// (at: now) wins the last-write-wins sync merge, on this or any other device.
function seedDefaultOff(store) {
  for (const id of DEFAULT_OFF_IDS) {
    if (!(id in store.disabled)) store.disabled[id] = { off: true, at: 0 }
  }
  return store
}

// Same idea for the Custom day: the three default exercises read as members
// until the user edits. at: 0 loses every LWW comparison, so a real toggle wins.
function seedCustom(store) {
  for (const id of CUSTOM_DEFAULT_IDS) {
    if (!(id in store.custom)) store.custom[id] = { on: true, at: 0 }
  }
  return store
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

// Remove one set from today's session by position (in-workout correction of a
// mis-logged entry — any set, not just the last). Drops the session entirely if
// that empties it, so we never leave a zero-set session behind. Out-of-range
// indices are a no-op. Returns the remaining sets.
export function deleteSetAt(exerciseId, index) {
  const date = todayISO()
  return mutate((store) => {
    const session = store.sessions.find(
      (s) => s.exerciseId === exerciseId && s.date === date
    )
    if (!session || index < 0 || index >= session.sets.length) return session?.sets ?? []
    session.sets.splice(index, 1)
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

// Pause model: startedAt/endedAt stay true wall-clock stamps; `pausedMs` is
// total time spent paused and `pausedAt` marks an open pause (null while
// running). Elapsed subtracts pausedMs — see workoutElapsed in format.js. Old
// records lacking these fields compute exactly as before (pausedMs ?? 0).
//
// `updatedAt` stamps every mutation below. The sync merge prefers the higher
// updatedAt (see sync.js), so a Resume that clears endedAt beats the stale
// cloud copy that still has it — without this, the merge's "finished wins"
// rule would silently re-finish a resumed workout on the next app launch.
// Records written before this field existed have no updatedAt (treated as 0),
// so they fall through to the original endedAt-based rule.

// Begin (or restart) today's workout — stamps startedAt, clears endedAt/pauses.
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
    workout.pausedMs = 0
    workout.pausedAt = null
    workout.updatedAt = Date.now()
    return workout
  })
}

// Pause today's running workout — freezes the clock by marking the pause start.
export function pauseWorkout() {
  const date = todayISO()
  return mutate((store) => {
    const workout = store.workouts.find((w) => w.date === date)
    if (!workout || workout.endedAt || workout.pausedAt) return workout ?? null
    workout.pausedAt = Date.now()
    workout.updatedAt = Date.now()
    return workout
  })
}

// Resume — bank the paused span into pausedMs and clear the open pause.
export function resumeWorkout() {
  const date = todayISO()
  return mutate((store) => {
    const workout = store.workouts.find((w) => w.date === date)
    if (!workout || !workout.pausedAt) return workout ?? null
    workout.pausedMs = (workout.pausedMs ?? 0) + (Date.now() - workout.pausedAt)
    workout.pausedAt = null
    workout.updatedAt = Date.now()
    return workout
  })
}

// Stop today's workout — stamps endedAt so duration is frozen. If it was
// paused, close that span into pausedMs first so the pause isn't counted.
export function finishWorkout() {
  const date = todayISO()
  return mutate((store) => {
    const workout = store.workouts.find((w) => w.date === date)
    if (!workout) return null
    if (workout.pausedAt) {
      workout.pausedMs = (workout.pausedMs ?? 0) + (Date.now() - workout.pausedAt)
      workout.pausedAt = null
    }
    workout.endedAt = Date.now()
    workout.updatedAt = Date.now()
    return workout
  })
}

// Un-finish today's workout — for a mis-tapped Finish or "actually, one more
// set". The gap between finishing and resuming is banked as a paused span, so
// the clock picks up exactly where it froze and workoutElapsed needs no special
// case. No-op if there's no ended workout to resume.
export function resumeFinishedWorkout() {
  const date = todayISO()
  return mutate((store) => {
    const workout = store.workouts.find((w) => w.date === date)
    if (!workout || !workout.endedAt) return workout ?? null
    workout.pausedMs = (workout.pausedMs ?? 0) + (Date.now() - workout.endedAt)
    workout.endedAt = null
    workout.updatedAt = Date.now()
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

// --- per-exercise enable/disable (Day-screen edit mode) -------------------
// `disabled` is a map: exerciseId → { off: bool, at: ms }. Entries keep their
// timestamp so cross-device sync can merge toggles last-write-wins (a stale
// cloud copy can't resurrect an exercise you re-enabled).

const disabledIds = (store) =>
  new Set(Object.keys(store.disabled).filter((id) => store.disabled[id].off))

export function getDisabledIds() {
  return disabledIds(loadStore())
}

// Flip one exercise on/off for its day. Returns the updated disabled-id Set.
export function toggleExercise(exerciseId) {
  return mutate((store) => {
    const off = store.disabled[exerciseId]?.off ?? false
    store.disabled[exerciseId] = { off: !off, at: Date.now() }
    return disabledIds(store)
  })
}

// --- Custom-day membership (independent of the home-day `disabled` map) ------
// `custom` maps exerciseId → { on, at }; members are ids with on:true. Toggling
// here never touches an exercise's home-day enabled state, and vice versa — the
// Custom day is a free-form pick from every exercise (finishers included).

const customIds = (store) =>
  new Set(Object.keys(store.custom).filter((id) => store.custom[id].on))

export function getCustomIds() {
  return customIds(loadStore())
}

// Add/remove one exercise from the Custom day. Returns the updated member Set.
export function toggleCustom(exerciseId) {
  return mutate((store) => {
    const on = store.custom[exerciseId]?.on ?? false
    store.custom[exerciseId] = { on: !on, at: Date.now() }
    return customIds(store)
  })
}

// --- per-exercise notes (Exercise screen) --------------------------------
// `notes` is a map: exerciseId → { text, at }, same shape and same LWW merge
// as `disabled`. One sticky note per exercise, not per session — it's standing
// reference ("seat pin 4, elbows tucked"), so it survives every workout.
//
// Clearing a note stores { text: '', at } rather than dropping the key: an
// empty string is a tombstone that wins the merge, where a missing key would
// let a stale cloud copy resurrect what you just deleted.
//
// The whole note is one LWW value, so two devices editing the same note means
// the later write wins outright — no text merge. Same trade as `disabled`.

export function getNote(exerciseId) {
  return loadStore().notes[exerciseId]?.text ?? ''
}

export function saveNote(exerciseId, text) {
  mutate((store) => {
    store.notes[exerciseId] = { text, at: Date.now() }
  })
}

// --- bodyweight log (Account screen) -------------------------------------
// `bodyweight` maps date → { lbs, at }: one weigh-in per calendar day, stored
// canonical lbs (converted at the display/input boundary like session weights).
// Same LWW merge as notes/disabled — the newer `at` wins. Deleting stores
// { lbs: null, at } as a tombstone so a stale cloud copy can't resurrect it.

// Log (or overwrite) today's weigh-in. Idempotent per day and LWW-correct.
export function logBodyweight(lbs) {
  const date = todayISO()
  return mutate((store) => {
    store.bodyweight[date] = { lbs, at: Date.now() }
    return store.bodyweight[date]
  })
}

// Remove one weigh-in. Writes a null-lbs tombstone (not a key drop) so the
// delete wins the merge instead of a stale cloud copy resurrecting it.
export function deleteBodyweight(date) {
  mutate((store) => {
    store.bodyweight[date] = { lbs: null, at: Date.now() }
  })
}

// Newest-first [{ date, lbs }], tombstones filtered out.
export function getBodyweightLog() {
  const bw = loadStore().bodyweight
  return Object.entries(bw)
    .filter(([, e]) => e.lbs != null)
    .map(([date, e]) => ({ date, lbs: e.lbs }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
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
