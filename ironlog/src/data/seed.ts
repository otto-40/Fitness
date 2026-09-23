import { addDays, addMinutes, format, setHours, setMinutes, startOfDay } from 'date-fns'
import type { Effort, Measurement, Profile, Routine, RoutineExercise, SetType, Units, Workout, WorkoutExercise, WorkoutSet } from '../types'
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

export const SAMS_PROGRAM = 'Sam’s Weekly Workout'

/** [exerciseId, sets, repMin, repMax, restSec, why] — or [exerciseId, minutes, why] for aerobic work. */
type SamRx = [id: string, sets: number, repMin: number, repMax: number, restSec: number, note: string] | [id: string, minutes: number, note: string]

function samDay(id: string, weekday: number, name: string, notes: string, rx: SamRx[], createdAt: string, optional = false): Routine {
  return {
    id,
    name,
    notes,
    program: SAMS_PROGRAM,
    weekday,
    optional: optional || undefined,
    inPlan: true,
    createdAt,
    updatedAt: createdAt,
    exercises: rx.map((r, i): RoutineExercise =>
      r.length === 3
        ? { id: `${id}-${i}`, exerciseId: r[0], sets: 1, repMin: 0, repMax: 0, restSec: 0, minutes: r[1], note: r[2], supersetId: null }
        : { id: `${id}-${i}`, exerciseId: r[0], sets: r[1], repMin: r[2], repMax: r[3], restSec: r[4], note: r[5], supersetId: null },
    ),
  }
}

/** Sam's program from the Longevity app: four required days plus an optional Sunday walk. */
export function samsWeeklyWorkout(createdAt = new Date().toISOString()): Routine[] {
  return [
    samDay('sam-mon', 1, 'Monday — Lower + Push', 'Lower body and pressing, with ankle, groin and trunk armour for basketball.', [
      ['leg-press', 4, 6, 8, 180, 'Leg strength = longevity anchor. Goblet squat works too.'],
      ['bulgarian-split-squat', 3, 8, 8, 120, 'Single-leg control for cuts and landings. Reps per leg.'],
      ['db-bench-press', 4, 6, 8, 180, 'Neutral grip: press strength with low wrist torque.'],
      ['calf-tibialis-raise', 3, 15, 15, 60, 'Ankle armour — the #1 hoops injury. 15 of each.'],
      ['copenhagen-plank', 3, 20, 20, 60, 'About a 40% cut in groin injuries in trials. 20 s per side.'],
      ['pallof-side-plank', 2, 10, 10, 60, 'Anti-rotation trunk for contact and cuts. 2 rounds.'],
      ['incline-walk', 20, 'Zone 2 finisher.'],
    ], createdAt),
    samDay('sam-wed', 3, 'Wednesday — Game Night', 'Basketball. Counts as vigorous aerobic work.', [
      ['basketball', 60, 'Covers plyometrics and high-intensity intervals.'],
    ], createdAt),
    samDay('sam-thu', 4, 'Thursday — Upper + Hinge', 'Posterior chain and pulling, elbow-friendly throughout.', [
      ['trap-bar-deadlift', 4, 5, 6, 180, 'Posterior chain; straps spare the elbow. RDL works too.'],
      ['chest-supported-row', 3, 8, 10, 120, 'Neutral grip: strict pulling, no momentum on the tendon.'],
      ['lat-pulldown', 3, 10, 10, 120, 'Neutral grip: the vertical pull without the pull-up hang.'],
      ['seated-db-press', 3, 6, 8, 120, 'Neutral grip: shoulder strength for rebounds and contests.'],
      ['nordic-curl', 3, 5, 5, 120, 'Or slider leg curl. About a 50% cut in hamstring injuries in meta-analyses.'],
      ['db-calf-raise', 3, 12, 12, 60, 'Achilles capacity and side-to-side balance. Reps per leg.'],
      ['incline-walk', 20, 'Zone 2 finisher.'],
    ], createdAt),
    samDay('sam-sat', 6, 'Saturday — Full Body + Cardio', 'Glutes, incline pressing and rows, then a long zone 2 walk.', [
      ['hip-thrust', 3, 8, 8, 150, 'Glute drive for jumping and sprinting, spares the knees. 45° back extension works too.'],
      ['incline-db-press', 3, 8, 10, 150, 'The incline angle the flat press misses.'],
      ['seated-cable-row', 3, 10, 10, 120, 'Pulling volume, elbow-friendly.'],
      ['incline-walk', 45, 'Zone 2.'],
    ], createdAt),
    samDay('sam-sun', 0, 'Sunday — Optional Walk', 'A bonus session: it counts when you do it, but the week doesn’t need it.', [
      ['incline-walk', 30, 'Tops up the weekly aerobic dose toward 150 min.'],
    ], createdAt, true),
  ]
}

