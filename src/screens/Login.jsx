import { useState } from 'react'
import { supabase, SITE_URL } from '../supabase.js'

// Real email/password auth ("Confirm email" is ON in Supabase — signups must
// click the emailed link) plus Google OAuth. Sign-in and sign-up are separate,
// explicit actions: a typo'd email fails honestly instead of silently creating
// a new account (the flaw in the old username scheme).

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.14-4.06 1.14-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l4-3.1z"
    />
    <path
      fill="#EA4335"
      d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.62l4 3.1C6.23 6.88 8.88 4.77 12 4.77z"
    />
  </svg>
)

function Login({ onOffline }) {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'forgot'
  const [sent, setSent] = useState(null) // 'confirm' | 'reset' — "check your email" states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false)

  const switchMode = (m) => {
    setMode(m)
    setError('')
    setNotice('')
    setUnconfirmed(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    setUnconfirmed(false)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (/not confirmed/i.test(error.message)) {
          setUnconfirmed(true)
          setError('Email not confirmed yet — check your inbox for the link.')
        } else if (/invalid login credentials/i.test(error.message)) {
          setError('Wrong email or password.')
        } else {
          setError(error.message)
        }
      }
      // success → App's onAuthStateChange swaps the screen
    } else if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: SITE_URL },
      })
      if (error) {
        setError(
          /already registered/i.test(error.message)
            ? 'That email already has an account — log in instead.'
            : error.message
        )
      } else if (data.user && data.user.identities?.length === 0) {
        // Supabase anti-enumeration: signUp for an existing confirmed email
        // "succeeds" but returns a user with no identities
        setError('That email already has an account — log in instead.')
      } else if (!data.session) {
        setSent('confirm')
      }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: SITE_URL,
      })
      if (error) setError(error.message)
      else setSent('reset')
    }
    setBusy(false)
  }

  const resendConfirm = async () => {
    setBusy(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: SITE_URL },
    })
    setBusy(false)
    setNotice(error ? error.message : 'Confirmation email resent.')
  }

  const googleSignIn = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: SITE_URL },
    })

  const canSubmit =
    email.trim() !== '' &&
    (mode === 'forgot' || (mode === 'signup' ? password.length >= 6 : password !== ''))

  const TITLES = { signin: 'Log in', signup: 'Create account', forgot: 'Reset password' }

  return (
    <div className="login-screen">
      <div className="login-inner">
        <div className="login-brand">
          Workout Buddy<span className="login-dot">.</span>
        </div>
        <p className="login-tagline">Train. Track. Repeat.</p>

        {sent ? (
          <div className="login-card">
            <p className="login-sent-title">Check your email</p>
            <p className="login-sent-body">
              {sent === 'confirm'
                ? `We sent a confirmation link to ${email}. Click it, then come back and log in.`
                : `We sent a password-reset link to ${email}. Click it to choose a new password.`}
            </p>
            <button
              type="button"
              className="finish-button"
              onClick={() => {
                setSent(null)
                switchMode('signin')
              }}
            >
              Back to log in
            </button>
          </div>
        ) : (
          <form className="login-card" onSubmit={submit}>
            {mode === 'signin' && (
              <>
                <button type="button" className="oauth-button" onClick={googleSignIn}>
                  <GoogleMark />
                  Continue with Google
                </button>
                <div className="login-divider">or</div>
              </>
            )}

            <label className="field">
              <span className="field-label">Email</span>
              <input
                type="email"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="email"
                required
                value={email}
                placeholder="you@example.com"
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
              />
            </label>

            {mode !== 'forgot' && (
              <label className="field">
                <span className="field-label">Password</span>
                <input
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                  minLength={mode === 'signup' ? 6 : undefined}
                  value={password}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                />
              </label>
            )}

            <button type="submit" className="finish-button" disabled={busy || !canSubmit}>
              {busy ? 'Working…' : TITLES[mode]}
            </button>

            {error && <p className="lock-error">{error}</p>}
            {unconfirmed && (
              <button
                type="button"
                className="login-link"
                onClick={resendConfirm}
                disabled={busy}
              >
                Resend confirmation email
              </button>
            )}
            {notice && <p className="login-notice">{notice}</p>}

            <div className="login-links">
              {mode === 'signin' && (
                <>
                  <button
                    type="button"
                    className="login-link"
                    onClick={() => switchMode('forgot')}
                  >
                    Forgot password?
                  </button>
                  <button
                    type="button"
                    className="login-link"
                    onClick={() => switchMode('signup')}
                  >
                    New here? Create account
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <button type="button" className="login-link" onClick={() => switchMode('signin')}>
                  Have an account? Log in
                </button>
              )}
              {mode === 'forgot' && (
                <button type="button" className="login-link" onClick={() => switchMode('signin')}>
                  Back to log in
                </button>
              )}
            </div>
          </form>
        )}

        <button type="button" className="login-offline" onClick={onOffline}>
          Use offline (no sync)
        </button>
      </div>
    </div>
  )
}

export default Login
