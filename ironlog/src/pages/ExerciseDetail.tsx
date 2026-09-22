import clsx from 'clsx'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, LineChart as ChartIcon, Pencil, Star, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LineTrend } from '../components/charts/Charts'
import { ExerciseForm } from '../components/ExerciseForm'
import { Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, MuscleTag, SectionTitle, Segmented, Stat } from '../components/ui'
import { SetTypeBadge } from '../components/workout/SetTypeBadge'
import { useExerciseMap } from '../hooks/useExercises'
import { exerciseHistory, exerciseRecords } from '../lib/calc'
import { friendlyDay } from '../lib/dates'
import { formatEstimate, formatVolume, formatWeight, round, toDisplayWeight } from '../lib/units'
import { useStore } from '../store/useStore'
import { toast } from '../store/useToast'

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

  return (
    <div className="animate-rise">
      <Link to="/library" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} /> Exercises
      </Link>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-4xl leading-none font-semibold tracking-wide uppercase sm:text-5xl">{ex.name}</h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="accent">{ex.primary}</Badge>
            {ex.secondary.map((m) => (
              <MuscleTag key={m} muscle={m} />
            ))}
            <MuscleTag muscle={ex.equipment} />
            {ex.custom && <Badge>Custom</Badge>}
            {ex.archived && <Badge tone="danger">Deleted</Badge>}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {!ex.archived && (
            <IconButton label={fav ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={fav} onClick={() => toggleFavorite(ex.id)} className={fav ? 'text-accent' : undefined}>
              <Star size={20} className={clsx(fav && 'fill-current')} />
            </IconButton>
          )}
          {ex.custom && !ex.archived && (
            <>
              <IconButton label="Edit exercise" onClick={() => setEditing(true)}>
                <Pencil size={18} />
              </IconButton>
              <IconButton label="Delete exercise" tone="danger" onClick={() => setConfirm(true)}>
                <Trash2 size={18} />
              </IconButton>
            </>
          )}
        </div>
      </div>

      {ex.cue && <blockquote className="mb-6 rounded-2xl border-l-4 border-accent bg-surface p-4 text-[15px] text-ink-2">{ex.cue}</blockquote>}

      {history.length === 0 ? (
        <EmptyState icon={<ChartIcon size={22} />} title="No history yet" body="Log this exercise in a workout and its best set, estimated 1RM and progress chart will appear here." />
      ) : (
        <>
          <Card className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4 sm:p-5">
            <Stat
              label="Best set"
              value={record?.bestWeight ? formatWeight(record.bestWeight.value, units, false) : `${record?.bestReps?.value ?? 0}`}
              unit={record?.bestWeight ? `${units} × ${record.bestWeight.reps}` : 'reps'}
              sub={record?.bestWeight ? friendlyDay(record.bestWeight.date) : undefined}
            />
            <Stat
              label="Est. 1RM"
              value={record?.bestE1rm ? formatEstimate(record.bestE1rm.value, units, false) : '—'}
              unit={record?.bestE1rm ? units : undefined}
              sub={record?.bestE1rm ? `from ${formatWeight(record.bestE1rm.weight, units, false)} × ${record.bestE1rm.reps}` : 'Bodyweight only'}
            />
            <Stat label="Best volume" value={record?.bestVolume ? formatVolume(record.bestVolume.value, units, false) : '—'} unit={record?.bestVolume ? units : undefined} sub="in one session" />
            <Stat label="Sessions" value={history.length} sub={`Last: ${friendlyDay(history.at(-1)!.date)}`} />
          </Card>

          <Card className="mt-4 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">{metricName}</h2>
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
              />
            )}
          </Card>

          <section className="mt-6">
            <SectionTitle>History</SectionTitle>
            <ul className="grid gap-2 md:grid-cols-2">
              {[...history].reverse().map((h) => {
                let n = 0
                return (
                  <li key={h.workoutId}>
                    <Link to={`/history/${h.workoutId}`} className="block rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium">{format(parseISO(h.date), 'EEE d MMM yyyy')}</span>
                        {h.e1rm > 0 && <span className="tnum text-sm text-muted">1RM {formatEstimate(h.e1rm, units)}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {h.sets.map((s) => {
                          if (s.type !== 'warmup') n++
                          const best = s.id === h.bestSet?.id
                          return (
                            <span
                              key={s.id}
                              className={clsx('tnum inline-flex items-center gap-1 rounded-lg py-0.5 pr-2 pl-0.5 text-sm', best ? 'bg-accent-soft font-semibold text-accent-ink' : 'bg-surface-2')}
                            >
                              <SetTypeBadge type={s.type} index={n} className="size-6 text-sm" />
                              {s.weight ? `${formatWeight(s.weight, units, false)}×${s.reps}` : `${s.reps} reps`}
                            </span>
                          )
                        })}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
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
