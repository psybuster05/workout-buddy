import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Home from './screens/Home.jsx'
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

  const openExercise = (id) =>
    withTransition(() => {
      setExerciseId(id)
      setScreen('exercise')
    })
  const goHome = () => withTransition(() => setScreen('home'))
  const goHistory = () => withTransition(() => setScreen('history'))

  let screenEl
  if (screen === 'exercise') {
    const exercise = data.exercises.find((e) => e.id === exerciseId)
    screenEl = <Exercise exercise={exercise} onBack={goHome} onStartRest={startRest} />
  } else if (screen === 'history') {
    screenEl = <History exercises={data.exercises} onBack={goHome} />
  } else {
    screenEl = (
      <Home
        days={data.days}
        exercises={data.exercises}
        onSelect={openExercise}
        onHistory={goHistory}
      />
    )
  }

  return (
    <>
      {screenEl}
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
    </>
  )
}

export default App
