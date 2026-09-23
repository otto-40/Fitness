import { cn as clsx } from '../../lib/cn'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'hero'
type Size = 'sm' | 'md' | 'lg' | 'xl'

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[background-color,color,transform,box-shadow] duration-150 active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none select-none whitespace-nowrap'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)]',
  secondary: 'bg-surface-2 text-ink hover:bg-surface-3',
  outline: 'border border-line-strong text-ink hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger-soft text-danger hover:brightness-95 dark:hover:brightness-125',
  hero: 'bg-white/10 text-on-hero hover:bg-white/15',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-[15px]',
  lg: 'h-13 px-6 text-base',
  xl: 'h-14 rounded-2xl px-6 text-[17px]',
}

function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return clsx(base, variants[variant], sizes[size], extra)
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  block?: boolean
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', icon, block, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, clsx(block && 'w-full', className))} {...rest}>
      {icon}
      {children}
    </button>
  )
})

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
}: {
  to: string
  variant?: Variant
  size?: Size
  icon?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <Link to={to} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'default' | 'accent' | 'danger'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', tone = 'default', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-xl transition-colors active:scale-95 disabled:opacity-40',
        // Compact icon buttons keep an invisible 44px touch area.
        size === 'sm' && 'hit size-8',
        size === 'md' && 'hit size-10',
        size === 'lg' && 'size-12',
        tone === 'default' && 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        tone === 'accent' && 'bg-accent text-on-accent hover:bg-accent-hover',
        tone === 'danger' && 'text-danger hover:bg-danger-soft',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})
