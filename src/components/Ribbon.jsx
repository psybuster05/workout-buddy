import { useEffect, useRef, useState } from 'react'

// Horizontal number ribbon — flick a ruler-style tape, it snaps to the nearest
// increment, and the tick under the fixed centre caret is the selected value.
// The big readout is tappable to type an exact number (scrolling to a heavy
// weight one tick at a time is slow). Replaces the −/＋ steppers.
//
// `value` is in DISPLAY units (lbs or kg, or plain reps/seconds) — the parent
// owns any storage conversion, exactly as it did with the steppers.
// px per increment — the scroll-snap stride. Pushed to CSS as --item (inline on
// the track) so the tick width and edge padding can't drift from this number.
const ITEM = 36

export default function Ribbon({
  value,
  onChange,
  min,
  max,
  step,
  decimals = 0,
  labelEvery = 5,
  unit,
  ariaLabel,
}) {
  const trackRef = useRef(null)
  const rafRef = useRef(0)
  // Two guards for the scroll↔value feedback loop, one per direction:
  // fromScroll — a value change that came FROM a user scroll, so the effect
  //   must not yank scrollLeft back (that would kill the flick's momentum).
  // suppress — a scroll that came FROM a programmatic reposition, so the
  //   handler must not fire onChange (that would snap an off-grid prefill,
  //   e.g. 20.4 kg → 20 kg, silently changing the logged weight).
  const fromScroll = useRef(false)
  const suppress = useRef(false)
  const dragRef = useRef(null) // {startX, startScroll} while mouse-dragging
  // latest value, so rapid chevron clicks accumulate instead of all reading the
  // same stale prop (React batches synchronous clicks — the classic stepper bug)
  const valueRef = useRef(value)
  const [typing, setTyping] = useState(false)

  const count = Math.max(1, Math.round((max - min) / step) + 1)
  const clamp = (v) => Math.min(max, Math.max(min, v))
  const indexOf = (v) => Math.round((clamp(v) - min) / step)
  const round = (v) => Number(v.toFixed(decimals))
  // trim trailing zeros only in the fractional part: 45.00→"45", 47.50→"47.5",
  // but leave integers alone so 10 reps doesn't become "1"
  const fmt = (v) => {
    const s = v.toFixed(decimals)
    return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s
  }

  // reposition the tape when the value changes from outside this component
  useEffect(() => {
    if (fromScroll.current) {
      fromScroll.current = false
      return
    }
    const el = trackRef.current
    if (!el || typing) return
    const target = indexOf(value) * ITEM
    if (Math.abs(el.scrollLeft - target) < 1) return
    suppress.current = true
    el.scrollLeft = target
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = () => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const el = trackRef.current
      if (!el) return
      if (suppress.current) {
        suppress.current = false
        return
      }
      const i = Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / ITEM)))
      const v = round(min + i * step)
      if (v !== round(value)) {
        fromScroll.current = true
        onChange(v)
      }
    })
  }

  const commitTyped = (raw) => {
    const n = Number(raw)
    onChange(round(clamp(Number.isFinite(n) ? n : min)))
    setTyping(false)
  }

  // keep valueRef current for external changes (scroll, type, prefill); stepBy
  // advances it itself so a burst of clicks accumulates before the re-render
  useEffect(() => {
    valueRef.current = value
  }, [value])

  // one-step nudge for the flanking chevrons — the precise click path, for
  // anyone who'd rather tap than flick (the old −/＋ behaviour, kept as a corner)
  const stepBy = (dir) => {
    const next = round(clamp(valueRef.current + dir * step))
    valueRef.current = next
    onChange(next)
  }

  // Mouse support. Touch and trackpad already scroll the tape natively; a mouse
  // has no horizontal wheel and can't grab an overflow container — so add both:
  // click-and-drag the tape, and mouse-wheel → horizontal.
  const clampIndex = (n) => Math.min(count - 1, Math.max(0, n))

  const onPointerDown = (e) => {
    if (e.pointerType === 'touch' || e.button !== 0) return // leave touch to native
    const el = trackRef.current
    if (!el) return
    dragRef.current = { startX: e.clientX, startScroll: el.scrollLeft }
    el.style.scrollSnapType = 'none' // don't fight the drag
    el.classList.add('is-dragging')
    el.setPointerCapture?.(e.pointerId)
    e.preventDefault()
  }

  const onPointerMove = (e) => {
    if (!dragRef.current) return
    const el = trackRef.current
    if (!el) return
    el.scrollLeft = dragRef.current.startScroll - (e.clientX - dragRef.current.startX)
  }

  const endDrag = () => {
    const el = trackRef.current
    if (!dragRef.current || !el) return
    dragRef.current = null
    el.classList.remove('is-dragging')
    el.style.scrollSnapType = '' // restore CSS snap
    el.scrollTo({ left: clampIndex(Math.round(el.scrollLeft / ITEM)) * ITEM, behavior: 'smooth' })
  }

  // Wheel needs a native non-passive listener: React's onWheel is passive, so it
  // can't preventDefault the page from scrolling as the tape moves.
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const onWheel = (e) => {
      // a mouse wheel is vertical-only; convert it. A trackpad's horizontal
      // component (deltaX) is left to native scrolling.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      el.scrollLeft += e.deltaY
      e.preventDefault()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <div className="ribbon" role="group" aria-label={ariaLabel}>
      <div className="ribbon-readout">
        {typing ? (
          <input
            className="ribbon-input"
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            autoFocus
            defaultValue={fmt(clamp(value))}
            onBlur={(e) => commitTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            aria-label={`${ariaLabel} — type a value`}
          />
        ) : (
          <button
            type="button"
            className="ribbon-value"
            onClick={() => setTyping(true)}
            aria-label={`${ariaLabel}: ${fmt(clamp(value))}${unit ? ' ' + unit : ''} — tap to type`}
          >
            {fmt(clamp(value))}
          </button>
        )}
        {unit && <span className="ribbon-unit">{unit}</span>}
      </div>
      <div className="ribbon-row">
        <button
          type="button"
          className="ribbon-chevron"
          onClick={() => stepBy(-1)}
          disabled={round(value) <= min}
          aria-label={`Decrease ${ariaLabel}`}
        >
          ‹
        </button>
        <div className="ribbon-track-wrap">
          <span className="ribbon-caret" aria-hidden="true" />
          <div
            className="ribbon-track"
            ref={trackRef}
            style={{ '--item': `${ITEM}px` }}
            onScroll={handleScroll}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            aria-hidden="true"
          >
            {Array.from({ length: count }, (_, i) => {
              const v = round(min + i * step)
              const major = i % labelEvery === 0
              return (
                <div className="ribbon-tick" key={i}>
                  <span className={major ? 'ribbon-mark major' : 'ribbon-mark'} />
                  {major && <span className="ribbon-tick-label">{fmt(v)}</span>}
                </div>
              )
            })}
          </div>
        </div>
        <button
          type="button"
          className="ribbon-chevron"
          onClick={() => stepBy(1)}
          disabled={round(value) >= max}
          aria-label={`Increase ${ariaLabel}`}
        >
          ›
        </button>
      </div>
    </div>
  )
}
