import { useState } from 'react'

function Exercise({ exercise, onBack }) {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState(0)
  const [sets, setSets] = useState([])

  const finishSet = () => {
    setSets([...sets, { reps, weight: Number(weight) || 0 }])
    setReps(0)
    // step 3: auto-start rest timer here
  }

  return (
    <div className="screen">
      <button className="back-button" onClick={onBack}>
        ‹ Back
      </button>
      <h1>{exercise.name}</h1>

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

      <section className="session-zone">
        <label className="weight-field">
          Weight (lbs)
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="2.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="0"
          />
        </label>

        <div className="rep-counter">
          <button
            className="rep-button"
            onClick={() => setReps((r) => Math.max(0, r - 1))}
            aria-label="Subtract one rep"
          >
            −
          </button>
          <div className="rep-count">
            {reps}
            <span>reps</span>
          </div>
          <button
            className="rep-button"
            onClick={() => setReps((r) => r + 1)}
            aria-label="Add one rep"
          >
            +
          </button>
        </div>

        <button className="finish-button" disabled={reps === 0} onClick={finishSet}>
          Finish set
        </button>

        {sets.length > 0 && (
          <ol className="set-log">
            {sets.map((s, i) => (
              <li key={i}>
                Set {i + 1} — {s.reps} reps @ {s.weight} lbs
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

export default Exercise
