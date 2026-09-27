import { beforeEach, describe, expect, it } from 'vitest'
import { liveActivityContent } from '../liveActivity'
import { useStore } from '../../store/useStore'
import { starterRoutines } from '../../data/seed'

describe('Live Activity (lock-screen rest countdown)', () => {
  beforeEach(() => {
    useStore.setState({ routines: starterRoutines(), workouts: [], customExercises: [], active: null })
  })

  it('is empty without a workout in progress', () => {
    expect(liveActivityContent(useStore.getState())).toBeNull()
  })

  it('shows the next set before the first rest', () => {
    useStore.getState().startWorkout('sam-mon')
    const a = useStore.getState().active!
    const c = liveActivityContent(useStore.getState())!
    expect(c.workout).toBe(a.name)
    expect(c.startedAt).toBe(new Date(a.startedAt).getTime())
    expect(c.restStartedAt).toBeNull()
    expect(c.restEndsAt).toBeNull()
    expect(c.next).toBe('Leg Press')
    expect(c.detail).toBe('Set 1 of 4 · 6–8 reps')
    expect(c.done).toBe(0)
    expect(c.total).toBe(a.exercises.reduce((n, e) => n + e.sets.length, 0))
  })

  it('counts down the rest and names the set after it; adjusting rest keeps the start', () => {
    const s = useStore.getState()
    s.startWorkout('sam-mon')
    const ex = useStore.getState().active!.exercises[0]
    s.updateSet(ex.id, ex.sets[0].id, { weight: 100, reps: 8 })
    s.completeSet(ex.id, ex.sets[0].id)
    const rest = useStore.getState().active!.rest!
    let c = liveActivityContent(useStore.getState())!
    expect(c.restEndsAt).toBe(rest.endsAt)
    expect(c.restStartedAt).toBe(rest.endsAt - rest.duration * 1000)
    expect(c.next).toBe('Leg Press')
    expect(c.detail).toBe('Set 2 of 4 · 100 kg × 6–8 reps')
    expect(c.done).toBe(1)
    const start = c.restStartedAt
    s.adjustRest(30)
    c = liveActivityContent(useStore.getState())!
    expect(c.restEndsAt).toBe(rest.endsAt + 30_000)
    expect(c.restStartedAt).toBe(start)
    s.skipRest()
    expect(liveActivityContent(useStore.getState())!.restEndsAt).toBeNull()
  })

  it('says every set is logged at the end', () => {
    const s = useStore.getState()
    s.startWorkout(null)
    s.addExercisesToActive(['bench-press'])
    let ex = useStore.getState().active!.exercises[0]
    for (const extra of ex.sets.slice(1)) s.removeSet(ex.id, extra.id)
    ex = useStore.getState().active!.exercises[0]
    s.updateSet(ex.id, ex.sets[0].id, { weight: 60, reps: 5 })
    s.completeSet(ex.id, ex.sets[0].id)
    const c = liveActivityContent(useStore.getState())!
    expect(c.next).toBe('All sets logged')
    expect(c.detail).toBe('Finish the workout when you’re ready')
    expect([c.done, c.total]).toEqual([1, 1])
  })
})
