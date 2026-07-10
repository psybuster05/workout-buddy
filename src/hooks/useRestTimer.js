import { useRef, useState } from 'react'

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

  const startRest = (seconds) => {
    if (!audioCtxRef.current && window.AudioContext) {
      audioCtxRef.current = new AudioContext()
    }
    audioCtxRef.current?.resume?.()
    setRest({ endsAt: Date.now() + seconds * 1000, total: seconds, id: Date.now() })
  }
  // id changes per rest (remounts the timer) but not on extend (no flicker)
  const extendRest = () =>
    setRest((r) => (r ? { ...r, endsAt: r.endsAt + 15000, total: r.total + 15 } : r))
  const dismissRest = () => setRest(null)

  return { rest, startRest, extendRest, dismissRest, audioCtxRef }
}
