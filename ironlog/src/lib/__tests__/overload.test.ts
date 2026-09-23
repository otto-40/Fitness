import { beforeEach, describe, expect, it } from 'vitest'
import { aerobicMinutes, computePrEvents, effortAdvice, isDone, sessionEffort, workoutVolume } from '../calc'
import { nextWorkout, weeklyBuckets, weeklyPlan } from '../stats'
import { parseBackup } from '../backup'
import { migrateState, useStore } from '../../store/useStore'
import type { DataState } from '../../store/useStore'
import { samsWeeklyWorkout, starterRoutines } from '../../data/seed'
import { BUILT_IN_EXERCISES } from '../../data/exercises'
import type { Effort, Workout, WorkoutSet } from '../../types'

const set = (weight: number, reps: number, effort: Effort | null = null, extra: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: Math.random().toString(36).slice(2),
  type: 'normal',
  weight,
  reps,
  completed: true,
  effort,
  ...extra,
})
const walk = (minutes: number, completed = true): WorkoutSet => ({ id: 'w' + minutes, type: 'normal', weight: null, reps: null, minutes, completed })
const workout = (id: string, date: string, exercises: [string, WorkoutSet[]][]): Workout => ({
  id,
  name: id,
  startedAt: date,
  endedAt: date,
  exercises: exercises.map(([exerciseId, sets], i) => ({ id: `${id}-${i}`, exerciseId, restSec: 90, sets })),
})

describe('effort', () => {
  it('summarises a session by its most common rating, ties going harder, and ignores warm-ups', () => {
    expect(sessionEffort([set(100, 5, 'easy'), set(100, 5, 'hard')])).toBe('hard')
    expect(sessionEffort([set(100, 5, 'easy'), set(100, 5, 'easy'), set(100, 5, 'hard')])).toBe('easy')
    expect(sessionEffort([set(60, 8, 'hard', { type: 'warmup' }), set(100, 5, 'moderate')])).toBe('moderate')
    expect(sessionEffort([set(100, 5)])).toBeNull()
  })

  it('advises adding load only when every loaded set was easy, and holding when every set was hard', () => {
    expect(effortAdvice([set(100, 5, 'easy'), set(97.5, 6, 'easy')], 2.5)).toEqual({ kind: 'add', weight: 102.5 })
    expect(effortAdvice([set(100, 5, 'hard'), set(100, 4, 'hard')], 2.5)).toEqual({ kind: 'hold', weight: 100 })
    expect(effortAdvice([set(100, 5, 'easy'), set(100, 5, 'hard')], 2.5)).toBeNull()
    // A half-rated session says nothing rather than something misleading.
    expect(effortAdvice([set(100, 5, 'easy'), set(100, 5)], 2.5)).toBeNull()
  })
})

describe('aerobic minutes', () => {
  it('counts completed aerobic minutes and keeps them out of volume and records', () => {
    const a = workout('a', '2026-09-14T10:00:00', [['incline-walk', [walk(20), walk(10, false)]], ['bench-press', [set(100, 5)]]])
    const b = workout('b', '2026-09-16T10:00:00', [['incline-walk', [walk(45)]]])
    expect(aerobicMinutes(a)).toBe(20)
    expect(workoutVolume(a)).toBe(500)
    expect(isDone(walk(20))).toBe(true)
    expect(isDone(walk(0))).toBe(false)
    expect(computePrEvents([a, b]).some((e) => e.exerciseId === 'incline-walk')).toBe(false)
    const weeks = weeklyBuckets([a, b], 2, new Date('2026-09-20T12:00:00'))
    expect(weeks.at(-1)!.aerobic).toBe(65)
  })

  it('ships incline walk and basketball as aerobic built-ins with prescribed minutes', () => {
    const aero = BUILT_IN_EXERCISES.filter((e) => e.aerobic).map((e) => [e.id, e.defaultMinutes])
    expect(aero).toEqual([
      ['incline-walk', 20],
      ['basketball', 60],
    ])
  })
})

describe("Sam's Weekly Workout", () => {
  const sams = samsWeeklyWorkout('2026-01-01T00:00:00Z')

  it('has the five Longevity days with their rest times, rep targets and aerobic minutes', () => {
    expect(sams.map((r) => [r.weekday, r.name])).toEqual([
      [1, 'Monday — Lower + Push'],
      [3, 'Wednesday — Game Night'],
      [4, 'Thursday — Upper + Hinge'],
      [6, 'Saturday — Full Body + Cardio'],
      [0, 'Sunday — Optional Walk'],
    ])
    const mon = sams[0].exercises
    expect(mon[0]).toMatchObject({ exerciseId: 'leg-press', sets: 4, repMin: 6, repMax: 8, restSec: 180 })
    expect(mon.at(-1)).toMatchObject({ exerciseId: 'incline-walk', minutes: 20 })
    expect(sams[1].exercises[0]).toMatchObject({ exerciseId: 'basketball', minutes: 60 })
    expect(sams.every((r) => r.program === 'Sam’s Weekly Workout' && r.inPlan)).toBe(true)
    // Every exercise it uses exists in the library.
    const ids = new Set(BUILT_IN_EXERCISES.map((e) => e.id))
    expect(sams.flatMap((r) => r.exercises).every((e) => ids.has(e.exerciseId))).toBe(true)
  })

  it('is the default plan; Sunday is optional and not part of the weekly target', () => {
    expect(weeklyPlan(starterRoutines())).toEqual({ days: [1, 3, 4, 6, 0], target: 4 })
  })

  it('schedules by weekday: the next workout is the next planned day, skipping one already done today', () => {
    const wed = new Date('2026-09-23T08:00:00') // a Wednesday
    const profile = { name: '', experience: 'beginner', goal: 'general', daysPerWeek: 4, equipment: [], trainingDays: [1, 2, 4, 6] } as const
    expect(nextWorkout(sams, [], { ...profile, equipment: [], trainingDays: [1, 2, 4, 6] }, wed)?.routine.id).toBe('sam-wed')
    const done: Workout = { ...workout('x', '2026-09-23T07:00:00', []), routineId: 'sam-wed' }
    const next = nextWorkout(sams, [done], { ...profile, equipment: [], trainingDays: [1, 2, 4, 6] }, wed)
    expect(next?.routine.id).toBe('sam-thu')
  })
})

