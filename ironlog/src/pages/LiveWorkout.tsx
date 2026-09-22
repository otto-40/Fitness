import clsx from 'clsx'
import { ChevronDown, Dumbbell, Flag, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ExercisePicker } from '../components/ExercisePicker'
import { ConfirmDialog, Button, EmptyState, Field, IconButton, Input, Modal, Textarea } from '../components/ui'
import { ExerciseCard } from '../components/workout/ExerciseCard'
import { RestDock } from '../components/workout/RestDock'
import { useExerciseMap } from '../hooks/useExercises'
import { useNow } from '../hooks/useNow'
import { completedSetCount, previousSets, workoutVolume } from '../lib/calc'
import { clock } from '../lib/dates'
import { formatVolume } from '../lib/units'
import { useStore } from '../store/useStore'
import { toast } from '../store/useToast'
import type { WorkoutExercise } from '../types'

/** Keeps the phone screen awake during a session where supported. */
function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    const request = () =>
      nav.wakeLock
        ?.request('screen')
        .then((l) => (lock = l))
        .catch(() => {})
    request()
    const onVis = () => document.visibilityState === 'visible' && request()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      lock?.release().catch(() => {})
    }
  }, [])
}

function groupSupersets(list: WorkoutExercise[]) {
  const groups: { id: string; items: WorkoutExercise[] }[] = []
  for (const ex of list) {
    const last = groups.at(-1)
    if (ex.supersetId && last && last.items[0].supersetId === ex.supersetId) last.items.push(ex)
    else groups.push({ id: ex.id, items: [ex] })
  }
  return groups
}

