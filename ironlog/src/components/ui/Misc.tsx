import { cn as clsx } from '../../lib/cn'
import type { ReactNode } from 'react'
import { useId } from 'react'

export function Card({ children, className, id, as: As = 'div' }: { children: ReactNode; className?: string; id?: string; as?: 'div' | 'section' | 'article' | 'li' }) {
  return (
    <As id={id} className={clsx('rounded-2xl border border-line bg-surface', className)}>
      {children}
    </As>
  )
}

/** Dark, dominant card used once per page for the thing that matters most right now. */
export function HeroCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('relative overflow-hidden rounded-3xl bg-hero text-on-hero ring-1 ring-white/[0.06] ring-inset', className)}>{children}</div>
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx('mb-3 flex min-h-8 items-center justify-between gap-3', className)}>
      <h2 className="eyebrow">{children}</h2>
      {action}
    </div>
  )
}

export function PageHeader({
  title,
  eyebrow,
  subtitle,
  actions,
  back,
}: {
  title: string
  eyebrow?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  back?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back}
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-[34px] leading-none font-semibold tracking-[0.04em] uppercase sm:text-[40px]">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: ReactNode
  title: string
  body: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex flex-col items-center rounded-3xl border border-dashed border-line-strong bg-surface/40 px-6 py-12 text-center', className)}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">{icon}</div>
      <h3 className="text-[17px] font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

/** Big stamped number with a small unit, for summary tiles. */
export function Stat({
  label,
  value,
  unit,
  sub,
  className,
  size = 'md',
}: {
  label: string
  value: ReactNode
  unit?: string
  sub?: ReactNode
  className?: string
  size?: 'md' | 'lg'
}) {
  return (
    <div className={clsx('min-w-0', className)}>
      <div className="eyebrow">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={clsx('stamp', size === 'lg' ? 'text-[44px]' : 'text-[30px]')}>{value}</span>
        {unit && <span className="text-sm font-medium text-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  )
}

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode
  tone?: 'default' | 'accent' | 'good' | 'danger' | 'warn' | 'solid'
  className?: string
}) {
  return (
    <span
      className={clsx(
        'inline-flex h-6 items-center gap-1 rounded-lg px-2 text-xs font-semibold whitespace-nowrap',
        tone === 'default' && 'bg-surface-2 text-ink-2',
        tone === 'accent' && 'bg-accent-soft text-accent-ink',
        tone === 'good' && 'bg-good-soft text-good',
        tone === 'danger' && 'bg-danger-soft text-danger',
        tone === 'warn' && 'bg-warn-soft text-warn',
        tone === 'solid' && 'bg-accent text-on-accent',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** The Overload mark: a bigger plate stepping up over a smaller one (progressive overload, and an O). Matches the app icon. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 100 100" className={clsx('size-8 rounded-[9px]', className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5247e6" />
          <stop offset="1" stopColor="#3730a3" />
        </linearGradient>
        <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="#fff" />
          <circle cx="58" cy="43" r="34" fill="#000" />
        </mask>
      </defs>
      <rect width="100" height="100" fill={`url(#${id}-bg)`} />
      <g transform="translate(50 50) scale(0.8) translate(-50 -50)">
        <circle cx="35" cy="63" r="17.5" fill="none" stroke="#b9b4ff" strokeWidth="11" mask={`url(#${id}-m)`} />
        <circle cx="58" cy="43" r="24" fill="none" stroke="#fff" strokeWidth="14" />
        <circle cx="58" cy="43" r="5.5" fill="#fff" />
      </g>
    </svg>
  )
}

export function Logo({ className, withWord = true }: { className?: string; withWord?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <LogoMark />
      {withWord && (
        <span className="font-display text-[22px] leading-none font-bold tracking-[0.08em] uppercase">
          Over<span className="text-accent">load</span>
        </span>
      )}
    </span>
  )
}

export function MuscleTag({ muscle, count }: { muscle: string; count?: number }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-xs font-medium text-ink-2">
      {muscle}
      {count != null && <span className="tnum font-semibold text-ink">{count}</span>}
    </span>
  )
}

/** Typographic stand-in for exercise imagery: two letters, stamped. */
export function Monogram({ name, size = 'md', active }: { name: string; size?: 'sm' | 'md' | 'lg'; active?: boolean }) {
  const letters =
    name
      .replace(/\(.*?\)/g, '')
      .split(/[\s-]+/)
      .filter((w) => /[A-Za-z]/.test(w))
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  return (
    <span
      aria-hidden
      className={clsx(
        'stamp flex shrink-0 items-center justify-center rounded-xl tracking-[0.06em]',
        size === 'sm' && 'size-9 text-[15px]',
        size === 'md' && 'size-11 text-lg',
        size === 'lg' && 'size-14 rounded-2xl text-2xl',
        active ? 'bg-accent text-on-accent' : 'bg-surface-2 text-ink-2',
      )}
    >
      {letters}
    </span>
  )
}

/** Grouped inset list, settings-style. */
export function ListGroup({ title, children, className, footer }: { title?: string; children: ReactNode; className?: string; footer?: ReactNode }) {
  return (
    <section className={className}>
      {title && <h2 className="eyebrow mb-2 px-1">{title}</h2>}
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">{children}</div>
      {footer && <p className="mt-2 px-1 text-xs text-muted">{footer}</p>}
    </section>
  )
}

export function ListRow({
  icon,
  title,
  description,
  control,
  className,
  stack,
}: {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  control?: ReactNode
  className?: string
  /** Put the control under the text on narrow screens. */
  stack?: boolean
}) {
  return (
    <div className={clsx('flex gap-3 px-4 py-3.5', stack ? 'flex-col sm:flex-row sm:items-center' : 'items-center', className)}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {icon && <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2">{icon}</span>}
        <div className="min-w-0">
          <div className="text-[15px] font-medium">{title}</div>
          {description && <div className="text-sm text-muted">{description}</div>}
        </div>
      </div>
      {control && <div className={clsx('shrink-0', stack && 'sm:max-w-[60%]')}>{control}</div>}
    </div>
  )
}
