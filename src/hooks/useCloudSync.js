import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { onStoreChange } from '../storage.js'
import { markDirty, flush, pullMergePush, setSyncUser, onSyncStatus } from '../sync.js'

// All the Supabase/cloud-sync machinery lifted out of App. Returns the auth
// session, the offline opt-out, the sync status, and the handlers the UI needs.
//
// `session` is tri-state: undefined = still checking on load, null = logged
// out, object = logged in. When Supabase isn't configured, auth/sync are off
// and the app runs local-only (session pinned to null).
export function useCloudSync() {
  const [session, setSession] = useState(supabase ? undefined : null)
  // "offline" = user chose to skip login and run local-only; persisted so we
  // don't nag them every launch
  const [offline, setOffline] = useState(
    () => localStorage.getItem('workout-tracker:offline') === '1'
  )
  const [syncStatus, setSyncStatus] = useState('idle')
  // true while the user arrived via a password-reset email link — App shows
  // the choose-a-new-password screen until it's cleared
  const [recovery, setRecovery] = useState(false)

  // track the Supabase session
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s ?? null)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') setRecovery(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase) return
    return onSyncStatus(setSyncStatus)
  }, [])

  // once logged in, wire cloud sync: mark dirty on every local write, flush at
  // checkpoints, pull+merge now and whenever we regain connectivity
  const userId = session?.user?.id ?? null
  useEffect(() => {
    if (!supabase || !userId) return
    setSyncUser(userId)
    const unsub = onStoreChange(markDirty)
    const onOnline = () => pullMergePush(userId)
    const onHide = () => {
      if (document.hidden) flush()
    }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    const interval = setInterval(flush, 120000) // periodic safety net
    pullMergePush(userId)
    return () => {
      unsub()
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      clearInterval(interval)
    }
  }, [userId])

  const goOffline = () => {
    localStorage.setItem('workout-tracker:offline', '1')
    setOffline(true)
  }
  const leaveOffline = () => {
    localStorage.removeItem('workout-tracker:offline')
    setOffline(false)
  }
  const signOut = () => {
    leaveOffline()
    supabase?.auth.signOut()
  }
  const clearRecovery = () => setRecovery(false)

  return {
    session,
    offline,
    syncStatus,
    recovery,
    clearRecovery,
    goOffline,
    leaveOffline,
    signOut,
  }
}
