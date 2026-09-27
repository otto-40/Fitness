import clsx from 'clsx'
import { ArrowDown, ArrowUp, Check, Flame, History, Minus, MoreHorizontal, Plus, Timer, Trash2, TrendingDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { referenceSet } from '../../store/useStore'
import type { Effort, Exercise, SetType, Units, WorkoutExercise, WorkoutSet } from '../../types'
import { effortAdvice } from '../../lib/calc'
import { EffortShape } from './Effort'
import { EFFORT_META } from './effortMeta'
import { formatWeight, fromDisplayWeight, toDisplayWeight, weightStep } from '../../lib/units'
import { Button, IconButton, Modal, Monogram, MuscleTag } from '../ui'
import { Keypad } from './Keypad'
import type { KeypadField } from './Keypad'
import { SetTypeBadge } from './SetTypeBadge'
import { SET_TYPE_META } from './setTypes'
import { useUi } from '../../store/useUi'

type SetPatch = Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'type' | 'minutes' | 'effort'>>

export interface ExerciseCardProps {
  ex: WorkoutExercise
  def: Exercise | undefined
  prev: WorkoutSet[]
  units: Units
  mode: 'live' | 'edit'
  isFirst: boolean
  isLast: boolean
  /** The set the lifter should do next, highlighted as "up next". */
  upNextSetId?: string | null
  onSetChange: (setId: string, patch: SetPatch) => void
  onToggle: (setId: string) => void
  onAddSet: (type?: SetType) => void
  onRemoveSet: (setId: string) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  onRestChange?: (sec: number) => void
  /** Rate a set. The live workout logs an unlogged set when it is rated. */
  onEffort?: (setId: string, effort: Effort | null) => void
}

const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300]

