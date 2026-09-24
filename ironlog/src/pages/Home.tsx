import clsx from 'clsx'
import { addDays, format, isSameDay, isToday, isTomorrow, parseISO, subDays } from 'date-fns'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, Clock, Dumbbell, Flame, Footprints, Medal, Play, Plus, Scale } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStartWorkout } from '../components/StartWorkout'
import { Button, Card, EmptyState, HeroCard, LinkButton, MiniBars, SectionTitle, SegmentBar } from '../components/ui'
import { exerciseName, useExerciseMap } from '../hooks/useExercises'
import { aerobicMinutes, byDateDesc, completedSetCount, computePrEvents, durationMs, PR_LABEL, workoutVolume } from '../lib/calc'
import type { PrEvent } from '../lib/calc'
import { formatDuration, friendlyDay, weekStart } from '../lib/dates'
import { nextWorkout, routineMinutes, routineMuscles, weekAerobicMinutes, weeklyPlan, weekStreaks, weekVolume, weeklyBuckets } from '../lib/stats'
import { formatEstimate, formatVolume, formatWeight } from '../lib/units'
import { useStore } from '../store/useStore'
import { plural } from '../lib/format'

function greeting(d: Date) {
  const h = d.getHours()
  return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const MILESTONES = [2, 4, 8, 12, 26, 52, 104]

/** Weekday capsules: filled with a check when trained, outlined for today, tinted when planned. */
function WeekStrip() {
  const workouts = useStore((s) => s.workouts)
  const profileDays = useStore((s) => s.profile.trainingDays)
  const routines = useStore((s) => s.routines)
  const trainingDays = weeklyPlan(routines)?.days ?? profileDays
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
          <li key={d.toISOString()} aria-label={label}>
            <span
              className={clsx(
                'flex h-[62px] flex-col items-center justify-center gap-1 rounded-full transition-colors',
                trained.length ? 'bg-accent text-on-accent' : today ? 'bg-accent-soft text-ink ring-2 ring-accent ring-inset' : planned ? 'bg-surface-2 text-ink' : 'text-muted ring-1 ring-line ring-inset',
              )}
            >
              <span className={clsx('text-[10px] font-semibold uppercase', !trained.length && !today && 'text-muted')}>{format(d, 'EEEEE')}</span>
              {trained.length ? <Check size={17} strokeWidth={3} /> : <span className="stamp text-[17px]">{format(d, 'd')}</span>}
            </span>
            <span className={clsx('mx-auto mt-1.5 block size-1 rounded-full', planned && !trained.length ? 'bg-accent/70' : 'bg-transparent')} aria-hidden />
          </li>
        )
      })}
    </ol>
  )
}

function PrTile({ e }: { e: PrEvent }) {
  const map = useExerciseMap()
  const units = useStore((s) => s.settings.units)
  const value =
    e.kind === 'volume' ? formatVolume(e.value, units) : e.kind === 'reps' ? `${e.value} reps` : e.kind === 'e1rm' ? formatEstimate(e.value, units) : `${formatWeight(e.value, units)} × ${e.reps}`
  return (
    <li className="w-[72%] shrink-0 sm:w-auto">
      <Link to={`/library/${e.exerciseId}`} className="card flex h-full flex-col p-4 transition-transform active:scale-[0.98]">
        <span className="flex items-center justify-between">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
            <Medal size={17} />
          </span>
          <span className="text-xs text-muted">{friendlyDay(e.date)}</span>
        </span>
        <span className="stamp mt-4 block text-[28px]">{value}</span>
        <span className="mt-1 block truncate text-[15px] font-semibold">{exerciseName(map, e.exerciseId)}</span>
        <span className="block text-[13px] text-muted">{PR_LABEL[e.kind]}</span>
      </Link>
    </li>
  )
}

