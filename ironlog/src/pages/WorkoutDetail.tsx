import { format, parseISO } from 'date-fns'
import { ArrowLeft, Medal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExercisePicker } from '../components/ExercisePicker'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, SectionTitle, Textarea } from '../components/ui'
import { ExerciseCard } from '../components/workout/ExerciseCard'
import { SetTypeBadge } from '../components/workout/SetTypeBadge'
import { useExerciseMap } from '../hooks/useExercises'
import { completedSetCount, durationMs, e1rm, isDone, PR_LABEL, previousSets, prsForWorkout, workoutVolume } from '../lib/calc'
import { formatDuration } from '../lib/dates'
import { prValue } from '../lib/format'
import { uid } from '../lib/id'
import { normalizeSupersets } from '../lib/supersets'
import { formatEstimate, formatVolume, formatWeight } from '../lib/units'
import { useStore } from '../store/useStore'
import { toast } from '../store/useToast'
import { useFocusMode } from '../store/useUi'
import type { Workout, WorkoutExercise, WorkoutSet } from '../types'

function BackLink({ onClick }: { onClick?: (e: React.MouseEvent) => void }) {
  return (
    <Link to="/history" onClick={onClick} className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
      <ArrowLeft size={16} /> History
    </Link>
  )
}

function Editor({ workout, onDone }: { workout: Workout; onDone: () => void }) {
  const saveWorkout = useStore((s) => s.saveWorkout)
  const workouts = useStore((s) => s.workouts)
  const units = useStore((s) => s.settings.units)
  const map = useExerciseMap()
  const [draft, setDraft] = useState<Workout>(() => structuredClone(workout))
  const [start, setStart] = useState(format(parseISO(workout.startedAt), "yyyy-MM-dd'T'HH:mm"))
  const [minutes, setMinutes] = useState(String(Math.max(1, Math.round(durationMs(workout) / 60000))))
  const [picker, setPicker] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmLeave, setConfirmLeave] = useState<null | 'edit' | 'history'>(null)
  const [initial] = useState(() => JSON.stringify([draft, start, minutes]))
  const dirty = JSON.stringify([draft, start, minutes]) !== initial
  const navigate = useNavigate()
  useFocusMode()

  const mapEx = (exId: string, fn: (e: WorkoutExercise) => WorkoutExercise) =>
    setDraft((d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === exId ? fn(e) : e)) }))
  const mapSet = (exId: string, setId: string, fn: (s: WorkoutSet) => WorkoutSet) => mapEx(exId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? fn(s) : s)) }))

  const save = () => {
    const errs: Record<string, string> = {}
    const name = draft.name.trim()
    if (!name) errs.name = 'Give the workout a name.'
    const startDate = new Date(start)
    if (Number.isNaN(startDate.getTime())) errs.start = 'Enter a valid date and time.'
    else if (startDate.getTime() > Date.now() + 60000) errs.start = 'A logged workout can’t start in the future.'
    const mins = Number(minutes)
    if (!Number.isInteger(mins) || mins < 1 || mins > 600) errs.minutes = 'Duration must be between 1 and 600 minutes.'
    const exercises = draft.exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => s.completed && (s.reps ?? 0) > 0) })).filter((e) => e.sets.length)
    if (!exercises.length) errs.sets = 'Keep at least one completed set with reps, or delete the workout instead.'
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return
    saveWorkout({
      ...draft,
      name: name.slice(0, 60),
      notes: draft.notes?.trim() || undefined,
      startedAt: startDate.toISOString(),
      endedAt: new Date(startDate.getTime() + mins * 60000).toISOString(),
      exercises: exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, weight: s.weight ?? 0 })) })),
    })
    toast('Workout updated', { tone: 'success' })
    onDone()
  }

  return (
    <div className="animate-rise mx-auto max-w-3xl pb-32">
      <BackLink
        onClick={(e) => {
          if (!dirty) return
          e.preventDefault()
          setConfirmLeave('history')
        }}
      />
      <h1 className="mb-6 font-display text-4xl font-semibold tracking-wide uppercase">Edit workout</h1>
      <Card className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <Field label="Name" error={errors.name} className="sm:col-span-2">
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.name} value={draft.name} maxLength={60} onChange={(e) => { setDraft({ ...draft, name: e.target.value }); setErrors((er) => ({ ...er, name: '' })) }} />}
        </Field>
        <Field label="Started" error={errors.start}>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.start} type="datetime-local" value={start} onChange={(e) => { setStart(e.target.value); setErrors((er) => ({ ...er, start: '' })) }} />}
        </Field>
        <Field label="Duration (minutes)" error={errors.minutes}>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.minutes} inputMode="numeric" value={minutes} onChange={(e) => { setMinutes(e.target.value.replace(/\D/g, '').slice(0, 3)); setErrors((er) => ({ ...er, minutes: '' })) }} />}
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          {(id) => <Textarea id={id} value={draft.notes ?? ''} maxLength={2000} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />}
        </Field>
      </Card>

      <p className="mt-6 mb-3 text-sm text-muted">Only ticked sets are saved. Untick a set to drop it.</p>
      {errors.sets && (
        <p className="mb-3 rounded-xl bg-danger-soft p-3 text-sm text-danger" role="alert">
          {errors.sets}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {draft.exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            def={map.get(ex.exerciseId)}
            prev={previousSets(workouts, ex.exerciseId, workout.startedAt)}
            units={units}
            mode="edit"
            isFirst={i === 0}
            isLast={i === draft.exercises.length - 1}
            onSetChange={(setId, patch) => mapSet(ex.id, setId, (s) => ({ ...s, ...patch }))}
            onToggle={(setId) => mapSet(ex.id, setId, (s) => ({ ...s, completed: !s.completed }))}
            onAddSet={(type = 'normal') =>
              mapEx(ex.id, (e) => {
                const created: WorkoutSet = { id: uid('s'), type, weight: null, reps: null, completed: false }
                // Warm-ups go before the first working set, as in the live workout.
                const at = type === 'warmup' ? e.sets.findIndex((s) => s.type !== 'warmup') : -1
                return { ...e, sets: at < 0 ? [...e.sets, created] : [...e.sets.slice(0, at), created, ...e.sets.slice(at)] }
              })
            }
            onRemoveSet={(setId) => mapEx(ex.id, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) }))}
            onMove={(dir) =>
              setDraft((d) => {
                const list = [...d.exercises]
                const j = i + dir
                if (j < 0 || j >= list.length) return d
                ;[list[i], list[j]] = [list[j], list[i]]
                return { ...d, exercises: normalizeSupersets(list) }
              })
            }
            onRemove={() => setDraft((d) => ({ ...d, exercises: normalizeSupersets(d.exercises.filter((e) => e.id !== ex.id)) }))}
          />
        ))}
      </div>
      <Button variant="outline" block className="mt-3" icon={<Plus size={18} />} onClick={() => setPicker(true)}>
        Add exercise
      </Button>

      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] lg:left-[256px]">
        <div className="mx-auto flex max-w-3xl gap-2 rounded-3xl border border-line bg-surface/95 p-2 shadow-float backdrop-blur">
          <Button variant="secondary" size="lg" block onClick={() => (dirty ? setConfirmLeave('edit') : onDone())}>
            Cancel
          </Button>
          <Button size="lg" block onClick={save}>
            Save changes
          </Button>
        </div>
      </div>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(ids) =>
          setDraft((d) => ({
            ...d,
            exercises: [
              ...d.exercises,
              ...ids.map((exerciseId) => ({
                id: uid('we'),
                exerciseId,
                restSec: 90,
                sets: [{ id: uid('s'), type: 'normal' as const, weight: null, reps: null, completed: false }],
              })),
            ],
          }))
        }
      />
      <ConfirmDialog
        open={!!confirmLeave}
        onClose={() => setConfirmLeave(null)}
        onConfirm={() => (confirmLeave === 'history' ? navigate('/history') : onDone())}
        title="Discard changes?"
        message="Your edits to this workout haven’t been saved."
        confirmLabel="Discard"
      />
    </div>
  )
}

