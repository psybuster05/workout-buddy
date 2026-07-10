import { useState } from 'react'
import { supabase } from '../supabase.js'

// Supabase auth is email-based, so the username maps to a synthetic internal
// address that is never emailed (works because "Confirm email" is off). First
// login with a username creates the account; use the SAME username thereafter.
const emailFor = (username) =>
  `${username.trim().toLowerCase().replace(/\s+/g, '')}@workoutbuddy.app`

function Login({ onOffline }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const email = emailFor(username)
    let { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error && /invalid login credentials/i.test(error.message)) {
      const res = await supabase.auth.signUp({ email, password })
      error = res.error
      if (error && /already registered/i.test(error.message)) {
        error = { message: 'Incorrect password.' }
      }
    }
    setBusy(false)
    if (error) setError(error.message)
    // success → App's onAuthStateChange swaps the screen
  }

  return (
    <div className="login-screen">
      <div className="login-inner">
        <div className="login-brand">
          Workout Buddy<span className="login-dot">.</span>
        </div>
        <p className="login-tagline">Train. Track. Repeat.</p>

        <form className="login-card" onSubmit={submit}>
          <label className="field">
            <span className="field-label">Username</span>
            <input
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              autoFocus
              required
              value={username}
              placeholder="e.g. jon"
              onChange={(e) => {
                setUsername(e.target.value)
                setError('')
              }}
            />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              placeholder="At least 6 characters"
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
            />
          </label>
          <button
            type="submit"
            className="finish-button"
            disabled={busy || username.trim() === '' || password.length < 6}
          >
            {busy ? 'Logging in…' : 'Log in'}
          </button>
          {error && <p className="lock-error">{error}</p>}
        </form>

        <button type="button" className="login-offline" onClick={onOffline}>
          Use offline (no sync)
        </button>
      </div>
    </div>
  )
}

export default Login
