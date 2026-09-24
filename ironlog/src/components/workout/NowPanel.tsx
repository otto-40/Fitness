import clsx from 'clsx'
import { Check, Flag, Minus, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../ui'
import { useNow } from '../../hooks/useNow'
import { formatWeight, fromDisplayWeight, round, toDisplayWeight, weightStep } from '../../lib/units'
import { describeNext, useUpNext } from './upNext'
import { useStore } from '../../store/useStore'
import { toast } from '../../store/useToast'
import { flashSet, useUi } from '../../store/useUi'
import { RestDock } from './RestDock'

function BigStepper({
  label,
  value,
  placeholder,
  unit,
  onStep,
  onEdit,
  name,
  wide,
}: {
  label: string
  value: string | null
  placeholder: string
  unit?: string
  onStep: (dir: -1 | 1) => void
  onEdit: () => void
  /** Accessible name of the value, e.g. "weight". */
  name: string
  wide?: boolean
}) {
  const shown = value ?? placeholder
  return (
    <div className="flex h-[76px] min-w-0 items-stretch rounded-[20px] bg-surface-2" role="group" aria-label={label}>
      <button type="button" onClick={() => onStep(-1)} aria-label={`Less ${name}`} className={clsx('flex shrink-0 items-center justify-center rounded-l-[20px] text-ink-2 transition-colors active:bg-surface-3', wide ? 'w-16' : 'w-12')}>
        <Minus size={22} strokeWidth={2.4} />
      </button>
      <button type="button" onClick={onEdit} aria-label={`${label}: ${value ?? 'not set'}. Type a value`} className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-2xl transition-colors active:bg-surface-3">
        <span className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">{label}</span>
        <span className="flex max-w-full items-baseline gap-0.5">
          <span key={shown} className={clsx('stamp animate-tick truncate', shown.length > 5 ? 'text-[24px]' : 'text-[32px]', value == null && 'text-muted')}>
            {shown}
          </span>
          {unit && <span className="text-xs font-medium text-muted">{unit}</span>}
        </span>
      </button>
      <button type="button" onClick={() => onStep(1)} aria-label={`More ${name}`} className={clsx('flex shrink-0 items-center justify-center rounded-r-[20px] text-ink-2 transition-colors active:bg-surface-3', wide ? 'w-16' : 'w-12')}>
        <Plus size={22} strokeWidth={2.4} />
      </button>
    </div>
  )
}

/**
 * The thumb-zone panel of the live workout: everything needed mid-set in the
 * bottom of the screen. It logs the next set, becomes the rest timer (with what
 * comes next), and offers Add exercise / Finish once every set is logged.
 */
export function NowPanel({ onAddExercise, onFinish }: { onAddExercise: () => void; onFinish: () => void }) {
  const active = useStore((s) => s.active)
  const units = useStore((s) => s.settings.units)
  const updateSet = useStore((s) => s.updateSet)
  const up = useUpNext(active)
  const now = useNow(250, !!active?.rest)
  if (!active || !active.exercises.length) return null
  const resting = !!active.rest && active.rest.endsAt > now

  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const showCard = (exId: string) => document.getElementById(`ex-${exId}`)?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })

  let body: ReactNode = null
  if (!resting && up) {
    const { ex, set, def, ref } = up
    const aerobic = set.minutes != null
    const bodyweight = def?.equipment === 'Bodyweight'
    const openPad = (field: 'weight' | 'reps' | 'minutes') => useUi.setState({ padRequest: { exId: ex.id, setId: set.id, field } })
    const log = () => {
      const r = useStore.getState().completeSet(ex.id, set.id)
      if (!r.ok) {
        if (r.message) toast(r.message, { tone: 'error' })
        if (r.message?.includes('reps')) openPad('reps')
        else if (r.message?.includes('weight')) openPad('weight')
        return
      }
      flashSet(set.id)
      navigator.vibrate?.(12)
    }
    const kg = set.weight ?? ref?.weight ?? null
    const weightShown = kg == null ? null : bodyweight && !kg && set.weight == null ? null : String(round(toDisplayWeight(kg, units), 2))
    const repsShown = set.reps ?? ref?.reps ?? null
    const target = ex.repMin ? (ex.repMin === ex.repMax ? String(ex.repMin) : `${ex.repMin}–${ex.repMax}`) : '–'
    const stepWeight = (dir: -1 | 1) => {
      const base = kg == null ? 0 : toDisplayWeight(kg, units)
      const next = Math.max(0, round(base + dir * weightStep(units), 2))
      updateSet(ex.id, set.id, { weight: fromDisplayWeight(next, units) })
    }
    const stepReps = (dir: -1 | 1) => {
      // From empty, the first tap fills the target (or last time's) reps.
      const base = repsShown ?? ex.repMin ?? 0
      const next = repsShown == null ? Math.max(1, base) : Math.max(0, Math.min(999, base + dir))
      updateSet(ex.id, set.id, { reps: next })
    }
    const mins = set.minutes ?? 0
    body = (
      <div key={set.id} className="animate-swap">
        <div className="flex items-center gap-3 px-1 pb-2.5">
          <button type="button" onClick={() => showCard(ex.id)} className="min-h-11 min-w-0 flex-1 text-left" aria-label={`Up next: ${def?.name ?? 'Exercise'}, ${up.position}. Show in list`}>
            <span className="block text-[11px] font-semibold tracking-[0.12em] text-accent-ink uppercase">Up next · {up.position}</span>
            <span className="block truncate text-[17px] leading-tight font-semibold">{def?.name ?? 'Exercise'}</span>
          </button>
          <span className="tnum shrink-0 text-right text-xs leading-tight text-muted">
            Last time
            <span className="block text-[13px] font-semibold text-ink-2">
              {ref ? (ref.minutes != null ? `${ref.minutes} min` : `${bodyweight && !ref.weight ? 'BW' : formatWeight(ref.weight, units, false)} × ${ref.reps}`) : '—'}
            </span>
          </span>
        </div>
        {aerobic ? (
          <BigStepper
            wide
            label="Minutes"
            name="minutes"
            value={String(mins)}
            placeholder="0"
            unit="min"
            onStep={(d) => updateSet(ex.id, set.id, { minutes: Math.max(5, Math.min(600, mins + d * 5)) })}
            onEdit={() => openPad('minutes')}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <BigStepper label={bodyweight ? `Added ${units}` : units} name="weight" value={weightShown} placeholder={bodyweight ? 'BW' : '–'} onStep={stepWeight} onEdit={() => openPad('weight')} />
            <BigStepper label="Reps" name="reps" value={repsShown == null ? null : String(repsShown)} placeholder={target} onStep={stepReps} onEdit={() => openPad('reps')} />
          </div>
        )}
        <Button size="xl" block className="mt-2 h-[60px] text-[18px]" icon={<Check size={22} strokeWidth={3} />} onClick={log}>
          {aerobic ? 'Log minutes' : 'Log set'}
        </Button>
      </div>
    )
  } else if (!resting && !up) {
    body = (
      <div className="animate-swap">
        <div className="flex items-center gap-3 px-1 pb-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-good text-on-good">
            <Check size={20} strokeWidth={3} />
          </span>
          <span className="min-w-0">
            <span className="block text-[17px] font-semibold">All sets logged</span>
            <span className="block text-sm text-muted">Add another exercise, or finish the session.</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="xl" icon={<Plus size={20} />} onClick={onAddExercise}>
            Add exercise
          </Button>
          <Button size="xl" icon={<Flag size={18} />} onClick={onFinish}>
            Finish
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] lg:left-[256px]">
      <div className="pointer-events-auto mx-auto w-full max-w-3xl">
        <p className="sr-only" aria-live="polite">
          {up && !resting ? `Up next: ${up.def?.name ?? 'exercise'}, ${up.position}` : ''}
        </p>
        <RestDock next={up ? { name: up.def?.name ?? 'Exercise', detail: `${up.position} · ${describeNext(up, units)}` } : null} />
        {body && <section aria-label="Current set" className="rounded-[28px] bg-surface p-3 shadow-float ring-1 ring-black/[0.05] dark:bg-surface-2 dark:ring-white/[0.07]">{body}</section>}
      </div>
    </div>
  )
}
