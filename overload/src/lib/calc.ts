import type { Effort, Workout, WorkoutSet } from '../types'

/** Epley estimate. A single rep is its own 1RM. */
export function e1rm(weight: number, reps: number): number {
  if (!weight || !reps) return 0
  if (reps === 1) return weight
  return weight * (1 + Math.min(reps, 20) / 30)
}

/** An aerobic set logs minutes rather than weight and reps. */
export function isAerobicSet(s: WorkoutSet): boolean {
  return s.minutes != null
}

export function isDone(s: WorkoutSet): boolean {
  return s.completed && (isAerobicSet(s) ? (s.minutes ?? 0) > 0 : (s.reps ?? 0) > 0)
}

/** Completed, non-warm-up strength sets count toward volume and records. Aerobic sets never do. */
export function isWorking(s: WorkoutSet): boolean {
  return isDone(s) && s.type !== 'warmup' && !isAerobicSet(s)
}

/** Completed aerobic minutes in a workout. */
export function aerobicMinutes(w: Pick<Workout, 'exercises'>): number {
  let m = 0
  for (const ex of w.exercises) for (const s of ex.sets) if (isDone(s) && isAerobicSet(s)) m += s.minutes ?? 0
  return m
}

const EFFORT_RANK: Record<Effort, number> = { easy: 0, moderate: 1, hard: 2 }

/**
 * How a session of one exercise felt overall: the most common rating among its
 * rated working sets, ties going to the harder one. Null when nothing is rated.
 */
export function sessionEffort(sets: WorkoutSet[]): Effort | null {
  const counts: Record<Effort, number> = { easy: 0, moderate: 0, hard: 0 }
  for (const s of sets) if (isWorking(s) && s.effort) counts[s.effort]++
  let best: Effort | null = null
  for (const e of ['easy', 'moderate', 'hard'] as Effort[]) if (counts[e] && (!best || counts[e] >= counts[best])) best = e
  return best
}

export type EffortAdvice = { kind: 'add'; weight: number } | { kind: 'hold'; weight: number }

/**
 * Next-time advice from last session, only when every working set carrying load was rated:
 * all easy means there is load to add, all hard means repeat the weight rather than add.
 */
export function effortAdvice(prev: WorkoutSet[], step: number): EffortAdvice | null {
  const work = prev.filter((s) => isWorking(s) && (s.weight ?? 0) > 0)
  if (!work.length || work.some((s) => !s.effort)) return null
  const top = Math.max(...work.map((s) => s.weight ?? 0))
  if (work.every((s) => s.effort === 'easy')) return { kind: 'add', weight: top + step }
  if (work.every((s) => s.effort === 'hard')) return { kind: 'hold', weight: top }
  return null
}

export function effortRank(e: Effort): number {
  return EFFORT_RANK[e]
}

export function setVolume(s: WorkoutSet): number {
  return (s.weight ?? 0) * (s.reps ?? 0)
}

export function workoutVolume(w: Pick<Workout, 'exercises'>): number {
  let v = 0
  for (const ex of w.exercises) for (const s of ex.sets) if (isWorking(s)) v += setVolume(s)
  return v
}

export function completedSetCount(w: Pick<Workout, 'exercises'>): number {
  let n = 0
  for (const ex of w.exercises) for (const s of ex.sets) if (isDone(s)) n++
  return n
}

export function durationMs(w: Pick<Workout, 'startedAt' | 'endedAt'>): number {
  return Math.max(0, new Date(w.endedAt).getTime() - new Date(w.startedAt).getTime())
}

export function byDateAsc(a: Workout, b: Workout) {
  return a.startedAt.localeCompare(b.startedAt)
}
export function byDateDesc(a: Workout, b: Workout) {
  return b.startedAt.localeCompare(a.startedAt)
}

export interface ExerciseSession {
  workoutId: string
  date: string
  sets: WorkoutSet[]
  effort: Effort | null
  bestSet: WorkoutSet | null
  topWeight: number
  e1rm: number
  volume: number
  maxReps: number
}

