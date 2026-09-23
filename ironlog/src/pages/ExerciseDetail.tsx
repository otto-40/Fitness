import clsx from 'clsx'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, LineChart as ChartIcon, Medal, Pencil, Star, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ColumnTrend, LineTrend } from '../components/charts/Charts'
import { ExerciseForm } from '../components/ExerciseForm'
import { Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, Monogram, MuscleTag, SectionTitle, Segmented, Stat } from '../components/ui'
import { SetTypeBadge } from '../components/workout/SetTypeBadge'
import { EffortLegend, EffortShape } from '../components/workout/Effort'
import { EFFORT_META } from '../components/workout/effortMeta'
import { useExerciseMap } from '../hooks/useExercises'
import { aerobicHistory, exerciseHistory, exerciseRecords } from '../lib/calc'
import { friendlyDay } from '../lib/dates'
import { formatEstimate, formatVolume, formatWeight, round, toDisplayWeight } from '../lib/units'
import { useStore } from '../store/useStore'
import { toast } from '../store/useToast'
import { plural } from '../lib/format'

type Metric = 'e1rm' | 'topWeight' | 'volume' | 'maxReps'

export default function ExerciseDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const map = useExerciseMap()
  const ex = map.get(id)
  const workouts = useStore((s) => s.workouts)
  const units = useStore((s) => s.settings.units)
  const favorites = useStore((s) => s.favorites)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const deleteExercise = useStore((s) => s.deleteExercise)
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const history = useMemo(() => exerciseHistory(workouts, id), [workouts, id])
  const record = useMemo(() => exerciseRecords(workouts).find((r) => r.exerciseId === id), [workouts, id])
  const weighted = history.some((h) => h.topWeight > 0)
  const [metric, setMetric] = useState<Metric>('e1rm')
  const activeMetric: Metric = weighted ? metric : 'maxReps'

  if (!ex)
    return (
      <EmptyState
        icon={<ChartIcon size={22} />}
        title="Exercise not found"
        body="It may have been deleted."
        action={
          <Button variant="secondary" onClick={() => navigate('/library')}>
            Back to exercises
          </Button>
        }
        className="mt-10"
      />
    )

  const fav = favorites.includes(ex.id)
  const data = history.map((h) => ({
    label: format(parseISO(h.date), 'd MMM'),
    value: activeMetric === 'maxReps' ? h.maxReps : round(toDisplayWeight(h[activeMetric], units), 1),
  }))
  const metricName = { e1rm: 'Estimated 1RM', topWeight: 'Top set weight', volume: 'Session volume', maxReps: 'Most reps in a set' }[activeMetric]
  const first = data[0]?.value
  const last = data.at(-1)?.value
  const trend = first != null && last != null && data.length > 1 ? last - first : null

  const records = [
    record?.bestE1rm && { label: 'Best est. 1RM', value: formatEstimate(record.bestE1rm.value, units), detail: `${formatWeight(record.bestE1rm.weight, units)} × ${record.bestE1rm.reps}`, date: record.bestE1rm.date },
    record?.bestWeight && { label: 'Heaviest weight', value: formatWeight(record.bestWeight.value, units), detail: `for ${record.bestWeight.reps} reps`, date: record.bestWeight.date },
    record?.bestVolume && { label: 'Best session volume', value: formatVolume(record.bestVolume.value, units), detail: 'in one session', date: record.bestVolume.date },
    record?.bestReps && { label: 'Most reps in a set', value: `${record.bestReps.value}`, detail: 'reps', date: record.bestReps.date },
  ].filter(Boolean) as { label: string; value: string; detail: string; date: string }[]

  return (
    <div className="animate-rise">
      <Link to="/library" className="mb-4 inline-flex h-11 items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} /> Exercises
      </Link>
      <div className="mb-5 flex items-start gap-4">
        <Monogram name={ex.name} size="lg" active />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[34px] leading-none font-semibold tracking-[0.03em] uppercase sm:text-[44px]">{ex.name}</h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="accent" className="h-7 rounded-full px-2.5">
              {ex.primary}
            </Badge>
            {ex.secondary.map((m) => (
              <MuscleTag key={m} muscle={m} />
            ))}
            <MuscleTag muscle={ex.equipment} />
            {ex.custom && <Badge className="h-7 rounded-full px-2.5">Custom</Badge>}
            {ex.archived && (
              <Badge tone="danger" className="h-7 rounded-full px-2.5">
                Deleted
              </Badge>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {!ex.archived && (
            <IconButton label={fav ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={fav} onClick={() => toggleFavorite(ex.id)} className={clsx('size-11', fav && 'text-accent')}>
              <Star size={20} className={clsx(fav && 'animate-pop fill-current')} />
            </IconButton>
          )}
          {ex.custom && !ex.archived && (
            <>
              <IconButton label="Edit exercise" onClick={() => setEditing(true)} className="size-11">
                <Pencil size={18} />
              </IconButton>
              <IconButton label="Delete exercise" tone="danger" onClick={() => setConfirm(true)} className="size-11">
                <Trash2 size={18} />
              </IconButton>
            </>
          )}
        </div>
      </div>

      {ex.cue && (
        <blockquote className="mb-5 rounded-2xl border border-line bg-surface p-4 text-[15px] text-ink-2">
          <span className="eyebrow mb-1 block text-accent-ink">Form cue</span>
          {ex.cue}
        </blockquote>
      )}

      {ex.aerobic ? (
        <AerobicHistory exerciseId={ex.id} />
      ) : history.length === 0 ? (
        <EmptyState icon={<ChartIcon size={22} />} title="No history yet" body="Log this exercise in a workout and its best set, estimated 1RM and progress chart will appear here." />
      ) : (
        <>
          <Card className="grid grid-cols-2 gap-5 p-4 sm:grid-cols-4 sm:p-5">
            <Stat
              size="lg"
              label={weighted ? 'Est. 1RM' : 'Best reps'}
              value={weighted ? (record?.bestE1rm ? formatEstimate(record.bestE1rm.value, units, false) : '—') : (record?.bestReps?.value ?? 0)}
              unit={weighted ? units : 'reps'}
              sub={weighted && record?.bestE1rm ? `from ${formatWeight(record.bestE1rm.weight, units, false)} × ${record.bestE1rm.reps}` : undefined}
            />
            <Stat
              size="lg"
              label="Best set"
              value={record?.bestWeight ? formatWeight(record.bestWeight.value, units, false) : `${record?.bestReps?.value ?? 0}`}
              unit={record?.bestWeight ? `${units} × ${record.bestWeight.reps}` : 'reps'}
              sub={record?.bestWeight ? friendlyDay(record.bestWeight.date) : undefined}
            />
            <Stat label="Best volume" value={record?.bestVolume ? formatVolume(record.bestVolume.value, units, false) : '—'} unit={record?.bestVolume ? units : undefined} sub="in one session" />
            <Stat label="Sessions" value={history.length} sub={`Last: ${friendlyDay(history.at(-1)!.date)}`} />
          </Card>

          <Card className="mt-4 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="eyebrow">{metricName}</div>
                {trend !== null && (
                  <div className="mt-1 text-sm text-muted">
                    <span className={clsx('font-semibold', trend > 0 ? 'text-good' : 'text-ink-2')}>
                      {trend > 0 ? '+' : trend < 0 ? '−' : '±'}
                      {Math.abs(round(trend, 1)).toLocaleString()} {activeMetric === 'maxReps' ? 'reps' : units}
                    </span>{' '}
                    across {plural(history.length, 'session')}
                  </div>
                )}
              </div>
              {weighted && (
                <Segmented
                  label="Chart metric"
                  size="sm"
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { value: 'e1rm', label: 'Est. 1RM' },
                    { value: 'topWeight', label: 'Top set' },
                    { value: 'volume', label: 'Volume' },
                  ]}
                />
              )}
            </div>
            {history.length < 2 ? (
              <p className="py-10 text-center text-sm text-muted">Log one more session to see a trend.</p>
            ) : (
              <LineTrend
                data={data}
                series={[{ key: 'value', name: metricName }]}
                format={(v) => (activeMetric === 'maxReps' ? `${v} reps` : `${v.toLocaleString()} ${units}`)}
                ariaLabel={`${metricName} over ${history.length} sessions, from ${data[0].value} to ${data.at(-1)!.value}`}
                tickFormat={(v) => (v >= 10000 ? `${Math.round(v / 1000)}k` : String(v))}
                effort={history.map((h) => h.effort)}
              />
            )}
            {history.length >= 2 && <EffortLegend className="mt-2" />}
          </Card>

          <section className="mt-6">
            <SectionTitle>Personal records</SectionTitle>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {records.map((r) => (
                <li key={r.label} className="flex min-h-16 items-center gap-3 px-4 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
                    <Medal size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{r.label}</span>
                    <span className="block text-sm text-muted">
                      {r.detail} · {format(parseISO(r.date), 'd MMM yyyy')}
                    </span>
                  </span>
                  <span className="stamp text-2xl">{r.value}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6">
            <SectionTitle>History</SectionTitle>
            <ul className="grid gap-2 md:grid-cols-2">
              {[...history].reverse().slice(0, showAll ? undefined : 6).map((h) => {
                let n = 0
                return (
                  <li key={h.workoutId}>
                    <Link to={`/history/${h.workoutId}`} className="block rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="inline-flex items-center gap-2 font-semibold">
                          {format(parseISO(h.date), 'EEE d MMM yyyy')}
                          {h.effort && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
                              <EffortShape effort={h.effort} size={10} /> {EFFORT_META[h.effort].label}
                            </span>
                          )}
                        </span>
                        {h.e1rm > 0 && <span className="tnum text-sm text-muted">e1RM {formatEstimate(h.e1rm, units)}</span>}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {h.sets.map((s) => {
                          if (s.type !== 'warmup') n++
                          const best = s.id === h.bestSet?.id
                          return (
                            <span key={s.id} className={clsx('inline-flex items-center gap-1.5 rounded-lg py-0.5 pr-2 pl-0.5', best ? 'bg-accent-soft text-accent-ink' : 'bg-surface-2')}>
                              <SetTypeBadge type={s.type} index={n} className="size-6 rounded-md text-sm" />
                              <span className="stamp text-[17px]">{s.weight ? `${formatWeight(s.weight, units, false)}×${s.reps}` : `${s.reps} reps`}</span>
                              {s.effort && <EffortShape effort={s.effort} size={9} />}
                            </span>
                          )
                        })}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
            {history.length > 6 && (
              <Button variant="secondary" block className="mt-3" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Show fewer' : `Show all ${history.length} sessions`}
              </Button>
            )}
          </section>
        </>
      )}

      <ExerciseForm open={editing} onClose={() => setEditing(false)} existing={ex} />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          deleteExercise(ex.id)
          toast('Exercise deleted')
          navigate('/library')
        }}
        title="Delete exercise?"
        message={
          history.length
            ? 'It will be removed from the library and your routines. Past workouts keep their sets and still show this exercise.'
            : 'It will be removed from the library and any routines that use it.'
        }
        confirmLabel="Delete"
      />
    </div>
  )
}

/** Aerobic exercises: minutes per session rather than load. */
function AerobicHistory({ exerciseId }: { exerciseId: string }) {
  const workouts = useStore((s) => s.workouts)
  const sessions = useMemo(() => aerobicHistory(workouts, exerciseId), [workouts, exerciseId])
  if (!sessions.length)
    return <EmptyState icon={<ChartIcon size={22} />} title="No sessions yet" body="Log this in a workout and its minutes will build up here, and count toward your weekly aerobic target." />
  const total = sessions.reduce((n, x) => n + x.minutes, 0)
  const recent = sessions.slice(-16)
  return (
    <>
      <Card className="grid grid-cols-2 gap-5 p-4 sm:grid-cols-4 sm:p-5">
        <Stat size="lg" label="Total" value={total.toLocaleString()} unit="min" />
        <Stat size="lg" label="Sessions" value={sessions.length} />
        <Stat label="Average" value={Math.round(total / sessions.length)} unit="min" sub="per session" />
        <Stat label="Last" value={sessions.at(-1)!.minutes} unit="min" sub={friendlyDay(sessions.at(-1)!.date)} />
      </Card>
      <Card className="mt-4 p-4 sm:p-5">
        <SectionTitle>Minutes per session</SectionTitle>
        <ColumnTrend
          data={recent.map((x) => ({ label: format(parseISO(x.date), 'd MMM'), minutes: x.minutes }))}
          series={[{ key: 'minutes', name: 'Minutes', color: 'var(--good)' }]}
          format={(v) => `${v} min`}
          yWidth={32}
          highlightLast
          ariaLabel={`Minutes for the last ${recent.length} sessions`}
        />
      </Card>
      <section className="mt-6">
        <SectionTitle>History</SectionTitle>
        <ul className="grid gap-2 md:grid-cols-2">
          {[...sessions].reverse().slice(0, 12).map((x) => (
            <li key={x.workoutId}>
              <Link to={`/history/${x.workoutId}`} className="flex min-h-14 items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 transition-colors hover:border-line-strong">
                <span className="font-semibold">{format(parseISO(x.date), 'EEE d MMM yyyy')}</span>
                <span className="stamp text-xl">
                  {x.minutes}
                  <span className="font-sans text-sm font-normal text-muted"> min</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
