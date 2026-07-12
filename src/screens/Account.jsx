import { useState } from 'react'
import { supabase, SITE_URL } from '../supabase.js'

// Account management, reached from the person icon in the header. Signed in:
// shows the account email, change-email (the migration path off the old
// synthetic username address), and sign out. Offline mode: the way back to
// the login screen.
function Account({ session, onSignOut, onLogin }) {
  const [emailOpen, setEmailOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState('')

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
    <div className="screen">
      <h1>Account</h1>

      {session ? (
        <>
          <div className="zone-card">
            <span className="zone-card-label">Signed in as</span>
            <p className="account-email">{session.user.email}</p>
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