function fmtRest(sec: number) {
  if (!sec) return 'Off'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

const GRID = 'grid grid-cols-[44px_minmax(0,1fr)_minmax(0,76px)_minmax(0,60px)_52px] items-center gap-1.5 sm:gap-2'
/** Aerobic rows: set, last time, −5 / minutes / +5, done. */
const GRID_AERO = 'grid grid-cols-[44px_minmax(0,1fr)_minmax(0,140px)_52px] items-center gap-1.5 sm:gap-2'

export function ExerciseCard(p: ExerciseCardProps) {
  const { ex, def, prev, units } = p
  const [menu, setMenu] = useState(false)
  const [info, setInfo] = useState(false)
  const [setMenuFor, setSetMenuFor] = useState<string | null>(null)
  const [pad, setPad] = useState<{ setId: string; field: KeypadField } | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const flashFromPanel = useUi((s) => s.flash)
  // The now panel asks for a set's keypad; this card owns the keypad for its sets.
  useEffect(
    () =>
      useUi.subscribe((st) => {
        const r = st.padRequest
        if (r?.exId !== ex.id) return
        setPad({ setId: r.setId, field: r.field })
        useUi.setState({ padRequest: null })
      }),
    [ex.id],
  )
  const bodyweight = def?.equipment === 'Bodyweight'
  const aerobic = !!def?.aerobic || ex.sets.some((s) => s.minutes != null)
  const advice = p.mode === 'live' && !aerobic ? effortAdvice(prev, fromDisplayWeight(weightStep(units), units)) : null
  const done = ex.sets.filter((s) => s.completed).length
  const allDone = done === ex.sets.length && done > 0
  const menuSet = ex.sets.find((s) => s.id === setMenuFor)
  const padSet = ex.sets.find((s) => s.id === pad?.setId)

  const labelFor = (s: WorkoutSet) => {
    const n = ex.sets.filter((x) => x.type !== 'warmup').findIndex((x) => x.id === s.id) + 1
    // Every label is unique so screen readers can tell two warm-ups or drop sets apart.
    if (s.minutes != null) return { n, text: `Session ${n}` }
    if (s.type === 'warmup') return { n, text: `Warm-up ${ex.sets.filter((x) => x.type === 'warmup').findIndex((x) => x.id === s.id) + 1}` }
    return { n, text: s.type === 'normal' ? `Set ${n}` : `Set ${n} · ${SET_TYPE_META[s.type].label}` }
  }

  const toggle = (setId: string, wasDone: boolean) => {
    p.onToggle(setId)
    if (!wasDone) {
      setFlashId(setId)
      setTimeout(() => setFlashId((f) => (f === setId ? null : f)), 700)
    }
  }

  const refFor = (s: WorkoutSet) => referenceSet(prev, ex, s)
  const refText = (ref: WorkoutSet | undefined) =>
    !ref ? '—' : ref.minutes != null ? `${ref.minutes} min` : `${bodyweight && !ref.weight ? 'BW' : formatWeight(ref.weight, units, false)} × ${ref.reps}`
  const padRef = padSet ? refFor(padSet) : undefined

  return (
    <div
      id={`ex-${ex.id}`}
      className={clsx(
        'card scroll-mt-44 scroll-mb-[360px] transition-shadow duration-300',
        p.upNextSetId ? 'ring-2 ring-accent/55' : allDone && 'ring-1 ring-good/45',
      )}
    >
      <div className="flex items-start gap-3 px-3 pt-3 sm:px-4">
        <button onClick={() => setInfo(true)} className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left" aria-label={`${def?.name ?? 'Exercise'} details`}>
          <Monogram name={def?.name ?? '?'} active={!!p.upNextSetId} />
          <span className="min-w-0">
            <span className="block truncate text-[17px] leading-tight font-semibold group-hover:underline">{def?.name ?? 'Deleted exercise'}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
              <span>{def?.primary}</span>
              {ex.repMin && ex.repMax ? <span>· {ex.repMin === ex.repMax ? ex.repMin : `${ex.repMin}–${ex.repMax}`} reps</span> : null}
              {aerobic && <span>· Aerobic</span>}
              {p.mode === 'live' && !aerobic && (
                <span className="inline-flex items-center gap-1">
                  · <Timer size={13} /> {fmtRest(ex.restSec)}
                </span>
              )}
            </span>
          </span>
        </button>
        <span className={clsx('tnum mt-2.5 inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-bold', allDone ? 'bg-good-soft text-good' : 'bg-surface-2 text-muted')}>
          {allDone && <Check size={12} strokeWidth={3} />}
          {done}/{ex.sets.length}
        </span>
        <IconButton label={`Options for ${def?.name ?? 'exercise'}`} onClick={() => setMenu(true)} className="-mr-1 size-11">
          <MoreHorizontal size={20} />
        </IconButton>
      </div>

      {(ex.note || advice) && (
        <div className="mt-2 flex flex-col gap-1.5 px-3 sm:px-4">
          {ex.note && <p className="text-[13px] leading-snug text-ink-2">{ex.note}</p>}
          {advice && (
            <p className={clsx('flex items-start gap-2 rounded-xl px-3 py-2 text-[13px] leading-snug font-medium', advice.kind === 'add' ? 'bg-good-soft text-ink' : 'bg-warn-soft text-ink')}>
              <EffortShape effort={advice.kind === 'add' ? 'easy' : 'hard'} className="mt-0.5" />
              {advice.kind === 'add'
                ? `Every set felt easy last time — try ${formatWeight(advice.weight, units)}.`
                : `Every set was hard last time — hold ${formatWeight(advice.weight, units)} and own it.`}
            </p>
          )}
        </div>
      )}

      {aerobic ? (
        <div className="px-2 pt-3 pb-2 sm:px-3">
          <div className={clsx(GRID_AERO, 'px-1 pb-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted uppercase')}>
            <span className="text-center">Set</span>
            <span>
              Last<span className="max-sm:hidden"> time</span>
            </span>
            <span className="text-center">Minutes</span>
            <span className="sr-only">Done</span>
          </div>
          <ul className="flex flex-col gap-1">
            {ex.sets.map((s) => {
              const { text: label } = labelFor(s)
              const ref = refFor(s)
              const mins = s.minutes ?? 0
              const upNext = p.upNextSetId === s.id
              return (
                <li key={s.id} className={clsx(GRID_AERO, 'relative rounded-xl px-1 py-1 transition-colors', s.completed && 'bg-good-soft', (flashId === s.id || flashFromPanel === s.id) && 'animate-flash', upNext && 'ring-2 ring-accent ring-inset')}>
                  <button onClick={() => setSetMenuFor(s.id)} aria-label={`${label}: delete`} className="flex h-11 w-11 items-center justify-center rounded-lg">
                    <SetTypeBadge type="normal" index={ex.sets.indexOf(s) + 1} className="size-10" />
                  </button>
                  <button
                    type="button"
                    disabled={!ref || s.completed}
                    onClick={() => ref?.minutes != null && p.onSetChange(s.id, { minutes: ref.minutes })}
                    className="tnum flex h-[52px] w-full min-w-0 flex-col items-start justify-center overflow-hidden rounded-lg text-left text-[13px] font-medium text-muted enabled:hover:text-ink"
                    aria-label={ref ? `Last time ${refText(ref)}. Tap to copy.` : 'No previous session'}
                  >
                    {upNext && <span className="text-[10px] leading-tight font-bold tracking-[0.06em] whitespace-nowrap text-accent-ink uppercase">Up next</span>}
                    <span className="whitespace-nowrap">{refText(ref)}</span>
                  </button>
                  <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-1">
                    <button type="button" disabled={s.completed || mins <= 5} onClick={() => p.onSetChange(s.id, { minutes: Math.max(5, mins - 5) })} aria-label={`${label}: 5 minutes less`} className="flex h-11 items-center justify-center rounded-xl bg-surface-2 hover:bg-surface-3 disabled:opacity-35">
                      <Minus size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPad({ setId: s.id, field: 'minutes' })}
                      aria-label={`${label} minutes: ${mins}. Edit`}
                      className={clsx('stamp flex h-[52px] min-w-0 items-baseline justify-center gap-0.5 rounded-xl pt-3 text-[22px]', s.completed ? 'bg-transparent' : 'bg-surface-2 hover:bg-surface-3')}
                    >
                      {mins}
                      <span className="font-sans text-xs font-medium text-muted">min</span>
                    </button>
                    <button type="button" disabled={s.completed || mins >= 600} onClick={() => p.onSetChange(s.id, { minutes: Math.min(600, mins + 5) })} aria-label={`${label}: 5 minutes more`} className="flex h-11 items-center justify-center rounded-xl bg-surface-2 hover:bg-surface-3 disabled:opacity-35">
                      <Plus size={18} />
                    </button>
                  </div>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={s.completed}
                    aria-label={`${label} completed`}
                    onClick={() => toggle(s.id, s.completed)}
                    className={clsx(
                      'flex size-[52px] items-center justify-center rounded-xl transition-all active:scale-90',
                      s.completed ? 'animate-pop bg-good text-on-good' : upNext ? 'bg-accent text-on-accent' : 'bg-surface-2 text-muted hover:bg-surface-3 hover:text-ink',
                    )}
                  >
                    <Check size={24} strokeWidth={3} />
                  </button>
                </li>
              )
            })}
          </ul>
          <button onClick={() => p.onAddSet()} className="mt-1 flex h-12 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
            <Plus size={17} /> Add session
          </button>
        </div>
      ) : (
      <div className="px-2 pt-3 pb-2 sm:px-3">
        <div className={clsx(GRID, 'px-1 pb-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted uppercase')}>
          <span className="text-center">Set</span>
          <span>
            Last<span className="max-sm:hidden"> time</span>
          </span>
          <span className="text-center">{bodyweight ? `+${units}` : units}</span>
          <span className="text-center">Reps</span>
          <span className="sr-only">Done</span>
        </div>
        <ul className="flex flex-col gap-1">
          {ex.sets.map((s) => {
            const { n, text: label } = labelFor(s)
            const ref = refFor(s)
            const upNext = p.upNextSetId === s.id
            const wPlaceholder = ref?.weight != null && !(bodyweight && !ref.weight) ? formatWeight(ref.weight, units, false) : bodyweight ? '0' : '–'
            const rPlaceholder = ref?.reps != null ? String(ref.reps) : ex.repMin ? `${ex.repMin}–${ex.repMax}` : '–'
            const cell = (field: KeypadField, value: string | null, placeholder: string, aria: string) => (
              <button
                type="button"
                onClick={() => setPad({ setId: s.id, field })}
                aria-label={aria}
                className={clsx(
                  'stamp flex h-[52px] w-full min-w-0 items-center justify-center truncate rounded-xl text-[22px] transition-colors active:scale-[0.97]',
                  s.completed ? 'bg-transparent' : 'bg-surface-2 hover:bg-surface-3',
                  value == null && 'text-muted',
                  field === 'reps' && value == null && placeholder.includes('–') && 'text-base',
                )}
              >
                {value ?? placeholder}
              </button>
            )
            return (
              <li
                key={s.id}
                className={clsx(
                  GRID,
                  'relative rounded-xl px-1 py-1 transition-colors',
                  s.completed && 'bg-good-soft',
                  (flashId === s.id || flashFromPanel === s.id) && 'animate-flash',
                  upNext && 'ring-2 ring-accent ring-inset',
                )}
              >
                <button
                  onClick={() => setSetMenuFor(s.id)}
                  aria-label={`${label}${s.effort ? `, rated ${EFFORT_META[s.effort].label.toLowerCase()}` : ''}: change type or delete`}
                  className="relative flex h-11 w-11 items-center justify-center rounded-lg"
                >
                  <SetTypeBadge type={s.type} index={n} className="size-10" />
                  {s.effort && (
                    <span className="absolute -right-0.5 -bottom-0.5 flex size-[18px] items-center justify-center rounded-full bg-surface ring-1 ring-line">
                      <EffortShape effort={s.effort} size={10} />
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={!ref || s.completed}
                  onClick={() => ref && p.onSetChange(s.id, { weight: ref.weight, reps: ref.reps })}
                  className="tnum flex h-[52px] w-full min-w-0 flex-col items-start justify-center overflow-hidden rounded-lg text-left text-[13px] font-medium text-muted enabled:hover:text-ink"
                  aria-label={ref ? `Last time ${refText(ref)}. Tap to copy.` : 'No previous set'}
                >
                  {upNext && <span className="text-[10px] leading-tight font-bold tracking-[0.06em] whitespace-nowrap text-accent-ink uppercase">Up next</span>}
                  {ref ? (
                    <span className="flex min-w-0 flex-wrap leading-tight">
                      <span className="whitespace-nowrap">{bodyweight && !ref.weight ? 'BW' : formatWeight(ref.weight, units, false)}</span>
                      <span className="whitespace-nowrap">&nbsp;× {ref.reps}</span>
                    </span>
                  ) : (
                    <span>—</span>
                  )}
                </button>
                {cell('weight', s.weight == null ? null : formatWeight(s.weight, units, false), wPlaceholder, `${label} weight: ${s.weight == null ? 'empty' : formatWeight(s.weight, units)}. Edit`)}
                {cell('reps', s.reps == null ? null : String(s.reps), rPlaceholder, `${label} reps: ${s.reps ?? 'empty'}. Edit`)}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={s.completed}
                  aria-label={`${label} completed`}
                  onClick={() => toggle(s.id, s.completed)}
                  className={clsx(
                    'flex size-[52px] items-center justify-center rounded-xl transition-all active:scale-90',
                    s.completed ? 'animate-pop bg-good text-on-good' : upNext ? 'bg-accent text-on-accent' : 'bg-surface-2 text-muted hover:bg-surface-3 hover:text-ink',
                  )}
                >
                  <Check size={24} strokeWidth={3} />
                </button>
              </li>
            )
          })}
        </ul>
        <button
          onClick={() => p.onAddSet()}
          className="mt-1 flex h-12 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Plus size={17} /> Add set
        </button>
      </div>
      )}

      {padSet && pad && (
        <Keypad
          open
          onClose={() => setPad(null)}
          title={def?.name ?? 'Exercise'}
          subtitle={`${labelFor(padSet).text}${padRef ? ` · Last time ${refText(padRef)}` : ''}`}
          field={pad.field}
          onFieldChange={(field) => setPad({ ...pad, field })}
          weight={padSet.weight == null ? null : toDisplayWeight(padSet.weight, units)}
          reps={padSet.reps}
          minutes={padSet.minutes}
          effort={padSet.effort}
          onEffort={
            p.onEffort && padSet.minutes == null
              ? (e) => {
                  const wasDone = padSet.completed
                  p.onEffort!(padSet.id, e)
                  // In the live workout a rating is the last thing you do to a set: it logs it.
                  if (p.mode === 'live' && e && !wasDone) {
                    setFlashId(padSet.id)
                    setTimeout(() => setFlashId((f) => (f === padSet.id ? null : f)), 700)
                    setPad(null)
                  }
                }
              : undefined
          }
          weightPlaceholder={padRef?.weight != null ? String(toDisplayWeight(padRef.weight, units)) : undefined}
          repsPlaceholder={padRef?.reps != null ? String(padRef.reps) : undefined}
          unit={units}
          step={weightStep(units)}
          bodyweight={bodyweight}
          completed={padSet.completed}
          onChange={(patch) =>
            p.onSetChange(padSet.id, {
              ...(patch.weight !== undefined ? { weight: patch.weight == null ? null : fromDisplayWeight(patch.weight, units) } : {}),
              ...(patch.reps !== undefined ? { reps: patch.reps } : {}),
              ...(patch.minutes !== undefined ? { minutes: patch.minutes } : {}),
            })
          }
          onLog={
            p.mode === 'live'
              ? () => {
                  toggle(padSet.id, false)
                  setPad(null)
                }
              : undefined
          }
        />
      )}

      {/* Exercise menu */}
      <Modal open={menu} onClose={() => setMenu(false)} title={def?.name ?? 'Exercise'} size="sm">
        <div className="flex flex-col gap-2">
          {p.onRestChange && !aerobic && (
            <div className="rounded-2xl bg-surface-2 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Timer size={16} /> Rest after each set
              </div>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {REST_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => p.onRestChange!(r)}
                    aria-pressed={ex.restSec === r}
                    className={clsx('tnum h-11 rounded-xl text-sm font-semibold', ex.restSec === r ? 'bg-accent text-on-accent' : 'bg-surface text-ink-2 hover:text-ink')}
                  >
                    {fmtRest(r)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!aerobic && (
            <>
              <Button variant="secondary" size="lg" block className="justify-start" icon={<Flame size={18} />} onClick={() => { p.onAddSet('warmup'); setMenu(false) }}>
                Add warm-up set
              </Button>
              <Button variant="secondary" size="lg" block className="justify-start" icon={<TrendingDown size={18} />} onClick={() => { p.onAddSet('drop'); setMenu(false) }}>
                Add drop set
              </Button>
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" disabled={p.isFirst} icon={<ArrowUp size={18} />} onClick={() => { p.onMove(-1); setMenu(false) }}>
              Move up
            </Button>
            <Button variant="secondary" size="lg" disabled={p.isLast} icon={<ArrowDown size={18} />} onClick={() => { p.onMove(1); setMenu(false) }}>
              Move down
            </Button>
          </div>
          <Button variant="danger" size="lg" block className="justify-start" icon={<Trash2 size={18} />} onClick={() => { p.onRemove(); setMenu(false) }}>
            Remove exercise
          </Button>
        </div>
      </Modal>

      {/* Set type menu */}
      <Modal open={!!menuSet} onClose={() => setSetMenuFor(null)} title={menuSet?.minutes != null ? 'Session' : 'Set type'} size="sm">
        {menuSet && (
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Set type">
            {menuSet.minutes == null && (Object.keys(SET_TYPE_META) as SetType[]).map((t) => (
              <button
                key={t}
                role="radio"
                aria-checked={menuSet.type === t}
                onClick={() => {
                  p.onSetChange(menuSet.id, { type: t })
                  setSetMenuFor(null)
                }}
                className={clsx('flex min-h-14 items-center gap-3 rounded-2xl border p-3 text-left', menuSet.type === t ? 'border-accent bg-accent-soft/50' : 'border-line hover:bg-surface-2')}
              >
                <SetTypeBadge type={t} index={1} />
                <span>
                  <span className="block font-semibold">{SET_TYPE_META[t].label}</span>
                  <span className="block text-sm text-muted">{SET_TYPE_META[t].help}</span>
                </span>
              </button>
            ))}
            <Button
              variant="danger"
              size="lg"
              block
              className="mt-2"
              icon={<Trash2 size={18} />}
              onClick={() => {
                p.onRemoveSet(menuSet.id)
                setSetMenuFor(null)
              }}
            >
              {menuSet.minutes != null ? 'Delete session' : 'Delete set'}
            </Button>
          </div>
        )}
      </Modal>

      {/* Exercise info */}
      <Modal open={info} onClose={() => setInfo(false)} title={def?.name ?? 'Exercise'} size="sm">
        {def && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1.5">
              <MuscleTag muscle={def.primary} />
              {def.secondary.map((m) => (
                <MuscleTag key={m} muscle={m} />
              ))}
              <MuscleTag muscle={def.equipment} />
            </div>
            {def.cue && <blockquote className="rounded-2xl border-l-4 border-accent bg-surface-2 p-4 text-[15px]">{def.cue}</blockquote>}
            {prev.length > 0 && (
              <div>
                <div className="eyebrow mb-2 flex items-center gap-1.5">
                  <History size={13} /> Last session
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {prev.map((s) => (
                    <span key={s.id} className="tnum rounded-lg bg-surface-2 px-2 py-1 text-sm font-medium">
                      {formatWeight(s.weight, units, false)} × {s.reps}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <Link to={`/library/${def.id}`} className="text-sm font-semibold text-accent-ink hover:underline">
              Open exercise history
            </Link>
          </div>
        )}
      </Modal>
    </div>
  )
}
