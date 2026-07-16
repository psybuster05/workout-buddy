import { SyncIcon, StopwatchIcon, PersonIcon } from '../icons.jsx'
import { DEBUG_AUDIO } from '../hooks/useRestTimer.js'

// Sticky app header: brand (Home) or back button on the left; rest-timer,
// sync, and account icon buttons on the right (in that order). Purely
// presentational — App owns the handlers and decides which buttons show
// (sync needs a login; account just needs Supabase configured).
function AppHeader({
  isHome,
  onBack,
  onHome,
  showSync,
  syncStatus,
  onSyncNow,
  onStartRest,
  showAccount,
  onAccount,
}) {
  return (
    <header className="app-header">
      {isHome ? (
        <button className="app-brand" onClick={onHome}>
          Workout Buddy
        </button>
      ) : (
        <button className="back-button" onClick={onBack}>
          ‹ Back
        </button>
      )}
      <div className="header-actions">
        <button
          className="timer-button"
          aria-label="Start rest timer"
          // ?debug=1 → 10s, so the audio readout is reachable without standing
          // around for a minute and a half per test
          onClick={() => onStartRest(DEBUG_AUDIO ? 10 : 90)}
        >
          <StopwatchIcon />
        </button>
        {showSync && (
          <button
            className={`timer-button sync-button sync-${syncStatus}`}
            aria-label="Sync now"
            onClick={onSyncNow}
          >
            <SyncIcon />
          </button>
        )}
        {showAccount && (
          <button className="timer-button" aria-label="Account" onClick={onAccount}>
            <PersonIcon />
          </button>
        )}
      </div>
    </header>
  )
}

export default AppHeader
