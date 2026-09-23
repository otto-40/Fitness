import { EQUIPMENT, MUSCLES } from '../types'
import type { Effort, Exercise, Measurement, Profile, Routine, Settings, Workout, WorkoutExercise, WorkoutSet } from '../types'
import type { DataState } from '../store/useStore'
import { DEFAULT_SETTINGS, migrateState } from '../store/useStore'
import { DEMO_PROFILE } from '../data/seed'

export const BACKUP_APP = 'Overload'
/** Backups made before the app was renamed. */
const LEGACY_APPS = ['IronLog']
/** v2 adds effort, aerobic minutes, routine notes, weekdays and programs. v1 files still import. */
export const BACKUP_VERSION = 2

export function buildBackup(state: DataState) {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: state,
  }
}

export function downloadJson(filename: string, obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---- validation -------------------------------------------------------------

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, max = 500): string | null => (typeof v === 'string' && v.length <= max ? v : null)
const num = (v: unknown, min = -Infinity, max = Infinity): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null
const optNum = (v: unknown, min: number, max: number): number | null => (v == null ? null : num(v, min, max))
const isDate = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v))

function arr<T>(v: unknown, fn: (x: unknown) => T | null): T[] {
  if (!Array.isArray(v)) return []
  return v.map(fn).filter((x): x is T => x !== null)
}

function exercise(v: unknown): Exercise | null {
  if (!isObj(v)) return null
  const id = str(v.id, 100)
  const name = str(v.name, 80)?.trim()
  const primary = MUSCLES.find((m) => m === v.primary)
  const equipment = EQUIPMENT.find((e) => e === v.equipment)
  if (!id || !name || !primary || !equipment) return null
  return {
    id,
    name,
    primary,
    equipment,
    secondary: arr(v.secondary, (m) => MUSCLES.find((x) => x === m) ?? null),
    cue: str(v.cue, 300) ?? '',
    custom: true,
    archived: v.archived === true || undefined,
    aerobic: v.aerobic === true || undefined,
    defaultMinutes: num(v.defaultMinutes, 1, 600) ?? undefined,
  }
}

function routine(v: unknown): Routine | null {
  if (!isObj(v)) return null
  const id = str(v.id, 100)
  const name = str(v.name, 80)
  if (!id || !name) return null
  const exercises = arr(v.exercises, (e) => {
    if (!isObj(e)) return null
    const exerciseId = str(e.exerciseId, 100)
    const minutes = num(e.minutes, 1, 600) ?? undefined
    const sets = num(e.sets, 1, 20)
    // Aerobic rows carry minutes and no rep target.
    const repMin = num(e.repMin, minutes ? 0 : 1, 500)
    const repMax = num(e.repMax, minutes ? 0 : 1, 500)
    const restSec = num(e.restSec, 0, 1800)
    if (!exerciseId || sets == null || repMin == null || repMax == null || restSec == null) return null
    return {
      id: str(e.id, 100) ?? `${id}-${exerciseId}`,
      exerciseId,
      sets,
      repMin,
      repMax: Math.max(repMin, repMax),
      restSec,
      supersetId: str(e.supersetId, 100),
      minutes,
      note: str(e.note, 300) ?? undefined,
    }
  })
  const now = new Date().toISOString()
  return {
    id,
    name,
    notes: str(v.notes, 1000) ?? undefined,
    exercises,
    inPlan: v.inPlan === true,
    generated: v.generated === true || undefined,
    program: str(v.program, 80) ?? undefined,
    weekday: num(v.weekday, 0, 6) ?? undefined,
    optional: v.optional === true || undefined,
    createdAt: isDate(v.createdAt) ? v.createdAt : now,
    updatedAt: isDate(v.updatedAt) ? v.updatedAt : now,
  }
}

function workoutSet(v: unknown): WorkoutSet | null {
  if (!isObj(v)) return null
  const type = (['normal', 'warmup', 'failure', 'drop'] as const).find((t) => t === v.type) ?? 'normal'
  return {
    id: str(v.id, 100) ?? Math.random().toString(36).slice(2),
    type,
    weight: optNum(v.weight, 0, 2000),
    reps: optNum(v.reps, 0, 1000),
    completed: v.completed === true,
    effort: (['easy', 'moderate', 'hard'] as Effort[]).find((e) => e === v.effort) ?? null,
    minutes: optNum(v.minutes, 0, 600),
  }
}

