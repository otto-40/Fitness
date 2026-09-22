import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ActiveWorkout,
  Exercise,
  Measurement,
  Profile,
  Routine,
  SetType,
  Settings,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '../types'
import { DEMO_PROFILE, generateSeed, snapDemoToUnits, starterRoutines } from '../data/seed'
import { BUILT_IN_EXERCISES } from '../data/exercises'
import { uid } from '../lib/id'
import { isDone, previousSets } from '../lib/calc'
import { generateProgram } from '../lib/programGen'

export const STORAGE_KEY = 'ironlog-v1'
export const DEMO_PREFIX = 'demo-'

export interface DataState {
  onboarded: boolean
  profile: Profile
  settings: Settings
  customExercises: Exercise[]
  favorites: string[]
  routines: Routine[]
  workouts: Workout[]
  measurements: Measurement[]
  active: ActiveWorkout | null
}

type SetPatch = Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'type' | 'completed'>>

interface Actions {
  completeOnboarding: (profile: Profile, settings: Partial<Settings>, keepDemo: boolean) => void
  skipOnboarding: () => void
  restartOnboarding: () => void
  updateSettings: (patch: Partial<Settings>) => void
  updateProfile: (patch: Partial<Profile>) => void

  toggleFavorite: (exerciseId: string) => void
  saveExercise: (ex: Exercise) => void
  deleteExercise: (id: string) => void

  saveRoutine: (r: Routine) => void
  deleteRoutine: (id: string) => void
  duplicateRoutine: (id: string) => string | null
  moveRoutine: (id: string, dir: -1 | 1) => void
  toggleInPlan: (id: string) => void

  startWorkout: (routineId: string | null) => void
  renameActive: (name: string) => void
  updateSet: (exId: string, setId: string, patch: SetPatch) => void
  completeSet: (exId: string, setId: string) => { ok: boolean; message?: string }
  addSet: (exId: string, type?: SetType) => void
  removeSet: (exId: string, setId: string) => void
  addExercisesToActive: (exerciseIds: string[]) => void
  removeActiveExercise: (exId: string) => void
  moveActiveExercise: (exId: string, dir: -1 | 1) => void
  setActiveRest: (exId: string, restSec: number) => void
  setActiveNotes: (notes: string) => void
  adjustRest: (deltaSec: number) => void
  skipRest: () => void
  finishWorkout: () => string | null
  discardWorkout: () => void

  saveWorkout: (w: Workout) => void
  deleteWorkout: (id: string) => void

  saveMeasurement: (m: Measurement) => void
  deleteMeasurement: (id: string) => void

  resetDemoData: () => void
  removeSampleData: () => void
  clearAllData: () => void
  importData: (data: DataState) => void
}

export const DEFAULT_SETTINGS: Settings = { theme: 'system', units: 'kg', defaultRestSec: 90, timerSound: true }

function seededState(): DataState {
  const seed = generateSeed()
  return {
    onboarded: false,
    profile: seed.profile,
    settings: { ...DEFAULT_SETTINGS },
    customExercises: [],
    favorites: seed.favorites,
    routines: seed.routines,
    workouts: seed.workouts,
    measurements: seed.measurements,
    active: null,
  }
}

function newSet(type: SetType = 'normal'): WorkoutSet {
  return { id: uid('s'), type, weight: null, reps: null, completed: false }
}

function mapActive(state: DataState, fn: (a: ActiveWorkout) => ActiveWorkout): Partial<DataState> {
  return state.active ? { active: fn(state.active) } : {}
}

function mapExercise(a: ActiveWorkout, exId: string, fn: (e: WorkoutExercise) => WorkoutExercise): ActiveWorkout {
  return { ...a, exercises: a.exercises.map((e) => (e.id === exId ? fn(e) : e)) }
}

/** Last session's matching set: warm-ups line up with warm-ups, work sets with work sets. */
export function referenceSet(prev: WorkoutSet[], ex: WorkoutExercise, set: WorkoutSet): WorkoutSet | undefined {
  const warm = set.type === 'warmup'
  const same = ex.sets.filter((s) => (s.type === 'warmup') === warm)
  const idx = same.findIndex((s) => s.id === set.id)
  return prev.filter((s) => (s.type === 'warmup') === warm)[idx]
}

