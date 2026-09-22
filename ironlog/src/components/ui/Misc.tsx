import { cn as clsx } from '../../lib/cn'
import type { ReactNode } from 'react'

export function Card({ children, className, as: As = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' | 'li' }) {
  return <As className={clsx('rounded-2xl border border-line bg-surface', className)}>{children}</As>
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="text-[13px] font-semibold tracking-[0.08em] text-muted uppercase">{children}</h2>
      {action}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back}
        <h1 className="font-display text-[34px] leading-none font-semibold tracking-wide uppercase sm:text-[40px]">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function EmptyState({ icon, title, body, action, className }: { icon: ReactNode; title: string; body: string; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center', className)}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">{icon}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Stat({ label, value, unit, sub, className }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; className?: string }) {
  return (
    <div className={clsx('min-w-0', className)}>
      <div className="text-xs font-medium tracking-wide text-muted uppercase">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="tnum font-display text-[28px] leading-none font-semibold">{value}</span>
        {unit && <span className="text-sm font-medium text-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  )
}

export function Badge({ children, tone = 'default', className }: { children: ReactNode; tone?: 'default' | 'accent' | 'good' | 'danger'; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-semibold whitespace-nowrap',
        tone === 'default' && 'bg-surface-2 text-ink-2',
        tone === 'accent' && 'bg-accent-soft text-accent-ink',
        tone === 'good' && 'bg-good-soft text-good',
        tone === 'danger' && 'bg-danger-soft text-danger',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** The IronLog mark: a loaded barbell seen end-on. */
export function Logo({ className, withWord = true }: { className?: string; withWord?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-ink" />
        <rect x="5" y="9" width="4" height="14" rx="1.5" fill="#ff6a2b" />
        <rect x="23" y="9" width="4" height="14" rx="1.5" fill="#ff6a2b" />
        <rect x="9" y="11.5" width="2.5" height="9" rx="1" fill="#ff6a2b" />
        <rect x="20.5" y="11.5" width="2.5" height="9" rx="1" fill="#ff6a2b" />
        <rect x="11.5" y="14.75" width="9" height="2.5" rx="1" className="fill-bg" />
      </svg>
      {withWord && (
        <span className="font-display text-[22px] leading-none font-bold tracking-[0.06em] uppercase">
          Iron<span className="text-accent">Log</span>
        </span>
      )}
    </span>
  )
}

export function MuscleTag({ muscle }: { muscle: string }) {
  return <span className="inline-flex h-6 items-center rounded-md border border-line px-2 text-xs font-medium text-ink-2">{muscle}</span>
}
