import { dayAccent } from '../theme.js'

function Home({ days, exercises, onSelect }) {
  return (
    <div className="screen">
      {days.map((day) => (
        <section key={day} className="day-group" style={{ '--accent': dayAccent(day) }}>
          <h2>{day}</h2>
          <ul className="exercise-list">
            {exercises
              .filter((e) => e.day === day)
              .map((e) => (
                <li key={e.id}>
                  <button className="exercise-button" onClick={() => onSelect(e.id)}>
                    {e.name}
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default Home
