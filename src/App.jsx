import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Home from './screens/Home.jsx'
import Day from './screens/Day.jsx'
import Exercise from './screens/Exercise.jsx'
import History from './screens/History.jsx'
import Account from './screens/Account.jsx'
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

  // transient confirmation chip ("Workout started") — one message at a time,
  // self-dismissing; a repeat show resets the clock
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

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
  const goAccount = () => withTransition(() => setScreen('account'))
  // back is contextual: exercise → its day, everything else → home
  const goBack = () =>
    withTransition(() => setScreen(screen === 'exercise' ? 'day' : 'home'))

  let screenEl
  if (screen === 'exercise') {
    const exercise = data.exercises.find((e) => e.id === exerciseId)
    screenEl = (
      <Exercise
        exercise={exercise}
        day={selectedDay}
        onStartRest={startRest}
        onToast={showToast}
      />
    )
  } else if (screen === 'day') {
    screenEl = (
      <Day day={selectedDay} exercises={data.exercises} onSelectExercise={openExercise} />
    )
  } else if (screen === 'history') {
    screenEl = <History exercises={data.exercises} />
  } else if (screen === 'account') {
    screenEl = <Account session={session} onSignOut={signOut} onLogin={leaveOffline} />
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
        restActive={!!rest}
        showAccount={!!supabase}
        onAccount={goAccount}
      />

      {screenEl}

      {(!!(supabase && session) || screen === 'history' || screen === 'account') && (
        <div className="app-bottom">
          {supabase && session && (
            <p className="sync-status">{SYNC_LABEL[syncStatus] ?? ''}</p>
          )}
          {(screen === 'history' || screen === 'account') && (
            <footer className="app-footer">
              <p>© 2026 Workout Buddy — all gains reserved</p>
              <p>Last updated {__BUILD_DATE__}</p>
            </footer>
          )}
        </div>
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

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}

export default App
