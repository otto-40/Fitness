import type { PrEvent } from './calc'
import type { Units } from '../types'
import { formatEstimate, formatVolume, formatWeight } from './units'

export function prValue(e: PrEvent, units: Units): string {
  if (e.kind === 'volume') return formatVolume(e.value, units)
  if (e.kind === 'reps') return `${e.value} reps`
  if (e.kind === 'e1rm') return `${formatEstimate(e.value, units)} (${formatWeight(e.weight, units, false)} × ${e.reps})`
  return `${formatWeight(e.value, units)} × ${e.reps}`
}

/** "1 set", "3 sets", "1 entry", "2 entries". */
export function plural(n: number, word: string, many = `${word}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? word : many}`
}
