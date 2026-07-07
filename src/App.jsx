import { useState } from 'react'
import { flushSync } from 'react-dom'
import Home from './screens/Home.jsx'
import Exercise from './screens/Exercise.jsx'
import History from './screens/History.jsx'
import Lock from './screens/Lock.jsx'
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

  if (screen === 'exercise') {
    const exercise = data.exercises.find((e) => e.id === exerciseId)
    return <Exercise exercise={exercise} onBack={goHome} />
  }

  if (screen === 'history') {
    return <History exercises={data.exercises} onBack={goHome} />
  }

  return (
    <Home
      days={data.days}
      exercises={data.exercises}
      onSelect={openExercise}
      onHistory={goHistory}
    />
  )
}

export default App
