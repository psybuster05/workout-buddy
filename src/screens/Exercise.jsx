import { useEffect, useRef, useState } from 'react'
import {
  deleteLastSet,
  getNote,
  lastSession,
  loadStore,
  logSet,
  saveNote,
  todaySession,
} from '../storage.js'
import { personalRecord } from '../format.js'
import { dayAccent } from '../theme.js'
import { CheckIcon, PencilIcon } from '../icons.jsx'
import Ribbon from '../components/Ribbon.jsx'
import { getWeightUnit, lbsToDisplay, displayToLbs, weightStep } from '../units.js'

// ribbon bounds (display units). Generous caps — you flick past the middle, and
// the tappable readout handles anything beyond.
const REPS_MAX = 50
const SECONDS_MAX = 300
const WEIGHT_MAX = { lbs: 300, kg: 140 }

// The programmed target is no longer a card of its own — it's the Notes
// placeholder, so the prescription is there when the note is empty and gets out
// of the way once you've written your own. exercises.json keeps `target` purely
// as the source for this string.
const targetPlaceholder = (t) => {
  if (!t) return 'Notes…'
  const parts = []
  if (t.goal) parts.push(`Goal: ${t.goal}`)
  if (t.sets) parts.push(`Sets: ${t.sets}`)
  if (t.reps) parts.push(`Reps: ${t.reps}`)
  return parts.length ? parts.join(' · ') : 'Notes…'
}

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

  // Sticky per-exercise note. Local state drives the textarea and writes are
  // batched: saveNote → saveStore → onStoreChange → markDirty re-renders the
  // whole app, which is not something to do on every keystroke. noteRef keeps
  // the latest text reachable from the unmount cleanup, which can't see state.
  // The note is read-only until the pencil is tapped: it's standing reference
  // you look at far more often than you edit, and a live textarea means a
  // stray thumb rewrites it mid-set.
  const [note, setNote] = useState(() => getNote(exercise.id))
  const [editingNote, setEditingNote] = useState(false)
  const noteInputRef = useRef(null)
  const savedRef = useRef(note)
  const noteRef = useRef(note)
  // synced in an effect, not assigned during render: the listener and the
  // unmount cleanup below close over the first render's scope and would
  // otherwise never see the current text
  useEffect(() => {
    noteRef.current = note
  }, [note])

  const flushNote = () => {
    if (noteRef.current === savedRef.current) return
    savedRef.current = noteRef.current
    saveNote(exercise.id, noteRef.current)
  }

  // pencil toggles edit; leaving edit mode is a save point
  const toggleNoteEdit = () => {
    setEditingNote((v) => {
      if (v) flushNote()
      return !v
    })
  }

  // straight into typing — the tap that opened the editor shouldn't need a
  // second tap to land in the field
  useEffect(() => {
    if (editingNote) noteInputRef.current?.focus()
  }, [editingNote])

  // Two-tap clear, same as History's delete: the first tap arms, the second
  // commits, and it disarms after 3s so a stray tap can't sit there loaded.
  // Worth the friction — the X lives next to the pencil and a note is typed,
  // not recoverable.
  const [clearArmed, setClearArmed] = useState(false)
  const disarmRef = useRef(null)
  useEffect(() => () => clearTimeout(disarmRef.current), [])

  const clearNote = () => {
    if (!clearArmed) {
      setClearArmed(true)
      clearTimeout(disarmRef.current)
      disarmRef.current = setTimeout(() => setClearArmed(false), 3000)
      return
    }
    clearTimeout(disarmRef.current)
    setClearArmed(false)
    setNote('')
    // write the empty-string tombstone now and keep the refs in step, so the
    // debounce and the unmount flush both see this as already saved
    noteRef.current = ''
    savedRef.current = ''
    saveNote(exercise.id, '')
    setEditingNote(false)
  }

  // persist after a pause in typing…
  useEffect(() => {
    if (note === savedRef.current) return
    const id = setTimeout(flushNote, 800)
    return () => clearTimeout(id)
  }, [note]) // eslint-disable-line react-hooks/exhaustive-deps

  // …and on the exits a debounce can't catch: leaving the screen (unmount,
  // which is what the header Back tap does) and iOS killing a backgrounded tab.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushNote()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      flushNote()
    }
  }, [exercise.id]) // eslint-disable-line react-hooks/exhaustive-deps

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

      <section className="session-zone">
        <div className="zone-card">
          <span className="zone-card-label">Notes</span>
          <div className="note-head">
            {/* always rendered: with nothing on the left the buttons float
                against empty space, and "none yet" is real information */}
            <p className={pr ? 'pr-line' : 'pr-line is-none'}>PR · {pr ?? 'None yet'}</p>
            <div className="note-actions">
              <button
                className={editingNote ? 'note-action on' : 'note-action'}
                aria-label={editingNote ? 'Done editing notes' : 'Edit notes'}
                aria-pressed={editingNote}
                onClick={toggleNoteEdit}
              >
                {editingNote ? <CheckIcon /> : <PencilIcon />}
              </button>
              {note && (
                <button
                  className={clearArmed ? 'note-action armed' : 'note-action'}
                  aria-label={clearArmed ? 'Confirm clear notes' : 'Clear notes'}
                  onClick={clearNote}
                >
                  {clearArmed ? 'Clear?' : '✕'}
                </button>
              )}
            </div>
          </div>
          {editingNote ? (
            <textarea
              ref={noteInputRef}
              className="note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={flushNote}
              placeholder={targetPlaceholder(exercise.target)}
              rows={2}
              aria-label={`Notes for ${exercise.name}`}
            />
          ) : (
            // pre-wrap so typed line breaks survive the round trip to a <p>
            <p className={note ? 'note-text' : 'note-text is-empty'}>
              {note || targetPlaceholder(exercise.target)}
            </p>
          )}
        </div>
        <div className="zone-card log-card">
          <span className="zone-card-label">This Set</span>
          {/* lifts: weight ribbon above reps ribbon · cardio keeps its typed
              minutes + miles stepper (those aren't "weight and reps") */}
          {mode === 'weighted' && (
            <Ribbon
              value={Number(weight) || 0}
              onChange={(v) => setWeight(String(v))}
              min={0}
              max={WEIGHT_MAX[unit] ?? 300}
              step={weightStep(unit)}
              decimals={2}
              labelEvery={2}
              unit={unit}
              ariaLabel={`Weight in ${unit}`}
            />
          )}
          {cardio ? (
            <div className="counter-row">
              <button
                className="counter-button"
                onClick={() => setReps((r) => Math.max(0, r - 1))}
                disabled={reps === 0}
                aria-label="Subtract one minute"
              >
                −
              </button>
              <div className="counter-value-wrap">
                {/* minutes are typed, not tapped 32 times */}
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
                <span className="counter-sub">min</span>
              </div>
              <button
                className="counter-button"
                onClick={() => setReps((r) => r + 1)}
                aria-label="Add one minute"
              >
                +
              </button>
            </div>
          ) : (
            <Ribbon
              value={reps}
              onChange={setReps}
              min={0}
              max={mode === 'time' ? SECONDS_MAX : REPS_MAX}
              step={1}
              decimals={0}
              labelEvery={mode === 'time' ? 10 : 2}
              unit={mode === 'time' ? 'sec' : 'reps'}
              ariaLabel={mode === 'time' ? 'Seconds' : 'Reps'}
            />
          )}

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
