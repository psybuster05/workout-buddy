import { useState } from 'react'
import Home from './screens/Home.jsx'
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
    return (
      <div className="screen">
        <button className="back-button" onClick={() => setScreen('home')}>
          ‹ Back
        </button>
        <h1>{exercise.name}</h1>
        <p className="placeholder">Exercise screen coming in build step 2.</p>
      </div>
    )
  }

  return <Home days={data.days} exercises={data.exercises} onSelect={openExercise} />
}

export default App
