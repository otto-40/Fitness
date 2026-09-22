import { useMemo } from 'react'
import { BUILT_IN_EXERCISES } from '../data/exercises'
import { useStore } from '../store/useStore'
import type { Exercise } from '../types'

/** All exercises (built-in + custom), including archived ones for history lookups. */
export function useExerciseMap(): Map<string, Exercise> {
  const custom = useStore((s) => s.customExercises)
  return useMemo(() => new Map([...BUILT_IN_EXERCISES, ...custom].map((e) => [e.id, e])), [custom])
}

/** Exercises available for picking and browsing. */
export function useExerciseList(): Exercise[] {
  const custom = useStore((s) => s.customExercises)
  return useMemo(
    () => [...BUILT_IN_EXERCISES, ...custom.filter((e) => !e.archived)].sort((a, b) => a.name.localeCompare(b.name)),
    [custom],
  )
}

export function exerciseName(map: Map<string, Exercise>, id: string): string {
  return map.get(id)?.name ?? 'Deleted exercise'
}
