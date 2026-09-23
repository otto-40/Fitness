import { cn as clsx } from '../../lib/cn'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { forwardRef, useId } from 'react'

export const inputClass =
  'h-11 w-full rounded-xl border border-transparent bg-surface-2 px-3 text-[15px] text-ink placeholder:text-muted transition-colors focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/25 aria-[invalid=true]:border-danger'

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string
  hint?: string
  error?: string | null
  children: (id: string, describedBy?: string) => ReactNode
  className?: string
}) {
  const id = useId()
  const msgId = `${id}-msg`
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink-2">
        {label}
      </label>
      {children(id, error || hint ? msgId : undefined)}
      {error ? (
        <p id={msgId} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={clsx(inputClass, className)} {...rest} />
})

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(inputClass, 'appearance-none bg-size-[16px] bg-position-[right_12px_center] bg-no-repeat pr-9', className)} style={{ backgroundImage: CHEVRON }} {...rest}>
      {children}
    </select>
  )
}

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23636469' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")"

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(inputClass, 'h-auto min-h-20 py-2.5', className)} {...rest} />
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  label: string
  size?: 'sm' | 'md'
  className?: string
}) {
  // Arrow keys move the selection, as in a native radio group.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = options.findIndex((o) => o.value === value)
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const next = options[(i + d + options.length) % options.length]
    onChange(next.value)
    requestAnimationFrame(() => (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[aria-checked="true"]')?.focus())
  }
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className={clsx('inline-flex rounded-full bg-surface-2 p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={clsx(
              'flex-1 rounded-full px-3.5 font-semibold whitespace-nowrap transition-all',
              size === 'sm' ? 'h-8 text-[13px]' : 'h-9 text-sm',
              active ? 'bg-surface text-ink shadow-card dark:bg-surface-3' : 'text-muted hover:text-ink',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors',
        active ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-[15px] font-medium">
          {label}
        </label>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-surface-3')}
      >
        <span className={clsx('absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
      </button>
    </div>
  )
}

/** A native select dressed as a filter chip ("All muscles ▾"). Active when a value is chosen. */
export function DropdownChip({
  value,
  onChange,
  options,
  placeholder,
  label,
}: {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  placeholder: string
  label: string
}) {
  const active = value !== ''
  return (
    <span className="relative inline-flex shrink-0">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          'h-9 appearance-none rounded-full border pr-8 pl-3.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          active ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink-2 hover:border-line-strong',
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 24 24" className={clsx('pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2', active ? 'text-bg' : 'text-muted')} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

/** − value + control for small integers such as set counts. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
  className,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  label: string
  className?: string
}) {
  return (
    <div className={clsx('flex h-10 items-center rounded-xl bg-surface-2', className)} role="group" aria-label={label}>
      <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="flex h-full w-10 items-center justify-center rounded-l-xl text-lg font-semibold text-ink-2 hover:bg-surface-3 disabled:opacity-35">
        −
      </button>
      <span className="stamp min-w-7 flex-1 text-center text-xl" aria-live="polite">
        {value}
      </span>
      <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="flex h-full w-10 items-center justify-center rounded-r-xl text-lg font-semibold text-ink-2 hover:bg-surface-3 disabled:opacity-35">
        +
      </button>
    </div>
  )
}
