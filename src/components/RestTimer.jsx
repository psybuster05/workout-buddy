import { useEffect, useRef, useState } from 'react'

function beep(ctx) {
  const now = ctx.currentTime
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

// Countdown is derived from the endsAt wall-clock timestamp every tick, never
// from a decrementing counter — iOS suspends JS when the phone locks or Safari
// backgrounds the tab, and this way the timer is correct again on first tick
// after resume.
function RestTimer({ endsAt, totalSeconds, audioCtxRef, onExtend, onDismiss }) {
  const [now, setNow] = useState(() => Date.now())
  const firedRef = useRef(false)

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
    // only alert if rest actually just ended — if the phone was locked past the
    // end, beeping minutes late is worse than silently clearing (beep scheduled
    // on the parent-owned audio context, so it plays on after we unmount)
    if (Date.now() - endsAt < 3000) {
      navigator.vibrate?.([200, 100, 200])
      const ctx = audioCtxRef.current
      if (ctx) {
        ctx.resume?.()
        beep(ctx)
      }
    }
    // the beep + vibrate are the "rest over" signal — clear the timer itself
    // instead of leaving a button to tap
    onDismiss()
  }, [done, endsAt, audioCtxRef, onDismiss])

  if (done) return null

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
