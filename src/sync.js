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
  return { schemaVersion: A.schemaVersion ?? B.schemaVersion ?? 1, sessions, workouts }
}

// --- sync status (for the footer indicator) ----------------------------------

let status = 'idle' // 'idle' | 'syncing' | 'offline' | 'error'
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
let pushTimer = null

export function setSyncUser(userId) {
  currentUserId = userId
}

async function upsert(store) {
  if (!supabase || !currentUserId) return
  if (!navigator.onLine) {
    setStatus('offline')
    return
  }
  setStatus('syncing')
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { user_id: currentUserId, data: store, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  if (error) {
    console.warn('sync push failed:', error.message)
    setStatus('error')
  } else {
    setStatus('idle')
  }
}

// debounced — called after every local write via storage.onStoreChange
export function pushLocal() {
  if (!supabase || !currentUserId) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => upsert(loadStore()), 1500)
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
  replaceStore(merged) // updates local + notifies UI to re-read
  await upsert(merged)
}
