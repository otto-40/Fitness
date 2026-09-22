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
