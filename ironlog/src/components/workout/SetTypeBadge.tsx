import clsx from 'clsx'
import type { SetType } from '../../types'

export const SET_TYPE_META: Record<SetType, { short: string; label: string; className: string; help: string }> = {
  normal: { short: '', label: 'Working set', className: 'bg-surface-2 text-ink', help: 'Counts toward volume and records' },
  warmup: { short: 'W', label: 'Warm-up', className: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300', help: 'Excluded from volume and records' },
  failure: { short: 'F', label: 'Failure', className: 'bg-danger-soft text-danger', help: 'Taken to technical failure' },
  drop: { short: 'D', label: 'Drop set', className: 'bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300', help: 'Reduced weight straight after the previous set' },
}

export function SetTypeBadge({ type, index, className }: { type: SetType; index: number; className?: string }) {
  const meta = SET_TYPE_META[type]
  return (
    <span className={clsx('tnum flex size-9 items-center justify-center rounded-lg font-display text-lg font-semibold', meta.className, className)}>
      {type === 'normal' ? index : meta.short}
    </span>
  )
}
