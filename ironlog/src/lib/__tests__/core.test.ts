import { describe, expect, it } from 'vitest'
import { computePrEvents, e1rm, exerciseRecords, previousSets, workoutVolume } from '../calc'
import { applyLinks, linkedToNext, nextUp, toggleLink } from '../supersets'
import { parseBackup } from '../backup'
import { generateProgram } from '../programGen'
import { generateSeed, snapDemoToUnits } from '../../data/seed'
import { formatWeight, fromDisplayWeight, toDisplayWeight } from '../units'
import { weekStreaks } from '../stats'
import type { Workout } from '../../types'

const w = (id: string, date: string, sets: [number, number, ('normal' | 'warmup')?][], exerciseId = 'bench-press'): Workout => ({
  id,
  name: 'Test',
  startedAt: date,
  endedAt: date,
  exercises: [{ id: id + 'e', exerciseId, restSec: 90, sets: sets.map(([weight, reps, type = 'normal'], i) => ({ id: `${id}s${i}`, type, weight, reps, completed: true })) }],
})

describe('calculations', () => {
  it('estimates 1RM with Epley and treats a single as its own max', () => {
    expect(e1rm(100, 1)).toBe(100)
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 1)
  })

  it('excludes warm-ups and incomplete sets from volume', () => {
    const x = w('a', '2026-01-01T10:00:00Z', [[50, 10, 'warmup'], [100, 5]])
    x.exercises[0].sets.push({ id: 'z', type: 'normal', weight: 200, reps: 5, completed: false })
    expect(workoutVolume(x)).toBe(500)
  })

  it('does not count the first session as a record, then detects improvements', () => {
    const hist = [w('a', '2026-01-01T10:00:00Z', [[100, 5]]), w('b', '2026-01-08T10:00:00Z', [[102.5, 5]]), w('c', '2026-01-15T10:00:00Z', [[100, 3]])]
    const events = computePrEvents(hist)
    expect(events.filter((e) => e.workoutId === 'a')).toHaveLength(0)
    expect(events.filter((e) => e.workoutId === 'b').map((e) => e.kind).sort()).toEqual(['e1rm', 'volume', 'weight'])
    expect(events.filter((e) => e.workoutId === 'c')).toHaveLength(0)
    const rec = exerciseRecords(hist)[0]
    expect(rec.bestWeight?.value).toBe(102.5)
    expect(rec.sessions).toBe(3)
  })

  it('returns the most recent previous sets before a given time', () => {
    const hist = [w('a', '2026-01-01T10:00:00Z', [[100, 5]]), w('b', '2026-01-08T10:00:00Z', [[110, 4]])]
    expect(previousSets(hist, 'bench-press')[0].weight).toBe(110)
    expect(previousSets(hist, 'bench-press', '2026-01-05T00:00:00Z')[0].weight).toBe(100)
  })

  it('counts week streaks, keeping the current week alive', () => {
    const now = new Date('2026-09-22T12:00:00') // Tuesday
    const hist = [w('a', '2026-09-08T10:00:00', [[1, 1]]), w('b', '2026-09-15T10:00:00', [[1, 1]])]
    expect(weekStreaks(hist, now).current).toBe(2)
  })
})

describe('units', () => {
  it('round-trips pounds without drift', () => {
    const kg = fromDisplayWeight(135, 'lb')
    expect(toDisplayWeight(kg, 'lb')).toBe(135)
    expect(formatWeight(kg, 'lb')).toBe('135 lb')
  })

  it('snaps sample loads to plate jumps in pounds', () => {
    const seed = generateSeed(new Date('2026-09-22T12:00:00'))
    const snapped = snapDemoToUnits(seed.workouts, 'lb')
    for (const x of snapped) for (const e of x.exercises) for (const s of e.sets) if (s.weight) expect((toDisplayWeight(s.weight, 'lb') * 2) % 5).toBeCloseTo(0, 5)
  })
})

describe('supersets', () => {
  it('picks the next set in order, alternating rounds inside a superset', () => {
    const s = (id: string, completed = false) => ({ id, completed })
    const list = [
      { id: 'a', sets: [s('a1', true), s('a2', true)] },
      { id: 'b', supersetId: 'x', sets: [s('b1', true), s('b2'), s('b3')] },
      { id: 'c', supersetId: 'x', sets: [s('c1', true), s('c2')] },
      { id: 'd', sets: [s('d1')] },
    ]
    expect(nextUp(list)).toEqual({ exId: 'b', setId: 'b2' })
    list[1].sets[1].completed = true
    expect(nextUp(list)).toEqual({ exId: 'c', setId: 'c2' })
    list[2].sets[1].completed = true
    expect(nextUp(list)).toEqual({ exId: 'b', setId: 'b3' })
    list[1].sets[2].completed = true
    expect(nextUp(list)).toEqual({ exId: 'd', setId: 'd1' })
    list[3].sets[0].completed = true
    expect(nextUp(list)).toBeNull()
  })

  it('links and unlinks neighbours without leaving singletons', () => {
    let list = [{ supersetId: null as string | null }, { supersetId: null }, { supersetId: null }]
    list = toggleLink(list, 0)
    list = toggleLink(list, 1)
    expect(linkedToNext(list, 0) && linkedToNext(list, 1)).toBe(true)
    list = toggleLink(list, 0)
    expect(list[0].supersetId).toBeNull()
    expect(linkedToNext(list, 1)).toBe(true)
    expect(applyLinks(list, [false, false, false]).every((x) => x.supersetId === null)).toBe(true)
  })
})

describe('program generation', () => {
  it('only uses available equipment and matches days per week', () => {
    const r = generateProgram({ goal: 'strength', experience: 'beginner', daysPerWeek: 3, equipment: ['Bodyweight'] })
    expect(r).toHaveLength(3)
    expect(r.every((x) => x.exercises.length >= 3)).toBe(true)
    expect(r[0].exercises[0].repMax).toBeLessThanOrEqual(5)
  })
})

describe('backup import', () => {
  it('rejects non-Overload files and accepts backups from before the rename', () => {
    expect(() => parseBackup('nope')).toThrow(/valid JSON/)
    expect(() => parseBackup('{"app":"Other"}')).toThrow(/not an Overload backup/)
    expect(parseBackup(JSON.stringify({ app: 'IronLog', version: 1, data: {} })).counts.workouts).toBe(0)
  })

  it('keeps valid records and skips malformed ones', () => {
    const good = w('a', '2026-01-01T10:00:00Z', [[100, 5]])
    const text = JSON.stringify({
      app: 'IronLog',
      version: 1,
      data: { workouts: [good, { id: 'bad' }], routines: [], measurements: [{ id: 'm', date: '2026-01-01', weight: 80 }, { id: 'x', date: 'soon' }], settings: { units: 'lb', theme: 'weird' } },
    })
    const res = parseBackup(text)
    expect(res.counts.workouts).toBe(1)
    expect(res.counts.measurements).toBe(1)
    expect(res.skipped).toBe(2)
    expect(res.data.settings.units).toBe('lb')
    expect(res.data.settings.theme).toBe('system')
  })
})
