import { useEffect, useRef, useState } from 'react'
import { deleteSession, deleteWorkout, exportJSON, loadStore } from '../storage.js'
import { formatSession, formatDuration, personalRecord } from '../format.js'
import { dayAccent, dayLabel } from '../theme.js'
import { supabase } from '../supabase.js'

function History({ exercises, authed, onSignOut, onLogin }) {
  const [store, setStore] = useState(() => loadStore())
  // delete needs two taps: the first arms the button, the second commits;
  // an armed button disarms itself after a beat so a stray tap can't linger
  const [armed, setArmed] = useState(null)
  const disarmTimer = useRef(null)

  useEffect(() => () => clearTimeout(disarmTimer.current), [])

  const handleDelete = (exerciseId, date) => {
    const key = `${exerciseId}|${date}`
    if (armed !== key) {
      setArmed(key)
      clearTimeout(disarmTimer.current)
      disarmTimer.current = setTimeout(() => setArmed(null), 3000)
      return
    }
    clearTimeout(disarmTimer.current)
    deleteSession(exerciseId, date)
    setArmed(null)
    setStore(loadStore())
  }

  const handleDeleteWorkout = (date) => {
    const key = `workout|${date}`
    if (armed !== key) {
      setArmed(key)
      clearTimeout(disarmTimer.current)
      disarmTimer.current = setTimeout(() => setArmed(null), 3000)
      return
    }
    clearTimeout(disarmTimer.current)
    deleteWorkout(date)
    setArmed(null)
    setStore(loadStore())
  }

  const byExercise = exercises
    .map((exercise) => ({
      exercise,
      sessions: store.sessions
        .filter((s) => s.exerciseId === exercise.id)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    }))
    .filter((x) => x.sessions.length > 0)

  const handleExport = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workout-history-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const workouts = [...(store.workouts ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1))
  const doneOn = (date) =>
    store.sessions.filter((s) => s.date === date && s.sets.length > 0).length

  const renderWorkout = (w) => {
    const isArmed = armed === `workout|${w.date}`
    return (
      <li key={w.date} className="history-entry workout-entry">
        <span className="history-date">{w.date}</span>
        <span className="workout-meta">
          <span className="workout-day">{dayLabel(w.day)}</span>
          <span className="workout-sub">
            {w.endedAt ? formatDuration(w.endedAt - w.startedAt) : 'in progress'} ·{' '}
            {doneOn(w.date)} exercise{doneOn(w.date) === 1 ? '' : 's'}
          </span>
        </span>
        <button
          className={isArmed ? 'history-delete armed' : 'history-delete'}
          onClick={() => handleDeleteWorkout(w.date)}
          aria-label={
            isArmed ? `Confirm delete workout on ${w.date}` : `Delete workout on ${w.date}`
          }
        >
          {isArmed ? 'Delete?' : '✕'}
        </button>
      </li>
    )
  }

  return (
    <div className="screen">
      <h1>History</h1>

      {workouts.length > 0 && (
        <section className="day-group">
          <h2>Workouts</h2>
          <ul className="history-list">{workouts.slice(0, 8).map(renderWorkout)}</ul>
          {workouts.length > 8 && (
            <details className="hist-more">
              <summary>Show all {workouts.length}</summary>
              <ul className="history-list">{workouts.slice(8).map(renderWorkout)}</ul>
            </details>
          )}
        </section>
      )}

      <h2 className="hist-heading">Exercises</h2>
      {byExercise.length === 0 ? (
        <p className="placeholder">No workouts logged yet.</p>
      ) : (
        byExercise.map(({ exercise, sessions }) => {
          const pr = personalRecord(sessions, exercise.tracking ?? 'weighted')
          return (
            <details
              key={exercise.id}
              className="hist-group"
              style={{ '--accent': dayAccent(exercise.day) }}
            >
              <summary className="hist-summary">
                <span className="hist-summary-text">
                  <span className="hist-name">{exercise.name}</span>
                  <span className="hist-summary-meta">
                    {pr
                      ? `PR · ${pr}`
                      : `${sessions.length} log${sessions.length === 1 ? '' : 's'}`}
                  </span>
                </span>
                <span className="hist-chevron" />
              </summary>
              <ul className="history-list">
                {sessions.map((s) => {
                  const isArmed = armed === `${exercise.id}|${s.date}`
                  return (
                    <li key={s.date} className="history-entry">
                      <span className="history-date">{s.date}</span>
                      <span className="history-sets">
                        {formatSession(s, exercise.tracking ?? 'weighted')}
                      </span>
                      <button
                        className={isArmed ? 'history-delete armed' : 'history-delete'}
                        onClick={() => handleDelete(exercise.id, s.date)}
                        aria-label={
                          isArmed
                            ? `Confirm delete ${exercise.name} on ${s.date}`
                            : `Delete ${exercise.name} on ${s.date}`
                        }
                      >
                        {isArmed ? 'Delete?' : '✕'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </details>
          )
        })
      )}

      <button className="export-button" onClick={handleExport}>
        Export JSON
      </button>

      {supabase &&
        (authed ? (
          <button className="signout-button" onClick={onSignOut}>
            Sign out
          </button>
        ) : (
          <button className="signout-button" onClick={onLogin}>
            Log in to back up
          </button>
        ))}
    </div>
  )
}

export default History
