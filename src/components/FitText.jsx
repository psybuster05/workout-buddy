import { useLayoutEffect, useRef } from 'react'

// Single-line text that must never wrap or truncate: starts at `max` px and
// steps the font down (to `min`) until the rendered text fits its box.
// Re-fits on viewport resize/rotation.
function FitText({ children, max = 18, min = 11, className }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      let size = max
      el.style.fontSize = `${size}px`
      while (size > min && el.scrollWidth > el.clientWidth) {
        size -= 0.5
        el.style.fontSize = `${size}px`
      }
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [children, max, min])

  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  )
}

export default FitText
