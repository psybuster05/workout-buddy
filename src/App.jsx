import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Home from './screens/Home.jsx'
import Day from './screens/Day.jsx'
import Exercise from './screens/Exercise.jsx'
import History from './screens/History.jsx'
import Lock from './screens/Lock.jsx'
import RestTimer from './components/RestTimer.jsx'
import { isUnlocked } from './auth.js'
import data from './data/exercises.json'

// animate screen swaps with the View Transitions API where available
// (iOS Safari 18+); otherwise switch instantly
const withTransition = (update) => {
  if (document.startViewTransition) {
    document.startViewTransition(() => flushSync(update))
  } else {
    update()
  }
}

function App() {
  const [unlocked, setUnlocked] = useState(() => isUnlocked())
  const [screen, setScreen] = useState('home')
  const [selectedDay, setSelectedDay] = useState(null)
  const [exerciseId, setExerciseId] = useState(null)
  // rest lives at the app level (not inside Exercise) so it keeps running while
  // Jon navigates between exercises mid-rest. { endsAt, total, id } | null
  const [rest, setRest] = useState(null)
  const audioCtxRef = useRef(null)

  // called from the Finish-set tap, so the AudioContext unlock keeps its
  // required user-gesture context. id changes per rest (remounts the timer)
  // but not on extend (no flicker).
  const startRest = (seconds) => {
    if (!audioCtxRef.current && window.AudioContext) {
      audioCtxRef.current = new AudioContext()
    }
    audioCtxRef.current?.resume?.()
    setRest({ endsAt: Date.now() + seconds * 1000, total: seconds, id: Date.now() })
  }
  const extendRest = () =>
    setRest((r) => (r ? { ...r, endsAt: r.endsAt + 15000, total: r.total + 15 } : r))
  const dismissRest = () => setRest(null)

  if (!unlocked) {
    return <Lock onUnlock={() => withTransition(() => setUnlocked(true))} />
  }

  const openDay = (day) =>
    withTransition(() => {
      setSelectedDay(day)
      setScreen('day')
    })
  const openExercise = (id) =>
    withTransition(() => {
      setExerciseId(id)
      setScreen('exercise')
    })
  const goHome = () => withTransition(() => setScreen('home'))
  const goHistory = () => withTransition(() => setScreen('history'))
  // back is contextual: exercise → its day, everything else → home
  const goBack = () =>
    withTransition(() => setScreen(screen === 'exercise' ? 'day' : 'home'))

  let screenEl
  if (screen === 'exercise') {
    const exercise = data.exercises.find((e) => e.id === exerciseId)
    screenEl = <Exercise exercise={exercise} onStartRest={startRest} />
  } else if (screen === 'day') {
    screenEl = (
      <Day day={selectedDay} exercises={data.exercises} onSelectExercise={openExercise} />
    )
  } else if (screen === 'history') {
    screenEl = <History exercises={data.exercises} />
  } else {
    screenEl = (
      <Home
        days={data.days}
        exercises={data.exercises}
        onSelectDay={openDay}
        onHistory={goHistory}
      />
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        {screen === 'home' ? (
          <button className="app-brand" onClick={goHome}>
            Workout Buddy
          </button>
        ) : (
          <button className="back-button" onClick={goBack}>
            ‹ Back
          </button>
        )}
        <button
          className="timer-button"
          aria-label="Start rest timer"
          onClick={() => startRest(90)}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="9" y1="2.5" x2="15" y2="2.5" />
            <line x1="12" y1="2.5" x2="12" y2="6" />
            <circle cx="12" cy="14" r="8" />
            <line x1="12" y1="14" x2="12" y2="9.5" />
          </svg>
        </button>
      </header>

      {screenEl}

      <footer className="app-footer">
        <p>© 2026 Workout Buddy — all gains reserved</p>
        <p>Last updated {__BUILD_DATE__}</p>
      </footer>

      {rest && (
        <RestTimer
          key={rest.id}
          endsAt={rest.endsAt}
          totalSeconds={rest.total}
          audioCtxRef={audioCtxRef}
          onExtend={extendRest}
          onDismiss={dismissRest}
        />
      )}
    </div>
  )
}

export default App