export const useStore = create<DataState & Actions>()(
  persist(
    (set, get) => ({
      ...seededState(),

      completeOnboarding: (profile, settings, keepDemo) =>
        set((s) => {
          const isDemo = (x: { id: string }) => x.id.startsWith(DEMO_PREFIX)
          const units = settings.units ?? s.settings.units
          const workouts = keepDemo ? snapDemoToUnits(s.workouts, units) : s.workouts.filter((w) => !isDemo(w))
          const used = new Set(workouts.map((w) => w.routineId))
          // A repeated onboarding replaces the previous generated plan unless it has history.
          const others = s.routines.filter((r) => !r.generated || used.has(r.id)).map((r) => ({ ...r, inPlan: false }))
          return {
            onboarded: true,
            profile,
            settings: { ...s.settings, ...settings, setupSeen: true },
            routines: [...generateProgram(profile), ...others],
            workouts,
            measurements: keepDemo ? s.measurements : s.measurements.filter((m) => !isDemo(m)),
          }
        }),
      skipOnboarding: () => set((s) => ({ onboarded: true, settings: { ...s.settings, setupSeen: true } })),
      restartOnboarding: () => set({ onboarded: false }),
      updateSettings: (patch) =>
        set((s) => ({
          settings: { ...s.settings, ...patch },
          ...(patch.units && patch.units !== s.settings.units ? { workouts: snapDemoToUnits(s.workouts, patch.units) } : {}),
        })),
      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

      toggleFavorite: (id) =>
        set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id] })),
      saveExercise: (ex) =>
        set((s) => {
          const exists = s.customExercises.some((e) => e.id === ex.id)
          const clean = { ...ex, custom: true }
          return { customExercises: exists ? s.customExercises.map((e) => (e.id === ex.id ? clean : e)) : [...s.customExercises, clean] }
        }),
      deleteExercise: (id) =>
        set((s) => {
          const inHistory = s.workouts.some((w) => w.exercises.some((e) => e.exerciseId === id))
          return {
            // Keep a hidden copy when history refers to it so past workouts still read correctly.
            customExercises: inHistory
              ? s.customExercises.map((e) => (e.id === id ? { ...e, archived: true } : e))
              : s.customExercises.filter((e) => e.id !== id),
            favorites: s.favorites.filter((f) => f !== id),
            routines: s.routines.map((r) =>
              r.exercises.some((e) => e.exerciseId === id) ? { ...r, exercises: r.exercises.filter((e) => e.exerciseId !== id) } : r,
            ),
          }
        }),

      saveRoutine: (r) =>
        set((s) => {
          const stamped = { ...r, updatedAt: new Date().toISOString() }
          const exists = s.routines.some((x) => x.id === r.id)
          return { routines: exists ? s.routines.map((x) => (x.id === r.id ? stamped : x)) : [...s.routines, stamped] }
        }),
      deleteRoutine: (id) => set((s) => ({ routines: s.routines.filter((r) => r.id !== id) })),
      duplicateRoutine: (id) => {
        const r = get().routines.find((x) => x.id === id)
        if (!r) return null
        const now = new Date().toISOString()
        const ssMap = new Map<string, string>()
        const copy: Routine = {
          ...r,
          id: uid('rt'),
          name: `${r.name} (copy)`,
          inPlan: false,
          createdAt: now,
          updatedAt: now,
          exercises: r.exercises.map((e) => {
            let ss = e.supersetId ?? null
            if (ss) {
              if (!ssMap.has(ss)) ssMap.set(ss, uid('ss'))
              ss = ssMap.get(ss)!
            }
            return { ...e, id: uid('re'), supersetId: ss }
          }),
        }
        set((s) => {
          const idx = s.routines.findIndex((x) => x.id === id)
          const routines = [...s.routines]
          routines.splice(idx + 1, 0, copy)
          return { routines }
        })
        return copy.id
      },
      moveRoutine: (id, dir) =>
        set((s) => {
          const i = s.routines.findIndex((r) => r.id === id)
          const j = i + dir
          if (i < 0 || j < 0 || j >= s.routines.length) return {}
          const routines = [...s.routines]
          ;[routines[i], routines[j]] = [routines[j], routines[i]]
          return { routines }
        }),
      toggleInPlan: (id) => set((s) => ({ routines: s.routines.map((r) => (r.id === id ? { ...r, inPlan: !r.inPlan } : r)) })),

      startWorkout: (routineId) =>
        set((s) => {
          const r = routineId ? s.routines.find((x) => x.id === routineId) : null
          const exercises: WorkoutExercise[] = (r?.exercises ?? []).map((re) => ({
            id: uid('we'),
            exerciseId: re.exerciseId,
            restSec: re.restSec,
            repMin: re.repMin,
            repMax: re.repMax,
            supersetId: re.supersetId ?? null,
            sets: Array.from({ length: Math.max(1, re.sets) }, () => newSet()),
          }))
          return {
            active: {
              id: uid('w'),
              name: r?.name ?? 'Quick workout',
              routineId: r?.id ?? null,
              startedAt: new Date().toISOString(),
              exercises,
              rest: null,
            },
          }
        }),
      renameActive: (name) => set((s) => mapActive(s, (a) => ({ ...a, name }))),
      updateSet: (exId, setId, patch) =>
        set((s) =>
          mapActive(s, (a) => mapExercise(a, exId, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === setId ? { ...x, ...patch } : x)) }))),
        ),
      completeSet: (exId, setId) => {
        const s = get()
        const a = s.active
        const ex = a?.exercises.find((e) => e.id === exId)
        const target = ex?.sets.find((x) => x.id === setId)
        if (!a || !ex || !target) return { ok: false }
        if (target.completed) {
          set(mapActive(s, (a2) => mapExercise(a2, exId, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === setId ? { ...x, completed: false } : x)) }))))
          return { ok: true }
        }
        const prev = previousSets(s.workouts, ex.exerciseId)
        const ref = referenceSet(prev, ex, target)
        const reps = target.reps ?? ref?.reps ?? null
        const weight = target.weight ?? ref?.weight ?? null
        const def = [...BUILT_IN_EXERCISES, ...s.customExercises].find((e) => e.id === ex.exerciseId)
        if (!reps || reps <= 0) return { ok: false, message: 'Enter reps for this set first' }
        if (weight == null && def?.equipment !== 'Bodyweight') return { ok: false, message: 'Enter a weight for this set first' }
        // Rest after the last exercise of a superset round, otherwise go straight to the next one.
        const idx = a.exercises.findIndex((e) => e.id === exId)
        const next = a.exercises[idx + 1]
        const midSuperset = !!ex.supersetId && next?.supersetId === ex.supersetId
        const restSec = target.type === 'warmup' ? Math.min(60, ex.restSec) : ex.restSec
        set({
          active: {
            ...mapExercise(a, exId, (e) => ({
              ...e,
              sets: e.sets.map((x, i) => {
                if (x.id === setId) return { ...x, reps, weight: weight ?? 0, completed: true }
                // First time on this exercise: carry the load forward to the remaining sets.
                const after = i > e.sets.findIndex((y) => y.id === setId)
                if (after && !x.completed && x.weight == null && x.type === target.type && !referenceSet(prev, ex, x)) return { ...x, weight: weight ?? 0 }
                return x
              }),
            })),
            rest:
              midSuperset || restSec <= 0
                ? a.rest
                : { endsAt: Date.now() + restSec * 1000, duration: restSec, label: def?.name ?? 'Rest' },
          },
        })
        return { ok: true }
      },
      addSet: (exId, type = 'normal') =>
        set((s) =>
          mapActive(s, (a) =>
            mapExercise(a, exId, (e) => {
              const created = newSet(type)
              if (type === 'warmup') {
                const firstWork = e.sets.findIndex((x) => x.type !== 'warmup')
                const sets = [...e.sets]
                sets.splice(firstWork < 0 ? sets.length : firstWork, 0, created)
                return { ...e, sets }
              }
              return { ...e, sets: [...e.sets, created] }
            }),
          ),
        ),
      removeSet: (exId, setId) =>
        set((s) => mapActive(s, (a) => mapExercise(a, exId, (e) => ({ ...e, sets: e.sets.filter((x) => x.id !== setId) })))),
      addExercisesToActive: (ids) =>
        set((s) =>
          mapActive(s, (a) => ({
            ...a,
            exercises: [
              ...a.exercises,
              ...ids.map((exerciseId) => ({
                id: uid('we'),
                exerciseId,
                restSec: s.settings.defaultRestSec,
                supersetId: null,
                sets: [newSet(), newSet(), newSet()],
              })),
            ],
          })),
        ),
      removeActiveExercise: (exId) => set((s) => mapActive(s, (a) => ({ ...a, exercises: a.exercises.filter((e) => e.id !== exId) }))),
      moveActiveExercise: (exId, dir) =>
        set((s) =>
          mapActive(s, (a) => {
            const i = a.exercises.findIndex((e) => e.id === exId)
            const j = i + dir
            if (i < 0 || j < 0 || j >= a.exercises.length) return a
            const exercises = [...a.exercises]
            ;[exercises[i], exercises[j]] = [exercises[j], exercises[i]]
            return { ...a, exercises }
          }),
        ),
      setActiveRest: (exId, restSec) => set((s) => mapActive(s, (a) => mapExercise(a, exId, (e) => ({ ...e, restSec })))),
      setActiveNotes: (notes) => set((s) => mapActive(s, (a) => ({ ...a, notes }))),
      adjustRest: (delta) =>
        set((s) =>
          mapActive(s, (a) => {
            if (!a.rest) return a
            const endsAt = Math.max(Date.now(), a.rest.endsAt + delta * 1000)
            return { ...a, rest: { ...a.rest, endsAt, duration: Math.max(1, a.rest.duration + delta) } }
          }),
        ),
      skipRest: () => set((s) => mapActive(s, (a) => ({ ...a, rest: null }))),
      finishWorkout: () => {
        const a = get().active
        if (!a) return null
        const exercises = a.exercises
          .map((e) => ({ ...e, sets: e.sets.filter(isDone) }))
          .filter((e) => e.sets.length > 0)
        if (!exercises.length) return null
        const { rest: _rest, ...rest } = a
        void _rest
        const workout: Workout = { ...rest, exercises, endedAt: new Date().toISOString() }
        set((s) => ({ workouts: [...s.workouts, workout], active: null }))
        return workout.id
      },
      discardWorkout: () => set({ active: null }),

      saveWorkout: (w) => set((s) => ({ workouts: s.workouts.map((x) => (x.id === w.id ? w : x)) })),
      deleteWorkout: (id) => set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),

      saveMeasurement: (m) =>
        set((s) => {
          const exists = s.measurements.some((x) => x.id === m.id)
          return { measurements: exists ? s.measurements.map((x) => (x.id === m.id ? m : x)) : [...s.measurements, m] }
        }),
      deleteMeasurement: (id) => set((s) => ({ measurements: s.measurements.filter((m) => m.id !== id) })),

      resetDemoData: () =>
        set((s) => {
          const seed = seededState()
          return { ...seed, workouts: snapDemoToUnits(seed.workouts, s.settings.units), onboarded: true, settings: s.settings, profile: { ...s.profile, trainingDays: DEMO_PROFILE.trainingDays } }
        }),
      removeSampleData: () =>
        set((s) => ({
          workouts: s.workouts.filter((w) => !w.id.startsWith(DEMO_PREFIX)),
          measurements: s.measurements.filter((m) => !m.id.startsWith(DEMO_PREFIX)),
        })),
      clearAllData: () =>
        set((s) => ({
          workouts: [],
          measurements: [],
          favorites: [],
          customExercises: [],
          routines: starterRoutines().map((r) => ({ ...r, inPlan: false })),
          active: null,
          settings: s.settings,
        })),
      importData: (data) => set({ ...data }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (s): DataState => ({
        onboarded: s.onboarded,
        profile: s.profile,
        settings: s.settings,
        customExercises: s.customExercises,
        favorites: s.favorites,
        routines: s.routines,
        workouts: s.workouts,
        measurements: s.measurements,
        active: s.active,
      }),
    },
  ),
)