export function starterRoutines(createdAt = new Date().toISOString()): Routine[] {
  return [
    ...samsWeeklyWorkout(createdAt),
    routine('starter-push', 'Push', 'Chest, shoulders and triceps. Leave one rep in the tank on the main lift.', false, [
      ['bench-press', 4, 5, 8, 150],
      ['overhead-press', 3, 6, 10, 120],
      ['incline-db-press', 3, 8, 12, 90],
      ['lateral-raise', 3, 12, 15, 60, 'ss1'],
      ['triceps-pushdown', 3, 10, 15, 60, 'ss1'],
    ], createdAt),
    routine('starter-pull', 'Pull', 'Back and biceps. Hinge first while you are fresh.', false, [
      ['deadlift', 3, 3, 5, 180],
      ['pull-up', 3, 6, 10, 120],
      ['barbell-row', 3, 8, 10, 120],
      ['face-pull', 3, 12, 15, 60],
      ['ez-bar-curl', 3, 8, 12, 60, 'ss1'],
      ['hammer-curl', 3, 10, 12, 60, 'ss1'],
    ], createdAt),
    routine('starter-legs', 'Legs', 'Quads, hamstrings, glutes and calves. Brace before every rep.', false, [
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

function set(type: SetType, weight: number | null, reps: number, effort: Effort | null = null): WorkoutSet {
  return { id: uid('s'), type, weight, reps, completed: true, effort }
}

function aerobicSet(minutes: number): WorkoutSet {
  return { id: uid('s'), type: 'normal', weight: null, reps: null, minutes, completed: true }
}

/** The demo lifter trains push / pull / legs, with game nights and zone 2 walks for aerobic work. */
function buildHistory(routines: Routine[], now: Date, rand: () => number): Workout[] {
  const ppl = ['starter-push', 'starter-pull', 'starter-legs'].map((id) => routines.find((r) => r.id === id)!)
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
        // Most sessions are rated; the odd one is not, as in real use.
        const rated = rand() > 0.15
        const effortFor = (isLast: boolean): Effort | null => {
          if (!rated) return null
          if (deload) return 'easy'
          const r = rand()
          return isLast ? (r < 0.55 ? 'hard' : 'moderate') : r < 0.2 ? 'easy' : r < 0.85 ? 'moderate' : 'hard'
        }
        if (MAIN_LIFTS.has(re.exerciseId)) {
          sets.push(set('warmup', Math.round((load * 0.5) / 2.5) * 2.5, 8, rated ? 'easy' : null))
          sets.push(set('warmup', Math.round((load * 0.75) / 2.5) * 2.5, 4, rated ? 'easy' : null))
        }
        for (let i = 0; i < re.sets; i++) {
          const fatigue = i * (rand() < 0.5 ? 1 : 0)
          let reps = re.repMax - fatigue - Math.floor(rand() * 2)
          if (base === 0) reps = re.repMin + Math.min(re.repMax - re.repMin, Math.floor(w / 3)) + Math.floor(rand() * 2) - i
          reps = Math.max(re.repMin - 1, reps)
          const isLast = i === re.sets - 1
          const type: SetType = isLast && re.exerciseId === 'triceps-pushdown' && rand() < 0.4 ? 'failure' : 'normal'
          sets.push(set(type, base === 0 ? 0 : load, Math.max(1, reps), effortFor(isLast)))
          if (isLast && re.exerciseId === 'lateral-raise' && rand() < 0.5) sets.push(set('drop', Math.max(2, load - 4), 10, rated ? 'hard' : null))
        }
        elapsed += sets.length * 2.2 + 1
        return { id: uid('we'), exerciseId: re.exerciseId, restSec: re.restSec, repMin: re.repMin, repMax: re.repMax, supersetId: re.supersetId, sets }
      })
      // About half the sessions end with a zone 2 walk.
      if (!deload && rand() < 0.5) {
        const walk = 15 + 5 * Math.floor(rand() * 2)
        exercises.push({ id: uid('we'), exerciseId: 'incline-walk', restSec: 0, supersetId: null, sets: [aerobicSet(walk)] })
        elapsed += walk
      }
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
    // Wednesday game night and an occasional Sunday walk.
    for (const [off, id, name, minutes, chance] of [
      [2, 'basketball', 'Game night', 50 + 5 * Math.floor(rand() * 5), 0.8],
      [6, 'incline-walk', 'Sunday walk', 30, 0.4],
    ] as const) {
      const day = addDays(firstWeek, w * 7 + off)
      if (day >= startOfDay(now) || rand() > chance) continue
      const start = setMinutes(setHours(day, off === 2 ? 19 : 10), Math.floor(rand() * 30))
      workouts.push({
        id: uid('demo-w'),
        name,
        routineId: null,
        startedAt: start.toISOString(),
        endedAt: addMinutes(start, minutes + 5).toISOString(),
        exercises: [{ id: uid('we'), exerciseId: id, restSec: 0, supersetId: null, sets: [aerobicSet(minutes)] }],
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
