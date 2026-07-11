import { useState } from 'react'
import { flushSync } from 'react-dom'
import Home from './screens/Home.jsx'
import Day from './screens/Day.jsx'
import Exercise from './screens/Exercise.jsx'
import History from './screens/History.jsx'
import Login from './screens/Login.jsx'
import ResetPassword from './screens/ResetPassword.jsx'
import AppHeader from './components/AppHeader.jsx'
import RestTimer from './components/RestTimer.jsx'
import { supabase } from './supabase.js'
import { syncNow } from './sync.js'
import { useCloudSync } from './hooks/useCloudSync.js'
import { useRestTimer } from './hooks/useRestTimer.js'
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

const SYNC_LABEL = {
  syncing: 'Syncing…',
  offline: 'Offline — will sync',
  error: 'Sync issue — will retry',
  pending: 'Unsynced — tap sync',
  idle: 'Synced to cloud',
}

function App() {
  const {
    session,
    offline,
    syncStatus,
    recovery,
    clearRecovery,
    goOffline,
    leaveOffline,
    signOut,
  } = useCloudSync()
  const { rest, startRest, extendRest, dismissRest, audioCtxRef } = useRestTimer()

  const [screen, setScreen] = useState('home')
  const [selectedDay, setSelectedDay] = useState(null)
  const [exerciseId, setExerciseId] = useState(null)

  if (session === undefined) return null // brief auth check on load
  // arrived via a password-reset email link → set the new password first
  if (recovery && session) return <ResetPassword onDone={clearRecovery} />
  if (supabase && !session && !offline) return <Login onOffline={goOffline} />

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
    screenEl = (
      <History
        exercises={data.exercises}
        authed={!!session}
        onSignOut={signOut}
        onLogin={leaveOffline}
      />
    )
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
      <AppHeader
        isHome={screen === 'home'}
        onHome={goHome}
        onBack={goBack}
        showSync={!!(supabase && session)}
        syncStatus={syncStatus}
        onSyncNow={() => syncNow()}
        onStartRest={startRest}
      />

      {screenEl}

      {screen === 'history' && (
        <footer className="app-footer">
          {supabase && session && (
            <p className="sync-status">{SYNC_LABEL[syncStatus] ?? ''}</p>
          )}
          <p>© 2026 Workout Buddy — all gains reserved</p>
          <p>Last updated {__BUILD_DATE__}</p>
        </footer>
      )}

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
