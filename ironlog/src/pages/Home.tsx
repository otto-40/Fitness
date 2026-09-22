import clsx from 'clsx'
import { addDays, format, isSameDay, isToday, isTomorrow, parseISO, subDays } from 'date-fns'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Clock, Dumbbell, Flame, Medal, Play, Plus, Scale, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStartWorkout } from '../components/StartWorkout'
import { Badge, Button, Card, EmptyState, LinkButton, MuscleTag, SectionTitle } from '../components/ui'
import { exerciseName, useExerciseMap } from '../hooks/useExercises'
import { byDateDesc, completedSetCount, computePrEvents, durationMs, PR_LABEL, workoutVolume } from '../lib/calc'
import type { PrEvent } from '../lib/calc'
import { formatDuration, friendlyDay, weekStart } from '../lib/dates'
import { nextWorkout, routineMinutes, routineMuscles, weekStreaks, weekVolume } from '../lib/stats'
import { formatEstimate, formatVolume, formatWeight } from '../lib/units'
import { useStore } from '../store/useStore'

function greeting(d: Date) {
  const h = d.getHours()
  return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function WeekStrip() {
  const workouts = useStore((s) => s.workouts)
  const trainingDays = useStore((s) => s.profile.trainingDays)
  const start = weekStart(new Date())
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return (
    <ol className="grid grid-cols-7 gap-1.5" aria-label="This week">
      {days.map((d) => {
        const trained = workouts.filter((w) => isSameDay(parseISO(w.startedAt), d))
        const today = isToday(d)
        const planned = trainingDays.includes(d.getDay())
        const label = `${format(d, 'EEEE')}: ${trained.length ? `trained (${trained.map((w) => w.name).join(', ')})` : planned ? 'planned' : 'rest day'}`
        return (
          <li key={d.toISOString()} aria-label={label} className="flex flex-col items-center gap-1.5">
            <span className={clsx('text-[11px] font-semibold uppercase', today ? 'text-ink' : 'text-muted')}>{format(d, 'EEEEE')}</span>
            <span
              className={clsx(
                'flex size-10 items-center justify-center rounded-xl text-sm font-semibold tnum transition-colors sm:size-11',
                trained.length ? 'bg-accent text-on-accent' : today ? 'border-2 border-ink text-ink' : 'bg-surface-2 text-ink-2',
              )}
            >
              {trained.length ? <Dumbbell size={16} strokeWidth={2.5} /> : format(d, 'd')}
            </span>
            <span className={clsx('size-1 rounded-full', planned && !trained.length ? 'bg-muted' : 'bg-transparent')} aria-hidden />
          </li>
        )
      })}
    </ol>
  )
}

function PrRow({ e }: { e: PrEvent }) {
  const map = useExerciseMap()
  const units = useStore((s) => s.settings.units)
  const value =
    e.kind === 'volume'
      ? formatVolume(e.value, units)
      : e.kind === 'reps'
        ? `${e.value} reps`
        : e.kind === 'e1rm'
          ? formatEstimate(e.value, units)
          : `${formatWeight(e.value, units)} × ${e.reps}`
  return (
    <li>
      <Link to={`/library/${e.exerciseId}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
          <Medal size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{exerciseName(map, e.exerciseId)}</span>
          <span className="block text-sm text-muted">
            {PR_LABEL[e.kind]} · {friendlyDay(e.date)}
          </span>
        </span>
        <span className="tnum text-right font-semibold">{value}</span>
      </Link>
    </li>
  )
}

export default function Home() {
  const { profile, routines, workouts, measurements, settings } = useStore()
  const units = settings.units
  const map = useExerciseMap()
  const { start, dialog, active } = useStartWorkout()
  const now = new Date()

  const next = useMemo(() => nextWorkout(routines, workouts, profile), [routines, workouts, profile])
  const streak = useMemo(() => weekStreaks(workouts), [workouts])
  const thisWeek = weekVolume(workouts, now)
  const lastWeek = weekVolume(workouts, subDays(now, 7))
  const change = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : null
  const weekCount = workouts.filter((w) => parseISO(w.startedAt) >= weekStart(now)).length

  const prs = useMemo(() => {
    const all = computePrEvents(workouts)
    // One line per exercise per workout: the most meaningful record wins.
    const rank = { e1rm: 0, weight: 1, reps: 2, volume: 3 }
    const seen = new Map<string, PrEvent>()
    for (const e of all) {
      const k = `${e.workoutId}:${e.exerciseId}`
      const cur = seen.get(k)
      if (!cur || rank[e.kind] < rank[cur.kind]) seen.set(k, e)
    }
    return [...seen.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  }, [workouts])

  const recent = useMemo(() => [...workouts].sort(byDateDesc).slice(0, 3), [workouts])
  const bw = useMemo(() => {
    const withW = measurements.filter((m) => m.weight).sort((a, b) => a.date.localeCompare(b.date))
    const latest = withW.at(-1)
    if (!latest) return null
    const cutoff = format(subDays(now, 30), 'yyyy-MM-dd')
    const base = withW.find((m) => m.date >= cutoff)
    return { latest, delta: base && base !== latest ? latest.weight! - base.weight! : null }
  }, [measurements]) // eslint-disable-line react-hooks/exhaustive-deps

  const nextLabel = next ? (isToday(next.date) ? 'Today' : isTomorrow(next.date) ? 'Tomorrow' : format(next.date, 'EEEE')) : ''

  return (
    <div className="animate-rise">
      <header className="mb-6">
        <p className="text-sm font-medium text-muted">{format(now, 'EEEE, d MMMM')}</p>
        <h1 className="mt-1 font-display text-[34px] leading-none font-semibold tracking-wide uppercase sm:text-[40px]">
          {greeting(now)}
          {profile.name ? `, ${profile.name}` : ''}
        </h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        {/* Next workout */}
        {active ? (
          <Card className="relative overflow-hidden border-ink bg-ink p-5 text-bg sm:p-6">
            <Badge tone="accent" className="mb-3">
              In progress
            </Badge>
            <h2 className="font-display text-3xl font-semibold tracking-wide uppercase">{active.name}</h2>
            <p className="mt-1 text-sm opacity-70">
              {completedSetCount(active)} {completedSetCount(active) === 1 ? "set" : "sets"} logged · started {format(parseISO(active.startedAt), 'HH:mm')}
            </p>
            <LinkButton to="/workout" size="lg" className="mt-6 w-full sm:w-auto" icon={<Play size={18} fill="currentColor" />}>
              Resume workout
            </LinkButton>
          </Card>
        ) : next ? (
          <Card className="relative overflow-hidden p-5 sm:p-6">
            <span className="absolute inset-y-0 left-0 w-1 bg-accent" aria-hidden />
            <div className="relative">
              <div className="flex items-center gap-2">
                <Badge tone="accent">{nextLabel}</Badge>
                <span className="text-sm text-muted">Next in your plan</span>
              </div>
              <h2 className="mt-3 font-display text-4xl leading-none font-semibold tracking-wide uppercase">{next.routine.name}</h2>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-1">
                  <Dumbbell size={15} /> {next.routine.exercises.length} exercises
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={15} /> ~{routineMinutes(next.routine)} min
                </span>
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {routineMuscles(next.routine, map).map((m) => (
                  <MuscleTag key={m} muscle={m} />
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button size="lg" icon={<Play size={18} fill="currentColor" />} onClick={() => start(next.routine.id)} className="flex-1 sm:flex-none">
                  Start workout
                </Button>
                <LinkButton to={`/routines/${next.routine.id}`} size="lg" variant="secondary">
                  Preview
                </LinkButton>
              </div>
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={<Dumbbell size={22} />}
            title="No plan yet"
            body="Add routines to your plan and IronLog will line up your next session here."
            action={
              <div className="flex gap-2">
                <LinkButton to="/routines" variant="secondary">
                  Routines
                </LinkButton>
                <Button onClick={() => start(null)} icon={<Plus size={18} />}>
                  Quick workout
                </Button>
              </div>
            }
          />
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted">
              <Flame size={16} className="text-accent-ink" /> Streak
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="tnum font-display text-4xl font-semibold">{streak.current}</span>
              <span className="text-sm text-muted">{streak.current === 1 ? 'week' : 'weeks'}</span>
            </div>
            <p className="mt-1 text-xs text-muted">Best: {streak.longest} weeks</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted">
              <Trophy size={16} className="text-accent-ink" /> This week
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="tnum font-display text-4xl font-semibold">{weekCount}</span>
              <span className="text-sm text-muted">/ {profile.trainingDays.length || profile.daysPerWeek} sessions</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(100, (weekCount / Math.max(1, profile.trainingDays.length || profile.daysPerWeek)) * 100)}%` }}
              />
            </div>
          </Card>
          <Card className="col-span-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-muted">Volume this week</div>
                <div className="tnum mt-2 font-display text-4xl font-semibold">{formatVolume(thisWeek, units)}</div>
                <p className="mt-1 text-xs text-muted">Last week: {formatVolume(lastWeek, units)}</p>
              </div>
              {change !== null && (
                <Badge tone={change >= 0 ? 'good' : 'default'} className="h-7 text-sm">
                  {change >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                  {Math.abs(change).toFixed(0)}%
                </Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-muted">
              {change === null ? 'Log a workout to start comparing weeks.' : change >= 0 ? 'Ahead of last week so far.' : 'Behind last week so far — the week isn’t over yet.'}
            </p>
          </Card>
        </div>
      </div>

      <Card className="mt-4 p-4 sm:p-5">
        <SectionTitle
          action={
            <Link to="/history" className="text-sm font-semibold text-accent-ink hover:underline">
              History
            </Link>
          }
        >
          This week
        </SectionTitle>
        <WeekStrip />
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <SectionTitle
            action={
              <Link to="/progress#records" className="text-sm font-semibold text-accent-ink hover:underline">
                All records
              </Link>
            }
          >
            Recent personal records
          </SectionTitle>
          {prs.length ? (
            <ul className="-mx-2">
              {prs.map((e) => (
                <PrRow key={`${e.workoutId}-${e.exerciseId}-${e.kind}`} e={e} />
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted">Records show up after your second session of an exercise. Beat your last numbers to set one.</p>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-4 sm:p-5">
            <SectionTitle
              action={
                <Link to="/history" className="text-sm font-semibold text-accent-ink hover:underline">
                  See all
                </Link>
              }
            >
              Recent workouts
            </SectionTitle>
            {recent.length ? (
              <ul className="-mx-2">
                {recent.map((w) => (
                  <li key={w.id}>
                    <Link to={`/history/${w.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2">
                      <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2 leading-none">
                        <span className="text-[10px] font-semibold text-muted uppercase">{format(parseISO(w.startedAt), 'MMM')}</span>
                        <span className="font-display text-lg font-semibold">{format(parseISO(w.startedAt), 'd')}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{w.name}</span>
                        <span className="block text-sm text-muted">
                          {friendlyDay(w.startedAt)} · {formatDuration(durationMs(w))}
                        </span>
                      </span>
                      <span className="tnum text-sm font-medium text-ink-2">{formatVolume(workoutVolume(w), units)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-muted">No workouts yet. Your first session will appear here.</p>
                <Button variant="secondary" className="mt-3" onClick={() => start(null)} icon={<Plus size={18} />}>
                  Start an empty workout
                </Button>
              </div>
            )}
          </Card>

          <Link to="/body" className="group">
            <Card className="flex items-center gap-4 p-4 transition-colors group-hover:border-line-strong">
              <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
                <Scale size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-muted">Bodyweight</div>
                {bw ? (
                  <div className="font-semibold">
                    {formatWeight(bw.latest.weight, units)}
                    {bw.delta !== null && (
                      <span className="ml-2 text-sm font-normal text-muted">
                        {bw.delta > 0 ? '+' : bw.delta < 0 ? '−' : '±'}
                        {formatWeight(Math.abs(bw.delta), units)} in 30 days
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="font-semibold">Log your first weigh-in</div>
                )}
              </div>
              <ArrowRight size={18} className="text-muted transition-transform group-hover:translate-x-0.5" />
            </Card>
          </Link>
        </div>
      </div>

      {!active && next && (
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" onClick={() => start(null)} icon={<Plus size={18} />}>
            Start an empty workout instead
          </Button>
        </div>
      )}
      {dialog}
    </div>
  )
}
