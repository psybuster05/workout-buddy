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

  it('a resumed workout beats a stale finished cloud copy (updatedAt wins)', () => {
    // cloud still thinks the workout finished at 5000; locally it was resumed
    // (endedAt cleared) later. The resume must survive the merge, or the next
    // app-launch pull silently re-finishes it.
    const cloud = {
      sessions: [],
      workouts: [{ date: '2026-07-01', day: 'Mon — Push', startedAt: 1000, endedAt: 5000, updatedAt: 5000 }],
    }
    const local = {
      sessions: [],
      workouts: [
        { date: '2026-07-01', day: 'Mon — Push', startedAt: 1000, endedAt: null, pausedMs: 2000, updatedAt: 9000 },
      ],
    }
    expect(mergeStores(cloud, local).workouts[0].endedAt).toBe(null)
    expect(mergeStores(local, cloud).workouts[0].endedAt).toBe(null) // order-independent
    // and the banked pause rode along
    expect(mergeStores(cloud, local).workouts[0].pausedMs).toBe(2000)
  })

  it('records without updatedAt keep the original finished-wins rule', () => {
    // back-compat: pre-upgrade records have no updatedAt, so both sides are 0
    // and the merge must fall through to the endedAt rule unchanged.
    const a = { sessions: [], workouts: [workout('2026-07-01', 'Mon — Push', 1000, null)] }
    const b = { sessions: [], workouts: [workout('2026-07-01', 'Mon — Push', 1000, 5000)] }
    expect(mergeStores(a, b).workouts[0].endedAt).toBe(5000)
    expect(mergeStores(b, a).workouts[0].endedAt).toBe(5000)
  })

  it('empty local ∪ remote = full restore (post-eviction)', () => {
    const remote = {
      schemaVersion: 1,
      sessions: [session('bench', '2026-07-01', [{ reps: 8, weight: 45 }])],
      workouts: [workout('2026-07-01', 'Mon — Push', 1000, 2000)],
      disabled: { 'calf-raise': { off: true, at: 500 } },
      notes: { bench: { text: 'seat pin 4', at: 500 } },
      custom: { squat: { on: true, at: 500 } },
      bodyweight: { '2026-07-01': { lbs: 180, at: 500 } },
    }
    const local = {
      schemaVersion: 1,
      sessions: [],
      workouts: [],
      disabled: {},
      notes: {},
      custom: {},
      bodyweight: {},
    }
    expect(mergeStores(remote, local)).toEqual(remote)
  })

  it('tolerates null / missing fields', () => {
    expect(mergeStores(null, null)).toEqual({
      schemaVersion: 1,
      sessions: [],
      workouts: [],
      disabled: {},
      notes: {},
      custom: {},
      bodyweight: {},
    })
    const only = {
      schemaVersion: 1,
      sessions: [session('x', '2026-07-01', [{ reps: 1, weight: 0 }])],
      workouts: [],
      disabled: {},
      notes: {},
      custom: {},
      bodyweight: {},
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

  it('notes merge last-write-wins per exercise', () => {
    const a = { sessions: [], workouts: [], notes: { bench: { text: 'old cue', at: 100 } } }
    const b = { sessions: [], workouts: [], notes: { bench: { text: 'new cue', at: 200 } } }
    expect(mergeStores(a, b).notes.bench).toEqual({ text: 'new cue', at: 200 })
    expect(mergeStores(b, a).notes.bench).toEqual({ text: 'new cue', at: 200 }) // order-independent
    // disjoint ids just union
    const c = { sessions: [], workouts: [], notes: { squat: { text: 'belt', at: 50 } } }
    expect(Object.keys(mergeStores(a, c).notes).sort()).toEqual(['bench', 'squat'])
  })

  it('a cleared note is a tombstone, not a resurrection', () => {
    // the whole point of storing { text: '' } instead of dropping the key:
    // clearing on this device must beat the stale cloud copy that still has text
    const cloud = { sessions: [], workouts: [], notes: { bench: { text: 'stale', at: 100 } } }
    const local = { sessions: [], workouts: [], notes: { bench: { text: '', at: 200 } } }
    expect(mergeStores(cloud, local).notes.bench.text).toBe('')
    expect(mergeStores(local, cloud).notes.bench.text).toBe('')
  })

  it('custom-day membership merges last-write-wins per exercise', () => {
    // added to the Custom day on A at t=100; removed on B later at t=200
    const a = { sessions: [], workouts: [], custom: { bench: { on: true, at: 100 } } }
    const b = { sessions: [], workouts: [], custom: { bench: { on: false, at: 200 } } }
    expect(mergeStores(a, b).custom.bench).toEqual({ on: false, at: 200 })
    expect(mergeStores(b, a).custom.bench).toEqual({ on: false, at: 200 }) // order-independent
    const c = { sessions: [], workouts: [], custom: { squat: { on: true, at: 50 } } }
    expect(Object.keys(mergeStores(a, c).custom).sort()).toEqual(['bench', 'squat'])
  })

  it('bodyweight log merges last-write-wins per date', () => {
    // same day re-logged on two devices: the later weigh-in wins
    const a = { sessions: [], workouts: [], bodyweight: { '2026-07-01': { lbs: 180, at: 100 } } }
    const b = { sessions: [], workouts: [], bodyweight: { '2026-07-01': { lbs: 179, at: 200 } } }
    expect(mergeStores(a, b).bodyweight['2026-07-01']).toEqual({ lbs: 179, at: 200 })
    expect(mergeStores(b, a).bodyweight['2026-07-01']).toEqual({ lbs: 179, at: 200 }) // order-independent
    // disjoint dates just union
    const c = { sessions: [], workouts: [], bodyweight: { '2026-07-02': { lbs: 181, at: 50 } } }
    expect(Object.keys(mergeStores(a, c).bodyweight).sort()).toEqual(['2026-07-01', '2026-07-02'])
  })

  it('a deleted weigh-in is a tombstone, not a resurrection', () => {
    // deleting stores { lbs: null } — it must beat the stale cloud copy that
    // still has a weight, same as a cleared note
    const cloud = { sessions: [], workouts: [], bodyweight: { '2026-07-01': { lbs: 180, at: 100 } } }
    const local = { sessions: [], workouts: [], bodyweight: { '2026-07-01': { lbs: null, at: 200 } } }
    expect(mergeStores(cloud, local).bodyweight['2026-07-01'].lbs).toBe(null)
    expect(mergeStores(local, cloud).bodyweight['2026-07-01'].lbs).toBe(null)
  })
})
