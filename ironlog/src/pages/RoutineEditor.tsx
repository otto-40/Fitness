import clsx from 'clsx'
import { ArrowDown, ArrowLeft, ArrowUp, Clock, Link2, Link2Off, ListPlus, Play, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExercisePicker } from '../components/ExercisePicker'
import { useStartWorkout } from '../components/StartWorkout'
import { Button, Card, ConfirmDialog, EmptyState, Field, IconButton, Input, MuscleTag, Select, Stepper, Switch, Textarea } from '../components/ui'
import { NumberField } from '../components/workout/NumberField'
import { useExerciseMap } from '../hooks/useExercises'
import { uid } from '../lib/id'
import { routineMinutes, routineMuscles } from '../lib/stats'
import { linkedToNext, normalizeSupersets, toggleLink } from '../lib/supersets'
import { useStore } from '../store/useStore'
import { toast } from '../store/useToast'
import { useFocusMode } from '../store/useUi'
import type { Routine, RoutineExercise } from '../types'
import { plural } from '../lib/format'

const REST = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300]
const restLabel = (s: number) => (s === 0 ? 'No rest' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min`)

function blankRoutine(): Routine {
  const now = new Date().toISOString()
  return { id: uid('rt'), name: '', notes: '', exercises: [], inPlan: false, createdAt: now, updatedAt: now }
}

export default function RoutineEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const routines = useStore((s) => s.routines)
  const defaultRest = useStore((s) => s.settings.defaultRestSec)
  const saveRoutine = useStore((s) => s.saveRoutine)
  const deleteRoutine = useStore((s) => s.deleteRoutine)
  const map = useExerciseMap()
  const isNew = id === 'new'
  const existing = routines.find((r) => r.id === id)
  const [draft, setDraft] = useState<Routine | null>(() => (isNew ? blankRoutine() : existing ? structuredClone(existing) : null))
  const [picker, setPicker] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; exercises?: string; rows?: Record<string, string> }>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [initial] = useState(() => JSON.stringify(draft))
  const dirty = !!draft && JSON.stringify(draft) !== initial
  const { start, dialog } = useStartWorkout()
  useFocusMode()

  const muscles = useMemo(() => (draft ? routineMuscles(draft, map) : []), [draft, map])

  // Closing the tab with unsaved edits gets the browser's own "leave page?" prompt.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (!draft)
    return (
      <EmptyState
        icon={<ListPlus size={22} />}
        title="Routine not found"
        body="It may have been deleted."
        action={
          <Button variant="secondary" onClick={() => navigate('/routines')}>
            Back to routines
          </Button>
        }
        className="mt-10"
      />
    )

  const setExercises = (fn: (list: RoutineExercise[]) => RoutineExercise[]) => setDraft((d) => (d ? { ...d, exercises: normalizeSupersets(fn(d.exercises)) } : d))
  const patchRow = (rowId: string, patch: Partial<RoutineExercise>) => {
    setExercises((list) => list.map((e) => (e.id === rowId ? { ...e, ...patch } : e)))
    if (errors.rows?.[rowId]) setErrors((er) => ({ ...er, rows: { ...er.rows, [rowId]: '' } }))
  }

  const validate = () => {
    const rows: Record<string, string> = {}
    for (const e of draft.exercises) {
      if (map.get(e.exerciseId)?.aerobic) {
        if (!e.minutes || e.minutes < 1 || e.minutes > 600) rows[e.id] = 'Minutes must be between 1 and 600.'
        continue
      }
      if (!e.sets || e.sets < 1 || e.sets > 10) rows[e.id] = 'Sets must be between 1 and 10.'
      else if (!e.repMin || !e.repMax || e.repMin < 1 || e.repMax > 100) rows[e.id] = 'Reps must be between 1 and 100.'
      else if (e.repMin > e.repMax) rows[e.id] = 'The minimum reps can’t be above the maximum.'
    }
    const errs = {
      name: draft.name.trim() ? undefined : 'Give the routine a name.',
      exercises: draft.exercises.length ? undefined : 'Add at least one exercise.',
      rows,
    }
    setErrors(errs)
    return !errs.name && !errs.exercises && !Object.keys(rows).length
  }

  const save = (thenStart = false) => {
    if (!validate()) {
      toast('Check the highlighted fields', { tone: 'error' })
      return
    }
    saveRoutine({ ...draft, name: draft.name.trim().slice(0, 60), notes: draft.notes?.trim() })
    toast(isNew ? 'Routine created' : 'Routine saved', { tone: 'success' })
    if (thenStart) start(draft.id)
    else navigate('/routines')
  }

  const leave = () => (dirty ? setConfirmLeave(true) : navigate('/routines'))

  const totalSets = draft.exercises.reduce((n, e) => n + (e.sets || 0), 0)

  return (
    <div className="animate-rise mx-auto max-w-3xl pb-32">
      <Link
        to="/routines"
        onClick={(e) => {
          if (!dirty) return
          e.preventDefault()
          setConfirmLeave(true)
        }}
        className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft size={16} /> Routines
      </Link>
      <h1 className="mb-6 font-display text-4xl font-semibold tracking-wide uppercase">{isNew ? 'New routine' : 'Edit routine'}</h1>

      <Card className="flex flex-col gap-4 p-4 sm:p-5">
        {draft.program && <p className="eyebrow text-accent-ink">{draft.program}</p>}
        <Field label="Name" error={errors.name}>
          {(fid, d) => (
            <Input
              id={fid}
              aria-describedby={d}
              aria-invalid={!!errors.name}
              value={draft.name}
              maxLength={60}
              placeholder="e.g. Upper Body Power"
              autoFocus={isNew}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          )}
        </Field>
        <Field label="Notes">
          {(fid) => <Textarea id={fid} value={draft.notes ?? ''} maxLength={1000} placeholder="Focus, tempo, anything to remember" onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />}
        </Field>
        <Switch checked={draft.inPlan} onChange={(v) => setDraft({ ...draft, inPlan: v })} label="Include in my plan" description="Plan routines rotate on the home screen as your next workout." />
      </Card>

      <div className="sticky top-2 z-20 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-surface/95 px-4 py-3 text-sm shadow-card backdrop-blur">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Clock size={16} /> ~{draft.exercises.length ? routineMinutes(draft) : 0} min
        </span>
        <span className="font-medium">
          {plural(draft.exercises.length, 'exercise')} · {plural(totalSets, 'set')}
        </span>
        <span className="flex flex-wrap gap-1.5">
          {muscles.length ? muscles.map((m) => <MuscleTag key={m} muscle={m} />) : <span className="text-muted">No muscles yet</span>}
        </span>
      </div>

      {errors.exercises && (
        <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger" role="alert">
          {errors.exercises}
        </p>
      )}

      <ol className="mt-4 flex flex-col">
        {draft.exercises.map((e, i) => {
          const def = map.get(e.exerciseId)
          const linked = linkedToNext(draft.exercises, i)
          const linkedPrev = linkedToNext(draft.exercises, i - 1)
          const rowErr = errors.rows?.[e.id]
          return (
            <li key={e.id} className="flex flex-col">
              <div
                className={clsx(
                  'relative rounded-2xl border bg-surface p-3 sm:p-4',
                  e.supersetId ? 'border-accent/60' : 'border-line',
                  linkedPrev && 'rounded-t-md',
                  linked && 'rounded-b-md',
                  rowErr && 'border-danger',
                )}
              >
                {e.supersetId && <span className="absolute top-3 bottom-3 left-0 w-1 rounded-r-full bg-accent" aria-hidden />}
                <div className="flex items-start gap-2">
                  <span className="tnum mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 font-display text-lg font-semibold">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{def?.name ?? 'Deleted exercise'}</div>
                    <div className="text-sm text-muted">
                      {def?.primary} · {def?.equipment}
                      {e.supersetId && <span className="font-semibold text-accent-ink"> · Superset</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0">
                    <IconButton size="sm" label="Move up" disabled={i === 0} onClick={() => setExercises((l) => { const c = [...l]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c })}>
                      <ArrowUp size={16} />
                    </IconButton>
                    <IconButton size="sm" label="Move down" disabled={i === draft.exercises.length - 1} onClick={() => setExercises((l) => { const c = [...l]; [c[i + 1], c[i]] = [c[i], c[i + 1]]; return c })}>
                      <ArrowDown size={16} />
                    </IconButton>
                    <IconButton size="sm" tone="danger" label={`Remove ${def?.name ?? 'exercise'}`} onClick={() => setExercises((l) => l.filter((x) => x.id !== e.id))}>
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </div>
                {def?.aerobic ? (
                  <div className="mt-3 grid grid-cols-[1fr_1fr] gap-2 sm:grid-cols-[180px_1fr]">
                    <div className="flex flex-col gap-1 text-xs font-medium text-muted">
                      Minutes
                      <Stepper label="Minutes" min={5} max={600} step={5} unit="min" value={e.minutes || def.defaultMinutes || 20} onChange={(v) => patchRow(e.id, { minutes: v })} />
                    </div>
                    <p className="self-end pb-2.5 text-xs text-muted">Aerobic — logged as minutes and counted toward your weekly target.</p>
                  </div>
                ) : (
                <div className="mt-3 grid grid-cols-[1fr_1.4fr] gap-2 sm:grid-cols-[132px_160px_1fr]">
                  <div className="flex flex-col gap-1 text-xs font-medium text-muted">
                    Sets
                    <Stepper label="Sets" min={1} max={10} value={e.sets || 1} onChange={(v) => patchRow(e.id, { sets: v })} />
                  </div>
                  <div className="flex flex-col gap-1 text-xs font-medium text-muted">
                    <span id={`reps-${e.id}`}>Rep range</span>
                    <div className="flex items-center gap-1.5" role="group" aria-labelledby={`reps-${e.id}`}>
                      <NumberField label="Minimum reps" decimal={false} max={100} value={e.repMin || null} onChange={(v) => patchRow(e.id, { repMin: v ?? 0 })} className="text-base" />
                      <span className="text-muted">–</span>
                      <NumberField label="Maximum reps" decimal={false} max={100} value={e.repMax || null} onChange={(v) => patchRow(e.id, { repMax: v ?? 0 })} className="text-base" />
                    </div>
                  </div>
                  <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-muted sm:col-span-1">
                    Rest
                    <Select value={e.restSec} onChange={(ev) => patchRow(e.id, { restSec: Number(ev.target.value) })}>
                      {REST.map((r) => (
                        <option key={r} value={r}>
                          {restLabel(r)}
                        </option>
                      ))}
                    </Select>
                  </label>
                </div>
                )}
                <Input
                  value={e.note ?? ''}
                  maxLength={200}
                  onChange={(ev) => patchRow(e.id, { note: ev.target.value || undefined })}
                  placeholder="Why it’s in the program (shown mid-workout)"
                  aria-label={`Note for ${def?.name ?? 'exercise'}`}
                  className="mt-2 text-sm"
                />
                {rowErr && <p className="mt-2 text-sm text-danger">{rowErr}</p>}
              </div>
              {i < draft.exercises.length - 1 && (
                <div className="relative flex justify-center py-1.5">
                  <span className={clsx('absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2', linked ? 'bg-accent' : 'bg-line')} aria-hidden />
                  <button
                    onClick={() => setExercises((l) => toggleLink(l, i))}
                    aria-pressed={linked}
                    className={clsx(
                      'relative inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors',
                      linked ? 'border-accent bg-accent text-on-accent' : 'border-line bg-bg text-muted hover:text-ink',
                    )}
                  >
                    {linked ? <Link2 size={14} /> : <Link2Off size={14} />}
                    {linked ? 'Superset — tap to unlink' : 'Link as superset'}
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <Button variant="outline" block size="lg" className="mt-3" icon={<Plus size={18} />} onClick={() => setPicker(true)}>
        Add exercises
      </Button>

      {!isNew && (
        <Button variant="ghost" className="mt-6 text-danger" icon={<Trash2 size={16} />} onClick={() => setConfirmDelete(true)}>
          Delete routine
        </Button>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] lg:left-[256px]">
        <div className="mx-auto flex max-w-3xl gap-2 rounded-3xl border border-line bg-surface/95 p-2 shadow-float backdrop-blur">
          <IconButton label="Cancel" size="lg" onClick={leave} className="size-13 bg-surface-2">
            <X size={20} />
          </IconButton>
          <Button variant="outline" size="lg" className="min-w-0 flex-1 px-3" icon={<Play size={16} />} onClick={() => save(true)}>
            Save & start
          </Button>
          <Button size="lg" className="min-w-0 flex-1 px-3" onClick={() => save()}>
            Save
          </Button>
        </div>
      </div>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(ids) =>
          setExercises((l) => [
            ...l,
            ...ids.map((exerciseId) => {
              const d = map.get(exerciseId)
              return d?.aerobic
                ? { id: uid('re'), exerciseId, sets: 1, repMin: 0, repMax: 0, restSec: 0, minutes: d.defaultMinutes ?? 20, supersetId: null }
                : { id: uid('re'), exerciseId, sets: 3, repMin: 8, repMax: 12, restSec: defaultRest, supersetId: null }
            }),
          ])
        }
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteRoutine(draft.id)
          toast('Routine deleted')
          navigate('/routines')
        }}
        title="Delete routine?"
        message="Workouts you already logged with it stay in your history."
        confirmLabel="Delete"
      />
      <ConfirmDialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={() => navigate('/routines')}
        title="Discard changes?"
        message="Your edits to this routine haven’t been saved."
        confirmLabel="Discard"
      />
      {dialog}
    </div>
  )
}
