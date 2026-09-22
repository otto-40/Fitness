import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { parseDecimal } from '../../lib/units'

/**
 * Numeric input that keeps its own text while focused, so partial input such as
 * "62." survives, and only reports parsed values upward.
 */
export function NumberField({
  value,
  onChange,
  placeholder,
  label,
  decimal = true,
  max = 9999,
  className,
  disabled,
}: {
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  label: string
  decimal?: boolean
  max?: number
  className?: string
  disabled?: boolean
}) {
  const [text, setText] = useState(value == null ? '' : String(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setText(value == null ? '' : String(value))
  }, [value])

  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="done"
      autoComplete="off"
      aria-label={label}
      disabled={disabled}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => {
        focused.current = true
        e.currentTarget.select()
      }}
      onBlur={() => {
        focused.current = false
        setText(value == null ? '' : String(value))
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      onChange={(e) => {
        const raw = e.target.value
        const allowed = decimal ? /^\d{0,4}([.,]\d{0,2})?$/ : /^\d{0,4}$/
        if (!allowed.test(raw)) return
        setText(raw)
        const n = parseDecimal(raw)
        onChange(n == null ? null : Math.min(max, Math.max(0, n)))
      }}
      className={clsx(
        'tnum h-11 w-full min-w-0 rounded-xl border border-transparent bg-surface-2 text-center text-[17px] font-semibold text-ink placeholder:font-medium placeholder:text-muted/80 focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/25 focus:outline-none',
        className,
      )}
    />
  )
}
