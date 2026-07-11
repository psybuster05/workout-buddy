import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './supabaseConfig.js'

// where auth emails (confirm / reset / email change) and OAuth redirects land —
// absolute app URL, correct on both localhost dev and GitHub Pages. window is
// guarded so importing this module doesn't crash vitest's node environment.
export const SITE_URL =
  typeof window === 'undefined' ? '' : window.location.origin + import.meta.env.BASE_URL

// null until real credentials are in place — callers gate on isSupabaseConfigured()
export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
