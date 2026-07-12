import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './supabaseConfig.js'

// where auth emails (confirm / reset / email change) and OAuth redirects land —
// absolute app URL, correct on both localhost dev and GitHub Pages. window is
// guarded so importing this module doesn't crash vitest's node environment.
export const SITE_URL =
  typeof window === 'undefined' ? '' : window.location.origin + import.meta.env.BASE_URL

// When an OAuth / email-link callback fails server-side, Supabase redirects
// back with the reason in the URL hash (#error=...&error_description=...).
// Capture it synchronously at import — before the auth client can strip the
// hash — so the Login screen can show it instead of silently ignoring it.
export const AUTH_REDIRECT_ERROR = (() => {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.hash.slice(1))
  const desc = params.get('error_description') || params.get('error')
  if (desc) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }
  return desc ?? ''
})()

// null until real credentials are in place — callers gate on isSupabaseConfigured()
export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
