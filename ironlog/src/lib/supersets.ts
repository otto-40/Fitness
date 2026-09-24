import { uid } from './id'

interface Linkable {
  supersetId?: string | null
}

/** True when item i is performed back to back with item i + 1. */
export function linkedToNext<T extends Linkable>(list: T[], i: number): boolean {
  const a = list[i]?.supersetId
  return !!a && list[i + 1]?.supersetId === a
}

/** Rebuilds superset ids from a list of links so groups are always contiguous and never singletons. */
export function applyLinks<T extends Linkable>(list: T[], links: boolean[]): T[] {
  const out = list.map((x) => ({ ...x }))
  let i = 0
  while (i < out.length) {
    let j = i
    while (j < out.length - 1 && links[j]) j++
    const id = j > i ? (out[i].supersetId && out.slice(i, j + 1).every((x) => x.supersetId === out[i].supersetId) ? out[i].supersetId : uid('ss')) : null
    for (let k = i; k <= j; k++) out[k].supersetId = id
    i = j + 1
  }
  return out
}

export function normalizeSupersets<T extends Linkable>(list: T[]): T[] {
  return applyLinks(
    list,
    list.map((_, i) => linkedToNext(list, i)),
  )
}

export function toggleLink<T extends Linkable>(list: T[], i: number): T[] {
  const links = list.map((_, k) => linkedToNext(list, k))
  links[i] = !links[i]
  return applyLinks(list, links)
}

interface SetLike {
  id: string
  completed: boolean
}
interface ExerciseLike extends Linkable {
  id: string
  sets: SetLike[]
}

/**
 * The set to do next. Straight sets go in order; inside a superset the rounds
 * alternate (A1, B1, A2, B2…), because that is how a superset is performed.
 */
export function nextUp<T extends ExerciseLike>(list: T[]): { exId: string; setId: string } | null {
  const i = list.findIndex((e) => e.sets.some((s) => !s.completed))
  if (i < 0) return null
  const ss = list[i].supersetId
  if (!ss) return { exId: list[i].id, setId: list[i].sets.find((s) => !s.completed)!.id }
  let start = i
  while (start > 0 && list[start - 1].supersetId === ss) start--
  let end = i
  while (end < list.length - 1 && list[end + 1].supersetId === ss) end++
  const group = list.slice(start, end + 1)
  const rounds = Math.max(...group.map((e) => e.sets.length))
  for (let r = 0; r < rounds; r++)
    for (const e of group) {
      const s = e.sets[r]
      if (s && !s.completed) return { exId: e.id, setId: s.id }
    }
  return null
}
