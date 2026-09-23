import clsx from 'clsx'
import { ChevronDown, Dumbbell, Link2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ExercisePicker } from '../components/ExercisePicker'
import { Button, ConfirmDialog, EmptyState, Field, IconButton, Input, Modal, Textarea } from '../components/ui'
import { ExerciseCard } from '../components/workout/ExerciseCard'
import { NowPanel } from '../components/workout/NowPanel'
import { nextUp } from '../lib/supersets'
import { useExerciseMap } from '../hooks/useExercises'
import { useNow } from '../hooks/useNow'
import { aerobicMinutes, completedSetCount, previousSets, workoutVolume } from '../lib/calc'
import { weekAerobicMinutes } from '../lib/stats'
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
  const aerobicTarget = useStore((s) => s.settings.aerobicTargetMin ?? 150)
  const a = useStore.getState()
  const map = useExerciseMap()
  const now = useNow(1000, !!active)
  const [picker, setPicker] = useState(false)
  const [menu, setMenu] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [editName, setEditName] = useState<string | null>(null)
  useWakeLock()
  const up = active ? nextUp(active.exercises) : null
  // Bring the next exercise into view when the session moves on to it (not on every set).
  const lastUpEx = useRef<string | null>(null)
  useEffect(() => {
    const id = up?.exId ?? null
    if (id && lastUpEx.current && id !== lastUpEx.current) {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      document.getElementById(`ex-${id}`)?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
    }
    lastUpEx.current = id
  }, [up?.exId])

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
  const hasAerobic = active.exercises.some((e) => e.sets.some((x) => x.minutes != null))
  const aerobicWeek = weekAerobicMinutes(workouts, new Date()) + aerobicMinutes(active)
  const doneSets = completedSetCount(active)
  const totalSets = active.exercises.reduce((n, e) => n + e.sets.length, 0)
  const tickedSets = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0)
  const pending = totalSets - tickedSets
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
      {/* Header: minimise, name + clock, options, and Finish kept at the top, away from the thumb. */}
      <div className="sticky top-0 z-30 -mx-4 bg-bg/90 px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex items-center gap-1">
          <IconButton label="Minimise workout" onClick={() => navigate('/')} className="-ml-2 size-11">
            <ChevronDown size={24} />
          </IconButton>
          <h1 className="min-w-0 flex-1">
            <button onClick={() => setEditName(active.name)} className="group w-full min-w-0 text-left" aria-label={`Workout name: ${active.name}. Tap to rename.`}>
              <span className="block truncate text-[13px] font-semibold text-muted">{active.name}</span>
              <span className="stamp block text-[32px] leading-none" role="timer" aria-label={`Elapsed ${clock(elapsed)}`}>
                {clock(elapsed)}
              </span>
            </button>
          </h1>
          <IconButton label="Workout options" onClick={() => setMenu(true)} className="size-11">
            <MoreHorizontal size={22} />
          </IconButton>
          <Button size="sm" onClick={onFinishClick} className="h-11 px-4">
            Finish
          </Button>
        </div>
        {/* One segment per exercise, filled by its logged sets (Peloton-style block progress). */}
        <div className="mt-2.5 flex gap-1" role="progressbar" aria-label="Sets completed" aria-valuemin={0} aria-valuemax={totalSets} aria-valuenow={tickedSets}>
          {active.exercises.map((e) => {
            const d = e.sets.filter((x) => x.completed).length
            return (
              <span key={e.id} className="h-1.5 min-w-2 overflow-hidden rounded-full bg-surface-3" style={{ flexGrow: Math.max(1, e.sets.length) }}>
                <span className={clsx('block h-full rounded-full transition-[width] duration-300', d === e.sets.length && d > 0 ? 'bg-good' : 'bg-accent')} style={{ width: `${e.sets.length ? (d / e.sets.length) * 100 : 0}%` }} />
              </span>
            )
          })}
          {!active.exercises.length && <span className="h-1.5 flex-1 rounded-full bg-surface-3" />}
        </div>
        <dl className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm whitespace-nowrap">
          {(!hasAerobic || active.exercises.some((e) => e.sets.some((x) => x.minutes == null))) && (
            <div className="flex items-baseline gap-1.5">
              <dt className="eyebrow">Volume</dt>
              <dd className="stamp text-lg">{formatVolume(volume, units)}</dd>
            </div>
          )}
          <div className="flex items-baseline gap-1.5">
            <dt className="eyebrow">Sets</dt>
            <dd className="stamp text-lg" aria-live="polite">
              {doneSets}/{totalSets}
            </dd>
          </div>
          {hasAerobic && (
            <div className="flex items-baseline gap-1.5">
              <dt className="eyebrow">Aerobic week</dt>
              <dd className="stamp text-lg">
                {aerobicWeek}/{aerobicTarget}
                <span className="ml-0.5 font-sans text-xs text-muted">min</span>
              </dd>
            </div>
          )}
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
          const cards = g.items.map((ex, i) => {
            exIndex++
            const idx = exIndex
            return (
              <div key={ex.id} className="relative">
                {isSuperset && i > 0 && (
                  <span className="absolute -top-3 left-1/2 z-10 flex size-6 -translate-x-1/2 items-center justify-center rounded-full bg-accent text-on-accent" aria-hidden>
                    <Link2 size={13} />
                  </span>
                )}
                <ExerciseCard
                  ex={ex}
                  def={map.get(ex.exerciseId)}
                  prev={prevByExercise.get(ex.exerciseId) ?? []}
                  units={units}
                  mode="live"
                  isFirst={idx === 0}
                  isLast={idx === active.exercises.length - 1}
                  upNextSetId={ex.id === up?.exId ? up.setId : null}
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
                  onEffort={(setId, e) => {
                    const r = useStore.getState().rateSet(ex.id, setId, e)
                    if (!r.ok && r.message) toast(r.message, { tone: 'error' })
                  }}
                />
              </div>
            )
          })
          return isSuperset ? (
            <section key={g.id} aria-label="Superset" className="relative -mx-2 rounded-[26px] bg-accent-soft/50 p-1 pl-2.5 sm:mx-0 sm:p-1.5 sm:pl-3">
              <span className="absolute top-4 bottom-4 left-1 w-1 rounded-full bg-accent" aria-hidden />
              <div className="flex items-center gap-2 px-1.5 pt-1 pb-2 text-xs font-bold tracking-[0.1em] text-accent-ink uppercase">
                <Link2 size={14} /> Superset · rest after the last exercise
              </div>
              <div className="flex flex-col gap-3">{cards}</div>
            </section>
          ) : (
            cards
          )
        })}
        {active.exercises.length > 0 && (
          <button
            onClick={() => setPicker(true)}
            className="flex h-14 items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-line-strong text-[15px] font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent-ink"
          >
            <Plus size={19} /> Add exercise
          </button>
        )}
      </div>

      {/* Thumb zone: log the next set, rest, or wrap up. */}
      <NowPanel onAddExercise={() => setPicker(true)} onFinish={onFinishClick} />

      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={(ids) => a.addExercisesToActive(ids)} />

      <Modal open={menu} onClose={() => setMenu(false)} title="Workout" size="sm">
        <div className="flex flex-col gap-3">
          <Field label="Notes">
            {(id) => (
              <Textarea id={id} value={active.notes ?? ''} maxLength={1000} onChange={(e) => a.setActiveNotes(e.target.value)} placeholder="How did it feel? Anything to remember next time?" />
            )}
          </Field>
          <Button variant="secondary" size="lg" block icon={<Pencil size={18} />} onClick={() => { setMenu(false); setEditName(active.name) }}>
            Rename workout
          </Button>
          <Button variant="danger" size="lg" block icon={<Trash2 size={18} />} onClick={() => { setMenu(false); setConfirmDiscard(true) }}>
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
          <Button block size="lg" type="submit" form="rename-form">
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
