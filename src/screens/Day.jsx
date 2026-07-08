import { useEffect, useState } from 'react'
import { dayAccent, dayLabel } from '../theme.js'
import { finishWorkout, startWorkout, todaySession, todayWorkout } from '../storage.js'

// mm:ss, or h:mm:ss once a workout passes an hour
function formatDuration(ms) {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function Day({ day, exercises, onSelectExercise }) {
  const dayExercises = exercises.filter((e) => e.day === day)
  const [workout, setWorkout] = useState(() => todayWorkout())
  const [now, setNow] = useState(() => Date.now())

  const active = workout && !workout.endedAt

  // tick while a workout is running; elapsed derives from the startedAt
  // timestamp, so it stays correct across navigation / app close / reopen
  useEffect(() => {
    if (!active) return
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [active])

  const doneIds = dayExercises
    .filter((e) => (todaySession(e.id)?.sets.length ?? 0) > 0)
    .map((e) => e.id)

  const elapsed = workout
    ? (workout.endedAt ?? now) - workout.startedAt
    : 0

  return (
    <div className="screen" style={{ '--accent': dayAccent(day) }}>
      <h1>{dayLabel(day)}</h1>

      <div className="zone-card workout-card">
        <span className="zone-card-label">Workout</span>

        {!workout ? (
          <button className="finish-button" onClick={() => setWorkout(startWorkout(day))}>
            Start Workout
          </button>
        ) : (
          <>
            <div className="workout-elapsed">{formatDuration(elapsed)}</div>
            <div className="workout-done">
              {doneIds.length} of {dayExercises.length} exercises done
            </div>
            {active ? (
              <button
                className="finish-button"
                onClick={() => setWorkout(finishWorkout())}
              >
                Finish Workout
              </button>
            ) : (
              <button
                className="delete-last-button"
                onClick={() => setWorkout(startWorkout(day))}
              >
                Restart
              </button>
            )}
          </>
        )}
      </div>

      <ul className="exercise-list">
        {dayExercises.map((e) => (
          <li key={e.id}>
            <button
              className={
                doneIds.includes(e.id) ? 'exercise-button is-done' : 'exercise-button'
              }
              onClick={() => onSelectExercise(e.id)}
            >
              {e.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Day
