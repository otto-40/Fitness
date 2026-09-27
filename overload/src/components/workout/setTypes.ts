import type { SetType } from '../../types'

export const SET_TYPE_META: Record<SetType, { short: string; label: string; className: string; help: string }> = {
  normal: { short: '', label: 'Working set', className: 'bg-surface-2 text-ink', help: 'Counts toward volume and records' },
  warmup: { short: 'W', label: 'Warm-up', className: 'bg-warn-soft text-warn', help: 'Excluded from volume and records' },
  failure: { short: 'F', label: 'Failure', className: 'bg-danger-soft text-danger', help: 'Taken to technical failure' },
  drop: { short: 'D', label: 'Drop set', className: 'bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300', help: 'Reduced weight straight after the previous set' },
}
