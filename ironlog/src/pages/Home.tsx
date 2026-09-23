import clsx from 'clsx'
import { addDays, format, isSameDay, isToday, isTomorrow, parseISO, subDays } from 'date-fns'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, Clock, Dumbbell, Flame, Medal, Play, Plus, Scale } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStartWorkout } from '../components/StartWorkout'
import { Badge, Button, Card, EmptyState, HeroCard, LinkButton, MiniBars, Ring, SectionTitle, SegmentBar } from '../components/ui'
import { exerciseName, useExerciseMap } from '../hooks/useExercises'
import { byDateDesc, completedSetCount, computePrEvents, durationMs, PR_LABEL, workoutVolume } from '../lib/calc'
import type { PrEvent } from '../lib/calc'
import { formatDuration, friendlyDay, weekStart } from '../lib/dates'
import { nextWorkout, routineMinutes, routineMuscles, weekStreaks, weekVolume, weeklyBuckets } from '../lib/stats'
import { formatEstimate, formatVolume, formatWeight } from '../lib/units'
import { useStore } from '../store/useStore'

function greeting(d: Date) {
  const h = d.getHours()
  return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const MILESTONES = [2, 4, 8, 12, 26, 52, 104]

function WeekStrip() {
  const workouts = useStore((s) => s.workouts)
  const trainingDays = useStore((s) => s.profile.trainingDays)
  const start = weekStart(new Date())
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label="This week">
      {days.map((d) => {
        const trained = workouts.filter((w) => isSameDay(parseISO(w.startedAt), d))
        const today = isToday(d)
        const planned = trainingDays.includes(d.getDay())
        const label = `${format(d, 'EEEE')}: ${trained.length ? `trained (${trained.map((w) => w.name).join(', ')})` : planned ? 'planned' : 'rest day'}`
        return (
          <li key={d.toISOString()} aria-label={label} className="flex flex-col items-center gap-1.5">
            <span className={clsx('text-[11px] font-semibold uppercase', today ? 'text-accent-ink' : 'text-muted')}>{format(d, 'EEEEE')}</span>
            <span
              className={clsx(
                'stamp flex size-10 items-center justify-center rounded-full text-[17px] transition-colors sm:size-11',
                trained.length ? 'bg-accent text-on-accent' : today ? 'ring-2 ring-accent text-ink ring-inset' : planned ? 'bg-surface-2 text-ink' : 'text-muted',
              )}
            >
              {trained.length ? <Check size={18} strokeWidth={3} /> : format(d, 'd')}
            </span>
            <span className={clsx('size-1 rounded-full', planned && !trained.length ? 'bg-accent/60' : 'bg-transparent')} aria-hidden />
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
    e.kind === 'volume' ? formatVolume(e.value, units) : e.kind === 'reps' ? `${e.value} reps` : e.kind === 'e1rm' ? formatEstimate(e.value, units) : `${formatWeight(e.value, units)} × ${e.reps}`
  return (
    <li>
      <Link to={`/library/${e.exerciseId}`} className="flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
          <Medal size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{exerciseName(map, e.exerciseId)}</span>
          <span className="block text-sm text-muted">
            {PR_LABEL[e.kind]} · {friendlyDay(e.date)}
          </span>
        </span>
        <span className="stamp text-right text-xl">{value}</span>
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
  const target = Math.max(1, profile.trainingDays.length || profile.daysPerWeek)
  const buckets = useMemo(() => weeklyBuckets(workouts, 6), [workouts])
  const milestone = MILESTONES.find((m) => m > streak.current) ?? streak.current + 4

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
    return [...seen.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
  }, [workouts])

  const recent = useMemo(() => [...workouts].sort(byDateDesc).slice(0, 3), [workouts])
  const bw = useMemo(() => {
    const withW = measurements.filter((m) => m.weight).sort((a, b) => a.date.localeCompare(b.date))
    const latest = withW.at(-1)
    if (!latest) return null
    const cutoff = format(subDays(new Date(), 30), 'yyyy-MM-dd')
    const base = withW.find((m) => m.date >= cutoff)
    return { latest, delta: base && base !== latest ? latest.weight! - base.weight! : null }
  }, [measurements])

  const nextLabel = next ? (isToday(next.date) ? 'Today' : isTomorrow(next.date) ? 'Tomorrow' : format(next.date, 'EEEE')) : ''
  const activeDone = active ? active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0) : 0
  const activeTotal = active ? active.exercises.reduce((n, e) => n + e.sets.length, 0) : 0

  return (
    <div className="animate-rise">
      <header className="mb-5">
        <p className="eyebrow">{format(now, 'EEEE, d MMMM')}</p>
        <h1 className="mt-2 font-display text-[34px] leading-none font-semibold tracking-[0.04em] uppercase sm:text-[40px]">
          {greeting(now)}
          {profile.name ? `, ${profile.name}` : ''}
        </h1>
      </header>

      <Card className="mb-4 px-3 py-4 sm:px-5">
        <WeekStrip />
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Today */}
        {active ? (
          <HeroCard className="p-5 sm:p-6">
            <Badge tone="solid">In progress</Badge>
            <h2 className="mt-3 font-display text-[40px] leading-none font-semibold tracking-[0.03em] uppercase">{active.name}</h2>
            <p className="mt-2 text-sm text-on-hero-muted">
              {completedSetCount(active)} {completedSetCount(active) === 1 ? 'set' : 'sets'} logged · started {format(parseISO(active.startedAt), 'HH:mm')}
            </p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-accent" style={{ width: `${activeTotal ? (activeDone / activeTotal) * 100 : 0}%` }} />
            </div>
            <LinkButton to="/workout" size="xl" className="mt-6 w-full sm:w-auto" icon={<Play size={18} fill="currentColor" />}>
              Resume workout
            </LinkButton>
          </HeroCard>
        ) : next ? (
          <HeroCard className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Badge tone="solid">{nextLabel}</Badge>
              <span className="text-sm text-on-hero-muted">Next in your plan</span>
            </div>
            <h2 className="mt-4 font-display text-[44px] leading-[0.95] font-semibold tracking-[0.03em] uppercase">{next.routine.name}</h2>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-on-hero-muted">
              <span className="inline-flex items-center gap-1.5">
                <Dumbbell size={15} /> {next.routine.exercises.length} exercises
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={15} /> ~{routineMinutes(next.routine)} min
              </span>
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {routineMuscles(next.routine, map).map((m) => (
                <span key={m} className="inline-flex h-7 items-center rounded-full bg-white/10 px-2.5 text-xs font-medium">
                  {m}
                </span>
              ))}
            </div>
            <div className="mt-6 flex gap-2">
              <Button size="xl" icon={<Play size={18} fill="currentColor" />} onClick={() => start(next.routine.id)} className="flex-1 sm:flex-none">
                Start workout
              </Button>
              <LinkButton to={`/routines/${next.routine.id}`} size="xl" variant="hero">
                Preview
              </LinkButton>
            </div>
          </HeroCard>
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

        {/* Weekly target + streak */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Card className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center lg:p-5">
            <Ring value={weekCount / target} size={76} stroke={8} label={`${weekCount} of ${target} sessions this week`}>
              <span className="stamp text-[26px]">{weekCount}</span>
              <span className="text-[10px] font-semibold text-muted">of {target}</span>
            </Ring>
            <div className="min-w-0">
              <div className="eyebrow">This week</div>
              <div className="mt-1 text-[15px] font-semibold">
                {weekCount >= target ? 'Target hit' : `${target - weekCount} to go`}
              </div>
              <div className="mt-0.5 text-xs text-muted">{target} sessions planned</div>
            </div>
          </Card>
          <Card className="p-4 lg:p-5">
            <div className="flex items-center gap-3">
              <span className={clsx('flex size-11 shrink-0 items-center justify-center rounded-xl', streak.current ? 'bg-accent-soft text-accent-ink' : 'bg-surface-2 text-muted')}>
                <Flame size={22} />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="stamp text-[30px]">{streak.current}</span>
                  <span className="text-sm text-muted">{streak.current === 1 ? 'week' : 'weeks'}</span>
                </div>
                <div className="eyebrow">Streak</div>
              </div>
            </div>
            <SegmentBar total={milestone} filled={streak.current} className="mt-3" label={`${streak.current} of ${milestone} weeks to the next milestone`} />
            <p className="mt-2 text-xs text-muted">
              {milestone - streak.current} more to a {milestone}-week streak · best {streak.longest}
            </p>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="eyebrow">Volume this week</div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="stamp text-[40px]">{formatVolume(thisWeek, units, false)}</span>
                <span className="text-sm text-muted">{units}</span>
              </div>
            </div>
            {change !== null && (
              <Badge tone={change >= 0 ? 'good' : 'default'} className="h-7 text-sm">
                {change >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                {Math.abs(change).toFixed(0)}%
              </Badge>
            )}
          </div>
          <MiniBars className="mt-4" values={buckets.map((b) => b.volume)} labels={buckets.map((b, i) => (i === buckets.length - 1 ? 'Now' : format(b.start, 'd/M')))} />
          <p className="mt-3 text-xs text-muted">
            {change === null
              ? 'Log a workout to start comparing weeks.'
              : `Last week ${formatVolume(lastWeek, units)} · ${change >= 0 ? 'ahead so far' : 'the week isn’t over yet'}`}
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionTitle
            action={
              <Link to="/progress#records" className="text-sm font-semibold text-accent-ink hover:underline">
                All records
              </Link>
            }
          >
            Recent records
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
                  <Link to={`/history/${w.id}`} className="flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
                    <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2 leading-none">
                      <span className="text-[10px] font-semibold text-muted uppercase">{format(parseISO(w.startedAt), 'MMM')}</span>
                      <span className="stamp text-lg">{format(parseISO(w.startedAt), 'd')}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{w.name}</span>
                      <span className="block text-sm text-muted">
                        {friendlyDay(w.startedAt)} · {formatDuration(durationMs(w))}
                      </span>
                    </span>
                    <span className="stamp text-lg text-ink-2">{formatVolume(workoutVolume(w), units)}</span>
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

        <div className="flex flex-col gap-4">
          <Link to="/body" className="group">
            <Card className="flex items-center gap-4 p-4 transition-colors group-hover:border-line-strong sm:p-5">
              <span className="flex size-11 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
                <Scale size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="eyebrow">Bodyweight</div>
                {bw ? (
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                    <span className="stamp text-[26px]">{formatWeight(bw.latest.weight, units)}</span>
                    {bw.delta !== null && (
                      <span className="text-sm text-muted">
                        {bw.delta > 0 ? '+' : bw.delta < 0 ? '−' : '±'}
                        {formatWeight(Math.abs(bw.delta), units)} in 30 days
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 font-semibold">Log your first weigh-in</div>
                )}
              </div>
              <ArrowRight size={18} className="text-muted transition-transform group-hover:translate-x-0.5" />
            </Card>
          </Link>
          {!active && next && (
            <Button variant="outline" size="lg" onClick={() => start(null)} icon={<Plus size={18} />}>
              Start an empty workout instead
            </Button>
          )}
        </div>
      </div>
      {dialog}
    </div>
  )
}
