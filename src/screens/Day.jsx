import { useEffect, useState } from 'react'
import { dayAccent, dayLabel } from '../theme.js'
import {
  finishWorkout,
  getDisabledIds,
  pauseWorkout,
  resumeFinishedWorkout,
  resumeWorkout,
  startWorkout,
  todaySession,
  todayWorkout,
  toggleExercise,
} from '../storage.js'
import { formatDuration, workoutElapsed } from '../format.js'
import { flush } from '../sync.js'
import FitText from '../components/FitText.jsx'
import { stretchesFor } from '../data/stretches.js'
import { CheckIcon, PencilIcon } from '../icons.jsx'

// Finisher card (Cardio, Core): extra-credit exercises borrowed from another
// day, tappable to log, deliberately not part of this day's "N of M done".
// Same shell as the cool-down stretches, with the borrowed day's accent.
function FinisherCard({ title, accent, exercises, editing, disabled, doneIds, onToggle, onSelect }) {
  // outside edit mode disabled rows are hidden, exactly like the main list —
  // which is also how you get them back: the pencil reveals every row
  const shown = editing ? exercises : exercises.filter((e) => !disabled.has(e.id))
  if (shown.length === 0) return null
  return (
    <details className="stretch-card" style={{ '--accent': accent }}>
      <summary>
        <span className="stretch-title">{title}</span>
        <span className="stretch-count">{shown.length}</span>
      </summary>
      <ul className="cardio-list">
        {shown.map((e) => {
          const off = disabled.has(e.id)
          const cls = ['cardio-row', doneIds.includes(e.id) && 'is-done', editing && off && 'is-off']
            .filter(Boolean)
            .join(' ')
          return (
            <li key={e.id}>
              <button
                className={cls}
                aria-pressed={editing ? !off : undefined}
                onClick={() => (editing ? onToggle(e.id) : onSelect(e.id))}
              >
                {e.name}
              </button>
            </li>
          )
        })}
      </ul>
    </details>
  )
}

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
  // Finishers — extra credit, never part of "N of M done" (they're not in
  // dayExercises, so the count can't see them). Cardio rides along on lifting
  // days only; Core is a pseudo-day with no Home button, so it rides along on
  // every day, and its edit mode here is the ONLY place to toggle it.
  const cardioExercises = day === 'Cardio' ? [] : exercises.filter((e) => e.day === 'Cardio')
  const coreExercises = exercises.filter((e) => e.day === 'Core')

  const active = workout && !workout.endedAt
  const paused = active && !!workout.pausedAt
  const running = active && !paused

  // tick only while running; elapsed derives from timestamps so it stays
  // correct across navigation / app close / reopen (and is frozen while paused)
  useEffect(() => {
    if (!running) return
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [running])

  const doneIds = activeExercises
    .filter((e) => (todaySession(e.id)?.sets.length ?? 0) > 0)
    .map((e) => e.id)
  // separate from doneIds on purpose: finishers get a ✓ but must never reach
  // the "N of M done" numerator or denominator
  const finisherDoneIds = [...cardioExercises, ...coreExercises]
    .filter((e) => (todaySession(e.id)?.sets.length ?? 0) > 0)
    .map((e) => e.id)

  const elapsed = workoutElapsed(workout, now)

  return (
    <div className="screen day-screen" style={{ '--accent': dayAccent(day) }}>
      <div className="day-title-row">
        <h1>{dayLabel(day)}</h1>
        <button
          className={editing ? 'edit-day-button on' : 'edit-day-button'}
          aria-label={editing ? 'Done editing exercises' : "Edit this day's exercises"}
          aria-pressed={editing}
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? <CheckIcon /> : <PencilIcon />}
        </button>
      </div>
      {editing && (
        <p className="edit-hint">
          Tap an exercise to remove it from this day — tap it again to add it back. Tap the
          checkmark when you're done.
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
            <div className={paused ? 'workout-elapsed is-paused' : 'workout-elapsed'}>
              {formatDuration(elapsed)}
            </div>
            <div className="workout-done">
              {paused
                ? 'Paused'
                : `${doneIds.length} of ${activeExercises.length} exercises done`}
            </div>
            {active ? (
              <div className="workout-actions">
                <button
                  className="workout-button"
                  onClick={() =>
                    setWorkout(paused ? resumeWorkout() : pauseWorkout())
                  }
                >
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button
                  className="finish-button"
                  onClick={() => {
                    setWorkout(finishWorkout())
                    flush() // sync checkpoint: push right after a workout ends
                  }}
                >
                  Finish Workout
                </button>
              </div>
            ) : (
              <div className="workout-actions">
                <button
                  className="finish-button"
                  onClick={() => {
                    setWorkout(resumeFinishedWorkout())
                    flush() // push the un-finish now so a launch-time pull can't re-finish it
                  }}
                >
                  Resume
                </button>
                <button
                  className="workout-button"
                  onClick={() => setWorkout(startWorkout(day))}
                >
                  Restart
                </button>
              </div>
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

      <FinisherCard
        title="Cardio finisher"
        accent={dayAccent('Cardio')}
        exercises={cardioExercises}
        editing={editing}
        disabled={disabled}
        doneIds={finisherDoneIds}
        onToggle={(id) => setDisabled(toggleExercise(id))}
        onSelect={onSelectExercise}
      />

      <FinisherCard
        title="Core finisher"
        accent={dayAccent('Core')}
        exercises={coreExercises}
        editing={editing}
        disabled={disabled}
        doneIds={finisherDoneIds}
        onToggle={(id) => setDisabled(toggleExercise(id))}
        onSelect={onSelectExercise}
      />


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
