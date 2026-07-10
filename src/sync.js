import { supabase } from './supabase.js'
import { loadStore, replaceStore } from './storage.js'

const TABLE = 'stores'

// --- pure merge (unit-tested) -------------------------------------------------

function mergeBy(items, keyOf, pick) {
  const map = new Map()
  for (const item of items) {
    const k = keyOf(item)
    map.set(k, map.has(k) ? pick(map.get(k), item) : item)
  }
  return [...map.values()]
}

// Union two stores so nothing is lost: sessions keyed by exercise+date (the one
// with more sets wins), workouts keyed by date (a finished record wins, else the
// later-started one). Empty-local ∪ remote = full restore after an eviction.
export function mergeStores(a, b) {
  const A = a ?? {}
  const B = b ?? {}
  const sessions = mergeBy(
    [...(A.sessions ?? []), ...(B.sessions ?? [])],
    (s) => `${s.exerciseId}|${s.date}`,
    (x, y) => ((y.sets?.length ?? 0) > (x.sets?.length ?? 0) ? y : x)
  )
  const workouts = mergeBy(
    [...(A.workouts ?? []), ...(B.workouts ?? [])],
    (w) => w.date,
    (x, y) => {
      const xe = x.endedAt ?? 0
      const ye = y.endedAt ?? 0
      if (xe !== ye) return ye > xe ? y : x
      return (y.startedAt ?? 0) >= (x.startedAt ?? 0) ? y : x
    }
  )
  // disabled-exercise toggles keyed by exercise id — the newer flip wins (LWW),
  // so re-enabling on one device can't be undone by a stale cloud copy
  const disabled = {}
  for (const src of [A.disabled ?? {}, B.disabled ?? {}]) {
    for (const [id, t] of Object.entries(src)) {
      if (!disabled[id] || (t.at ?? 0) > (disabled[id].at ?? 0)) disabled[id] = t
    }
  }
  return { schemaVersion: A.schemaVersion ?? B.schemaVersion ?? 1, sessions, workouts, disabled }
}

// --- status (footer text + header button) ------------------------------------

// 'idle' synced · 'pending' unsynced changes · 'syncing' · 'offline' · 'error'
let status = 'idle'
const statusListeners = new Set()
function setStatus(s) {
  status = s
  for (const cb of statusListeners) cb(s)
}
export function onSyncStatus(cb) {
  statusListeners.add(cb)
  cb(status)
  return () => statusListeners.delete(cb)
}

// --- push / pull -------------------------------------------------------------

let currentUserId = null
let dirty = false // local changes not yet pushed

export function setSyncUser(userId) {
  currentUserId = userId
}

// called after every local write (via storage.onStoreChange). We DON'T push per
// write — just mark dirty; the actual push happens at checkpoints / flush.
export function markDirty() {
  dirty = true
  if (supabase && currentUserId) setStatus('pending')
}

async function pushStore() {
  if (!supabase || !currentUserId) return
  if (!navigator.onLine) {
    setStatus('offline')
    return
  }
  setStatus('syncing')
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { user_id: currentUserId, data: loadStore(), updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  if (error) {
    console.warn('sync push failed:', error.message)
    setStatus('error')
  } else {
    dirty = false
    setStatus('idle')
  }
}

// checkpoint push — only if there are unsynced changes (workout finish, app
// backgrounded, periodic timer)
export function flush() {
  if (dirty) pushStore()
}

// pull remote, merge with local, write both — on login and on reconnect
export async function pullMergePush(userId) {
  if (!supabase || !userId) return
  currentUserId = userId
  if (!navigator.onLine) {
    setStatus('offline')
    return
  }
  setStatus('syncing')
  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.warn('sync pull failed:', error.message)
    setStatus('error')
    return
  }
  const merged = mergeStores(data?.data ?? null, loadStore())
  replaceStore(merged) // updates local + notifies UI (and marks dirty)
  await pushStore() // pushes merged, clears dirty
}

// manual "Sync now" (header button) — full reconcile
export async function syncNow() {
  if (currentUserId) await pullMergePush(currentUserId)
}
