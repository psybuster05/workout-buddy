import { describe, it, expect } from 'vitest'
import { mergeStores } from './sync.js'

const session = (exerciseId, date, sets) => ({ exerciseId, date, unit: 'lbs', sets })
const workout = (date, day, startedAt, endedAt) => ({ date, day, startedAt, endedAt })

describe('mergeStores', () => {
  it('unions disjoint sessions and workouts', () => {
    const a = {
      schemaVersion: 1,
      sessions: [session('bench', '2026-07-01', [{ reps: 8, weight: 45 }])],
      workouts: [workout('2026-07-01', 'Mon — Push', 1000, 2000)],
    }
    const b = {
      schemaVersion: 1,
      sessions: [session('squat', '2026-07-03', [{ reps: 10, weight: 50 }])],
      workouts: [workout('2026-07-03', 'Fri — Legs', 3000, 4000)],
    }
    const m = mergeStores(a, b)
    expect(m.sessions).toHaveLength(2)
    expect(m.workouts).toHaveLength(2)
  })

  it('for the same exercise+date, keeps the session with more sets', () => {
    const a = { sessions: [session('bench', '2026-07-01', [{ reps: 8, weight: 45 }])], workouts: [] }
    const b = {
      sessions: [
        session('bench', '2026-07-01', [
          { reps: 8, weight: 45 },
          { reps: 6, weight: 47.5 },
        ]),
      ],
      workouts: [],
    }
    const m = mergeStores(a, b)
    expect(m.sessions).toHaveLength(1)
    expect(m.sessions[0].sets).toHaveLength(2)
  })

  it('for the same date, a finished workout beats an unfinished one', () => {
    const a = { sessions: [], workouts: [workout('2026-07-01', 'Mon — Push', 1000, null)] }
    const b = { sessions: [], workouts: [workout('2026-07-01', 'Mon — Push', 1000, 5000)] }
    expect(mergeStores(a, b).workouts[0].endedAt).toBe(5000)
    expect(mergeStores(b, a).workouts[0].endedAt).toBe(5000) // order-independent
  })

  it('empty local ∪ remote = full restore (post-eviction)', () => {
    const remote = {
      schemaVersion: 1,
      sessions: [session('bench', '2026-07-01', [{ reps: 8, weight: 45 }])],
      workouts: [workout('2026-07-01', 'Mon — Push', 1000, 2000)],
      disabled: { 'calf-raise': { off: true, at: 500 } },
    }
    const local = { schemaVersion: 1, sessions: [], workouts: [], disabled: {} }
    expect(mergeStores(remote, local)).toEqual(remote)
  })

  it('tolerates null / missing fields', () => {
    expect(mergeStores(null, null)).toEqual({
      schemaVersion: 1,
      sessions: [],
      workouts: [],
      disabled: {},
    })
    const only = {
      schemaVersion: 1,
      sessions: [session('x', '2026-07-01', [{ reps: 1, weight: 0 }])],
      workouts: [],
      disabled: {},
    }
    expect(mergeStores(only, null)).toEqual(only)
  })

  it('disabled toggles merge last-write-wins per exercise', () => {
    // device A disabled it at t=100; device B re-enabled it later at t=200
    const a = { sessions: [], workouts: [], disabled: { bench: { off: true, at: 100 } } }
    const b = { sessions: [], workouts: [], disabled: { bench: { off: false, at: 200 } } }
    expect(mergeStores(a, b).disabled.bench).toEqual({ off: false, at: 200 })
    expect(mergeStores(b, a).disabled.bench).toEqual({ off: false, at: 200 }) // order-independent
    // disjoint ids just union
    const c = { sessions: [], workouts: [], disabled: { squat: { off: true, at: 50 } } }
    expect(Object.keys(mergeStores(a, c).disabled).sort()).toEqual(['bench', 'squat'])
  })
})
