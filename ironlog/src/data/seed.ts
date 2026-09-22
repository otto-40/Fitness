import { addDays, addMinutes, format, setHours, setMinutes, startOfDay } from 'date-fns'
import type { Measurement, Profile, Routine, RoutineExercise, SetType, Units, Workout, WorkoutExercise, WorkoutSet } from '../types'
import { KG_PER_LB } from '../lib/units'
import { mulberry32, uid } from '../lib/id'
import { weekStart } from '../lib/dates'

type Rx = [exerciseId: string, sets: number, repMin: number, repMax: number, restSec: number, superset?: string]

function routine(id: string, name: string, notes: string, inPlan: boolean, rx: Rx[], createdAt: string): Routine {
  return {
    id,
    name,
    notes,
    inPlan,
    createdAt,
    updatedAt: createdAt,
    exercises: rx.map(
      ([exerciseId, sets, repMin, repMax, restSec, superset], i): RoutineExercise => ({
        id: `${id}-${i}`,
        exerciseId,
        sets,
        repMin,
        repMax,
        restSec,
        supersetId: superset ? `${id}-${superset}` : null,
      }),
    ),
  }
}

export function starterRoutines(createdAt = new Date().toISOString()): Routine[] {
  return [
    routine('starter-push', 'Push', 'Chest, shoulders and triceps. Leave one rep in the tank on the main lift.', true, [
      ['bench-press', 4, 5, 8, 150],
      ['overhead-press', 3, 6, 10, 120],
      ['incline-db-press', 3, 8, 12, 90],
      ['lateral-raise', 3, 12, 15, 60, 'ss1'],
      ['triceps-pushdown', 3, 10, 15, 60, 'ss1'],
    ], createdAt),
    routine('starter-pull', 'Pull', 'Back and biceps. Hinge first while you are fresh.', true, [
      ['deadlift', 3, 3, 5, 180],
      ['pull-up', 3, 6, 10, 120],
      ['barbell-row', 3, 8, 10, 120],
      ['face-pull', 3, 12, 15, 60],
      ['ez-bar-curl', 3, 8, 12, 60, 'ss1'],
      ['hammer-curl', 3, 10, 12, 60, 'ss1'],
    ], createdAt),
    routine('starter-legs', 'Legs', 'Quads, hamstrings, glutes and calves. Brace before every rep.', true, [
      ['back-squat', 4, 5, 8, 180],
      ['romanian-deadlift', 3, 8, 10, 120],
      ['leg-press', 3, 10, 12, 90],
      ['lying-leg-curl', 3, 10, 15, 60, 'ss1'],
      ['standing-calf-raise', 3, 10, 15, 60, 'ss1'],
      ['hanging-leg-raise', 3, 10, 15, 60],
    ], createdAt),
    routine('starter-fb-a', 'Full Body Beginner A', 'A simple dumbbell-friendly session. Add a little weight when you hit the top of the rep range on every set.', false, [
      ['goblet-squat', 3, 8, 12, 90],
      ['db-bench-press', 3, 8, 12, 90],
      ['one-arm-db-row', 3, 8, 12, 90],
      ['db-romanian-deadlift', 3, 10, 12, 90],
      ['plank', 3, 30, 45, 60],
    ], createdAt),
    routine('starter-fb-b', 'Full Body Beginner B', 'Alternate with A, two or three times a week.', false, [
      ['leg-press', 3, 10, 12, 90],
      ['lat-pulldown', 3, 8, 12, 90],
      ['seated-db-press', 3, 8, 12, 90],
      ['hip-thrust', 3, 8, 12, 90],
      ['dead-bug', 3, 8, 12, 60],
    ], createdAt),
  ]
}

/** Starting load (kg), weekly gain (kg), rounding increment. Zero load = bodyweight. */
const LOADS: Record<string, [start: number, perWeek: number, step: number]> = {
  'bench-press': [70, 1.25, 2.5],
  'overhead-press': [42.5, 0.6, 2.5],
  'incline-db-press': [24, 0.5, 2],
  'lateral-raise': [9, 0.2, 1],
  'triceps-pushdown': [25, 0.6, 2.5],
  deadlift: [125, 2.5, 2.5],
  'pull-up': [0, 0, 1],
  'barbell-row': [65, 1.25, 2.5],
  'face-pull': [20, 0.4, 2.5],
  'ez-bar-curl': [27.5, 0.5, 2.5],
  'hammer-curl': [14, 0.3, 2],
  'back-squat': [95, 2, 2.5],
  'romanian-deadlift': [85, 1.5, 2.5],
  'leg-press': [160, 3, 5],
  'lying-leg-curl': [40, 0.8, 2.5],
  'standing-calf-raise': [70, 1.5, 5],
  'hanging-leg-raise': [0, 0, 1],
}

const MAIN_LIFTS = new Set(['bench-press', 'deadlift', 'back-squat'])

function set(type: SetType, weight: number | null, reps: number): WorkoutSet {
  return { id: uid('s'), type, weight, reps, completed: true }
}

