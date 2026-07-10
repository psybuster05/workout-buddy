import { SyncIcon, StopwatchIcon } from '../icons.jsx'

// Sticky app header: brand (Home) or back button on the left, sync + rest-timer
// icon buttons on the right. Purely presentational — App owns the handlers and
// decides whether the sync button shows (only when Supabase is configured and
// logged in).
function AppHeader({ isHome, onBack, onHome, showSync, syncStatus, onSyncNow, onStartRest }) {
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
        {showSync && (
          <button
            className={`timer-button sync-button sync-${syncStatus}`}
            aria-label="Sync now"
            onClick={onSyncNow}
          >
            <SyncIcon />
          </button>
        )}
        <button
          className="timer-button"
          aria-label="Start rest timer"
          onClick={() => onStartRest(90)}
        >
          <StopwatchIcon />
        </button>
      </div>
    </header>
  )
}

export default AppHeader
