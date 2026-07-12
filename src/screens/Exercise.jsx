import { useState } from 'react'
import { deleteLastSet, lastSession, loadStore, logSet, todaySession } from '../storage.js'
import { personalRecord } from '../format.js'
import { dayAccent } from '../theme.js'
import { getWeightUnit, lbsToDisplay, displayToLbs, weightStep } from '../units.js'

function Exercise({ exercise, onStartRest }) {
  // weighted (default): weight + reps · reps-only: no weight row ·
  // time: no weight row, counter is seconds stored in the reps field ·
  // cardio: minutes in the reps field + optional distance (mi) in weight
  const mode = exercise.tracking ?? 'weighted'
  const cardio = mode === 'cardio'
  // display unit for lifted weights (storage stays lbs; cardio's weight
  // field is miles and never converts)
  const unit = getWeightUnit()
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
    if (!w) return ''
    // stored lbs → display unit for lifts; cardio's field is miles, as-is
    return String(cardio ? w : lbsToDisplay(w, unit))
  })
  const [reps, setReps] = useState(() => lastSetFor(sets.length)?.reps ?? 0)
  // "to failure" flag for the set being entered; resets after each Finish set
  const [failure, setFailure] = useState(false)

  const setLine = (s, i) =>
    cardio
      ? `Set ${i + 1} — ${s.reps} min` + (s.weight > 0 ? ` · ${s.weight} mi` : '')
      : `Set ${i + 1} — ${s.reps} ${mode === 'time' ? 'sec' : 'reps'}` +
        (mode === 'weighted' ? ` @ ${lbsToDisplay(s.weight, unit)} ${unit}` : '') +
        (s.failure ? ' · F' : '')

  const adjustWeight = (delta) => {
    setWeight((w) => {
      const next = Math.max(0, (Number(w) || 0) + delta)
      // 2 decimals so 1.25 kg steps don't drift (2.5 → 3.75 → 5 …)
      return String(Math.round(next * 100) / 100)
    })
  }

  const finishSet = () => {
    const session = logSet(exercise.id, {
      reps,
      // lifts store lbs (converted from the display unit); cardio stores
      // miles in the weight slot; non-weighted modes store 0
      weight: cardio
        ? Number(weight) || 0
        : mode === 'weighted'
          ? displayToLbs(Number(weight) || 0, unit)
          : 0,
      ...(failure ? { failure: true } : {}),
    })
    setSets([...session.sets])
    setReps(lastSetFor(session.sets.length)?.reps ?? 0)
    setFailure(false)
    // restSeconds 0 = no auto rest timer (walk/run — nothing to rest for)
    if (exercise.restSeconds) onStartRest(exercise.restSeconds)
  }

  const deleteLast = () => {
    const remaining = deleteLastSet(exercise.id)
    setSets([...remaining])
    // re-prefill the counter for the set position we just reopened
    setReps(lastSetFor(remaining.length)?.reps ?? 0)
  }

  // History always shows the most recent work: today's sets if any, else the
  // last time this exercise was done. Delete-last only applies to today.
  const historyIsToday = sets.length > 0
  const historySets = historyIsToday ? sets : (last?.sets ?? [])
  const historyDate = historyIsToday ? null : last?.date

  // PR across all logged sessions of this exercise (today's already persisted,
  // so a new PR shows the moment you finish the set)
  const pr = personalRecord(
    loadStore().sessions.filter((s) => s.exerciseId === exercise.id),
    mode,
    unit
  )

  // shared stepper row: weight (lbs, ±2.5) for lifts, distance (mi, ±0.1) for
  // cardio — same state and styles, different units
  const step = cardio ? 0.1 : weightStep(unit)
  const weightRow = (
    <div className="counter-row">
      <button
        className="counter-button"
        onClick={() => adjustWeight(-step)}
        disabled={(Number(weight) || 0) === 0}
        aria-label={cardio ? 'Subtract 0.1 miles' : `Subtract ${step} ${unit}`}
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
          step={String(step)}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="0"
          aria-label={cardio ? 'Distance in miles (optional)' : `Weight in ${unit}`}
        />
        <span className="counter-sub">{cardio ? 'mi' : unit}</span>
      </div>
      <button
        className="counter-button"
        onClick={() => adjustWeight(step)}
        aria-label={cardio ? 'Add 0.1 miles' : `Add ${step} ${unit}`}
      >
        +
      </button>
    </div>
  )

  return (
    <div className="screen" style={{ '--accent': dayAccent(exercise.day) }}>
      <h1 className="exercise-title">{exercise.name}</h1>
      {pr && <p className="pr-line">PR · {pr}</p>}

      <section className="session-zone">
        {exercise.target && (
          <div className="zone-card">
            <span className="zone-card-label">Target</span>
            <p className="target-line">
              {exercise.target.goal && <span>Goal: {exercise.target.goal}</span>}
              {exercise.target.sets && <span>Sets: {exercise.target.sets}</span>}
              {exercise.target.reps && <span>Reps: {exercise.target.reps}</span>}
            </p>
          </div>
        )}
        <div className="zone-card log-card">
          <span className="zone-card-label">This Set</span>
          {/* lifts: weight above reps (original layout) · cardio: minutes above
              distance (primary value first) — same rows, swapped order */}
          {mode === 'weighted' && weightRow}
          <div className="counter-row">
            <button
              className="counter-button"
              onClick={() => setReps((r) => Math.max(0, r - 1))}
              disabled={reps === 0}
              aria-label={
                cardio
                  ? 'Subtract one minute'
                  : mode === 'time'
                    ? 'Subtract one second'
                    : 'Subtract one rep'
              }
            >
              −
            </button>
            <div className="counter-value-wrap">
              {cardio ? (
                // minutes are typed, not tapped 32 times — same input treatment
                // the weight field gets
                <input
                  className="counter-value"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={reps === 0 ? '' : reps}
                  onChange={(e) => setReps(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  placeholder="0"
                  aria-label="Minutes"
                />
              ) : (
                <div className="counter-value" aria-label={mode === 'time' ? 'Seconds' : 'Reps'}>
                  {reps}
                </div>
              )}
              <span className="counter-sub">
                {cardio ? 'min' : mode === 'time' ? 'sec' : 'reps'}
              </span>
            </div>
            <button
              className="counter-button"
              onClick={() => setReps((r) => r + 1)}
              aria-label={
                cardio ? 'Add one minute' : mode === 'time' ? 'Add one second' : 'Add one rep'
              }
            >
              +
            </button>
          </div>

          {cardio && weightRow}

          {!cardio && (
            <button
              type="button"
              className={failure ? 'failure-toggle on' : 'failure-toggle'}
              aria-pressed={failure}
              onClick={() => setFailure((f) => !f)}
            >
              <span className="failure-box">{failure ? 'F' : ''}</span>
              Taken to failure
            </button>
          )}

          <button className="finish-button" disabled={reps === 0} onClick={finishSet}>
            Finish set
          </button>
        </div>

        {historySets.length > 0 && (
          <div className="zone-card">
            <span className="zone-card-label">History</span>
            {!historyIsToday && <span className="zone-caption">Last done {historyDate}</span>}
            {historySets.length === 1 ? (
              <p className="set-log-line">{setLine(historySets[0], 0)}</p>
            ) : (
              <details className="set-drawer">
                <summary>
                  <span className="set-log-line">
                    {setLine(historySets[historySets.length - 1], historySets.length - 1)}
                  </span>
                  <span className="set-drawer-count">All {historySets.length}</span>
                </summary>
                <ol className="set-drawer-list">
                  {historySets
                    .map((s, i) => ({ s, i }))
                    .reverse()
                    .map(({ s, i }) => (
                      <li key={i}>{setLine(s, i)}</li>
                    ))}
                </ol>
              </details>
            )}
            {historyIsToday && (
              <button className="delete-last-button" onClick={deleteLast}>
                Delete last set
              </button>
            )}
          </div>
        )}
      </section>

      {exercise.videoUrl && (
        <div className="video-frame">
          <iframe
            src={exercise.videoUrl}
            title={`${exercise.name} form video`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )}

      {exercise.instructions?.length > 0 && (
        <div className="zone-card cues-card">
          <span className="zone-card-label">Form</span>
          <ul className="cues">
            {exercise.instructions.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default Exercise