export function summariseSets(sets: WorkoutSet[]) {
  let bestSet: WorkoutSet | null = null
  let best = -1
  let topWeight = 0
  let volume = 0
  let maxReps = 0
  for (const s of sets) {
    if (!isWorking(s)) continue
    const w = s.weight ?? 0
    const r = s.reps ?? 0
    const est = w > 0 ? e1rm(w, r) : r / 1000 // bodyweight: rank by reps
    if (est > best) {
      best = est
      bestSet = s
    }
    topWeight = Math.max(topWeight, w)
    volume += w * r
    maxReps = Math.max(maxReps, r)
  }
  return {
    bestSet,
    topWeight,
    e1rm: bestSet && (bestSet.weight ?? 0) > 0 ? e1rm(bestSet.weight!, bestSet.reps!) : 0,
    volume,
    maxReps,
  }
}

/** Every logged session of one exercise, oldest first. */
export function exerciseHistory(workouts: Workout[], exerciseId: string): ExerciseSession[] {
  const out: ExerciseSession[] = []
  for (const w of [...workouts].sort(byDateAsc)) {
    const sets = w.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets)
    if (!sets.some(isWorking)) continue
    out.push({ workoutId: w.id, date: w.startedAt, sets: sets.filter(isDone), effort: sessionEffort(sets), ...summariseSets(sets) })
  }
  return out
}

/** Minutes logged for an aerobic exercise, one entry per session, oldest first. */
export function aerobicHistory(workouts: Workout[], exerciseId: string): { workoutId: string; date: string; minutes: number }[] {
  const out: { workoutId: string; date: string; minutes: number }[] = []
  for (const w of [...workouts].sort(byDateAsc)) {
    const minutes = w.exercises
      .filter((e) => e.exerciseId === exerciseId)
      .flatMap((e) => e.sets)
      .reduce((n, s) => n + (isDone(s) && isAerobicSet(s) ? (s.minutes ?? 0) : 0), 0)
    if (minutes > 0) out.push({ workoutId: w.id, date: w.startedAt, minutes })
  }
  return out
}

/** Sets from the most recent workout (before `before`) that included this exercise. */
export function previousSets(workouts: Workout[], exerciseId: string, before?: string): WorkoutSet[] {
  let latest: Workout | null = null
  for (const w of workouts) {
    if (before && w.startedAt >= before) continue
    if (!w.exercises.some((e) => e.exerciseId === exerciseId && e.sets.some(isDone))) continue
    if (!latest || w.startedAt > latest.startedAt) latest = w
  }
  if (!latest) return []
  return latest.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets.filter(isDone))
}

export type PrKind = 'weight' | 'e1rm' | 'volume' | 'reps'

export interface PrEvent {
  workoutId: string
  date: string
  exerciseId: string
  kind: PrKind
  value: number
  /** Supporting set for weight / e1rm records. */
  weight?: number
  reps?: number
}

interface Bests {
  weight: number
  e1rm: number
  volume: number
  reps: number
}

/**
 * Walks history chronologically and records each time an exercise beat its own best.
 * The first session of an exercise sets a baseline and is not counted as a record.
 */
