import { useEffect, useState } from 'react'
import { dayAccent, dayLabel } from '../theme.js'
import {
  finishWorkout,
  getDisabledIds,
  startWorkout,
  todaySession,
  todayWorkout,
  toggleExercise,
} from '../storage.js'
import { formatDuration } from '../format.js'
import { flush } from '../sync.js'
import { burstConfetti } from '../confetti.js'
import FitText from '../components/FitText.jsx'
import { stretchesFor } from '../data/stretches.js'
import { PencilIcon } from '../icons.jsx'

function Day({ day, exercises, onSelectExercise }) {
  const dayExercises = exercises.filter((e) => e.day === day)
  const stretches = stretchesFor(day)
  const [workout, setWorkout] = useState(() => todayWorkout())
  const [now, setNow] = useState(() => Date.now())
  // edit mode: tap the pencil, then tap exercises to disable/re-enable them for
  // this day. Disabled ones are hidden outside edit mode but keep their history.
  const [editing, setEditing] = useState(false)
  const [disabled, setDisabled] = useState(() => getDisabledIds())
  const activeExercises = dayExercises.filter((e) => !disabled.has(e.id))
  // cardio finisher on lifting days: the Cardio day's (enabled) exercises,
  // tappable to log — extra credit, not part of "N of M done"
  const cardioExercises =
    day === 'Cardio'
      ? []
      : exercises.filter((e) => e.day === 'Cardio' && !disabled.has(e.id))

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

  const doneIds = activeExercises
    .filter((e) => (todaySession(e.id)?.sets.length ?? 0) > 0)
    .map((e) => e.id)

  const elapsed = workout
    ? (workout.endedAt ?? now) - workout.startedAt
    : 0

  return (
    <div className="screen day-screen" style={{ '--accent': dayAccent(day) }}>
      <div className="day-title-row">
        <h1>{dayLabel(day)}</h1>
        <button
          className={editing ? 'edit-day-button on' : 'edit-day-button'}
          aria-label="Edit this day's exercises"
          aria-pressed={editing}
          onClick={() => setEditing((v) => !v)}
        >
          <PencilIcon />
        </button>
      </div>
      {editing && (
        <p className="edit-hint">
          Tap an exercise to remove it from this day — tap it again to add it back. Tap the
          pencil when you're done.
        </p>
      )}

      <div className="zone-card workout-card">
        <span className="zone-card-label">Workout Tracker</span>

        {!workout ? (
          <button className="finish-button" onClick={() => setWorkout(startWorkout(day))}>
            Start Workout
          </button>
        ) : (
          <>
            <div className="workout-elapsed">{formatDuration(elapsed)}</div>
            <div className="workout-done">
              {doneIds.length} of {activeExercises.length} exercises done
            </div>
            {active ? (
              <button
                className="finish-button"
                onClick={() => {
                  setWorkout(finishWorkout())
                  flush() // sync checkpoint: push right after a workout ends
                  burstConfetti(dayAccent(day)) // you earned it
                }}
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
        {(editing ? dayExercises : activeExercises).map((e, i) => {
          const off = disabled.has(e.id)
          const cls = [
            'exercise-button',
            doneIds.includes(e.id) && 'is-done',
            editing && off && 'is-off',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <li key={e.id}>
              <button
                className={cls}
                aria-pressed={editing ? !off : undefined}
                onClick={() =>
                  editing ? setDisabled(toggleExercise(e.id)) : onSelectExercise(e.id)
                }
              >
                <span className="exercise-num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <FitText className="exercise-name">{e.name}</FitText>
                <span className="exercise-go" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>

      {cardioExercises.length > 0 && (
        <details
          className="stretch-card cardio-card"
          style={{ '--accent': dayAccent('Cardio') }}
        >
          <summary>
            <span className="stretch-title">Cardio finisher</span>
            <span className="stretch-count">{cardioExercises.length}</span>
          </summary>
          <ul className="cardio-list">
            {cardioExercises.map((e) => {
              const done = (todaySession(e.id)?.sets.length ?? 0) > 0
              return (
                <li key={e.id}>
                  <button
                    className={done ? 'cardio-row is-done' : 'cardio-row'}
                    onClick={() => onSelectExercise(e.id)}
                  >
                    {e.name}
                  </button>
                </li>
              )
            })}
          </ul>
        </details>
      )}

      {stretches.length > 0 && (
        <details className="stretch-card">
          <summary>
            <span className="stretch-title">Cool-down stretches</span>
            <span className="stretch-count">{stretches.length}</span>
          </summary>
          <ul className="stretch-list">
            {stretches.map((s) => (
              <li key={s.name}>
                <span className="stretch-name">{s.name}</span>
                <span className="stretch-cue">{s.cue}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

export default Day
