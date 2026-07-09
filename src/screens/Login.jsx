import { useState } from 'react'
import { supabase } from '../supabase.js'

// Email one-time-code login. Session persists after this, so it's only seen on a
// new device or after an eviction. On success, App's onAuthStateChange swaps in.
function Login() {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const sendCode = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() })
    setBusy(false)
    if (error) setError(error.message)
    else setStep('code')
  }

  const verify = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })
    setBusy(false)
    if (error) setError(error.message)
    // success → App re-renders via onAuthStateChange
  }

  return (
    <div className="screen lock-screen">
      <h1>Workout Buddy</h1>

      {step === 'email' ? (
        <form className="lock-form" onSubmit={sendCode}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            placeholder="Email"
            aria-label="Email"
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
          />
          <button
            type="submit"
            className="finish-button"
            disabled={busy || email.trim() === ''}
          >
            {busy ? 'Sending…' : 'Send code'}
          </button>
          {error && <p className="lock-error">{error}</p>}
        </form>
      ) : (
        <form className="lock-form" onSubmit={verify}>
          <p className="lock-hint">Enter the 6-digit code sent to {email}</p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            maxLength={6}
            value={code}
            placeholder="123456"
            aria-label="6-digit code"
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ''))
              setError('')
            }}
          />
          <button
            type="submit"
            className="finish-button"
            disabled={busy || code.length < 6}
          >
            {busy ? 'Verifying…' : 'Verify'}
          </button>
          {error && <p className="lock-error">{error}</p>}
          <button
            type="button"
            className="delete-last-button"
            onClick={() => {
              setStep('email')
              setCode('')
              setError('')
            }}
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  )
}

export default Login
