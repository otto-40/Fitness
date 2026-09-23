import clsx from 'clsx'
import type { Effort } from '../../types'
import { EFFORTS } from '../../types'
import { EFFORT_META } from './effortMeta'

/**
 * Effort is a shape as well as a colour (circle easy, diamond moderate, triangle hard),
 * so it reads in greyscale and to colour-blind users, as in Sam's Training Week.
 */
export function EffortShape({ effort, size = 12, className }: { effort: Effort; size?: number; className?: string }) {
  const meta = EFFORT_META[effort]
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} className={clsx('shrink-0', meta.text, className)} aria-hidden>
      {effort === 'easy' && <circle cx="6" cy="6" r="5" fill="currentColor" />}
      {effort === 'moderate' && <rect x="2.1" y="2.1" width="7.8" height="7.8" rx="1" transform="rotate(45 6 6)" fill="currentColor" />}
      {effort === 'hard' && <path d="M6 1.2 11 10.5H1Z" fill="currentColor" strokeLinejoin="round" />}
    </svg>
  )
}

/** Easy / Moderate / Hard. Tapping the chosen rating again clears it. */
export function EffortPicker({ value, onChange, className, label = 'How did it feel?' }: { value: Effort | null | undefined; onChange: (e: Effort | null) => void; className?: string; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={clsx('grid grid-cols-3 gap-2', className)}>
      {EFFORTS.map((e) => {
        const on = value === e
        return (
          <button
            key={e}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? null : e)}
            className={clsx(
              'flex min-h-11 items-center justify-center gap-1.5 rounded-xl border-2 px-2 text-sm font-semibold transition-colors active:scale-[0.97]',
              on ? clsx(EFFORT_META[e].border, EFFORT_META[e].soft) : 'border-transparent bg-surface-2 text-ink-2 hover:text-ink',
            )}
          >
            <EffortShape effort={e} />
            {EFFORT_META[e].label}
          </button>
        )
      })}
    </div>
  )
}

/** Small legend for effort-coloured charts. */
export function EffortLegend({ className }: { className?: string }) {
  return (
    <div className={clsx('flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted', className)}>
      {EFFORTS.map((e) => (
        <span key={e} className="inline-flex items-center gap-1.5">
          <EffortShape effort={e} size={10} /> {EFFORT_META[e].label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full border-2 border-muted" aria-hidden /> Not rated
      </span>
    </div>
  )
}
