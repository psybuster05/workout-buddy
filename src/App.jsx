import { useState } from 'react'
import Home from './screens/Home.jsx'
import Exercise from './screens/Exercise.jsx'
import History from './screens/History.jsx'
import data from './data/exercises.json'

function App() {
  const [screen, setScreen] = useState('home')
  const [exerciseId, setExerciseId] = useState(null)

  const openExercise = (id) => {
    setExerciseId(id)
    setScreen('exercise')
  }

  if (screen === 'exercise') {
    const exercise = data.exercises.find((e) => e.id === exerciseId)
    return <Exercise exercise={exercise} onBack={() => setScreen('home')} />
  }

  if (screen === 'history') {
    return <History exercises={data.exercises} onBack={() => setScreen('home')} />
  }

  return (
    <Home
      days={data.days}
      exercises={data.exercises}
      onSelect={openExercise}
      onHistory={() => setScreen('history')}
    />
  )
}

export default App
