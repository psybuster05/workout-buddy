import { useEffect, useRef, useState } from 'react'
import { supabase, SITE_URL } from '../supabase.js'
import { getWeightUnit, setWeightUnit, lbsToDisplay, displayToLbs } from '../units.js'
import { getBodyweightLog, logBodyweight, deleteBodyweight } from '../storage.js'
import Ribbon from '../components/Ribbon.jsx'

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

  // --- bodyweight log (canonical lbs; shown/entered in `unit`) ---
  const DEFAULT_LBS = 170
  const [bwLog, setBwLog] = useState(() => getBodyweightLog())
  const latest = bwLog[0] ?? null
  const previous = bwLog[1] ?? null
  // ribbon value lives in the display unit; prefilled to the last weigh-in so a
  // check-in is usually a one-tap confirm (the scale rarely moves much)
  const [bwInput, setBwInput] = useState(() => lbsToDisplay(latest?.lbs ?? DEFAULT_LBS, unit))
  // re-prefill when the unit flips so the ribbon reads in the shown unit
  useEffect(() => {
    setBwInput(lbsToDisplay(getBodyweightLog()[0]?.lbs ?? DEFAULT_LBS, unit))
  }, [unit])

  // local date (matches storage's todayISO) — for the "Update today" label
  const today = (() => {
    const d = new Date()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mm}-${dd}`
  })()
  const loggedToday = latest?.date === today

  const saveBodyweight = () => {
    logBodyweight(displayToLbs(bwInput, unit))
    setBwLog(getBodyweightLog())
  }

  // signed Δ vs the previous entry, in the display unit ('▲ 1.2' / '▼ 0.4')
  const fmtDelta = (curLbs, prevLbs) => {
    if (prevLbs == null) return null
    const d = Math.round((lbsToDisplay(curLbs, unit) - lbsToDisplay(prevLbs, unit)) * 10) / 10
    if (d === 0) return '±0'
    return `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}`
  }
  const withDelta = bwLog.map((e, i) => ({ ...e, delta: fmtDelta(e.lbs, bwLog[i + 1]?.lbs) }))

  // two-tap delete on a weigh-in row, same as History's row delete
  const [armed, setArmed] = useState(null)
  const disarmTimer = useRef(null)
  useEffect(() => () => clearTimeout(disarmTimer.current), [])
  const deleteWeigh = (date) => {
    if (armed !== date) {
      setArmed(date)
      clearTimeout(disarmTimer.current)
      disarmTimer.current = setTimeout(() => setArmed(null), 3000)
      return
    }
    clearTimeout(disarmTimer.current)
    deleteBodyweight(date)
    setArmed(null)
    setBwLog(getBodyweightLog())
  }

  const bwRow = (e) => {
    const isArmed = armed === e.date
    return (
      <li key={e.date} className="history-entry">
        <span className="history-date">{e.date}</span>
        <span className="history-sets">
          {lbsToDisplay(e.lbs, unit)} {unit}
          {e.delta ? ` · ${e.delta}` : ''}
        </span>
        <button
          className={isArmed ? 'history-delete armed' : 'history-delete'}
          onClick={() => deleteWeigh(e.date)}
          aria-label={
            isArmed ? `Confirm delete weigh-in on ${e.date}` : `Delete weigh-in on ${e.date}`
          }
        >
          {isArmed ? 'Delete?' : '✕'}
        </button>
      </li>
    )
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

      <div className="zone-card">
        <span className="zone-card-label">Bodyweight</span>

        <Ribbon
          value={bwInput}
          onChange={setBwInput}
          min={unit === 'kg' ? 36 : 80}
          max={unit === 'kg' ? 180 : 400}
          step={0.5}
          decimals={1}
          labelEvery={2}
          unit={unit}
          ariaLabel={`Bodyweight in ${unit}`}
        />
        <button type="button" className="signout-button" onClick={saveBodyweight}>
          {loggedToday ? 'Update today' : 'Log today'}
        </button>

        {latest ? (
          <details className="hist-group bw-group">
            <summary className="hist-summary">
              <span className="hist-summary-text">
                <span className="hist-name">Weigh-in history</span>
                <span className="hist-summary-meta">
                  {lbsToDisplay(latest.lbs, unit)} {unit}
                  {fmtDelta(latest.lbs, previous?.lbs) ? ` · ${fmtDelta(latest.lbs, previous?.lbs)}` : ''}
                </span>
              </span>
              <span className="hist-chevron" />
            </summary>
            <ul className="history-list">{withDelta.map(bwRow)}</ul>
          </details>
        ) : (
          <p className="bw-empty">No weigh-ins yet.</p>
        )}
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
