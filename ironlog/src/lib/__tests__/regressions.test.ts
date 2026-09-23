import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../../store/useStore'
import { formatDuration } from '../dates'
import { plural } from '../format'
import type { WorkoutExercise } from '../../types'

const ex = (id: string, supersetId: string | null = null): WorkoutExercise => ({
  id,
  exerciseId: id,
  restSec: 90,
  supersetId,
  sets: [{ id: `${id}-s1`, type: 'normal', weight: 20, reps: 10, completed: false }],
})

const linksOf = () => useStore.getState().active!.exercises.map((e) => e.supersetId)

describe('live workout supersets', () => {
  beforeEach(() => {
    useStore.setState({
      active: { id: 'w', name: 'Test', routineId: null, startedAt: new Date().toISOString(), rest: null, exercises: [ex('a', 'ss'), ex('b', 'ss'), ex('c')] },
    })
  })

  it('removing half of a superset clears the lone link', () => {
    useStore.getState().removeActiveExercise('a')
    expect(linksOf()).toEqual([null, null])
  })

  it('moving an exercise into the middle of a superset splits it cleanly', () => {
    useStore.getState().moveActiveExercise('c', -1)
    expect(linksOf()).toEqual([null, null, null])
  })

  it('reordering inside a superset keeps the group', () => {
    useStore.getState().moveActiveExercise('b', -1)
    const [x, y, z] = linksOf()
    expect(x).toBeTruthy()
    expect(x).toBe(y)
    expect(z).toBeNull()
  })

  it('rests only after the last exercise of a superset round', () => {
    useStore.getState().completeSet('a', 'a-s1')
    expect(useStore.getState().active!.rest).toBeNull()
    useStore.getState().completeSet('b', 'b-s1')
    expect(useStore.getState().active!.rest?.duration).toBe(90)
  })
})

describe('copy helpers', () => {
  it('pluralises counts', () => {
    expect(plural(1, 'set')).toBe('1 set')
    expect(plural(3, 'set')).toBe('3 sets')
    expect(plural(1, 'entry', 'entries')).toBe('1 entry')
    expect(plural(0, 'entry', 'entries')).toBe('0 entries')
  })

  it('shows sub-minute sessions as "<1 min" rather than "0 min"', () => {
    expect(formatDuration(20_000)).toBe('<1 min')
    expect(formatDuration(0)).toBe('0 min')
    expect(formatDuration(95 * 60_000)).toBe('1h 35m')
  })
})
