import clsx from 'clsx'
import { ArrowRight, Check, Delete } from 'lucide-react'
import { useState } from 'react'
import { parseDecimal, round } from '../../lib/units'
import { Modal } from '../ui'

export type KeypadField = 'weight' | 'reps'

export interface KeypadProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle: string
  field: KeypadField
  onFieldChange: (f: KeypadField) => void
  /** Values in display units. */
  weight: number | null
  reps: number | null
  weightPlaceholder?: string
  repsPlaceholder?: string
  unit: string
  step: number
  bodyweight: boolean
  onChange: (patch: { weight?: number | null; reps?: number | null }) => void
  /** Present in the live workout: logs the set and closes. */
  onLog?: () => void
  completed?: boolean
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const

/**
 * Full-width number pad for one-handed entry mid-set. Values update as you type;
 * the first key after switching field replaces the value, like a calculator.
 */
export function Keypad(p: KeypadProps) {
  const current = p.field === 'weight' ? p.weight : p.reps
  const [text, setText] = useState(current == null ? '' : String(current))
  const [fresh, setFresh] = useState(true)
  // Reset only when the sheet opens or the field changes (state adjusted during render, no effect).
  const sig = p.open ? p.field : null
  const [prevSig, setPrevSig] = useState(sig)
  if (sig !== prevSig) {
    setPrevSig(sig)
    if (sig) {
      setText(current == null ? '' : String(current))
      setFresh(true)
    }
  }

  const commit = (t: string) => {
    setText(t)
    const n = parseDecimal(t)
    const max = p.field === 'weight' ? 2000 : 999
    const v = n == null ? null : Math.min(max, Math.max(0, p.field === 'reps' ? Math.round(n) : n))
    p.onChange(p.field === 'weight' ? { weight: v } : { reps: v })
  }

  const press = (k: (typeof KEYS)[number]) => {
    if (k === 'back') {
      setFresh(false)
      return commit(text.slice(0, -1))
    }
    if (k === '.' && (p.field === 'reps' || text.includes('.'))) return
    const base = fresh ? '' : text
    setFresh(false)
    const next = base === '0' && k !== '.' ? k : base + k
    const [int, dec] = next.split('.')
    if (int.length > 4 || (dec && dec.length > 2)) return
    commit(next === '.' ? '0.' : next)
  }

  const nudge = (d: number) => {
    setFresh(false)
    const cur = parseDecimal(text) ?? parseDecimal((p.field === 'weight' ? p.weightPlaceholder : p.repsPlaceholder) ?? '') ?? 0
    const v = Math.max(0, round(cur + d, 2))
    commit(String(v))
  }

  const advance = () => {
    if (p.field === 'weight') p.onFieldChange('reps')
    else if (p.onLog && !p.completed) p.onLog()
    else p.onClose()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (/^[0-9]$/.test(e.key)) press(e.key as (typeof KEYS)[number])
    else if (e.key === '.' || e.key === ',') press('.')
    else if (e.key === 'Backspace') press('back')
    else if (e.key === 'Enter') advance()
    else if (e.key === 'Tab') p.onFieldChange(p.field === 'weight' ? 'reps' : 'weight')
    else return
    e.preventDefault()
  }

  const fieldButton = (f: KeypadField, label: string, value: number | null, placeholder?: string, unit?: string) => {
    const on = p.field === f
    const shown = on ? text : value == null ? '' : String(value)
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => p.onFieldChange(f)}
        className={clsx(
          'flex flex-1 flex-col items-start rounded-2xl border-2 px-4 py-2.5 text-left transition-colors',
          on ? 'border-accent bg-accent-soft/40' : 'border-transparent bg-surface-2',
        )}
      >
        <span className="eyebrow">{label}</span>
        <span className="mt-1 flex items-baseline gap-1">
          <span className={clsx('stamp text-[40px]', !shown && 'text-muted/60')}>{shown || placeholder || '0'}</span>
          {unit && <span className="text-sm font-medium text-muted">{unit}</span>}
          {on && <span className="ml-0.5 h-8 w-0.5 animate-pulse self-center bg-accent" aria-hidden />}
        </span>
      </button>
    )
  }

  return (
    <Modal open={p.open} onClose={p.onClose} title={p.title} description={p.subtitle} size="sm">
      <div onKeyDown={onKeyDown} className="outline-none" tabIndex={-1} data-autofocus aria-label="Number pad">
        <div role="group" aria-label="Field being edited" className="flex gap-2">
          {fieldButton('weight', p.bodyweight ? 'Added load' : 'Weight', p.weight, p.weightPlaceholder, p.unit)}
          {fieldButton('reps', 'Reps', p.reps, p.repsPlaceholder)}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => nudge(p.field === 'weight' ? -p.step : -1)} className="stamp h-12 rounded-xl bg-surface-2 text-xl hover:bg-surface-3 active:scale-[0.97]">
            −{p.field === 'weight' ? p.step : 1}
          </button>
          <button type="button" onClick={() => nudge(p.field === 'weight' ? p.step : 1)} className="stamp h-12 rounded-xl bg-surface-2 text-xl hover:bg-surface-3 active:scale-[0.97]">
            +{p.field === 'weight' ? p.step : 1}
          </button>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              disabled={k === '.' && p.field === 'reps'}
              aria-label={k === 'back' ? 'Delete' : k === '.' ? 'Decimal point' : k}
              className="stamp flex h-14 items-center justify-center rounded-xl bg-surface text-[26px] ring-1 ring-line transition-colors ring-inset hover:bg-surface-2 active:scale-[0.97] active:bg-surface-3 disabled:opacity-30"
            >
              {k === 'back' ? <Delete size={22} /> : k}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-[1fr_1.4fr] gap-2">
          <button type="button" onClick={p.onClose} className="h-14 rounded-2xl bg-surface-2 text-[15px] font-semibold hover:bg-surface-3">
            Done
          </button>
          {p.field === 'weight' ? (
            <button type="button" onClick={advance} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-semibold text-bg hover:opacity-90">
              Reps <ArrowRight size={18} />
            </button>
          ) : p.onLog && !p.completed ? (
            <button type="button" onClick={advance} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-good text-[15px] font-semibold text-white hover:brightness-110 dark:text-[#0b0c0e]">
              <Check size={20} strokeWidth={3} /> Log set
            </button>
          ) : (
            <button type="button" onClick={() => p.onFieldChange('weight')} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-semibold text-bg hover:opacity-90">
              Weight <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
