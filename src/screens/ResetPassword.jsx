import { useState } from 'react'
import { supabase } from '../supabase.js'

// Shown when the user arrives via a password-reset email link (Supabase fires
// PASSWORD_RECOVERY and signs them in on a recovery session). Saving the new
// password drops them straight into the app.
function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setError(error.message)
    else onDone()
  }

  return (
    <div className="login-screen">
      <div className="login-inner">
        <div className="login-brand">
          Workout Buddy<span className="login-dot">.</span>
        </div>
        <p className="login-tagline">Choose a new password</p>

        <form className="login-card" onSubmit={submit}>
          <label className="field">
            <span className="field-label">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              autoFocus
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
            disabled={busy || password.length < 6}
          >
            {busy ? 'Saving…' : 'Save password'}
          </button>
          {error && <p className="lock-error">{error}</p>}
        </form>
      </div>
    </div>
  )
}

export default ResetPassword
