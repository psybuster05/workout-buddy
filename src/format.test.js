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

describe('kg display unit (storage stays lbs)', () => {
  it('formatSession converts weighted sessions to kg', () => {
    const s = session([
      { reps: 8, weight: 45 },
      { reps: 8, weight: 45 },
      { reps: 8, weight: 45 },
    ])
    expect(formatSession(s, 'weighted', 'kg')).toBe('3×8 @ 20.4 kg')
    expect(formatSession(s, 'weighted')).toBe('3×8 @ 45 lbs') // default untouched
  })

  it('personalRecord converts best set and top weight to kg', () => {
    const sessions = [session([{ reps: 8, weight: 45 }])]
    expect(personalRecord(sessions, 'weighted', 'kg')).toBe('best 20.4 kg × 8 · top 20.4 kg')
  })

  it('cardio distance never converts (weight field is miles)', () => {
    const s = session([{ reps: 32, weight: 2.1 }])
    expect(formatSession(s, 'cardio', 'kg')).toBe('32 min · 2.1 mi')
  })
})

describe('personalRecord (weighted)', () => {
  it('crowns the hardest set by est. 1RM, printed as real weight×reps', () => {
    // 50×5 (e1RM ~58.3) beats 45×8 (e1RM ~57) — heavier-lower wins; top weight is 50
    const sessions = [session([{ reps: 8, weight: 45 }, { reps: 5, weight: 50 }])]
    expect(personalRecord(sessions, 'weighted')).toBe('best 50 lbs × 5 · top 50 lbs')
  })

  it('excludes warmup sets from the record', () => {
    const sessions = [session([{ reps: 1, weight: 100, warmup: true }, { reps: 8, weight: 45 }])]
    expect(personalRecord(sessions, 'weighted')).toBe('best 45 lbs × 8 · top 45 lbs')
  })

  it('null when every set is a warmup', () => {
    expect(personalRecord([session([{ reps: 5, weight: 40, warmup: true }])], 'weighted')).toBeNull()
  })
})

describe('formatSession (per-side)', () => {
  it('appends /side to unilateral lifts', () => {
    const s = session([
      { reps: 10, weight: 30 },
      { reps: 10, weight: 30 },
    ])
    expect(formatSession(s, 'weighted', 'lbs', true)).toBe('2×10 @ 30 lbs /side')
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