function workoutExercise(v: unknown): WorkoutExercise | null {
  if (!isObj(v)) return null
  const exerciseId = str(v.exerciseId, 100)
  if (!exerciseId) return null
  return {
    id: str(v.id, 100) ?? Math.random().toString(36).slice(2),
    exerciseId,
    restSec: num(v.restSec, 0, 1800) ?? 90,
    repMin: num(v.repMin, 1, 500) ?? undefined,
    repMax: num(v.repMax, 1, 500) ?? undefined,
    supersetId: str(v.supersetId, 100),
    note: str(v.note, 300) ?? undefined,
    sets: arr(v.sets, workoutSet),
  }
}

function workout(v: unknown): Workout | null {
  if (!isObj(v)) return null
  const id = str(v.id, 100)
  const name = str(v.name, 80) ?? 'Workout'
  if (!id || !isDate(v.startedAt) || !isDate(v.endedAt)) return null
  return {
    id,
    name,
    routineId: str(v.routineId, 100),
    startedAt: v.startedAt,
    endedAt: v.endedAt,
    notes: str(v.notes, 2000) ?? undefined,
    exercises: arr(v.exercises, workoutExercise),
  }
}

function measurement(v: unknown): Measurement | null {
  if (!isObj(v)) return null
  const id = str(v.id, 100)
  if (!id || typeof v.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return null
  return {
    id,
    date: v.date,
    weight: optNum(v.weight, 20, 400),
    bodyFat: optNum(v.bodyFat, 1, 70),
    waist: optNum(v.waist, 20, 300),
    chest: optNum(v.chest, 20, 300),
    arms: optNum(v.arms, 10, 100),
    thighs: optNum(v.thighs, 10, 150),
    hips: optNum(v.hips, 20, 300),
    note: str(v.note, 500) ?? undefined,
  }
}

function profile(v: unknown): Profile {
  if (!isObj(v)) return { ...DEMO_PROFILE }
  return {
    name: str(v.name, 40) ?? '',
    experience: (['beginner', 'intermediate', 'advanced'] as const).find((x) => x === v.experience) ?? 'beginner',
    goal: (['strength', 'muscle', 'general'] as const).find((x) => x === v.goal) ?? 'general',
    daysPerWeek: num(v.daysPerWeek, 1, 7) ?? 3,
    equipment: arr(v.equipment, (e) => EQUIPMENT.find((x) => x === e) ?? null),
    trainingDays: arr(v.trainingDays, (d) => num(d, 0, 6)),
  }
}

function settings(v: unknown): Settings {
  if (!isObj(v)) return { ...DEFAULT_SETTINGS }
  return {
    theme: (['light', 'dark', 'system'] as const).find((x) => x === v.theme) ?? 'system',
    units: v.units === 'lb' ? 'lb' : 'kg',
    defaultRestSec: num(v.defaultRestSec, 0, 1800) ?? 90,
    timerSound: v.timerSound !== false,
    aerobicTargetMin: num(v.aerobicTargetMin, 30, 600) ?? 150,
    setupSeen: true,
  }
}

export interface ImportResult {
  data: DataState
  counts: { workouts: number; routines: number; measurements: number; exercises: number }
  skipped: number
}

/** Parses and sanitises an exported backup. Throws with a readable message when unusable. */
export function parseBackup(text: string): ImportResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (!isObj(raw) || !(raw.app === BACKUP_APP || LEGACY_APPS.includes(raw.app as string)) || !isObj(raw.data)) throw new Error('That file is not an Overload backup.')
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION)
    throw new Error('This backup was made by a newer version of Overload.')
  const d = raw.data
  const lens = ['workouts', 'routines', 'measurements', 'customExercises'].map((k) => (Array.isArray(d[k]) ? (d[k] as unknown[]).length : 0))
  const data: DataState = {
    onboarded: true,
    profile: profile(d.profile),
    settings: settings(d.settings),
    customExercises: arr(d.customExercises, exercise),
    favorites: arr(d.favorites, (f) => str(f, 100)),
    routines: arr(d.routines, routine),
    workouts: arr(d.workouts, workout),
    measurements: arr(d.measurements, measurement),
    active: null,
  }
  if (isObj(d.active)) {
    const w = workout({ ...d.active, endedAt: new Date().toISOString() })
    if (w) {
      const { endedAt: _e, ...rest } = w
      void _e
      data.active = { ...rest, rest: null }
    }
  }
  const kept = [data.workouts.length, data.routines.length, data.measurements.length, data.customExercises.length]
  return {
    // Backups from before Overload get the same upgrade as stored data (Sam's Weekly Workout, aerobic target).
    data: migrateState(data, raw.version),
    counts: { workouts: kept[0], routines: kept[1], measurements: kept[2], exercises: kept[3] },
    skipped: lens.reduce((s, n, i) => s + (n - kept[i]), 0),
  }
}
