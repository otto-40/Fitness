import type { Effort } from '../../types'

/** Easy = good (green), moderate = accent (indigo), hard = warn (amber), as in Sam's Training Week. */
export const EFFORT_META: Record<Effort, { label: string; text: string; border: string; soft: string; cssVar: string }> = {
  easy: { label: 'Easy', text: 'text-good', border: 'border-good', soft: 'bg-good-soft text-ink', cssVar: 'var(--good)' },
  moderate: { label: 'Moderate', text: 'text-accent', border: 'border-accent', soft: 'bg-accent-soft text-ink', cssVar: 'var(--accent)' },
  hard: { label: 'Hard', text: 'text-warn', border: 'border-warn', soft: 'bg-warn-soft text-ink', cssVar: 'var(--warn)' },
}
