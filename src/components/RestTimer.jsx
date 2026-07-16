import { useEffect, useRef, useState } from 'react'
import { DEBUG_AUDIO } from '../hooks/useRestTimer.js'

// How late the alarm may be and still fire. In the foreground the 250ms tick
// makes this ~0.25s, so the limit only ever governs the suspended-JS case: a
// dimmed screen woken a few seconds after 0:00 is exactly when you DO still
// want the beep, which the old 3s threshold swallowed. Long enough to cover
// that, short enough that returning from a real lock stays silent.
const LATE_LIMIT_MS = 10000

function beep(ctx) {
  // +0.02 lead-in: scheduling at exactly currentTime races the audio thread,
  // and an envelope whose start is already in the past never ramps up
  const now = ctx.currentTime + 0.02
  ;[0, 0.18, 0.36].forEach((t, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880 + i * 110
    gain.gain.setValueAtTime(0.001, now + t)
    gain.gain.exponentialRampToValueAtTime(0.4, now + t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.15)
    osc.start(now + t)
    osc.stop(now + t + 0.16)
  })
}

// The alarm. Awaits resume() before scheduling, because a context that isn't
// 'running' reports a stale currentTime and beep() schedules against it.
//
// Measured on Chrome: resume() continues the clock rather than jumping it (~8ms
// gap), so scheduling off the stale value still lands in the future and plays.
// So this is hardening, NOT a proven fix — do not repeat the claim that it was
// the cause of the silent alarm; that was asserted and then disproved. It's
// kept because it costs nothing and iOS's WebKit-only 'interrupted' state is
// not the same code path as Chrome's 'suspended'. The ?debug=1 readout is what
// will actually identify the cause on the phone.
//
// Awaiting here is safe: this runs 90s after the tap, not inside a gesture, and
// the context was already unlocked by the Finish-set tap that started the rest.
// It closes over `ctx` only — never component state — so unmounting mid-beep is
// fine (that's the whole point of the parent owning the context).
async function fire(ctx, late, report) {
  // Deliberately async before any reporting: this is called from an effect, and
  // reporting synchronously would cascade a render (and trip react-hooks).
  await Promise.resolve()
  // Rest ended while JS was suspended and we're only finding out now — a beep
  // minutes late is worse than silence.
  if (late >= LATE_LIMIT_MS) return report?.({ state: 'suppressed (too late)', late })
  navigator.vibrate?.([200, 100, 200])
  if (!ctx) return report?.({ state: 'no-ctx', late })
  const before = ctx.state
  if (ctx.state !== 'running') {
    try {
      await ctx.resume()
    } catch {
      return report?.({ state: `${before}→resume-failed`, late })
    }
  }
  beep(ctx)
  report?.({ state: `${before}→${ctx.state}`, late })
}

// Countdown is derived from the endsAt wall-clock timestamp every tick, never
// from a decrementing counter — iOS suspends JS when the phone locks or Safari
// backgrounds the tab, and this way the timer is correct again on first tick
// after resume.
function RestTimer({ endsAt, totalSeconds, audioCtxRef, onExtend, onDismiss }) {
  const [now, setNow] = useState(() => Date.now())
  const firedRef = useRef(false)
  const [diag, setDiag] = useState(null)

  useEffect(() => {
    firedRef.current = false
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, 250)
    // recompute immediately when the tab comes back, don't wait for the interval
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('pageshow', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('pageshow', tick)
    }
  }, [endsAt])

  const remainingMs = Math.max(0, endsAt - now)
  const done = remainingMs === 0

  useEffect(() => {
    if (!done || firedRef.current) return
    firedRef.current = true
    fire(audioCtxRef.current, Date.now() - endsAt, DEBUG_AUDIO ? setDiag : undefined)
    // the beep + vibrate are the "rest over" signal — clear the timer itself
    // instead of leaving a button to tap (debug mode keeps it up for the readout)
    if (!DEBUG_AUDIO) onDismiss()
  }, [done, endsAt, audioCtxRef, onDismiss])

  // ?debug=1 holds the bar open after 0:00 to show what the audio layer did —
  // otherwise the readout would unmount before it could be read
  if (done) {
    if (!DEBUG_AUDIO) return null
    return (
      <div className="rest-timer">
        <div className="rest-row">
          <span className="rest-label">Audio</span>
          <span className="rest-diag">
            {diag ? `${diag.state} · session=${navigator.audioSession?.type ?? 'n/a'} · Δ${diag.late}ms` : '…'}
          </span>
          <button className="rest-skip" onClick={onDismiss}>
            Close
          </button>
        </div>
      </div>
    )
  }

  const secondsLeft = Math.ceil(remainingMs / 1000)
  const mm = Math.floor(secondsLeft / 60)
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className="rest-timer">
      <div className="rest-progress">
        <div
          className="rest-progress-fill"
          style={{ width: `${Math.min(100, (remainingMs / (totalSeconds * 1000)) * 100)}%` }}
        />
      </div>
      <div className="rest-row">
        <span className="rest-label">Rest</span>
        <span className="rest-count">
          {mm}:{ss}
        </span>
        <button className="rest-extend" onClick={onExtend}>
          +15s
        </button>
        <button className="rest-skip" onClick={onDismiss}>
          Skip
        </button>
      </div>
    </div>
  )
}

export default RestTimer