export default function WorkoutDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const workouts = useStore((s) => s.workouts)
  const units = useStore((s) => s.settings.units)
  const map = useExerciseMap()
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const w = workouts.find((x) => x.id === id)
  const prs = useMemo(() => (w ? prsForWorkout(workouts, w) : []), [w, workouts])

  if (!w)
    return (
      <div>
        <BackLink />
        <EmptyState icon={<Trash2 size={22} />} title="Workout not found" body="It may have been deleted." />
      </div>
    )

  if (editing) return <Editor workout={w} onDone={() => setEditing(false)} />

  const remove = () => {
    const snapshot = w
    useStore.getState().deleteWorkout(w.id)
    navigate('/history')
    toast('Workout deleted', { action: { label: 'Undo', run: () => useStore.setState((s) => ({ workouts: [...s.workouts, snapshot] })) } })
  }

  return (
    <div className="animate-rise mx-auto max-w-3xl">
      <BackLink />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[40px] leading-none font-semibold tracking-[0.03em] uppercase sm:text-5xl">{w.name}</h1>
          <p className="mt-2 text-muted">{format(parseISO(w.startedAt), "EEEE d MMMM yyyy 'at' HH:mm")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Pencil size={16} />} onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setConfirm(true)}>
            Delete
          </Button>
        </div>
      </div>

      <Card className="grid grid-cols-2 gap-y-2 p-1 sm:grid-cols-4">
        {[
          ['Duration', formatDuration(durationMs(w))],
          ['Volume', formatVolume(workoutVolume(w), units)],
          ['Sets', String(completedSetCount(w))],
          ['Exercises', String(w.exercises.length)],
        ].map(([k, v]) => (
          <div key={k} className="p-4">
            <div className="eyebrow">{k}</div>
            <div className="stamp mt-1.5 text-[28px]">{v}</div>
          </div>
        ))}
      </Card>

      {w.notes && <p className="mt-4 rounded-2xl bg-surface-2 p-4 text-[15px] text-ink-2">{w.notes}</p>}

      {prs.length > 0 && (
        <section className="mt-6">
          <SectionTitle>Records set</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {prs.map((e) => (
              <Badge key={`${e.exerciseId}-${e.kind}`} tone="accent" className="h-auto py-1.5">
                <Medal size={13} /> {map.get(e.exerciseId)?.name} · {PR_LABEL[e.kind]} {prValue(e, units)}
              </Badge>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 flex flex-col gap-3">
        {w.exercises.map((ex) => {
          let n = 0
          return (
            <Card key={ex.id} className="p-4">
              <Link to={`/library/${ex.exerciseId}`} className="inline-flex min-h-11 items-center font-semibold hover:underline">
                {map.get(ex.exerciseId)?.name ?? 'Deleted exercise'}
              </Link>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] tracking-wide text-muted uppercase">
                    <th className="w-12 pb-2 font-semibold">Set</th>
                    <th className="pb-2 font-semibold">Weight</th>
                    <th className="pb-2 font-semibold">Reps</th>
                    <th className="pb-2 text-right font-semibold">Est. 1RM</th>
                  </tr>
                </thead>
                <tbody className="tnum">
                  {ex.sets.filter(isDone).map((s) => {
                    if (s.type !== 'warmup') n++
                    return (
                      <tr key={s.id} className="border-t border-line">
                        <td className="py-1.5">
                          <SetTypeBadge type={s.type} index={n} className="size-7 text-base" />
                        </td>
                        <td className="stamp text-lg">{formatWeight(s.weight, units)}</td>
                        <td className="stamp text-lg">{s.reps}</td>
                        <td className="text-right text-muted">{s.weight ? formatEstimate(e1rm(s.weight, s.reps ?? 0), units) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
          )
        })}
      </section>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={remove}
        title="Delete workout?"
        message="This removes the workout and its sets from your history, charts and records."
        confirmLabel="Delete"
      />
    </div>
  )
}
