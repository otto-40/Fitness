import type { Effort } from '../../types'

/** Easy = good (green), moderate = neutral ink, hard = warn (yellow). The accent stays for things you can press. */
export const EFFORT_META: Record<Effort, { label: string; text: string; border: string; soft: string; cssVar: string }> = {
  easy: { label: 'Easy', text: 'text-good', border: 'border-good', soft: 'bg-good-soft text-ink', cssVar: 'var(--good)' },
  moderate: { label: 'Moderate', text: 'text-ink-2', border: 'border-ink-2', soft: 'bg-surface-3 text-ink', cssVar: 'var(--ink-2)' },
  hard: { label: 'Hard', text: 'text-warn', border: 'border-warn', soft: 'bg-warn-soft text-ink', cssVar: 'var(--warn)' },
}
