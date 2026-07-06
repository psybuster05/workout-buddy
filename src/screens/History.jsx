import { useState } from 'react'
import { exportJSON, loadStore } from '../storage.js'
import { formatSession } from '../format.js'
import { dayAccent } from '../theme.js'

function History({ exercises, onBack }) {
  const [store] = useState(() => loadStore())

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
      <button className="back-button" onClick={onBack}>
        ‹ Back
      </button>
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
              {sessions.map((s) => (
                <li key={s.date} className="history-entry">
                  <span className="history-date">{s.date}</span>
                  <span className="history-sets">{formatSession(s)}</span>
                </li>
              ))}
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
