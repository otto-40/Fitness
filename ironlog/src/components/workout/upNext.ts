import { useMemo } from 'react'
import { useExerciseMap } from '../../hooks/useExercises'
import { previousSets } from '../../lib/calc'
import { nextUp } from '../../lib/supersets'
import { formatWeight } from '../../lib/units'
import { referenceSet, useStore } from '../../store/useStore'
import type { ActiveWorkout, Exercise, Units, WorkoutExercise, WorkoutSet } from '../../types'

/** Where the next set sits in its exercise, in the words the set table uses. */
function position(ex: WorkoutExercise, set: WorkoutSet) {
  if (set.minutes != null) {
    const all = ex.sets
    return { short: `Session ${all.indexOf(set) + 1} of ${all.length}` }
  }
  const warm = set.type === 'warmup'
  const same = ex.sets.filter((s) => (s.type === 'warmup') === warm)
  const n = same.indexOf(set) + 1
  return { short: warm ? `Warm-up ${n} of ${same.length}` : `Set ${n} of ${same.length}` }
}

export interface UpNext {
  ex: WorkoutExercise
  set: WorkoutSet
  def: Exercise | undefined
  ref: WorkoutSet | undefined
  position: string
}

/** The next set to do, with last session's matching set for reference. */
export function useUpNext(active: ActiveWorkout | null): UpNext | null {
  const workouts = useStore((s) => s.workouts)
  const map = useExerciseMap()
  return useMemo(() => {
    if (!active) return null
    const up = nextUp(active.exercises)
    if (!up) return null
    const ex = active.exercises.find((e) => e.id === up.exId)!
    const set = ex.sets.find((s) => s.id === up.setId)!
    const ref = referenceSet(previousSets(workouts, ex.exerciseId), ex, set)
    return { ex, set, def: map.get(ex.exerciseId), ref, position: position(ex, set).short }
  }, [active, workouts, map])
}

/** "180 kg × 11", "BW × 12" or "20 min": what the next set will log as it stands. */
export function describeNext(n: UpNext, units: Units) {
  if (n.set.minutes != null) return `${n.set.minutes} min`
  const w = n.set.weight ?? n.ref?.weight ?? null
  const r = n.set.reps ?? n.ref?.reps ?? null
  const bw = n.def?.equipment === 'Bodyweight'
  const load = w == null || (bw && !w) ? (bw ? 'BW' : null) : formatWeight(w, units)
  const reps = r ?? (n.ex.repMin ? (n.ex.repMin === n.ex.repMax ? n.ex.repMin : `${n.ex.repMin}–${n.ex.repMax}`) : null)
  return [load, reps != null ? `${reps} reps` : null].filter(Boolean).join(' × ')
}