/** Faint overlapping plates in the hero's corner: the app icon's mark, as texture. */
function PlateMotif() {
  return (
    <svg viewBox="0 0 200 200" className="pointer-events-none absolute -top-10 -right-12 -z-10 size-56 text-white opacity-[0.06]" aria-hidden>
      <circle cx="84" cy="116" r="40" fill="none" stroke="currentColor" strokeWidth="22" />
      <circle cx="124" cy="76" r="56" fill="none" stroke="currentColor" strokeWidth="28" />
      <circle cx="124" cy="76" r="12" fill="currentColor" />
    </svg>
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
  const target = weeklyPlan(routines)?.target ?? Math.max(1, profile.trainingDays.length || profile.daysPerWeek)
  const aerobicTarget = settings.aerobicTargetMin ?? 150
  const aerobicWeek = weekAerobicMinutes(workouts, now)
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

  const weekLine =
    weekCount >= target ? 'Weekly target hit. Anything more is a bonus.' : `${plural(target - weekCount, 'session')} to go${streak.current ? ` · ${streak.current}-week streak going` : ''}`

  return (
    <div className="animate-rise">
      <header className="mb-5">
        <p className="text-[13px] font-semibold text-muted">{format(now, 'EEEE d MMMM')}</p>
        <h1 className="title-lg mt-0.5">
          {greeting(now)}
          {profile.name ? `, ${profile.name}` : ''}
        </h1>
      </header>

      <div className="grid items-start gap-3 lg:grid-cols-[1.3fr_1fr] lg:gap-4">
        {/* Today: the one hero on the screen */}
        {active ? (
          <HeroCard className="p-5 sm:p-6">
            <PlateMotif />
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-semibold">
              <span className="size-1.5 animate-pulse rounded-full bg-hero-ok" /> In progress
            </span>
            <h2 className="mt-4 text-[28px] leading-[1.1] font-bold tracking-[-0.02em]">{active.name}</h2>
            <p className="mt-2 text-sm text-on-hero-muted">
              {completedSetCount(active)} {completedSetCount(active) === 1 ? 'set' : 'sets'} logged · started {format(parseISO(active.startedAt), 'HH:mm')}
            </p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-accent" style={{ width: `${activeTotal ? (activeDone / activeTotal) * 100 : 0}%` }} />
            </div>
            <LinkButton to="/workout" size="xl" className="mt-6 w-full sm:w-auto" icon={<Play size={18} fill="currentColor" />}>
              Resume workout
            </LinkButton>
          </HeroCard>
        ) : next ? (
          <HeroCard className="p-5 sm:p-6">
            <PlateMotif />
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-white/15 px-3 text-xs font-semibold">{nextLabel}</span>
              <span className="truncate text-sm text-on-hero-muted">{next.routine.program ?? 'Next in your plan'}</span>
            </div>
            <h2 className="mt-4 max-w-[16ch] text-[30px] leading-[1.08] font-bold tracking-[-0.022em] sm:text-[34px]">{next.routine.name}</h2>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-on-hero-muted">
              <span className="inline-flex items-center gap-1.5">
                <Dumbbell size={15} /> {plural(next.routine.exercises.length, 'exercise')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={15} /> ~{routineMinutes(next.routine)} min
              </span>
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {routineMuscles(next.routine, map).map((m) => (
                <span key={m} className="inline-flex h-7 items-center rounded-full bg-white/12 px-2.5 text-xs font-medium">
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
            icon={<Dumbbell size={24} />}
            title="Your next session shows up here"
            body="Add routines to your plan and Overload lines up the next one, with a one-tap start."
            action={
              <div className="flex flex-wrap justify-center gap-2">
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

        {/* This week: capsules, target, streak, aerobic minutes and volume in one card */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">This week</h2>
            <span className="text-sm text-muted">
              <span className="stamp text-[22px] text-ink">{weekCount}</span> of {plural(target, 'session')}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted">{weekLine}</p>
          <div className="mt-4">
            <WeekStrip />
          </div>
          <div className="mt-3 grid grid-cols-3 divide-x divide-line border-t border-line pt-3">
            <Link to="/history" className="group min-w-0 pr-3" aria-label={`Streak: ${streak.current} ${streak.current === 1 ? 'week' : 'weeks'}, best ${streak.longest}. Next milestone ${milestone} weeks.`}>
              <span className="flex items-center gap-1 text-xs font-medium text-muted">
                <Flame size={13} className={streak.current ? 'text-accent-ink' : undefined} /> Streak
              </span>
              <span className="mt-1 flex items-baseline gap-1">
                <span className="stamp text-[26px]">{streak.current}</span>
                <span className="text-xs text-muted">{streak.current === 1 ? 'week' : 'weeks'}</span>
              </span>
              <SegmentBar total={Math.min(milestone, 12)} filled={Math.round((streak.current / milestone) * Math.min(milestone, 12))} className="mt-1.5" label={`${streak.current} of ${milestone} weeks to the next milestone`} />
              <span className="mt-1 block truncate text-[11px] text-muted">best {streak.longest}</span>
            </Link>
            <Link to="/progress#aerobic" className="group min-w-0 px-3" aria-label={`Aerobic this week: ${aerobicWeek} of ${aerobicTarget} minutes`}>
              <span className="flex items-center gap-1 text-xs font-medium text-muted">
                <Footprints size={13} className="text-good" /> Aerobic
              </span>
              <span className="mt-1 flex items-baseline gap-1">
                <span className="stamp text-[26px]">{aerobicWeek}</span>
                <span className="text-xs whitespace-nowrap text-muted">/ {aerobicTarget} min</span>
              </span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-3">
                <span className="block h-full rounded-full bg-good" style={{ width: `${Math.min(100, (aerobicWeek / aerobicTarget) * 100)}%` }} />
              </span>
              <span className="mt-1 block truncate text-[11px] text-muted">{aerobicWeek >= aerobicTarget ? 'guideline met' : `${aerobicTarget - aerobicWeek} min to go`}</span>
            </Link>
            <Link to="/progress" className="group min-w-0 pl-3" aria-label={`Volume this week: ${formatVolume(thisWeek, units)}`}>
              <span className="flex items-center gap-1 text-xs font-medium text-muted">
                <Dumbbell size={13} /> Volume
              </span>
              <span className="mt-1 flex items-baseline gap-1">
                <span className="stamp text-[26px]">{formatVolume(thisWeek, units, false)}</span>
                <span className="text-xs text-muted">{units}</span>
              </span>
              <MiniBars className="mt-1" height={14} values={buckets.map((b) => b.volume)} />
              <span className={clsx('mt-1 flex items-center gap-0.5 text-[11px] font-medium', change !== null && change >= 0 ? 'text-good' : 'text-muted')}>
                {change === null ? (
                  'first week'
                ) : (
                  <>
                    {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(change).toFixed(0)}% vs last
                  </>
                )}
              </span>
            </Link>
          </div>
        </Card>
      </div>

      <section className="mt-7" aria-labelledby="records-h">
        <SectionTitle
          action={
            <Link to="/progress#records" className="hit text-sm font-semibold text-accent-ink hover:underline">
              All records
            </Link>
          }
        >
          <span id="records-h">Recent records</span>
        </SectionTitle>
        {prs.length ? (
          <ul className="snap-row scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pt-1 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {prs.map((e) => (
              <PrTile key={`${e.workoutId}-${e.exerciseId}-${e.kind}`} e={e} />
            ))}
          </ul>
        ) : (
          <Card className="flex items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
              <Medal size={18} />
            </span>
            <p className="text-sm text-muted">Records show up after your second session of an exercise. Beat your last numbers to set one.</p>
          </Card>
        )}
      </section>

      <div className="mt-4 grid items-start gap-3 lg:mt-6 lg:grid-cols-2 lg:gap-4">
        <Card className="p-4 sm:p-5">
          <SectionTitle
            action={
              <Link to="/history" className="hit text-sm font-semibold text-accent-ink hover:underline">
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
                  <Link to={`/history/${w.id}`} className="flex min-h-14 items-center gap-3 rounded-[14px] px-2 py-2 transition-colors hover:bg-surface-2">
                    <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-[14px] bg-surface-2 leading-none">
                      <span className="text-[10px] font-semibold text-muted uppercase">{format(parseISO(w.startedAt), 'MMM')}</span>
                      <span className="stamp text-lg">{format(parseISO(w.startedAt), 'd')}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{w.name}</span>
                      <span className="block text-sm text-muted">
                        {friendlyDay(w.startedAt)} · {formatDuration(durationMs(w))}
                      </span>
                    </span>
                    <span className={clsx('stamp text-lg', workoutVolume(w) > 0 || !aerobicMinutes(w) ? 'text-ink-2' : 'text-good')}>
                      {workoutVolume(w) > 0 || !aerobicMinutes(w) ? formatVolume(workoutVolume(w), units) : `${aerobicMinutes(w)} min`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-5 text-center">
              <p className="text-sm text-muted">No workouts yet. Your first session will appear here.</p>
              <Button variant="secondary" className="mt-3" onClick={() => start(null)} icon={<Plus size={18} />}>
                Start an empty workout
              </Button>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-3 lg:gap-4">
          <Link to="/body" className="group">
            <Card className="flex items-center gap-4 p-4 transition-transform group-active:scale-[0.99] sm:p-5">
              <span className="flex size-11 items-center justify-center rounded-[14px] bg-surface-2 text-ink-2">
                <Scale size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted">Bodyweight</div>
                {bw ? (
                  <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                    <span className="stamp text-[26px]">{formatWeight(bw.latest.weight, units)}</span>
                    {bw.delta !== null && (
                      <span className="text-sm text-muted">
                        {bw.delta > 0 ? '+' : bw.delta < 0 ? '−' : '±'}
                        {formatWeight(Math.abs(bw.delta), units)} in 30 days
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="mt-0.5 font-semibold">Log your first weigh-in</div>
                )}
              </div>
              <ArrowRight size={18} className="text-muted transition-transform group-hover:translate-x-0.5" />
            </Card>
          </Link>
          {!active && next && (
            <button onClick={() => start(null)} className="card flex items-center gap-4 p-4 text-left transition-transform active:scale-[0.99] sm:p-5">
              <span className="flex size-11 items-center justify-center rounded-[14px] bg-accent-soft text-accent-ink">
                <Plus size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Start an empty workout instead</span>
                <span className="block text-sm text-muted">Add exercises as you go</span>
              </span>
              <ArrowRight size={18} className="text-muted" />
            </button>
          )}
        </div>
      </div>
      {dialog}
    </div>
  )
}
