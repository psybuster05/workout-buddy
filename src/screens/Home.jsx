import { dayImage } from '../theme.js'

const base = import.meta.env.BASE_URL

function Home({ days, exercises, onSelectDay }) {
  return (
    <div className="screen home-days">
      {days.map((day) => {
        const count = exercises.filter((e) => e.day === day).length
        return (
          <button
            key={day}
            className="day-button"
            style={{ '--day-img': `url(${base}days/${dayImage(day)})` }}
            onClick={() => onSelectDay(day)}
            aria-label={`${day}, ${count} exercises`}
          >
            <span className="day-count">
              {count} exercise{count === 1 ? '' : 's'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default Home
