import { useEffect, useState } from 'react'
import { supabase, SITE_URL } from '../supabase.js'
import { getWeightUnit, setWeightUnit } from '../units.js'

// Account management, reached from the person icon in the header. Signed in:
// shows the account email, change-email (the migration path off the old
// synthetic username address), and sign out. Offline mode: the way back to
// the login screen.
function Account({ session, onSignOut, onLogin }) {
  const [emailOpen, setEmailOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  // display unit for lifted weights (device-local preference; storage is lbs)
  const [unit, setUnit] = useState(() => getWeightUnit())
  const chooseUnit = (u) => {
    setWeightUnit(u)
    setUnit(u)
  }
  // the cached session can hold a stale email after a change confirmed in
  // another browser (the emailed link) — ask the server for current truth
  const [email, setEmail] = useState(session?.user?.email)
  useEffect(() => {
    if (!session) return
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setEmail(data.user.email)
    })
  }, [session])

  const changeEmail = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: SITE_URL }
    )
    setEmailMsg(
      error ? error.message : `Confirmation sent to ${newEmail} — click the link to finish.`
    )
    if (!error) setEmailOpen(false)
  }

  return (
    <div className="screen account-screen">
      <h1>Account</h1>

      <div className="zone-card">
        <span className="zone-card-label">Weight unit</span>
        <div className="unit-toggle" role="group" aria-label="Weight unit">
          <button
            type="button"
            className={unit === 'lbs' ? 'on' : ''}
            aria-pressed={unit === 'lbs'}
            onClick={() => chooseUnit('lbs')}
          >
            Imperial (lbs)
          </button>
          <button
            type="button"
            className={unit === 'kg' ? 'on' : ''}
            aria-pressed={unit === 'kg'}
            onClick={() => chooseUnit('kg')}
          >
            Metric (kg)
          </button>
        </div>
      </div>

      {session ? (
        <>
          <div className="zone-card">
            <span className="zone-card-label">Signed in as</span>
            <p className="account-email">{email}</p>
          </div>

          {emailOpen ? (
            <form className="change-email" onSubmit={changeEmail}>
              <input
                type="email"
                required
                autoFocus
                placeholder="new@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                aria-label="New account email"
              />
              <button type="submit" className="signout-button">
                Send link
              </button>
            </form>
          ) : (
            <button className="signout-button" onClick={() => setEmailOpen(true)}>
              Change account email
            </button>
          )}
          {emailMsg && <p className="change-email-msg">{emailMsg}</p>}

          <button className="signout-button" onClick={onSignOut}>
            Sign out
          </button>
        </>
      ) : (
        <>
          <div className="zone-card">
            <span className="zone-card-label">Offline mode</span>
            <p className="account-email">
              Workouts are saved on this device only — log in to back them up to the cloud.
            </p>
          </div>
          <button className="signout-button" onClick={onLogin}>
            Log in to back up
          </button>
        </>
      )}
    </div>
  )
}

export default Account
