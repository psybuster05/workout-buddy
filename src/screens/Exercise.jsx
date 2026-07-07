import { useRef, useState } from 'react'
import RestTimer from '../components/RestTimer.jsx'
import { deleteLastSet, lastSession, logSet, todaySession } from '../storage.js'
import { formatSession } from '../format.js'
import { dayAccent } from '../theme.js'

function Exercise({ exercise, onBack }) {
  // weighted (default): weight + reps · reps-only: no weight row ·
  // time: no weight row, counter is seconds stored in the reps field
  const mode = exercise.tracking ?? 'weighted'
  const repStep = mode === 'time' ? 5 : 1
  // "last time" = most recent previous day; today's in-progress sets reload
  // from storage so leaving and reopening the screen mid-workout loses nothing
  const [last] = useState(() => lastSession(exercise.id))
  const [sets, setSets] = useState(() => todaySession(exercise.id)?.sets ?? [])
  // mirror last time set-for-set: today's set N prefills from last session's
  // set N, clamping to its final set once today runs longer than last time
  const lastSetFor = (i) => {
    if (!last || last.sets.length === 0) return null
    return last.sets[Math.min(i, last.sets.length - 1)]
  }
  const [weight, setWeight] = useState(() => {
    const w = lastSetFor(sets.length)?.weight
    return w ? String(w) : ''
  })
  const [reps, setReps] = useState(() => lastSetFor(sets.length)?.reps ?? 0)
  const [restEndsAt, setRestEndsAt] = useState(null)
  const audioCtxRef = useRef(null)

  const adjustWeight = (delta) => {
    setWeight((w) => {
      const next = Math.max(0, (Number(w) || 0) + delta)
      return String(Math.round(next * 10) / 10)
    })
  }

  const finishSet = () => {
    const session = logSet(exercise.id, {
      reps,
      weight: mode === 'weighted' ? Number(weight) || 0 : 0,
    })
    setSets([...session.sets])
    setReps(lastSetFor(session.sets.length)?.reps ?? 0)
    // iOS only lets audio start from a user gesture — unlock the context on
    // this tap so the end-of-rest beep is allowed to play later
    if (!audioCtxRef.current && window.AudioContext) {
      audioCtxRef.current = new AudioContext()
    }
    audioCtxRef.current?.resume?.()
    setRestEndsAt(Date.now() + exercise.restSeconds * 1000)
  }

  const deleteLast = () => {
    const remaining = deleteLastSet(exercise.id)
    setSets([...remaining])
    // re-prefill the counter for the set position we just reopened
    setReps(lastSetFor(remaining.length)?.reps ?? 0)
  }

  return (
    <div className="screen" style={{ '--accent': dayAccent(exercise.day) }}>
      <button className="back-button" onClick={onBack}>
        ‹ Back
      </button>
      <h1>{exercise.name}</h1>

      <section className="session-zone">
        {exercise.target && (
          <div className="target-block">
            {exercise.target.sets && <span>Sets: {exercise.target.sets}</span>}
            {exercise.target.reps && <span>Reps: {exercise.target.reps}</span>}
          </div>
        )}
        {last && <p className="last-time">Last time: {formatSession(last, mode)}</p>}
        {mode === 'weighted' && (
        <div className="counter-row">
          <button
            className="counter-button"
            onClick={() => adjustWeight(-2.5)}
            disabled={(Number(weight) || 0) === 0}
            aria-label="Subtract 2.5 lbs"
          >
            −
          </button>
          <div className="counter-value-wrap">
            <input
              id="weight-input"
              className="counter-value"
              type="number"
              inputMode="decimal"
              min="0"
              step="2.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0"
              aria-label="Weight in lbs"
            />
            <span className="counter-sub">lbs</span>
          </div>
          <button
            className="counter-button"
            onClick={() => adjustWeight(2.5)}
            aria-label="Add 2.5 lbs"
          >
            +
          </button>
        </div>
        )}

        <div className="counter-row">
          <button
            className="counter-button"
            onClick={() => setReps((r) => Math.max(0, r - repStep))}
            disabled={reps === 0}
            aria-label={mode === 'time' ? 'Subtract 5 seconds' : 'Subtract one rep'}
          >
            −
          </button>
          <div className="counter-value-wrap">
            <div className="counter-value" aria-label={mode === 'time' ? 'Seconds' : 'Reps'}>
              {reps}
            </div>
            <span className="counter-sub">{mode === 'time' ? 'sec' : 'reps'}</span>
          </div>
          <button
            className="counter-button"
            onClick={() => setReps((r) => r + repStep)}
            aria-label={mode === 'time' ? 'Add 5 seconds' : 'Add one rep'}
          >
            +
          </button>
        </div>

        {restEndsAt !== null && (
          <RestTimer
            key={restEndsAt}
            endsAt={restEndsAt}
            totalSeconds={exercise.restSeconds}
            audioCtxRef={audioCtxRef}
            onDismiss={() => setRestEndsAt(null)}
          />
        )}

        <button className="finish-button" disabled={reps === 0} onClick={finishSet}>
          Finish set
        </button>

        {sets.length > 0 && (
          <>
            <ol className="set-log">
              {sets.map((s, i) => (
                <li key={i}>
                  Set {i + 1} — {s.reps} {mode === 'time' ? 'sec' : 'reps'}
                  {mode === 'weighted' && ` @ ${s.weight} lbs`}
                </li>
              ))}
            </ol>
            <button className="delete-last-button" onClick={deleteLast}>
              Delete last set
            </button>
          </>
        )}
      </section>

      <div className="video-frame">
        <iframe
          src={exercise.videoUrl}
          title={`${exercise.name} form video`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      <ul className="cues">
        {exercise.instructions.map((cue) => (
          <li key={cue}>{cue}</li>
        ))}
      </ul>
    </div>
  )
}

export default Exercise
