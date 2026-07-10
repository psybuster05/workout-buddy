import { describe, it, expect } from 'vitest'
import { formatSession, personalRecord } from './format.js'

const session = (sets) => ({ exerciseId: 'x', date: '2026-07-10', unit: 'lbs', sets })

describe('formatSession (cardio)', () => {
  it('single entry with distance', () => {
    expect(formatSession(session([{ reps: 32, weight: 2.1 }]), 'cardio')).toBe('32 min · 2.1 mi')
  })

  it('single entry without distance', () => {
    expect(formatSession(session([{ reps: 10, weight: 0 }]), 'cardio')).toBe('10 min')
  })

  it('multiple entries join minutes and sum distance', () => {
    const s = session([
      { reps: 32, weight: 2.1 },
      { reps: 18, weight: 1.3 },
    ])
    expect(formatSession(s, 'cardio')).toBe('32 + 18 min · 3.4 mi')
  })
})

describe('personalRecord (cardio)', () => {
  it('longest minutes and best distance across sessions', () => {
    const sessions = [
      session([{ reps: 32, weight: 2.1 }]),
      session([{ reps: 45, weight: 1.8 }]),
    ]
    expect(personalRecord(sessions, 'cardio')).toBe('longest 45 min · best 2.1 mi')
  })

  it('minutes only when no distance ever logged', () => {
    expect(personalRecord([session([{ reps: 10, weight: 0 }])], 'cardio')).toBe(
      'longest 10 min'
    )
  })

  it('null with no sets', () => {
    expect(personalRecord([], 'cardio')).toBeNull()
  })
})
