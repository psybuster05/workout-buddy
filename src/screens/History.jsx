import { useEffect, useRef, useState } from 'react'
import { deleteSession, exportJSON, loadStore } from '../storage.js'
import { formatSession } from '../format.js'
import { dayAccent } from '../theme.js'

function History({ exercises }) {
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

  return (
    <div className="screen">
      <h1>History</h1>

      {byExercise.length === 0 ? (
        <p className="placeholder">No workouts logged yet.</p>
      ) : (
        byExercise.map(({ exercise, sessions }) => (
          <section
            key={exercise.id}
            className="day-group"
            style={{ '--accent': dayAccent(exercise.day) }}
          >
            <h2>{exercise.name}</h2>
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
          </section>
        ))
      )}

      <button className="export-button" onClick={handleExport}>
        Export JSON
      </button>
    </div>
  )
}

export default History