export default function LiveWorkout() {
  const navigate = useNavigate()
  const active = useStore((s) => s.active)
  const workouts = useStore((s) => s.workouts)
  const units = useStore((s) => s.settings.units)
  const a = useStore.getState()
  const map = useExerciseMap()
  const now = useNow(1000, !!active)
  const [picker, setPicker] = useState(false)
  const [menu, setMenu] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [editName, setEditName] = useState<string | null>(null)
  useWakeLock()

  const prevByExercise = useMemo(() => {
    const m = new Map<string, ReturnType<typeof previousSets>>()
    for (const ex of active?.exercises ?? []) if (!m.has(ex.exerciseId)) m.set(ex.exerciseId, previousSets(workouts, ex.exerciseId))
    return m
  }, [active?.exercises, workouts])

  if (!active) {
    return (
      <div className="pt-10">
        <EmptyState
          icon={<Dumbbell size={22} />}
          title="No workout running"
          body="Start one of your routines, or begin an empty session and add exercises as you go."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/routines" className="inline-flex h-11 items-center rounded-xl bg-surface-2 px-4 font-semibold hover:bg-surface-3">
                Choose a routine
              </Link>
              <Button icon={<Plus size={18} />} onClick={() => a.startWorkout(null)}>
                Empty workout
              </Button>
            </div>
          }
        />
      </div>
    )
  }

  const elapsed = now - new Date(active.startedAt).getTime()
  const volume = workoutVolume(active)
  const doneSets = completedSetCount(active)
  const totalSets = active.exercises.reduce((n, e) => n + e.sets.length, 0)
  const pending = totalSets - active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0)
  const groups = groupSupersets(active.exercises)

  const finish = () => {
    const id = useStore.getState().finishWorkout()
    if (id) navigate(`/workout/summary/${id}`, { replace: true })
  }

  const onFinishClick = () => {
    if (doneSets === 0) {
      toast('Complete at least one set, or discard the workout from the menu.', { tone: 'error' })
      return
    }
    if (pending > 0) setConfirmFinish(true)
    else finish()
  }

  let exIndex = -1

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-line bg-bg/95 px-4 pt-3 pb-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex items-center gap-2">
          <IconButton label="Minimise workout" onClick={() => navigate('/')}>
            <ChevronDown size={22} />
          </IconButton>
          <button onClick={() => setEditName(active.name)} className="group min-w-0 flex-1 text-left" aria-label={`Workout name: ${active.name}. Tap to rename.`}>
            <span className="flex items-center gap-1.5">
              <span className="truncate font-display text-2xl leading-tight font-semibold tracking-wide uppercase">{active.name}</span>
              <Pencil size={14} className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
          </button>
          <IconButton label="Workout options" onClick={() => setMenu(true)}>
            <MoreHorizontal size={22} />
          </IconButton>
          <Button size="sm" onClick={onFinishClick} className="max-sm:hidden">
            Finish
          </Button>
        </div>
        <dl className="mt-2 grid grid-cols-3 gap-2">
          {[
            ['Duration', clock(elapsed)],
            ['Volume', formatVolume(volume, units)],
            ['Sets', `${doneSets}/${totalSets}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-surface px-3 py-2">
              <dt className="text-[11px] font-semibold tracking-wide text-muted uppercase">{k}</dt>
              <dd className="tnum font-display text-xl leading-tight font-semibold" aria-live={k === 'Sets' ? 'polite' : undefined}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Exercises */}
      <div className="mt-4 flex flex-col gap-3">
        {active.exercises.length === 0 && (
          <EmptyState
            icon={<Dumbbell size={22} />}
            title="Empty workout"
            body="Add your first exercise to start logging sets. The rest timer starts automatically when you tick a set."
            action={
              <Button icon={<Plus size={18} />} onClick={() => setPicker(true)}>
                Add exercise
              </Button>
            }
          />
        )}
        {groups.map((g) => {
          const isSuperset = g.items.length > 1
          const cards = g.items.map((ex) => {
            exIndex++
            const idx = exIndex
            return (
              <ExerciseCard
                key={ex.id}
                ex={ex}
                def={map.get(ex.exerciseId)}
                prev={prevByExercise.get(ex.exerciseId) ?? []}
                units={units}
                mode="live"
                isFirst={idx === 0}
                isLast={idx === active.exercises.length - 1}
                onSetChange={(setId, patch) => a.updateSet(ex.id, setId, patch)}
                onToggle={(setId) => {
                  const r = useStore.getState().completeSet(ex.id, setId)
                  if (!r.ok && r.message) toast(r.message, { tone: 'error' })
                }}
                onAddSet={(type) => a.addSet(ex.id, type)}
                onRemoveSet={(setId) => a.removeSet(ex.id, setId)}
                onMove={(dir) => a.moveActiveExercise(ex.id, dir)}
                onRemove={() => {
                  const snapshot = useStore.getState().active
                  a.removeActiveExercise(ex.id)
                  toast(`${map.get(ex.exerciseId)?.name ?? 'Exercise'} removed`, {
                    action: { label: 'Undo', run: () => snapshot && useStore.setState({ active: { ...snapshot, rest: useStore.getState().active?.rest ?? null } }) },
                  })
                }}
                onRestChange={(sec) => a.setActiveRest(ex.id, sec)}
              />
            )
          })
          return isSuperset ? (
            <section key={g.id} aria-label="Superset" className="rounded-3xl border-2 border-dashed border-accent/50 p-1.5">
              <div className="flex items-center gap-2 px-2.5 pt-1 pb-2 text-xs font-bold tracking-[0.1em] text-accent-ink uppercase">
                Superset · {g.items.length} exercises back to back
              </div>
              <div className="flex flex-col gap-1.5">{cards}</div>
            </section>
          ) : (
            cards
          )
        })}
      </div>

      {/* Bottom dock: rest timer + thumb-reach actions */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 px-3 lg:left-[248px]">
        <RestDock />
        <div className="mx-auto mb-3 flex w-full max-w-3xl gap-2 rounded-2xl border border-line bg-surface/95 p-2 shadow-card backdrop-blur">
          <Button variant="secondary" size="lg" className="flex-1" icon={<Plus size={20} />} onClick={() => setPicker(true)}>
            Exercise
          </Button>
          <Button size="lg" className={clsx('flex-1')} icon={<Flag size={18} />} onClick={onFinishClick}>
            Finish
          </Button>
        </div>
      </div>

      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={(ids) => a.addExercisesToActive(ids)} />

      <Modal open={menu} onClose={() => setMenu(false)} title="Workout" size="sm">
        <div className="flex flex-col gap-3">
          <Field label="Notes">
            {(id) => (
              <Textarea id={id} value={active.notes ?? ''} maxLength={1000} onChange={(e) => a.setActiveNotes(e.target.value)} placeholder="How did it feel? Anything to remember next time?" />
            )}
          </Field>
          <Button variant="secondary" block icon={<Pencil size={18} />} onClick={() => { setMenu(false); setEditName(active.name) }}>
            Rename workout
          </Button>
          <Button variant="danger" block icon={<Trash2 size={18} />} onClick={() => { setMenu(false); setConfirmDiscard(true) }}>
            Discard workout
          </Button>
        </div>
      </Modal>

      <Modal
        open={editName !== null}
        onClose={() => setEditName(null)}
        title="Rename workout"
        size="sm"
        footer={
          <Button
            block
            type="submit"
            form="rename-form"
          >
            Save
          </Button>
        }
      >
        <form
          id="rename-form"
          onSubmit={(e) => {
            e.preventDefault()
            const n = (editName ?? '').trim()
            if (!n) return
            a.renameActive(n.slice(0, 60))
            setEditName(null)
          }}
        >
          <Input data-autofocus value={editName ?? ''} maxLength={60} onChange={(e) => setEditName(e.target.value)} aria-label="Workout name" />
          {editName !== null && !editName.trim() && <p className="mt-2 text-sm text-danger">Name can’t be empty.</p>}
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          a.discardWorkout()
          toast('Workout discarded')
          navigate('/')
        }}
        title="Discard workout?"
        message={`All ${doneSets} logged sets from this session will be lost. This can’t be undone.`}
        confirmLabel="Discard"
      />
      <ConfirmDialog
        open={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        onConfirm={finish}
        tone="primary"
        title="Finish workout?"
        message={`${pending} unticked ${pending === 1 ? 'set' : 'sets'} will be left out. Only completed sets are saved.`}
        confirmLabel="Finish"
      />
    </div>
  )
}
