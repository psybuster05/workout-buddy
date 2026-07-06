function Home({ days, exercises, onSelect, onHistory }) {
  return (
    <div className="screen">
      <header className="home-header">
        <h1>Workout Buddy</h1>
        <button className="history-button" onClick={onHistory}>
          History
        </button>
      </header>
      {days.map((day) => (
        <section key={day} className="day-group">
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
