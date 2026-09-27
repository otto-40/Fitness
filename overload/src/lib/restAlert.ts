import { BUILT_IN_EXERCISES } from '../data/exercises'
import { describeNext, position } from '../components/workout/upNext'
import { referenceSet } from '../store/useStore'
import type { DataState } from '../store/useStore'
import { previousSets } from './calc'
import { nextUp } from './supersets'

/**
 * The lock-screen alert for the end of the current rest: what is due next, in the
 * same words as the now panel ("Leg Press" / "Set 2 of 4 · 180 kg × 11 reps").
 * Null when nothing is resting.
 */
export function restAlert(state: Pick<DataState, 'active' | 'workouts' | 'customExercises' | 'settings'>): { at: number; title: string; body: string } | null {
  const a = state.active
  if (!a?.rest) return null
  const at = a.rest.endsAt
  const up = nextUp(a.exercises)
  if (!up) return { at, title: 'Rest over', body: 'Every set is logged. Finish the workout when you’re ready.' }
  const ex = a.exercises.find((e) => e.id === up.exId)!
  const set = ex.sets.find((s) => s.id === up.setId)!
  const def = BUILT_IN_EXERCISES.find((e) => e.id === ex.exerciseId) ?? state.customExercises.find((e) => e.id === ex.exerciseId)
  const ref = referenceSet(previousSets(state.workouts, ex.exerciseId), ex, set)
  const pos = position(ex, set).short
  const detail = describeNext({ ex, set, def, ref, position: pos }, state.settings.units)
  return { at, title: `Rest over · ${def?.name ?? 'Next set'}`, body: detail ? `${pos} · ${detail}` : pos }
}
