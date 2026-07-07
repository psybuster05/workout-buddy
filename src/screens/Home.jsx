import { useState } from 'react'
import { dayAccent } from '../theme.js'

function Home({ days, exercises, onSelect, onHistory, onStartRest }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const choose = (action) => {
    setMenuOpen(false)
    action()
  }

  return (
    <div className="screen">
      <header className="home-header">
        <h1>Workout Buddy</h1>
        <div className="menu">
          <button
            className="menu-button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
          {menuOpen && (
            <>
              <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
              <div className="menu-dropdown" role="menu">
                <button role="menuitem" onClick={() => choose(onHistory)}>
                  History
                </button>
                <button role="menuitem" onClick={() => choose(onStartRest)}>
                  Rest Timer
                </button>
              </div>
            </>
          )}
        </div>
      </header>

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

      <footer className="app-footer">
        <p>© 2026 Workout Buddy — all gains reserved 💪</p>
        <p>Last updated {__BUILD_DATE__}</p>
      </footer>
    </div>
  )
}

export default Home
