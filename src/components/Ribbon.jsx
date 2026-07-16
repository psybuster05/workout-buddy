import { useEffect, useRef, useState } from 'react'

// Horizontal number ribbon — flick a ruler-style tape, it snaps to the nearest
// increment, and the tick under the fixed centre caret is the selected value.
// There's no separate readout: the emphasised number under the caret IS the
// value, with the unit beneath the tape. Tap the tape (a tap, not a flick) to
// type an exact number. Replaces the −/＋ steppers.
//
// `value` is in DISPLAY units (lbs or kg, or plain reps/seconds) — the parent
// owns any storage conversion, exactly as it did with the steppers.

// px per increment — the scroll-snap stride. Pushed to CSS as --item (inline on
// the track) so the tick width and edge padding can't drift from this number.
const ITEM = 36
// decorative faded ticks before the first real value, so the tape doesn't look
// like it slams into a wall at the minimum. Never snap targets or selectable —
// all the index math offsets past them.
const LEAD = 5
// ticks either side of the centre that get the scale/brighten emphasis
const EMPH_WINDOW = 4
// pointer travel (px) past which a press is a drag/scroll, not a tap-to-type
const TAP_SLOP = 6

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
  const dragRef = useRef(null) // press-in-progress bookkeeping (drag + tap)
  // latest value, so rapid chevron clicks accumulate instead of all reading the
  // same stale prop (React batches synchronous clicks — the classic stepper bug)
  const valueRef = useRef(value)
  const styledRef = useRef([]) // child indices currently carrying --emph
  const lastScrollAt = useRef(0) // guards tap-to-type against a scroll that ends in pointerup
  const [typing, setTyping] = useState(false)

  const count = Math.max(1, Math.round((max - min) / step) + 1)
  const clamp = (v) => Math.min(max, Math.max(min, v))
  const indexOf = (v) => Math.round((clamp(v) - min) / step)
  const clampIndex = (n) => Math.min(count - 1, Math.max(0, n))
  const round = (v) => Number(v.toFixed(decimals))
  // trim trailing zeros only in the fractional part: 45.00→"45", 47.50→"47.5",
  // but leave integers alone so 10 reps doesn't become "1"
  const fmt = (v) => {
    const s = v.toFixed(decimals)
    return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s
  }

  // A real value's scroll offset — LEAD phantom ticks sit before real tick 0, so
  // every scroll↔index conversion shifts by LEAD.
  const scrollForValue = (v) => (indexOf(v) + LEAD) * ITEM
  const valueAt = (scrollLeft) => round(min + clampIndex(Math.round(scrollLeft / ITEM) - LEAD) * step)

  // Scale/brighten ticks by nearness to the centre caret — the wheel-picker
  // pop, and (with no separate readout) what makes the centre number legible.
  // Cheap: transform + opacity only, and only the handful of ticks near centre.
  // Phantom lead ticks (index < LEAD) stay untouched.
  const updateEmphasis = (el) => {
    const kids = el.children
    const centre = el.scrollLeft / ITEM // fractional child index under the caret
    for (const i of styledRef.current) kids[i]?.style.removeProperty('--emph')
    styledRef.current = []
    const lo = Math.max(LEAD, Math.floor(centre) - EMPH_WINDOW)
    const hi = Math.min(kids.length - 1, Math.ceil(centre) + EMPH_WINDOW)
    for (let i = lo; i <= hi; i++) {
      const t = Math.max(0, 1 - Math.abs(i - centre) / EMPH_WINDOW)
      kids[i].style.setProperty('--emph', t.toFixed(3))
      styledRef.current.push(i)
    }
  }

  // reposition the tape when the value changes from outside this component
  useEffect(() => {
    if (fromScroll.current) {
      fromScroll.current = false
      return
    }
    const el = trackRef.current
    if (!el || typing) return
    const target = scrollForValue(value)
    if (Math.abs(el.scrollLeft - target) >= 1) {
      suppress.current = true
      el.scrollLeft = target
    }
    updateEmphasis(el) // keep the centre pop in sync even when we don't scroll
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = () => {
    lastScrollAt.current = Date.now()
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const el = trackRef.current
      if (!el) return
      updateEmphasis(el) // every frame, for the continuous effect
      if (suppress.current) {
        suppress.current = false
        return
      }
      const v = valueAt(el.scrollLeft)
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

  // Pointer handling does double duty: mouse drag-to-scroll (a mouse has no
  // horizontal wheel and can't grab an overflow container), and tap-to-type for
  // everyone. A tap = press + release with no real movement; a flick on touch
  // fires pointercancel as native scroll takes over, so it's never a tap.
  const onPointerDown = (e) => {
    const el = trackRef.current
    if (!el) return
    const mouse = e.pointerType !== 'touch' && e.button === 0
    dragRef.current = { startX: e.clientX, moved: false, mouse }
    if (mouse) {
      dragRef.current.startScroll = el.scrollLeft
      el.style.scrollSnapType = 'none' // don't fight the drag
      el.classList.add('is-dragging')
      el.setPointerCapture?.(e.pointerId)
      e.preventDefault()
    }
    // touch: leave native scrolling alone; we only watch for a tap
  }

  const onPointerMove = (e) => {
    const d = dragRef.current
    if (!d) return
    if (Math.abs(e.clientX - d.startX) > TAP_SLOP) d.moved = true
    if (d.mouse) {
      const el = trackRef.current
      if (el) el.scrollLeft = d.startScroll - (e.clientX - d.startX)
    }
  }

  const endPress = (e) => {
    const d = dragRef.current
    const el = trackRef.current
    if (!d || !el) return
    dragRef.current = null
    if (d.mouse) {
      el.classList.remove('is-dragging')
      el.style.scrollSnapType = '' // restore CSS snap
    }
    // a tap → type. Guard against a touch scroll that ends in pointerup rather
    // than pointercancel: if the tape scrolled in the last beat, it wasn't a tap.
    if (!d.moved && e.type === 'pointerup' && Date.now() - lastScrollAt.current > 200) {
      setTyping(true)
      return
    }
    if (d.mouse) {
      el.scrollTo({ left: scrollForValue(valueAt(el.scrollLeft)), behavior: 'smooth' })
    }
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
    <div
      className="ribbon"
      role="group"
      aria-label={`${ariaLabel}: ${fmt(clamp(value))}${unit ? ' ' + unit : ''}`}
    >
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
        <div className={typing ? 'ribbon-track-wrap is-typing' : 'ribbon-track-wrap'}>
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
            <>
              <span className="ribbon-caret" aria-hidden="true" />
              <div
                className="ribbon-track"
                ref={trackRef}
                style={{ '--item': `${ITEM}px` }}
                onScroll={handleScroll}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endPress}
                onPointerCancel={endPress}
                aria-hidden="true"
              >
                {/* faded, non-selectable lead-in ticks */}
                {Array.from({ length: LEAD }, (_, i) => (
                  <div className="ribbon-tick is-lead" key={`lead-${i}`}>
                    <span className="ribbon-mark" />
                  </div>
                ))}
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
            </>
          )}
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
      {unit && <span className="ribbon-unit">{unit}</span>}
    </div>
  )
}
