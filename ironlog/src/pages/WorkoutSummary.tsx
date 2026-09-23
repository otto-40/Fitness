import { format, parseISO } from 'date-fns'
import { Check, Clock, ListChecks, Medal, Trophy, Weight } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card, EmptyState, LinkButton, MuscleTag, SectionTitle } from '../components/ui'
import { useExerciseMap } from '../hooks/useExercises'
import { completedSetCount, durationMs, PR_LABEL, prsForWorkout, summariseSets, workoutVolume } from '../lib/calc'
import { prValue, plural } from '../lib/format'
import { formatDuration } from '../lib/dates'
import { formatVolume, formatWeight } from '../lib/units'
import { useStore } from '../store/useStore'

export default function WorkoutSummary() {
  const { id } = useParams()
  const workouts = useStore((s) => s.workouts)
  const units = useStore((s) => s.settings.units)
  const map = useExerciseMap()
  const w = workouts.find((x) => x.id === id)
  const prs = useMemo(() => (w ? prsForWorkout(workouts, w) : []), [w, workouts])

  if (!w)
    return (
      <EmptyState
        icon={<Trophy size={22} />}
        title="Workout not found"
        body="It may have been deleted."
        action={<LinkButton to="/history">Go to history</LinkButton>}
        className="mt-10"
      />
    )

  const muscleCounts = new Map<string, number>()
  for (const e of w.exercises) {
    const m = map.get(e.exerciseId)?.primary
    if (m) muscleCounts.set(m, (muscleCounts.get(m) ?? 0) + e.sets.filter((s) => s.type !== 'warmup').length)
  }
  const muscles = [...muscleCounts.entries()].sort((a, b) => b[1] - a[1])
  const count = workouts.filter((o) => o.startedAt <= w.startedAt).length
  const firstTimers = w.exercises.filter((e) => !workouts.some((o) => o.id !== w.id && o.startedAt < w.startedAt && o.exercises.some((x) => x.exerciseId === e.exerciseId)))

  return (
    <div className="animate-rise mx-auto max-w-2xl">
      <div className="pt-4 text-center">
        <div className="animate-pop mx-auto flex size-20 items-center justify-center rounded-full bg-accent text-on-accent ring-8 ring-accent-soft">
          <Check size={40} strokeWidth={3} />
        </div>
        <p className="eyebrow mt-6 text-accent-ink">Workout #{count} complete</p>
        <h1 className="mt-2 font-display text-[52px] leading-none font-bold tracking-[0.03em] uppercase">{w.name}</h1>
        <p className="mt-2 text-muted">{format(parseISO(w.startedAt), "EEEE d MMMM 'at' HH:mm")}</p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            [<Clock size={18} key="c" />, 'Duration', formatDuration(durationMs(w))],
            [<Weight size={18} key="w" />, 'Volume', formatVolume(workoutVolume(w), units)],
            [<ListChecks size={18} key="s" />, 'Sets', String(completedSetCount(w))],
            [<Medal size={18} key="m" />, 'Records', String(prs.length)],
          ] as const
        ).map(([icon, k, v]) => (
          <Card key={k} className="p-4">
            <span className="flex size-9 items-center justify-center rounded-xl bg-surface-2 text-accent-ink">{icon}</span>
            <div className="stamp mt-3 text-[30px]">{v}</div>
            <div className="eyebrow mt-1">{k}</div>
          </Card>
        ))}
      </div>

      {muscles.length > 0 && (
        <section className="mt-8">
          <SectionTitle>Muscles worked · working sets</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {muscles.map(([m, n]) => (
              <MuscleTag key={m} muscle={m} count={n} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <SectionTitle>Personal records</SectionTitle>
        {prs.length ? (
          <ul className="flex flex-col gap-2">
            {prs.map((e) => (
              <li key={`${e.exerciseId}-${e.kind}`} className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent-soft/50 p-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent">
                  <Medal size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{map.get(e.exerciseId)?.name}</span>
                  <span className="block text-sm text-ink-2">{PR_LABEL[e.kind]}</span>
                </span>
                <span className="tnum text-right text-sm font-semibold">{prValue(e, units)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-line-strong p-5 text-center text-sm text-muted">
            {firstTimers.length === w.exercises.length
              ? 'Baselines set for every exercise. Beat them next time to earn records.'
              : 'No new records this time. Consistency is what builds them.'}
          </p>
        )}
      </section>

      <section className="mt-8">
        <SectionTitle>Exercises</SectionTitle>
        <Card>
          <ul className="divide-y divide-line">
            {w.exercises.map((e) => {
              const s = summariseSets(e.sets)
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <Link to={`/library/${e.exerciseId}`} className="block truncate font-medium hover:underline">
                      {map.get(e.exerciseId)?.name ?? 'Deleted exercise'}
                    </Link>
                    <div className="text-sm text-muted">{plural(e.sets.length, 'set')}</div>
                  </div>
                  <div className="text-right">
                    <div className="stamp text-xl">{s.bestSet ? `${formatWeight(s.bestSet.weight, units)} × ${s.bestSet.reps}` : '—'}</div>
                    <div className="text-xs text-muted">best set</div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      </section>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <LinkButton to="/" size="xl" className="sm:flex-1">
          Done
        </LinkButton>
        <LinkButton to={`/history/${w.id}`} size="xl" variant="secondary" className="sm:flex-1">
          View or edit details
        </LinkButton>
      </div>
    </div>
  )
}