export function computePrEvents(workouts: Workout[]): PrEvent[] {
  const bests = new Map<string, Bests>()
  const events: PrEvent[] = []
  for (const w of [...workouts].sort(byDateAsc)) {
    const ids = new Set(w.exercises.map((e) => e.exerciseId))
    for (const id of ids) {
      const sets = w.exercises.filter((e) => e.exerciseId === id).flatMap((e) => e.sets)
      const s = summariseSets(sets)
      if (!s.bestSet) continue
      const prev = bests.get(id)
      const cur: Bests = { weight: s.topWeight, e1rm: s.e1rm, volume: s.volume, reps: s.maxReps }
      if (!prev) {
        bests.set(id, cur)
        continue
      }
      const base = { workoutId: w.id, date: w.startedAt, exerciseId: id }
      if (cur.weight > prev.weight + 1e-6) {
        const top = sets.filter(isWorking).find((x) => (x.weight ?? 0) === s.topWeight)
        events.push({ ...base, kind: 'weight', value: cur.weight, weight: cur.weight, reps: top?.reps ?? undefined })
      }
      if (cur.e1rm > prev.e1rm + 1e-6 && cur.e1rm > 0) {
        events.push({ ...base, kind: 'e1rm', value: cur.e1rm, weight: s.bestSet.weight ?? 0, reps: s.bestSet.reps ?? 0 })
      }
      if (cur.volume > prev.volume + 1e-6 && cur.volume > 0) {
        events.push({ ...base, kind: 'volume', value: cur.volume })
      }
      if (cur.weight === 0 && prev.weight === 0 && cur.reps > prev.reps) {
        events.push({ ...base, kind: 'reps', value: cur.reps })
      }
      bests.set(id, {
        weight: Math.max(prev.weight, cur.weight),
        e1rm: Math.max(prev.e1rm, cur.e1rm),
        volume: Math.max(prev.volume, cur.volume),
        reps: Math.max(prev.reps, cur.reps),
      })
    }
  }
  return events
}

export interface ExerciseRecord {
  exerciseId: string
  sessions: number
  bestWeight: { value: number; reps: number; date: string } | null
  bestE1rm: { value: number; weight: number; reps: number; date: string } | null
  bestVolume: { value: number; date: string } | null
  bestReps: { value: number; date: string } | null
  lastDate: string
}

export function exerciseRecords(workouts: Workout[]): ExerciseRecord[] {
  const map = new Map<string, ExerciseRecord>()
  for (const w of [...workouts].sort(byDateAsc)) {
    const ids = new Set(w.exercises.map((e) => e.exerciseId))
    for (const id of ids) {
      const sets = w.exercises.filter((e) => e.exerciseId === id).flatMap((e) => e.sets)
      const s = summariseSets(sets)
      if (!s.bestSet) continue
      const r =
        map.get(id) ??
        ({ exerciseId: id, sessions: 0, bestWeight: null, bestE1rm: null, bestVolume: null, bestReps: null, lastDate: w.startedAt } as ExerciseRecord)
      r.sessions++
      r.lastDate = w.startedAt
      for (const set of sets.filter(isWorking)) {
        const wt = set.weight ?? 0
        const reps = set.reps ?? 0
        if (wt > 0 && (!r.bestWeight || wt > r.bestWeight.value || (wt === r.bestWeight.value && reps > r.bestWeight.reps)))
          r.bestWeight = { value: wt, reps, date: w.startedAt }
        const est = e1rm(wt, reps)
        if (est > 0 && (!r.bestE1rm || est > r.bestE1rm.value)) r.bestE1rm = { value: est, weight: wt, reps, date: w.startedAt }
        if (!r.bestReps || reps > r.bestReps.value) r.bestReps = { value: reps, date: w.startedAt }
      }
      if (s.volume > 0 && (!r.bestVolume || s.volume > r.bestVolume.value)) r.bestVolume = { value: s.volume, date: w.startedAt }
      map.set(id, r)
    }
  }
  return [...map.values()]
}

/** Records a given workout set compared with everything logged before it. */
export function prsForWorkout(workouts: Workout[], workout: Workout): PrEvent[] {
  const prior = workouts.filter((w) => w.id !== workout.id && w.startedAt < workout.startedAt)
  return computePrEvents([...prior, workout]).filter((e) => e.workoutId === workout.id)
}

export const PR_LABEL: Record<PrKind, string> = {
  weight: 'Heaviest weight',
  e1rm: 'Best est. 1RM',
  volume: 'Most volume',
  reps: 'Most reps',
}
