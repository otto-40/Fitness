import { beforeEach, describe, expect, it } from 'vitest'
import { restAlert } from '../restAlert'
import { useStore } from '../../store/useStore'
import { starterRoutines } from '../../data/seed'

describe('rest alert (iPhone lock-screen notification)', () => {
  beforeEach(() => {
    useStore.setState({ routines: starterRoutines(), workouts: [], customExercises: [], active: null })
  })

  it('is empty when nothing is resting', () => {
    expect(restAlert(useStore.getState())).toBeNull()
    useStore.getState().startWorkout('sam-mon')
    expect(restAlert(useStore.getState())).toBeNull()
  })

  it('fires when rest ends and names the next set in the now panel’s words', () => {
    const s = useStore.getState()
    s.startWorkout('sam-mon')
    const ex = useStore.getState().active!.exercises[0]
    s.updateSet(ex.id, ex.sets[0].id, { weight: 100, reps: 8 })
    s.completeSet(ex.id, ex.sets[0].id)
    const a = restAlert(useStore.getState())!
    expect(a.at).toBe(useStore.getState().active!.rest!.endsAt)
    expect(a.title).toBe('Rest over · Leg Press')
    // The load carries forward from set 1; reps fall back to the target range.
    expect(a.body).toBe('Set 2 of 4 · 100 kg × 6–8 reps')
  })

  it('says the workout is done when the last set started the rest', () => {
    const s = useStore.getState()
    s.startWorkout(null)
    s.addExercisesToActive(['bench-press'])
    let ex = useStore.getState().active!.exercises[0]
    for (const extra of ex.sets.slice(1)) s.removeSet(ex.id, extra.id)
    ex = useStore.getState().active!.exercises[0]
    expect(ex.sets).toHaveLength(1)
    s.updateSet(ex.id, ex.sets[0].id, { weight: 60, reps: 5 })
    s.completeSet(ex.id, ex.sets[0].id)
    const a = restAlert(useStore.getState())!
    expect(a.title).toBe('Rest over')
    expect(a.body).toMatch(/Every set is logged/)
  })
})
