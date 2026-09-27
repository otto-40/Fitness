import type { Units } from '../types'

export const KG_PER_LB = 0.45359237
const CM_PER_IN = 2.54

export function round(n: number, dp = 1): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

/** kg → number in the user's unit, rounded for display/editing. */
export function toDisplayWeight(kg: number, units: Units): number {
  return units === 'kg' ? round(kg, 2) : round(kg / KG_PER_LB, 1)
}

/** User-entered number in their unit → kg for storage. */
export function fromDisplayWeight(value: number, units: Units): number {
  return units === 'kg' ? value : value * KG_PER_LB
}

export function fmtNum(n: number, maxDp = 1): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: maxDp })
}

export function formatWeight(kg: number | null | undefined, units: Units, withUnit = true): string {
  if (kg == null) return '—'
  const v = fmtNum(toDisplayWeight(kg, units), units === 'kg' ? 2 : 1)
  return withUnit ? `${v} ${units}` : v
}

/** Large totals such as session volume. */
export function formatVolume(kg: number, units: Units, withUnit = true): string {
  const v = Math.round(toDisplayWeight(kg, units))
  const s = v >= 100000 ? `${fmtNum(v / 1000, 0)}k` : v.toLocaleString()
  return withUnit ? `${s} ${units}` : s
}

export function lengthUnit(units: Units): 'cm' | 'in' {
  return units === 'kg' ? 'cm' : 'in'
}

export function toDisplayLength(cm: number, units: Units): number {
  return units === 'kg' ? round(cm, 1) : round(cm / CM_PER_IN, 1)
}

export function fromDisplayLength(v: number, units: Units): number {
  return units === 'kg' ? v : v * CM_PER_IN
}

/** Sensible plate increment for quick adjustments. */
export function weightStep(units: Units): number {
  return units === 'kg' ? 2.5 : 5
}

/** Parse a user-typed decimal ("62,5" or "62.5"). Returns null when blank/invalid. */
export function parseDecimal(input: string): number | null {
  const t = input.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Estimates (e1RM) are shown to 0.5 kg / 1 lb; more precision would be false. */
export function formatEstimate(kg: number | null | undefined, units: Units, withUnit = true): string {
  if (kg == null) return '—'
  const rounded = units === 'kg' ? Math.round(kg * 2) / 2 : Math.round(kg / KG_PER_LB) * KG_PER_LB
  return formatWeight(rounded, units, withUnit)
}
