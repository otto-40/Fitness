import clsx from 'clsx'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, parseISO, startOfMonth, subMonths } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Dumbbell, Medal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ColumnTrend } from '../components/charts/Charts'
import { useStartWorkout } from '../components/StartWorkout'
import { Badge, Button, Card, EmptyState, PageHeader, Segmented, Stat } from '../components/ui'
import { useExerciseMap } from '../hooks/useExercises'
import { byDateDesc, completedSetCount, computePrEvents, durationMs, workoutVolume } from '../lib/calc'
import { formatDuration, WEEK_OPTS, weekStart } from '../lib/dates'
import { weekStreaks } from '../lib/stats'
import { formatVolume } from '../lib/units'
import { useStore } from '../store/useStore'
import type { Workout } from '../types'

function WorkoutRow({ w, prCount }: { w: Workout; prCount: number }) {
  const units = useStore((s) => s.settings.units)
  const map = useExerciseMap()
  const d = parseISO(w.startedAt)
  return (
    <li>
      <Link to={`/history/${w.id}`} className="relative flex gap-4 overflow-hidden rounded-2xl border border-line bg-surface p-4 pl-5 transition-colors hover:border-line-strong">
        <span className={clsx('absolute inset-y-3 left-0 w-1 rounded-r-full', prCount ? 'bg-accent' : 'bg-line-strong')} aria-hidden />
        <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2 leading-none">
          <span className="text-[10px] font-semibold text-muted uppercase">{format(d, 'EEE')}</span>
          <span className="stamp text-2xl">{format(d, 'd')}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold">{w.name}</span>
            {prCount > 0 && (
              <Badge tone="accent">
                <Medal size={12} /> {prCount} PR{prCount > 1 ? 's' : ''}
              </Badge>
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock size={13} /> {formatDuration(durationMs(w))}
            </span>
            <span className="tnum font-medium text-ink-2">{formatVolume(workoutVolume(w), units)}</span>
            <span className="tnum">{completedSetCount(w)} sets</span>
          </span>
          <span className="mt-1.5 line-clamp-1 block text-sm text-ink-2">{w.exercises.map((e) => map.get(e.exerciseId)?.name ?? 'Deleted exercise').join(' · ')}</span>
        </span>
      </Link>
    </li>
  )
}

function MonthCalendar({ workouts, prCounts }: { workouts: Workout[]; prCounts: Map<string, number> }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<Date | null>(() => new Date())
  const days = eachDayOfInterval({ start: weekStart(month), end: endOfWeek(endOfMonth(month), WEEK_OPTS) })
  const inMonth = workouts.filter((w) => isSameMonth(parseISO(w.startedAt), month))
  const selectedWorkouts = selected ? workouts.filter((w) => isSameDay(parseISO(w.startedAt), selected)) : []

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => setMonth((m) => subMonths(m, 1))} className="flex size-10 items-center justify-center rounded-xl hover:bg-surface-2" aria-label="Previous month">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <div className="font-display text-2xl font-semibold tracking-wide uppercase">{format(month, 'MMMM yyyy')}</div>
            <div className="text-sm text-muted">
              {inMonth.length} workout{inMonth.length === 1 ? '' : 's'}
            </div>
          </div>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            disabled={isSameMonth(month, new Date())}
            className="flex size-10 items-center justify-center rounded-xl hover:bg-surface-2 disabled:opacity-30"
            aria-label="Next month"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted uppercase" aria-hidden>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className="py-1">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1" role="grid" aria-label={format(month, 'MMMM yyyy')}>
          {days.map((d) => {
            const ws = workouts.filter((w) => isSameDay(parseISO(w.startedAt), d))
            const cur = isSameMonth(d, month)
            const sel = selected && isSameDay(selected, d)
            return (
              <button
                key={d.toISOString()}
                role="gridcell"
                disabled={!cur}
                aria-selected={!!sel}
                aria-label={`${format(d, 'd MMMM')}${ws.length ? `, ${ws.map((w) => w.name).join(', ')}` : ', no workout'}`}
                onClick={() => setSelected(d)}
                className={clsx(
                  'stamp relative mx-auto flex aspect-square w-full max-w-12 flex-col items-center justify-center rounded-full text-[17px] transition-colors',
                  !cur && 'invisible',
                  ws.length ? 'bg-accent text-on-accent' : 'hover:bg-surface-2',
                  isToday(d) && !ws.length && 'ring-2 ring-accent ring-inset',
                  sel && 'ring-2 ring-ink ring-offset-2 ring-offset-surface',
                )}
              >
                {format(d, 'd')}
                {ws.length > 1 && <span className="absolute bottom-1 text-[9px] leading-none">×{ws.length}</span>}
              </button>
            )
          })}
        </div>
      </Card>
      <div>
        {selected ? (
          <>
            <div className="mb-3 flex items-end justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3">
              <div>
                <div className="eyebrow">Day selected</div>
                <div className="mt-0.5 font-semibold">{format(selected, 'EEEE d MMMM')}</div>
              </div>
              {selectedWorkouts.length > 0 && (
                <div className="text-right">
                  <div className="eyebrow">Total time</div>
                  <div className="stamp mt-0.5 text-xl">{formatDuration(selectedWorkouts.reduce((n, w) => n + durationMs(w), 0))}</div>
                </div>
              )}
            </div>
            {selectedWorkouts.length ? (
              <ul className="flex flex-col gap-2">
                {selectedWorkouts.map((w) => (
                  <WorkoutRow key={w.id} w={w} prCount={prCounts.get(w.id) ?? 0} />
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">Rest day — nothing logged.</p>
            )}
          </>
        ) : (
          <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">Select a day to see what you trained.</p>
        )}
      </div>
    </div>
  )
}

export default function History() {
  const workouts = useStore((s) => s.workouts)
  const units = useStore((s) => s.settings.units)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [monthsShown, setMonthsShown] = useState(2)
  const { start, dialog } = useStartWorkout()

  const sorted = useMemo(() => [...workouts].sort(byDateDesc), [workouts])
  const streak = useMemo(() => weekStreaks(workouts), [workouts])
  const prCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of computePrEvents(workouts)) if (e.kind === 'e1rm' || e.kind === 'weight' || e.kind === 'reps') m.set(e.workoutId, (m.get(e.workoutId) ?? 0) + 1)
    return m
  }, [workouts])

  const months = useMemo(() => {
    const groups = new Map<string, Workout[]>()
    for (const w of sorted) {
      const k = format(parseISO(w.startedAt), 'yyyy-MM')
      groups.set(k, [...(groups.get(k) ?? []), w])
    }
    return [...groups.entries()]
  }, [sorted])

  const perMonth = useMemo(() => {
    const now = startOfMonth(new Date())
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(now, 5 - i)
      return { label: format(m, 'MMM'), workouts: workouts.filter((w) => isSameMonth(parseISO(w.startedAt), m)).length }
    })
  }, [workouts])

  const thisMonth = perMonth.at(-1)?.workouts ?? 0

  return (
    <div className="animate-rise">
      <PageHeader
        title="History"
        subtitle={`${workouts.length} workout${workouts.length === 1 ? '' : 's'} logged`}
        actions={<Segmented label="View" value={view} onChange={setView} options={[{ value: 'list', label: 'List' }, { value: 'calendar', label: 'Calendar' }]} />}
      />

      {workouts.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} />}
          title="No workouts yet"
          body="Finished sessions land here with every set, so you can look back, fix a typo or delete a mistake."
          action={
            <Button icon={<Dumbbell size={18} />} onClick={() => start(null)}>
              Start a workout
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-[1fr_1.3fr]">
            <Card className="grid grid-cols-3 items-center gap-4 p-4 sm:p-5">
              <Stat label="Streak" value={streak.current} unit="wk" />
              <Stat label="Longest" value={streak.longest} unit="wk" />
              <Stat label="This month" value={thisMonth} />
            </Card>
            <Card className="p-4">
              <div className="mb-1 text-sm font-medium text-muted">Workouts per month</div>
              <ColumnTrend
                data={perMonth}
                series={[{ key: 'workouts', name: 'Workouts' }]}
                format={(v) => `${v} workouts`}
                height={110}
                yWidth={24}
                highlightLast
                ariaLabel={`Workouts per month: ${perMonth.map((m) => `${m.label} ${m.workouts}`).join(', ')}`}
              />
            </Card>
          </div>

          {view === 'calendar' ? (
            <MonthCalendar workouts={workouts} prCounts={prCounts} />
          ) : (
            <div className="flex flex-col gap-8">
              {months.slice(0, monthsShown).map(([key, ws]) => (
                <section key={key}>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h2 className="font-display text-2xl font-semibold tracking-[0.04em] uppercase">{format(parseISO(`${key}-01`), 'MMMM yyyy')}</h2>
                    <span className="tnum text-sm text-muted">
                      {ws.length} workout{ws.length === 1 ? '' : 's'} · {formatVolume(ws.reduce((s, w) => s + workoutVolume(w), 0), units)}
                    </span>
                  </div>
                  <ul className="grid gap-2 lg:grid-cols-2">
                    {ws.map((w) => (
                      <WorkoutRow key={w.id} w={w} prCount={prCounts.get(w.id) ?? 0} />
                    ))}
                  </ul>
                </section>
              ))}
              {months.length > monthsShown && (
                <Button variant="secondary" size="lg" block onClick={() => setMonthsShown((n) => n + 3)}>
                  Show older workouts ({months.slice(monthsShown).reduce((n, [, ws]) => n + ws.length, 0)})
                </Button>
              )}
            </div>
          )}
        </>
      )}
      {dialog}
    </div>
  )
}