function buildHistory(routines: Routine[], now: Date, rand: () => number): Workout[] {
  const ppl = routines.filter((r) => r.inPlan)
  const workouts: Workout[] = []
  const weeks = 11
  const firstWeek = addDays(weekStart(now), -7 * (weeks - 1))
  const dayOffsets = [0, 1, 3, 5] // Mon, Tue, Thu, Sat
  let rotation = 0
  for (let w = 0; w < weeks; w++) {
    const deload = w === 5
    for (const off of dayOffsets) {
      const day = addDays(firstWeek, w * 7 + off)
      if (day >= startOfDay(now)) continue
      if (deload && (off === 1 || off === 5)) continue
      if (!deload && rand() < 0.08) continue // the odd missed session
      const r = ppl[rotation % ppl.length]
      rotation++
      const morning = rand() < 0.6
      const start = setMinutes(setHours(day, morning ? 7 : 18), Math.floor(rand() * 40))
      let elapsed = 6
      const exercises: WorkoutExercise[] = r.exercises.map((re) => {
        const [base, gain, step] = LOADS[re.exerciseId] ?? [20, 0.3, 2.5]
        const progress = w - (w > 5 ? 1 : 0)
        const raw = base + gain * progress * (0.85 + rand() * 0.3)
        const load = base === 0 ? 0 : Math.round((deload ? raw * 0.85 : raw) / step) * step
        const sets: WorkoutSet[] = []
        if (MAIN_LIFTS.has(re.exerciseId)) {
          sets.push(set('warmup', Math.round((load * 0.5) / 2.5) * 2.5, 8))
          sets.push(set('warmup', Math.round((load * 0.75) / 2.5) * 2.5, 4))
        }
        for (let i = 0; i < re.sets; i++) {
          const fatigue = i * (rand() < 0.5 ? 1 : 0)
          let reps = re.repMax - fatigue - Math.floor(rand() * 2)
          if (base === 0) reps = re.repMin + Math.min(re.repMax - re.repMin, Math.floor(w / 3)) + Math.floor(rand() * 2) - i
          reps = Math.max(re.repMin - 1, reps)
          const isLast = i === re.sets - 1
          const type: SetType = isLast && re.exerciseId === 'triceps-pushdown' && rand() < 0.4 ? 'failure' : 'normal'
          sets.push(set(type, base === 0 ? 0 : load, Math.max(1, reps)))
          if (isLast && re.exerciseId === 'lateral-raise' && rand() < 0.5) sets.push(set('drop', Math.max(2, load - 4), 10))
        }
        elapsed += sets.length * 2.2 + 1
        return { id: uid('we'), exerciseId: re.exerciseId, restSec: re.restSec, repMin: re.repMin, repMax: re.repMax, supersetId: re.supersetId, sets }
      })
      workouts.push({
        id: uid('demo-w'),
        name: r.name,
        routineId: r.id,
        startedAt: start.toISOString(),
        endedAt: addMinutes(start, Math.round(elapsed + rand() * 8)).toISOString(),
        notes: rand() < 0.15 ? 'Felt strong today.' : undefined,
        exercises,
      })
    }
  }
  return workouts
}

function buildMeasurements(now: Date, rand: () => number): Measurement[] {
  const out: Measurement[] = []
  const days = 120
  for (let d = days; d >= 1; d -= 3 + Math.floor(rand() * 2)) {
    const t = (days - d) / days
    const date = format(addDays(startOfDay(now), -d), 'yyyy-MM-dd')
    const weight = Math.round((84.6 - 2.9 * t + (rand() - 0.5) * 0.8) * 10) / 10
    const m: Measurement = { id: uid('demo-m'), date, weight }
    if (d % 14 < 4) {
      m.waist = Math.round((88 - 3.2 * t + (rand() - 0.5)) * 10) / 10
      m.chest = Math.round((104 + 1.1 * t) * 10) / 10
      m.arms = Math.round((37 + 0.8 * t) * 10) / 10
      m.bodyFat = Math.round((19.5 - 2.4 * t) * 10) / 10
    }
    out.push(m)
  }
  return out
}

export interface SeedData {
  profile: Profile
  routines: Routine[]
  workouts: Workout[]
  measurements: Measurement[]
  favorites: string[]
}

export const DEMO_PROFILE: Profile = {
  name: 'Alex',
  experience: 'intermediate',
  goal: 'muscle',
  daysPerWeek: 4,
  equipment: ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'EZ Bar', 'Kettlebell', 'Band', 'Smith Machine'],
  trainingDays: [1, 2, 4, 6],
}

export function generateSeed(now = new Date()): SeedData {
  const rand = mulberry32(20260922)
  const routines = starterRoutines(addDays(now, -80).toISOString())
  return {
    profile: { ...DEMO_PROFILE },
    routines,
    workouts: buildHistory(routines, now, rand),
    measurements: buildMeasurements(now, rand),
    favorites: ['bench-press', 'back-squat', 'deadlift', 'overhead-press', 'pull-up'],
  }
}

/**
 * Snaps sample-data loads to real plate jumps in the chosen unit, so switching to
 * pounds shows 175 lb rather than 176.4 lb. Only touches demo workouts.
 */
export function snapDemoToUnits(workouts: Workout[], units: Units): Workout[] {
  const snap = (kg: number) => {
    if (units === 'kg') return Math.round(kg / (kg >= 20 ? 2.5 : 1)) * (kg >= 20 ? 2.5 : 1)
    const lb = kg / KG_PER_LB
    const step = lb >= 60 ? 5 : 2.5
    return Math.round(lb / step) * step * KG_PER_LB
  }
  return workouts.map((w) =>
    w.id.startsWith('demo-')
      ? { ...w, exercises: w.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => (s.weight ? { ...s, weight: snap(s.weight) } : s)) })) }
      : w,
  )
}
