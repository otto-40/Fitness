import clsx from 'clsx'
import { ArrowDown, ArrowUp, CalendarCheck, Clock, Copy, Dumbbell, ListPlus, MoreHorizontal, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStartWorkout } from '../components/StartWorkout'
import { Badge, Button, ConfirmDialog, EmptyState, IconButton, LinkButton, Modal, MuscleTag, PageHeader } from '../components/ui'
import { useExerciseMap } from '../hooks/useExercises'
import { WEEKDAY_SHORT } from '../lib/dates'
import { nextWorkout, routineMinutes, routineMuscles } from '../lib/stats'
import { useStore } from '../store/useStore'
import { toast } from '../store/useToast'
import type { Routine } from '../types'
import { plural } from '../lib/format'

export default function Routines() {
  const { routines, workouts, profile } = useStore()
  const { duplicateRoutine, moveRoutine, toggleInPlan, deleteRoutine } = useStore.getState()
  const map = useExerciseMap()
  const navigate = useNavigate()
  const { start, dialog } = useStartWorkout()
  const [menuFor, setMenuFor] = useState<Routine | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Routine | null>(null)
  const next = useMemo(() => nextWorkout(routines, workouts, profile), [routines, workouts, profile])
  const planCount = routines.filter((r) => r.inPlan).length
  const lastDone = useMemo(() => {
    const m = new Map<string, string>()
    for (const w of workouts) if (w.routineId && (!m.get(w.routineId) || w.startedAt > m.get(w.routineId)!)) m.set(w.routineId, w.startedAt)
    return m
  }, [workouts])

  const idx = menuFor ? routines.findIndex((r) => r.id === menuFor.id) : -1

  const plan = routines.filter((r) => r.inPlan)
  const weekly = plan.length > 0 && plan.every((r) => r.weekday != null)
  if (weekly) plan.sort((a, b) => ((a.weekday! + 6) % 7) - ((b.weekday! + 6) % 7))
  // Routines that belong to a named program (such as Sam's Weekly Workout) are listed together.
  const groups = useMemo(() => {
    const out: { label: string; program: boolean; items: Routine[] }[] = []
    for (const r of routines) {
      const label = r.program ?? 'Other routines'
      const g = out.find((x) => x.label === label) ?? out[out.push({ label, program: !!r.program, items: [] }) - 1]
      g.items.push(r)
    }
    return out.sort((a, b) => Number(b.program) - Number(a.program))
  }, [routines])

  return (
    <div className="animate-rise">
      <PageHeader
        title="Routines"
        subtitle={
          planCount
            ? `${planCount} in your plan · trains ${(weekly ? plan.map((r) => r.weekday!) : [...profile.trainingDays].sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7))).map((d) => WEEKDAY_SHORT[d]).join(', ') || 'no days set'}`
            : 'Add routines to your plan to get a “next workout” on the home screen.'
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <button onClick={() => start(null)} className="flex min-h-20 flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong active:scale-[0.99] sm:flex-row sm:items-center">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent">
            <Play size={18} fill="currentColor" />
          </span>
          <span>
            <span className="block font-semibold">Empty workout</span>
            <span className="block text-sm text-muted">Add exercises as you go</span>
          </span>
        </button>
        <Link to="/routines/new" className="flex min-h-20 flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong active:scale-[0.99] sm:flex-row sm:items-center">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink">
            <Plus size={20} />
          </span>
          <span>
            <span className="block font-semibold">New routine</span>
            <span className="block text-sm text-muted">Build a reusable session</span>
          </span>
        </Link>
      </div>

      {plan.length > 0 && (
        <section className="mb-6" aria-label="Plan rotation">
          <h2 className="eyebrow mb-3">{weekly ? `This week · ${plan[0].program ?? 'Weekly plan'}` : 'Plan rotation'}</h2>
          <ol className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {plan.map((r, i) => {
              const up = next?.routine.id === r.id
              return (
                <li key={r.id} className="shrink-0">
                  <Link
                    to={`/routines/${r.id}`}
                    className={clsx(
                      'flex h-12 items-center gap-2.5 rounded-full border pr-4 pl-1.5 text-sm font-semibold transition-colors',
                      up ? 'border-accent bg-accent-soft/60 text-ink' : 'border-line bg-surface text-ink-2 hover:text-ink',
                    )}
                  >
                    <span className={clsx('stamp flex size-9 items-center justify-center rounded-full', weekly ? 'text-sm' : 'text-lg', up ? 'bg-accent text-on-accent' : 'bg-surface-2')}>
                      {weekly ? WEEKDAY_SHORT[r.weekday!] : i + 1}
                    </span>
                    {weekly ? r.name.replace(/^\w+day — /, '') : r.name}
                    {r.optional && <span className="text-xs font-medium text-muted">optional</span>}
                    {up && <span className="text-xs font-bold tracking-[0.1em] text-accent-ink uppercase">Next</span>}
                  </Link>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {routines.length === 0 ? (
        <EmptyState
          icon={<ListPlus size={22} />}
          title="No routines yet"
          body="A routine is a reusable list of exercises with target sets, reps and rest. Build one to start sessions in a single tap."
          action={
            <LinkButton to="/routines/new" icon={<Plus size={18} />}>
              Create a routine
            </LinkButton>
          }
        />
      ) : (
        <>
          {groups.map((g) => (
          <section key={g.label} className="mb-8" aria-label={g.label}>
          <h2 className={clsx('eyebrow mb-3', g.program && 'text-accent-ink')}>
            {g.label} · {g.items.length}
          </h2>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {g.items.map((r) => {
              const muscles = routineMuscles(r, map)
              const isNext = next?.routine.id === r.id
              const sets = r.exercises.reduce((n, e) => n + (e.minutes ? 0 : e.sets), 0)
              const shown = r.exercises.slice(0, 4)
              return (
                <li key={r.id} className={clsx('flex min-w-0 flex-col rounded-2xl border bg-surface p-4 sm:p-5', isNext ? 'border-accent ring-1 ring-accent' : 'border-line')}>
                  <div className="flex items-start gap-2">
                    <Link to={`/routines/${r.id}`} className="flex min-h-11 min-w-0 flex-1 items-center hover:underline">
                      <h2 className="min-w-0 truncate font-display text-[26px] leading-tight font-semibold tracking-[0.03em] uppercase">{r.name}</h2>
                    </Link>
                    <IconButton label={`Options for ${r.name}`} onClick={() => setMenuFor(r)} className="-mt-1 -mr-2 size-11">
                      <MoreHorizontal size={20} />
                    </IconButton>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    {isNext && <Badge tone="solid">Up next</Badge>}
                    {r.inPlan && !isNext && (
                      <Badge>
                        <CalendarCheck size={12} /> In plan
                      </Badge>
                    )}
                    {r.optional && <Badge>Optional</Badge>}
                    <span className="inline-flex items-center gap-1">
                      <Dumbbell size={14} /> {plural(r.exercises.length, 'exercise')}
                      {sets > 0 && ` · ${plural(sets, 'set')}`}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={14} /> ~{routineMinutes(r)} min
                    </span>
                  </div>
                  {r.exercises.length ? (
                    <ul className="mt-3 flex flex-col gap-1 text-sm">
                      {shown.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-3">
                          <span className="truncate text-ink-2">{map.get(e.exerciseId)?.name ?? 'Deleted exercise'}</span>
                          <span className="tnum shrink-0 text-muted">
                            {e.minutes ? `${e.minutes} min` : `${e.sets} × ${e.repMin === e.repMax ? e.repMin : `${e.repMin}–${e.repMax}`}`}
                          </span>
                        </li>
                      ))}
                      {r.exercises.length > shown.length && <li className="text-muted">+{r.exercises.length - shown.length} more</li>}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-muted">No exercises yet.</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {muscles.map((m) => (
                      <MuscleTag key={m} muscle={m} />
                    ))}
                  </div>
                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <Button size="lg" variant={isNext ? 'primary' : 'secondary'} icon={<Play size={16} fill="currentColor" />} disabled={!r.exercises.length} onClick={() => start(r.id)} className="flex-1">
                      Start
                    </Button>
                    <LinkButton to={`/routines/${r.id}`} size="lg" variant="outline" icon={<Pencil size={16} />}>
                      Edit
                    </LinkButton>
                  </div>
                  {lastDone.get(r.id) && (
                    <p className="mt-2 text-xs text-muted">Last done {new Date(lastDone.get(r.id)!).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>
                  )}
                </li>
              )
            })}
          </ul>
          </section>
          ))}
        </>
      )}

      <Modal open={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.name ?? ''} size="sm">
        {menuFor && (
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              block
              className="justify-start"
              icon={<CalendarCheck size={18} />}
              onClick={() => {
                toggleInPlan(menuFor.id)
                toast(menuFor.inPlan ? 'Removed from your plan' : 'Added to your plan', { tone: 'success' })
                setMenuFor(null)
              }}
            >
              {menuFor.inPlan ? 'Remove from plan' : 'Add to plan'}
            </Button>
            <Button
              variant="secondary"
              block
              className="justify-start"
              icon={<Copy size={18} />}
              onClick={() => {
                const id = duplicateRoutine(menuFor.id)
                setMenuFor(null)
                toast('Routine duplicated', { tone: 'success', action: id ? { label: 'Edit', run: () => navigate(`/routines/${id}`) } : undefined })
              }}
            >
              Duplicate
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" disabled={idx <= 0} icon={<ArrowUp size={18} />} onClick={() => moveRoutine(menuFor.id, -1)}>
                Move up
              </Button>
              <Button variant="secondary" disabled={idx >= routines.length - 1} icon={<ArrowDown size={18} />} onClick={() => moveRoutine(menuFor.id, 1)}>
                Move down
              </Button>
            </div>
            <Button
              variant="danger"
              block
              className="justify-start"
              icon={<Trash2 size={18} />}
              onClick={() => {
                setConfirmDelete(menuFor)
                setMenuFor(null)
              }}
            >
              Delete routine
            </Button>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) return
          const snapshot = confirmDelete
          const at = routines.findIndex((r) => r.id === snapshot.id)
          deleteRoutine(snapshot.id)
          toast('Routine deleted', {
            action: {
              label: 'Undo',
              run: () =>
                useStore.setState((s) => {
                  const list = [...s.routines]
                  list.splice(at, 0, snapshot)
                  return { routines: list }
                }),
            },
          })
        }}
        title="Delete routine?"
        message={`“${confirmDelete?.name}” will be removed. Workouts you already logged with it stay in your history.`}
        confirmLabel="Delete"
      />
      {dialog}
    </div>
  )
}
