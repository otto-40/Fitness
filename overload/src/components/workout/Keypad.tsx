import clsx from 'clsx'
import { ArrowRight, Check, Delete } from 'lucide-react'
import { useRef, useState } from 'react'
import { parseDecimal, round } from '../../lib/units'
import type { Effort } from '../../types'
import { Modal } from '../ui'
import { EffortPicker } from './Effort'

export type KeypadField = 'weight' | 'reps' | 'minutes'

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
  /** Aerobic sets: the pad edits minutes only. */
  minutes?: number | null
  weightPlaceholder?: string
  repsPlaceholder?: string
  unit: string
  step: number
  bodyweight: boolean
  onChange: (patch: { weight?: number | null; reps?: number | null; minutes?: number | null }) => void
  /** Strength sets can be rated. In the live workout a rating also logs the set. */
  effort?: Effort | null
  onEffort?: (e: Effort | null) => void
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
  const valueOf = (f: KeypadField) => {
    const v = f === 'weight' ? p.weight : f === 'reps' ? p.reps : p.minutes
    return v == null ? '' : String(v)
  }
  const [text, setText] = useState(() => valueOf(p.field))
  // Key handling reads and writes this ref so fast typing never sees a stale render.
  // The sheet is mounted fresh each time it opens, so this starts from the current value.
  const entry = useRef({ field: p.field, text: valueOf(p.field), fresh: true })

  const aerobic = p.field === 'minutes'
  const step = p.field === 'weight' ? p.step : p.field === 'minutes' ? 5 : 1

  const switchField = (f: KeypadField) => {
    entry.current = { field: f, text: valueOf(f), fresh: true }
    setText(entry.current.text)
    p.onFieldChange(f)
  }

  const commit = (t: string) => {
    const field = entry.current.field
    entry.current = { field, text: t, fresh: false }
    setText(t)
    const n = parseDecimal(t)
    const max = field === 'weight' ? 2000 : field === 'minutes' ? 600 : 999
    const v = n == null ? null : Math.min(max, Math.max(0, field === 'weight' ? n : Math.round(n)))
    p.onChange({ [field]: v })
  }

  const press = (k: (typeof KEYS)[number]) => {
    const { field, text: cur, fresh } = entry.current
    if (k === 'back') return commit(cur.slice(0, -1))
    if (k === '.' && (field !== 'weight' || (!fresh && cur.includes('.')))) return
    const base = fresh ? '' : cur
    const next = base === '0' && k !== '.' ? k : base + k
    const [int, dec] = next.split('.')
    if (int.length > 4 || (dec && dec.length > 2)) return
    commit(next === '.' ? '0.' : next)
  }

  const nudge = (d: number) => {
    const { field, text: cur } = entry.current
    const base = parseDecimal(cur) ?? parseDecimal((field === 'weight' ? p.weightPlaceholder : field === 'reps' ? p.repsPlaceholder : '') ?? '') ?? 0
    commit(String(Math.max(0, round(base + d, 2))))
  }

  const advance = () => {
    if (entry.current.field === 'weight') switchField('reps')
    else if (p.onLog && !p.completed) p.onLog()
    else p.onClose()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (/^[0-9]$/.test(e.key)) press(e.key as (typeof KEYS)[number])
    else if (e.key === '.' || e.key === ',') press('.')
    else if (e.key === 'Backspace') press('back')
    else if (e.key === 'Enter' && e.target === e.currentTarget) advance()
    // Tab switches field only while the pad itself has focus; on a button it moves focus as usual.
    else if (e.key === 'Tab' && !e.shiftKey && e.target === e.currentTarget && !aerobic) switchField(entry.current.field === 'weight' ? 'reps' : 'weight')
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
        onClick={() => switchField(f)}
        className={clsx(
          'flex flex-1 flex-col items-start rounded-[20px] border-2 px-4 py-2.5 text-left transition-colors',
          on ? 'border-accent bg-accent-soft/40' : 'border-transparent bg-surface-2',
        )}
      >
        <span className="eyebrow">{label}</span>
        <span className="mt-1 flex items-baseline gap-1">
          <span className={clsx('stamp text-[40px]', !shown && 'text-muted')}>{shown || placeholder || '0'}</span>
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
          {aerobic ? (
            fieldButton('minutes', 'Minutes', p.minutes ?? null, undefined, 'min')
          ) : (
            <>
              {fieldButton('weight', p.bodyweight ? 'Added load' : 'Weight', p.weight, p.weightPlaceholder, p.unit)}
              {fieldButton('reps', 'Reps', p.reps, p.repsPlaceholder)}
            </>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => nudge(-step)} className="stamp h-12 rounded-[14px] bg-accent-soft text-xl text-accent-ink hover:brightness-95 active:scale-[0.97] dark:hover:brightness-125">
            −{step}
          </button>
          <button type="button" onClick={() => nudge(step)} className="stamp h-12 rounded-[14px] bg-accent-soft text-xl text-accent-ink hover:brightness-95 active:scale-[0.97] dark:hover:brightness-125">
            +{step}
          </button>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              disabled={k === '.' && p.field !== 'weight'}
              aria-label={k === 'back' ? 'Delete' : k === '.' ? 'Decimal point' : k}
              className="stamp flex h-14 items-center justify-center rounded-[14px] bg-surface-2 text-[26px] transition-colors hover:bg-surface-3 active:scale-[0.97] active:bg-surface-3 disabled:opacity-30"
            >
              {k === 'back' ? <Delete size={22} /> : k}
            </button>
          ))}
        </div>

        {p.onEffort && (
          <div className="mt-3">
            <p className="eyebrow mb-1.5">{p.onLog && !p.completed ? 'Rate it to log the set' : 'How did it feel?'}</p>
            <EffortPicker value={p.effort} onChange={p.onEffort} />
          </div>
        )}

        <div className="mt-3 grid grid-cols-[1fr_1.4fr] gap-2">
          <button type="button" onClick={p.onClose} className="h-14 rounded-2xl bg-surface-2 text-[15px] font-semibold hover:bg-surface-3">
            Done
          </button>
          {aerobic ? (
            p.onLog && !p.completed ? (
              <button type="button" onClick={advance} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-semibold text-on-accent hover:bg-accent-hover">
                <Check size={20} strokeWidth={3} /> Log minutes
              </button>
            ) : (
              <span aria-hidden />
            )
          ) : p.field === 'weight' ? (
            <button type="button" onClick={advance} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-semibold text-bg hover:opacity-90">
              Reps <ArrowRight size={18} />
            </button>
          ) : p.onLog && !p.completed ? (
            <button type="button" onClick={advance} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-semibold text-on-accent hover:bg-accent-hover">
              <Check size={20} strokeWidth={3} /> Log set
            </button>
          ) : (
            <button type="button" onClick={() => switchField('weight')} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-semibold text-bg hover:opacity-90">
              Weight <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
