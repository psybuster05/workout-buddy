// Small presentational SVG icons for the header buttons. Kept out of App so the
// header markup reads cleanly; sizes/strokes are unchanged from the originals.

export function SyncIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="21"
      height="21"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

export function StopwatchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="9" y1="2.5" x2="15" y2="2.5" />
      <line x1="12" y1="2.5" x2="12" y2="6" />
      <circle cx="12" cy="14" r="8" />
      <line x1="12" y1="14" x2="12" y2="9.5" />
    </svg>
  )
}
