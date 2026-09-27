import type { DataState } from '../store/useStore'
import { nextSetText } from './restAlert'

/**
 * What the lock-screen Live Activity shows for the workout in progress: the rest
 * countdown and the set that is due next. The iPhone draws and counts it down by
 * itself, so it stays right while the app is closed. Times are epoch ms.
 */
export interface LiveActivityContent {
  workout: string
  startedAt: number
  /** Both null when not resting. */
  restStartedAt: number | null
  restEndsAt: number | null
  /** "Leg Press", or "All sets logged". */
  next: string
  /** "Set 2 of 4 · 180 kg × 11 reps", or a nudge to finish. */
  detail: string
  done: number
  total: number
}

export function liveActivityContent(state: Pick<DataState, 'active' | 'workouts' | 'customExercises' | 'settings'>): LiveActivityContent | null {
  const a = state.active
  if (!a) return null
  const sets = a.exercises.flatMap((e) => e.sets)
  const next = nextSetText(state)
  return {
    workout: a.name,
    startedAt: new Date(a.startedAt).getTime(),
    restStartedAt: a.rest ? a.rest.endsAt - a.rest.duration * 1000 : null,
    restEndsAt: a.rest?.endsAt ?? null,
    next: next?.name ?? 'All sets logged',
    detail: next ? [next.position, next.detail].filter(Boolean).join(' · ') : 'Finish the workout when you’re ready',
    done: sets.filter((s) => s.completed).length,
    total: sets.length,
  }
}
