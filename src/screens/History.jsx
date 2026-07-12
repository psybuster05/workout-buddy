import { useEffect, useRef, useState } from 'react'
import { deleteSession, deleteWorkout, exportJSON, loadStore } from '../storage.js'
import { formatSession, formatDuration, personalRecord } from '../format.js'
import { dayAccent, dayLabel } from '../theme.js'
function History({ exercises }) {
  const [store, setStore] = useState(() => loadStore())
  // which delete button is armed (keyed by exercise|date or workout|date), or null
  const [armed, setArmed] = useState(null)
  const disarmTimer = useRef(null)

  useEffect(() => () => clearTimeout(disarmTimer.current), [])

  // Two-tap delete: the first tap arms `key`, the second (same key) commits.
  // An armed button disarms itself after 3s so a stray tap can't linger.
  const armOrCommit = (key, commit) => {
    if (armed !== key) {
      setArmed(key)
      clearTimeout(disarmTimer.current)
      disarmTimer.current = setTimeout(() => setArmed(null), 3000)
      return
    }
    clearTimeout(disarmTimer.current)
    commit()
    setArmed(null)
    setStore(loadStore())
  }

  const handleDelete = (exerciseId, date) =>
    armOrCommit(`${exerciseId}|${date}`, () => deleteSession(exerciseId, date))

  const handleDeleteWorkout = (date) =>
    armOrCommit(`workout|${date}`, () => deleteWorkout(date))

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
  const sessionsOn = (date) =>
    store.sessions
      .filter((s) => s.date === date && s.sets.length > 0)
      .map((s) => ({ session: s, exercise: exercises.find((e) => e.id === s.exerciseId) }))

  const renderWorkout = (w) => {
    const isArmed = armed === `workout|${w.date}`
    const done = sessionsOn(w.date)
    return (
      <details key={w.date} className="workout-detail">
        <summary className="history-entry workout-entry">
          <span className="history-date">{w.date}</span>
          <span className="workout-meta">
            <span className="workout-day">{dayLabel(w.day)}</span>
            <span className="workout-sub">
              {w.endedAt ? formatDuration(w.endedAt - w.startedAt) : 'in progress'} ·{' '}
              {done.length} exercise{done.length === 1 ? '' : 's'}
            </span>
          </span>
          <span className="hist-chevron" />
          <button
            className={isArmed ? 'history-delete armed' : 'history-delete'}
            onClick={(e) => {
              e.preventDefault()
              handleDeleteWorkout(w.date)
            }}
            aria-label={
              isArmed ? `Confirm delete workout on ${w.date}` : `Delete workout on ${w.date}`
            }
          >
            {isArmed ? 'Delete?' : '✕'}
          </button>
        </summary>
        {done.length > 0 ? (
          <ul className="workout-exercises">
            {done.map(({ session, exercise }) => (
              <li key={session.exerciseId}>
                <span className="workout-ex-name">{exercise?.name ?? session.exerciseId}</span>
                <span className="workout-ex-sets">
                  {formatSession(session, exercise?.tracking ?? 'weighted')}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="workout-empty">No exercises logged this day</p>
        )}
      </details>
    )
  }

  return (
    <div className="screen">
      <h1>History</h1>

      {workouts.length > 0 && (
        <section className="day-group">
          <h2>Workouts</h2>
          <div className="history-list">{workouts.slice(0, 8).map(renderWorkout)}</div>
          {workouts.length > 8 && (
            <details className="hist-more">
              <summary>Show all {workouts.length}</summary>
              <div className="history-list">{workouts.slice(8).map(renderWorkout)}</div>
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
    </div>
  )
}

export default History