describe('upgrading existing data', () => {
  const old = (): DataState => ({
    onboarded: true,
    profile: { name: 'Sam', experience: 'intermediate', goal: 'strength', daysPerWeek: 4, equipment: [], trainingDays: [1, 3, 4, 6] },
    settings: { theme: 'system', units: 'kg', defaultRestSec: 90, timerSound: true },
    customExercises: [],
    favorites: [],
    routines: [{ id: 'mine', name: 'My plan', exercises: [], inPlan: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
    workouts: [workout('w1', '2026-09-01T10:00:00', [['bench-press', [set(80, 5)]]])],
    measurements: [],
    active: null,
  })

  it("adds Sam's Weekly Workout as the plan and keeps everything already logged", () => {
    const before = old()
    const up = migrateState(before, 1)
    expect(up.routines.filter((r) => r.inPlan).map((r) => r.id)).toEqual(['sam-mon', 'sam-wed', 'sam-thu', 'sam-sat', 'sam-sun'])
    expect(up.routines.find((r) => r.id === 'mine')?.inPlan).toBe(false)
    expect(up.workouts).toBe(before.workouts)
    expect(up.settings.aerobicTargetMin).toBe(150)
    expect(migrateState(up, 2)).toBe(up)
  })

  it('imports IronLog backups with the same upgrade, and round-trips effort and minutes', () => {
    const res = parseBackup(JSON.stringify({ app: 'IronLog', version: 1, data: old() }))
    expect(res.data.routines.some((r) => r.id === 'sam-mon' && r.inPlan)).toBe(true)
    const withNew = { ...old(), workouts: [workout('w2', '2026-09-02T10:00:00', [['bench-press', [set(80, 5, 'hard')]], ['incline-walk', [walk(30)]]])] }
    const back = parseBackup(JSON.stringify({ app: 'Overload', version: 2, data: withNew }))
    expect(back.data.workouts[0].exercises[0].sets[0].effort).toBe('hard')
    expect(back.data.workouts[0].exercises[1].sets[0].minutes).toBe(30)
    const sam = parseBackup(JSON.stringify({ app: 'Overload', version: 2, data: { ...old(), routines: samsWeeklyWorkout() } }))
    expect(sam.data.routines[0].exercises.at(-1)).toMatchObject({ minutes: 20 })
    expect(sam.data.routines[4]).toMatchObject({ weekday: 0, optional: true, program: 'Sam’s Weekly Workout' })
  })
})

describe('live workout', () => {
  beforeEach(() => {
    useStore.setState({ routines: starterRoutines(), workouts: [], customExercises: [], active: null })
  })

  it('starts aerobic work with its prescribed minutes filled in, and logs it with one tick and no rest', () => {
    useStore.getState().startWorkout('sam-sat')
    const walkEx = useStore.getState().active!.exercises.at(-1)!
    expect(walkEx.sets).toHaveLength(1)
    expect(walkEx.sets[0]).toMatchObject({ minutes: 45, completed: false, weight: null })
    useStore.getState().completeSet(walkEx.id, walkEx.sets[0].id)
    const a = useStore.getState().active!
    expect(a.exercises.at(-1)!.sets[0].completed).toBe(true)
    expect(a.rest).toBeNull()
    expect(aerobicMinutes(a)).toBe(45)
  })

  it('rating an unlogged set logs it; clearing the rating keeps it logged', () => {
    useStore.getState().startWorkout('sam-mon')
    const ex = useStore.getState().active!.exercises[0]
    useStore.getState().updateSet(ex.id, ex.sets[0].id, { weight: 100, reps: 8 })
    useStore.getState().rateSet(ex.id, ex.sets[0].id, 'moderate')
    let s = useStore.getState().active!.exercises[0].sets[0]
    expect(s).toMatchObject({ completed: true, effort: 'moderate' })
    expect(useStore.getState().active!.rest).toMatchObject({ exId: ex.id, setId: s.id })
    useStore.getState().rateSet(ex.id, s.id, null)
    s = useStore.getState().active!.exercises[0].sets[0]
    expect(s).toMatchObject({ completed: true, effort: null })
  })
})
