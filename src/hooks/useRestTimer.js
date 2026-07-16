import { useRef, useState } from 'react'

// ?debug=1 → the header stopwatch starts a 10s rest instead of 90s and the rest
// bar shows what the audio layer actually did. The three ways the alarm can fail
// on iOS (silent switch / suspended context / suppressed as too-late) all look
// identical from the outside — "no beep" — so there's no diagnosing it on a real
// phone without a readout. Inert without the param.
export const DEBUG_AUDIO =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1'

// Rest-timer state lives here (lifted out of App) so it keeps running while Jon
// navigates between screens mid-rest. Returns { rest, startRest, extendRest,
// dismissRest, audioCtxRef }; App renders <RestTimer> from `rest`.
//
// startRest MUST stay callable synchronously from the Finish-set tap — the
// AudioContext unlock only works inside the user-gesture that triggered it
// (iOS audio rule). No async, no deferral in here.
export function useRestTimer() {
  const [rest, setRest] = useState(null) // { endsAt, total, id } | null
  const audioCtxRef = useRef(null)
  const keepaliveRef = useRef(null)

  // An inaudible source running for the length of the rest. Safari suspends an
  // idle AudioContext, which freezes ctx.currentTime — and a beep scheduled
  // against a frozen clock lands in the past and plays silently. Keeping one
  // node alive keeps the clock moving. Costs nothing for 90 seconds.
  const startKeepalive = (ctx) => {
    stopKeepalive()
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      gain.gain.value = 0.0001 // inaudible, but not zero — zero can get optimised out
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      keepaliveRef.current = () => {
        try {
          osc.stop()
          osc.disconnect()
          gain.disconnect()
        } catch {
          // already stopped — nothing to do
        }
      }
    } catch {
      // no keepalive is survivable; the beep has its own resume path
    }
  }

  const stopKeepalive = () => {
    keepaliveRef.current?.()
    keepaliveRef.current = null
  }

  const startRest = (seconds) => {
    // Everything in here is synchronous on purpose — see the note above.
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (AC) audioCtxRef.current = new AC()
      // iOS 16.4+: 'playback' makes WebAudio ignore the ringer/silent switch,
      // which otherwise mutes the beep entirely. Plain property assignment, so
      // it's gesture-safe. Set lazily on first rest rather than at module load,
      // so merely opening the app doesn't claim an audio session.
      if (navigator.audioSession) navigator.audioSession.type = 'playback'
    }
    const ctx = audioCtxRef.current
    ctx?.resume?.() // fire-and-forget: awaiting here would break the gesture
    if (ctx) startKeepalive(ctx)
    setRest({ endsAt: Date.now() + seconds * 1000, total: seconds, id: Date.now() })
  }
  // id changes per rest (remounts the timer) but not on extend (no flicker)
  const extendRest = () =>
    setRest((r) => (r ? { ...r, endsAt: r.endsAt + 15000, total: r.total + 15 } : r))
  const dismissRest = () => {
    stopKeepalive()
    setRest(null)
  }

  return { rest, startRest, extendRest, dismissRest, audioCtxRef }
}
