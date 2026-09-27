import { describe, expect, it } from 'vitest'
import { adoptEarlierData, STORE_KEY } from '../storageKey'

/** A tiny in-memory Storage. */
function memory(entries: Record<string, string>): Storage {
  const m = new Map(Object.entries(entries))
  return {
    get length() {
      return m.size
    },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
  }
}

const saved = JSON.stringify({ version: 2, state: { workouts: [{ id: 'w1' }], routines: [], settings: {} } })

describe('adopting data saved under an earlier key', () => {
  it('moves this app’s saved state to the current key, once', () => {
    const s = memory({ 'old-app-v1': saved })
    adoptEarlierData(s)
    expect(s.getItem(STORE_KEY)).toBe(saved)
    expect(s.getItem('old-app-v1')).toBeNull()
  })

  it('leaves other apps’ data alone and never overwrites current data', () => {
    const other = JSON.stringify({ version: 1, state: { weeks: {} } })
    const s = memory({ 'sams-training-week': saved, 'other-v1': other, [STORE_KEY]: '{"version":2,"state":{"workouts":[],"routines":[],"settings":{}}}' })
    adoptEarlierData(s)
    expect(JSON.parse(s.getItem(STORE_KEY)!).state.workouts).toEqual([])
    expect(s.getItem('other-v1')).toBe(other)
    expect(s.getItem('sams-training-week')).toBe(saved)
  })
})
