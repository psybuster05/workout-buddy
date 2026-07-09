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
      // no account yet → create it (signUp returns a session with confirm-email off)
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
    <div className="screen lock-screen">
      <h1>Workout Buddy</h1>

      <form className="lock-form" onSubmit={submit}>
        <input
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          autoFocus
          required
          value={username}
          placeholder="Username"
          aria-label="Username"
          onChange={(e) => {
            setUsername(e.target.value)
            setError('')
          }}
        />
        <input
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          value={password}
          placeholder="Password"
          aria-label="Password"
          onChange={(e) => {
            setPassword(e.target.value)
            setError('')
          }}
        />
        <button
          type="submit"
          className="finish-button"
          disabled={busy || username.trim() === '' || password.length < 6}
        >
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        {error && <p className="lock-error">{error}</p>}
      </form>

      <button type="button" className="offline-button" onClick={onOffline}>
        Use offline (no sync)
      </button>
    </div>
  )
}

export default Login
