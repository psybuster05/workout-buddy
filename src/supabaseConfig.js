// Supabase project credentials. The anon key is SAFE to commit and ship in the
// client bundle — Row Level Security (see the plan's SQL) means it can't read or
// write anyone's data without a logged-in session. Paste your values here.
//
// Until these are filled with a real project, cloud sync stays OFF and the app
// runs purely on localStorage (see isSupabaseConfigured()).
export const SUPABASE_URL = 'https://idogwtyvlxmlmsgrysyx.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkb2d3dHl2bHhtbG1zZ3J5c3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NjIxMjksImV4cCI6MjA5OTEzODEyOX0.855-BO97qm3iWmgZcIWd3cQ4a12hQOHLFPfIftdjot0'

export function isSupabaseConfigured() {
  return (
    /^https:\/\/.+\.supabase\.co$/.test(SUPABASE_URL) &&
    SUPABASE_ANON_KEY.length > 40 &&
    !SUPABASE_ANON_KEY.startsWith('YOUR')
  )
}
