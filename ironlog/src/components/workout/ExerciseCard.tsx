import clsx from 'clsx'
import { ArrowDown, ArrowUp, Check, Flame, Info, MoreHorizontal, Plus, Timer, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { referenceSet } from '../../store/useStore'
import type { Exercise, SetType, Units, WorkoutExercise, WorkoutSet } from '../../types'
import { formatWeight, fromDisplayWeight, toDisplayWeight } from '../../lib/units'
import { Button, IconButton, Modal, MuscleTag } from '../ui'
import { NumberField } from './NumberField'
import { SET_TYPE_META, SetTypeBadge } from './SetTypeBadge'

type SetPatch = Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'type'>>

export interface ExerciseCardProps {
  ex: WorkoutExercise
  def: Exercise | undefined
  prev: WorkoutSet[]
  units: Units
  mode: 'live' | 'edit'
  isFirst: boolean
  isLast: boolean
  onSetChange: (setId: string, patch: SetPatch) => void
  onToggle: (setId: string) => void
  onAddSet: (type?: SetType) => void
  onRemoveSet: (setId: string) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  onRestChange?: (sec: number) => void
}

const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300]

function fmtRest(sec: number) {
  if (!sec) return 'Off'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

export function ExerciseCard(p: ExerciseCardProps) {
  const { ex, def, prev, units } = p
  const [menu, setMenu] = useState(false)
  const [info, setInfo] = useState(false)
  const [setMenuFor, setSetMenuFor] = useState<string | null>(null)
  const bodyweight = def?.equipment === 'Bodyweight'
  const done = ex.sets.filter((s) => s.completed).length
  let workingIndex = 0
  const menuSet = ex.sets.find((s) => s.id === setMenuFor)

  return (
    <div className="rounded-2xl border border-line bg-surface">
      <div className="flex items-start gap-2 px-3 pt-3 sm:px-4">
        <button onClick={() => setInfo(true)} className="group min-w-0 flex-1 rounded-lg py-1 text-left">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[17px] font-semibold group-hover:underline">{def?.name ?? 'Deleted exercise'}</span>
            <Info size={15} className="shrink-0 text-muted" />
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
            <span>{def?.primary}</span>
            {ex.repMin && ex.repMax ? <span>· Target {ex.repMin === ex.repMax ? ex.repMin : `${ex.repMin}–${ex.repMax}`} reps</span> : null}
            {p.mode === 'live' && (
              <span className="inline-flex items-center gap-1">
                · <Timer size={13} /> {fmtRest(ex.restSec)}
              </span>
            )}
          </span>
        </button>
        <span className={clsx('tnum mt-1.5 rounded-md px-1.5 py-0.5 text-xs font-semibold', done === ex.sets.length && done > 0 ? 'bg-good-soft text-good' : 'bg-surface-2 text-muted')}>
          {done}/{ex.sets.length}
        </span>
        <IconButton label={`Options for ${def?.name ?? 'exercise'}`} onClick={() => setMenu(true)}>
          <MoreHorizontal size={20} />
        </IconButton>
      </div>

      <div className="px-2 pt-2 pb-2 sm:px-3">
        <div className="grid grid-cols-[36px_minmax(0,1fr)_minmax(0,68px)_minmax(0,56px)_44px] items-center gap-2 px-1 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
          <span className="text-center">Set</span>
          <span>Last time</span>
          <span className="text-center">{bodyweight ? `+${units}` : units}</span>
          <span className="text-center">Reps</span>
          <span className="sr-only">Done</span>
        </div>
        <ul className="flex flex-col gap-1">
          {ex.sets.map((s) => {
            if (s.type !== 'warmup') workingIndex++
            const ref = referenceSet(prev, ex, s)
            const refText = ref ? `${bodyweight && !ref.weight ? 'BW' : formatWeight(ref.weight, units, false)} × ${ref.reps}` : '—'
            const label = s.type === 'normal' ? `Set ${workingIndex}` : `${SET_TYPE_META[s.type].label} set`
            return (
              <li
                key={s.id}
                className={clsx(
                  'grid grid-cols-[36px_minmax(0,1fr)_minmax(0,68px)_minmax(0,56px)_44px] items-center gap-2 rounded-xl px-1 py-1 transition-colors',
                  s.completed && 'bg-good-soft',
                )}
              >
                <button onClick={() => setSetMenuFor(s.id)} aria-label={`${label}: change type or delete`} className="rounded-lg">
                  <SetTypeBadge type={s.type} index={workingIndex} />
                </button>
                <button
                  type="button"
                  disabled={!ref || s.completed}
                  onClick={() => ref && p.onSetChange(s.id, { weight: ref.weight, reps: ref.reps })}
                  className="tnum truncate rounded-lg py-2 text-left text-[13px] font-medium text-muted enabled:hover:text-ink"
                  aria-label={ref ? `Last time ${refText}. Tap to copy.` : 'No previous set'}
                >
                  {refText}
                </button>
                <NumberField
                  label={`${label} weight in ${units}`}
                  value={s.weight == null ? null : toDisplayWeight(s.weight, units)}
                  placeholder={ref?.weight != null && !(bodyweight && !ref.weight) ? formatWeight(ref.weight, units, false) : bodyweight ? '0' : ''}
                  onChange={(v) => p.onSetChange(s.id, { weight: v == null ? null : fromDisplayWeight(v, units) })}
                  className={clsx(s.completed && 'bg-transparent')}
                />
                <NumberField
                  label={`${label} reps`}
                  decimal={false}
                  max={999}
                  value={s.reps}
                  placeholder={ref?.reps != null ? String(ref.reps) : ex.repMin ? `${ex.repMin}–${ex.repMax}` : ''}
                  onChange={(v) => p.onSetChange(s.id, { reps: v })}
                  className={clsx(s.completed && 'bg-transparent', 'placeholder:text-[13px]')}
                />
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={s.completed}
                  aria-label={`${label} completed`}
                  onClick={() => p.onToggle(s.id)}
                  className={clsx(
                    'flex size-11 items-center justify-center rounded-xl transition-all active:scale-90',
                    s.completed ? 'animate-pop bg-good text-white dark:text-[#0e0f11]' : 'bg-surface-2 text-muted hover:bg-surface-3 hover:text-ink',
                  )}
                >
                  <Check size={22} strokeWidth={3} />
                </button>
              </li>
            )
          })}
        </ul>
        <button
          onClick={() => p.onAddSet()}
          className="mt-1 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Plus size={17} /> Add set
        </button>
      </div>

      {/* Exercise menu */}
      <Modal open={menu} onClose={() => setMenu(false)} title={def?.name ?? 'Exercise'} size="sm">
        <div className="flex flex-col gap-2">
          {p.onRestChange && (
            <div className="rounded-2xl bg-surface-2 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Timer size={16} /> Rest after each set
              </div>
              <div className="flex flex-wrap gap-1.5">
                {REST_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => p.onRestChange!(r)}
                    aria-pressed={ex.restSec === r}
                    className={clsx(
                      'tnum h-9 min-w-12 rounded-lg px-2 text-sm font-semibold',
                      ex.restSec === r ? 'bg-ink text-bg' : 'bg-surface text-ink-2 hover:text-ink',
                    )}
                  >
                    {fmtRest(r)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Button variant="secondary" block className="justify-start" icon={<Flame size={18} />} onClick={() => { p.onAddSet('warmup'); setMenu(false) }}>
            Add warm-up set
          </Button>
          <Button variant="secondary" block className="justify-start" icon={<Plus size={18} />} onClick={() => { p.onAddSet('drop'); setMenu(false) }}>
            Add drop set
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" disabled={p.isFirst} icon={<ArrowUp size={18} />} onClick={() => { p.onMove(-1); setMenu(false) }}>
              Move up
            </Button>
            <Button variant="secondary" disabled={p.isLast} icon={<ArrowDown size={18} />} onClick={() => { p.onMove(1); setMenu(false) }}>
              Move down
            </Button>
          </div>
          <Button variant="danger" block className="justify-start" icon={<Trash2 size={18} />} onClick={() => { p.onRemove(); setMenu(false) }}>
            Remove exercise
          </Button>
        </div>
      </Modal>

      {/* Set type menu */}
      <Modal open={!!menuSet} onClose={() => setSetMenuFor(null)} title="Set type" size="sm">
        {menuSet && (
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Set type">
            {(Object.keys(SET_TYPE_META) as SetType[]).map((t) => (
              <button
                key={t}
                role="radio"
                aria-checked={menuSet.type === t}
                onClick={() => {
                  p.onSetChange(menuSet.id, { type: t })
                  setSetMenuFor(null)
                }}
                className={clsx(
                  'flex items-center gap-3 rounded-2xl border p-3 text-left',
                  menuSet.type === t ? 'border-accent bg-accent-soft/50' : 'border-line hover:bg-surface-2',
                )}
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
              block
              className="mt-2"
              icon={<Trash2 size={18} />}
              onClick={() => {
                p.onRemoveSet(menuSet.id)
                setSetMenuFor(null)
              }}
            >
              Delete set
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
            {def.cue && (
              <blockquote className="rounded-2xl border-l-4 border-accent bg-surface-2 p-4 text-[15px]">{def.cue}</blockquote>
            )}
            {prev.length > 0 && (
              <div>
                <div className="mb-1 text-sm font-medium text-muted">Last session</div>
                <p className="tnum text-[15px]">{prev.map((s) => `${formatWeight(s.weight, units, false)}×${s.reps}`).join('  ·  ')}</p>
              </div>
            )}
            {p.mode === 'edit' && (
              <Link to={`/library/${def.id}`} className="text-sm font-semibold text-accent-ink hover:underline">
                Open exercise history
              </Link>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
