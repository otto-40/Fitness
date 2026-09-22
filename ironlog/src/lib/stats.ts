import { addDays, addWeeks, differenceInCalendarWeeks, format, isSameDay, parseISO, startOfDay } from 'date-fns'
import type { Exercise, Muscle, Profile, Routine, Workout } from '../types'
import { byDateDesc, isWorking, setVolume, workoutVolume } from './calc'
import { WEEK_OPTS, weekStart } from './dates'

export function workoutsInRange(workouts: Workout[], from: Date, to: Date): Workout[] {
  const a = from.getTime()
  const b = to.getTime()
  return workouts.filter((w) => {
    const t = new Date(w.startedAt).getTime()
    return t >= a && t < b
  })
}

export function weekVolume(workouts: Workout[], anyDayInWeek: Date): number {
  const start = weekStart(anyDayInWeek)
  return workoutsInRange(workouts, start, addWeeks(start, 1)).reduce((sum, w) => sum + workoutVolume(w), 0)
}

export interface WeekBucket {
  start: Date
  label: string
  workouts: number
  volume: number
}

export function weeklyBuckets(workouts: Workout[], weeks: number, now = new Date()): WeekBucket[] {
  const current = weekStart(now)
  const out: WeekBucket[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addWeeks(current, -i)
    const inWeek = workoutsInRange(workouts, start, addWeeks(start, 1))
    out.push({
      start,
      label: format(start, 'd MMM'),
      workouts: inWeek.length,
      volume: inWeek.reduce((s, w) => s + workoutVolume(w), 0),
    })
  }
  return out
}

/**
 * Consecutive weeks with at least one workout. The current week keeps the streak
 * alive while it is still in progress, so an untrained Monday doesn't read as zero.
 */
export function weekStreaks(workouts: Workout[], now = new Date()) {
  const trainedWeeks = new Set(workouts.map((w) => weekStart(parseISO(w.startedAt)).getTime()))
  const thisWeek = weekStart(now)
  let current = 0
  let cursor = trainedWeeks.has(thisWeek.getTime()) ? thisWeek : addWeeks(thisWeek, -1)
  while (trainedWeeks.has(cursor.getTime())) {
    current++
    cursor = addWeeks(cursor, -1)
  }
  const sorted = [...trainedWeeks].sort((a, b) => a - b)
  let longest = 0
  let run = 0
  let prev: number | null = null
  for (const t of sorted) {
    run = prev !== null && differenceInCalendarWeeks(new Date(t), new Date(prev), WEEK_OPTS) === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = t
  }
  return { current, longest }
}

export function trainedOn(workouts: Workout[], day: Date): Workout[] {
  return workouts.filter((w) => isSameDay(parseISO(w.startedAt), day))
}

export function muscleSplit(
  workouts: Workout[],
  exercises: Map<string, Exercise>,
  metric: 'volume' | 'sets',
): { muscle: Muscle; value: number }[] {
  const totals = new Map<Muscle, number>()
  for (const w of workouts)
    for (const ex of w.exercises) {
      const def = exercises.get(ex.exerciseId)
      if (!def) continue
      for (const s of ex.sets) {
        if (!isWorking(s)) continue
        totals.set(def.primary, (totals.get(def.primary) ?? 0) + (metric === 'sets' ? 1 : setVolume(s)))
      }
    }
  return [...totals.entries()]
    .map(([muscle, value]) => ({ muscle, value }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
}

export interface NextWorkout {
  routine: Routine
  date: Date
}

/** Next routine in the plan rotation, on the next planned training day. */
export function nextWorkout(routines: Routine[], workouts: Workout[], profile: Profile, now = new Date()): NextWorkout | null {
  const rotation = routines.filter((r) => r.inPlan && r.exercises.length > 0)
  if (!rotation.length) return null
  const last = [...workouts].sort(byDateDesc).find((w) => rotation.some((r) => r.id === w.routineId))
  const idx = last ? (rotation.findIndex((r) => r.id === last.routineId) + 1) % rotation.length : 0
  const days = profile.trainingDays.length ? profile.trainingDays : [1, 3, 5]
  const today = startOfDay(now)
  const trainedToday = workouts.some((w) => isSameDay(parseISO(w.startedAt), today))
  let date = today
  for (let i = trainedToday ? 1 : 0; i < 8; i++) {
    const d = addDays(today, i)
    if (days.includes(d.getDay())) {
      date = d
      break
    }
  }
  return { routine: rotation[idx], date }
}

export function routineMuscles(routine: Routine, exercises: Map<string, Exercise>): Muscle[] {
  const set = new Set<Muscle>()
  for (const re of routine.exercises) {
    const ex = exercises.get(re.exerciseId)
    if (ex) set.add(ex.primary)
  }
  return [...set]
}

/** Rough duration: ~45s per set of work plus prescribed rest, plus setup. */
export function routineMinutes(routine: Routine): number {
  let sec = 0
  routine.exercises.forEach((re, i) => {
    const next = routine.exercises[i + 1]
    const inSupersetWithNext = re.supersetId && next?.supersetId === re.supersetId
    sec += re.sets * (45 + (inSupersetWithNext ? 10 : re.restSec)) + 60
  })
  return Math.max(5, Math.round(sec / 60 / 5) * 5)
}
