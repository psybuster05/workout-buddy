import { dayAccent, dayImage, dayLabel } from '../theme.js'

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
    </div>
  )
}

export default Home
