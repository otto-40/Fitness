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

  return (
    <div className="animate-rise">
      <PageHeader
        title="Routines"
        subtitle={
          planCount
            ? `${planCount} in your plan · trains ${profile.trainingDays.map((d) => WEEKDAY_SHORT[d]).join(', ') || 'no days set'}`
            : 'Add routines to your plan to get a “next workout” on the home screen.'
        }
        actions={
          <LinkButton to="/routines/new" icon={<Plus size={18} />}>
            New routine
          </LinkButton>
        }
      />

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
          <p className="mb-3 text-sm text-muted">Routines in your plan rotate in the order shown. Use the menu to reorder.</p>
          <ul className="grid gap-3 md:grid-cols-2">
            {routines.map((r) => {
              const muscles = routineMuscles(r, map)
              const isNext = next?.routine.id === r.id
              const sets = r.exercises.reduce((n, e) => n + e.sets, 0)
              return (
                <li key={r.id} className={clsx('flex flex-col rounded-2xl border bg-surface p-4 sm:p-5', isNext ? 'border-accent ring-1 ring-accent' : 'border-line')}>
                  <div className="flex items-start gap-2">
                    <Link to={`/routines/${r.id}`} className="min-w-0 flex-1 hover:underline">
                      <h2 className="truncate font-display text-2xl leading-tight font-semibold tracking-wide uppercase">{r.name}</h2>
                    </Link>
                    <IconButton label={`Options for ${r.name}`} onClick={() => setMenuFor(r)} className="-mt-1 -mr-2">
                      <MoreHorizontal size={20} />
                    </IconButton>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                    {isNext && <Badge tone="accent">Up next</Badge>}
                    {r.inPlan && !isNext && (
                      <Badge>
                        <CalendarCheck size={12} /> In plan
                      </Badge>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Dumbbell size={14} /> {r.exercises.length} exercises · {sets} sets
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={14} /> ~{routineMinutes(r)} min
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-ink-2">
                    {r.exercises.length ? r.exercises.map((e) => map.get(e.exerciseId)?.name ?? 'Deleted exercise').join(' · ') : 'No exercises yet.'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {muscles.map((m) => (
                      <MuscleTag key={m} muscle={m} />
                    ))}
                  </div>
                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <Button icon={<Play size={16} fill="currentColor" />} disabled={!r.exercises.length} onClick={() => start(r.id)} className="flex-1 sm:flex-none">
                      Start
                    </Button>
                    <LinkButton to={`/routines/${r.id}`} variant="secondary" icon={<Pencil size={16} />}>
                      Edit
                    </LinkButton>
                    {lastDone.get(r.id) && (
                      <span className="ml-auto hidden text-xs text-muted sm:inline">Last done {new Date(lastDone.get(r.id)!).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
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
