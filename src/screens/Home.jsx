import { dayAccent, dayImage, dayLabel } from '../theme.js'
import { getDisabledIds } from '../storage.js'

const base = import.meta.env.BASE_URL

function Home({ days, exercises, onSelectDay, onHistory }) {
  const disabled = getDisabledIds()
  return (
    <div className="screen home-days">
      {days.map((day) => {
        const count = exercises.filter((e) => e.day === day && !disabled.has(e.id)).length
        return (
          <button
            key={day}
            className="day-button"
            style={{
              '--accent': dayAccent(day),
              '--day-img': `url(${base}days/${dayImage(day)})`,
            }}
            onClick={() => onSelectDay(day)}
          >
            <span className="day-button-title">{dayLabel(day)}</span>
            <span className="day-button-sub">
              {count} exercise{count === 1 ? '' : 's'}
            </span>
          </button>
        )
      })}

      <button className="home-history" onClick={onHistory}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 3v5h5" />
          <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
          <path d="M12 7v5l4 2" />
        </svg>
        History
      </button>
    </div>
  )
}

export default Home
