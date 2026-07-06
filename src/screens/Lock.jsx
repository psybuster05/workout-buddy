import { useState } from 'react'
import { tryUnlock } from '../auth.js'

function Lock({ onUnlock }) {
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (await tryUnlock(value)) {
      onUnlock()
    } else {
      setWrong(true)
      setValue('')
    }
  }

  return (
    <div className="screen lock-screen">
      <h1>Workout Buddy</h1>
      <form className="lock-form" onSubmit={submit}>
        <input
          type="password"
          autoFocus
          value={value}
          placeholder="Password"
          aria-label="Password"
          onChange={(e) => {
            setValue(e.target.value)
            setWrong(false)
          }}
        />
        <button type="submit" className="finish-button" disabled={value === ''}>
          Unlock
        </button>
        {wrong && <p className="lock-error">Wrong password</p>}
      </form>
    </div>
  )
}

export default Lock
