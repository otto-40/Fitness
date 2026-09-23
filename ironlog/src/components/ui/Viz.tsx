import type { ReactNode } from 'react'
import { cn as clsx } from '../../lib/cn'

/** The plate ring: circular progress with content in the middle. */
export function Ring({
  value,
  size = 96,
  stroke = 8,
  children,
  className,
  trackClass = 'text-surface-3',
  label,
}: {
  /** 0–1 */
  value: number
  size?: number
  stroke?: number
  children?: ReactNode
  className?: string
  trackClass?: string
  label?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className={clsx('relative shrink-0', className)} style={{ width: size, height: size }} role={label ? 'img' : undefined} aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className={trackClass} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: 'stroke-dashoffset 0.4s cubic-bezier(.2,.7,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

/** Discrete segments, like plates loaded on a bar. */
export function SegmentBar({ total, filled, className, label }: { total: number; filled: number; className?: string; label?: string }) {
  const n = Math.max(1, Math.min(total, 14))
  return (
    <div className={clsx('flex gap-1', className)} role="img" aria-label={label ?? `${Math.min(filled, total)} of ${total}`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={clsx('h-1.5 flex-1 rounded-full transition-colors', i < filled ? 'bg-accent' : 'bg-surface-3')} />
      ))}
    </div>
  )
}

/** List-sized trend line with an end dot and no axes. */
export function Sparkline({ values, width = 88, height = 28, className }: { values: number[]; width?: number; height?: number; className?: string }) {
  if (values.length < 2) return <span className={clsx('inline-block', className)} style={{ width, height }} aria-hidden />
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pad = 3
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), pad + (1 - (v - min) / span) * (height - pad * 2)])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <path d={d} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={3.5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
    </svg>
  )
}

/** Tiny column chart for tiles; the last bar is the current period. */
export function MiniBars({ values, labels, className, height = 44 }: { values: number[]; labels?: string[]; className?: string; height?: number }) {
  const max = Math.max(1, ...values)
  return (
    <div className={clsx('flex items-end gap-1.5', className)} aria-hidden>
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full items-end justify-center" style={{ height }}>
            <div
              className={clsx('w-full max-w-4 rounded-t-[4px]', i === values.length - 1 ? 'bg-accent' : 'bg-accent/45', v === 0 && 'bg-surface-3')}
              style={{ height: `${Math.max(v === 0 ? 3 : 6, (v / max) * height)}px` }}
            />
          </div>
          {labels && <span className="text-[10px] font-medium text-muted">{labels[i]}</span>}
        </div>
      ))}
    </div>
  )
}
