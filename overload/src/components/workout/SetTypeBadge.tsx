import { cn } from '../../lib/cn'
import type { SetType } from '../../types'
import { SET_TYPE_META } from './setTypes'

export function SetTypeBadge({ type, index, className }: { type: SetType; index: number; className?: string }) {
  const meta = SET_TYPE_META[type]
  return <span className={cn('stamp flex size-9 items-center justify-center rounded-lg text-lg', meta.className, className)}>{type === 'normal' ? index : meta.short}</span>
}
