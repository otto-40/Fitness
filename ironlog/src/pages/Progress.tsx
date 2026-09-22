import { differenceInCalendarWeeks, format, parseISO, subWeeks } from 'date-fns'
import { ChartNoAxesColumn, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ColumnTrend, LineTrend, RankBars } from '../components/charts/Charts'
import { Card, EmptyState, Input, LinkButton, PageHeader, SectionTitle, Segmented, Select, Stat } from '../components/ui'
import { useExerciseMap } from '../hooks/useExercises'
import { byDateAsc, completedSetCount, durationMs, exerciseHistory, exerciseRecords, workoutVolume } from '../lib/calc'
import { formatDuration, friendlyDay, WEEK_OPTS } from '../lib/dates'
import { muscleSplit, weeklyBuckets } from '../lib/stats'
import { formatEstimate, formatVolume, formatWeight, round, toDisplayWeight } from '../lib/units'
import { useStore } from '../store/useStore'

type Range = '4' | '12' | '26' | 'all'

export default function Progress() {
  const workouts = useStore((s) => s.workouts)
  const units = useStore((s) => s.settings.units)
  const map = useExerciseMap()
  const { hash } = useLocation()
  const [range, setRange] = useState<Range>('12')
  const [splitMetric, setSplitMetric] = useState<'volume' | 'sets'>('sets')
  const [recordQuery, setRecordQuery] = useState('')

  useEffect(() => {
    if (hash === '#records') setTimeout(() => document.getElementById('records')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [hash])

  const weeks = useMemo(() => {
    if (range !== 'all') return Number(range)
    const first = [...workouts].sort(byDateAsc)[0]
    return first ? Math.max(4, differenceInCalendarWeeks(new Date(), parseISO(first.startedAt), WEEK_OPTS) + 1) : 4
  }, [range, workouts])

  const fromKey = subWeeks(new Date(), weeks).toDateString()
  const from = useMemo(() => new Date(fromKey), [fromKey])
  const inRange = useMemo(() => workouts.filter((w) => parseISO(w.startedAt) >= from), [workouts, from])
  const buckets = useMemo(() => weeklyBuckets(workouts, weeks), [workouts, weeks])
  const split = useMemo(() => muscleSplit(inRange, map, splitMetric), [inRange, map, splitMetric])

  const exerciseOptions = useMemo(() => {
    const count = new Map<string, number>()
    for (const w of workouts) for (const e of w.exercises) count.set(e.exerciseId, (count.get(e.exerciseId) ?? 0) + 1)
    return [...count.entries()]
      .filter(([id]) => map.has(id))
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => ({ id, n, name: map.get(id)!.name }))
  }, [workouts, map])
  const [exerciseId, setExerciseId] = useState<string>('')
  const selected = exerciseId && exerciseOptions.some((o) => o.id === exerciseId) ? exerciseId : (exerciseOptions[0]?.id ?? '')
  const exHistory = useMemo(() => (selected ? exerciseHistory(workouts, selected).filter((h) => parseISO(h.date) >= from) : []), [workouts, selected, from])
  const weighted = exHistory.some((h) => h.topWeight > 0)

  const records = useMemo(
    () =>
      exerciseRecords(workouts)
        .filter((r) => map.has(r.exerciseId))
        .sort((a, b) => map.get(a.exerciseId)!.name.localeCompare(map.get(b.exerciseId)!.name)),
    [workouts, map],
  )
  const filteredRecords = records.filter((r) => map.get(r.exerciseId)!.name.toLowerCase().includes(recordQuery.trim().toLowerCase()))

  if (!workouts.length)
    return (
      <div className="animate-rise">
        <PageHeader title="Progress" />
        <EmptyState
          icon={<ChartNoAxesColumn size={22} />}
          title="Nothing to chart yet"
          body="Volume trends, muscle balance, strength curves and personal records are built from the workouts you log."
          action={<LinkButton to="/routines">Pick a routine</LinkButton>}
        />
      </div>
    )

  const totalVol = inRange.reduce((s, w) => s + workoutVolume(w), 0)
  const avgDur = inRange.length ? inRange.reduce((s, w) => s + durationMs(w), 0) / inRange.length : 0
  const volData = buckets.map((b) => ({ label: b.label, volume: Math.round(toDisplayWeight(b.volume, units)) }))
  const countData = buckets.map((b) => ({ label: b.label, workouts: b.workouts }))
  const exData = exHistory.map((h) => ({
    label: format(parseISO(h.date), 'd MMM'),
    e1rm: round(toDisplayWeight(h.e1rm, units), 1),
    top: round(toDisplayWeight(h.topWeight, units), 1),
    reps: h.maxReps,
  }))
  const kFmt = (v: number) => (v >= 10000 ? `${Math.round(v / 1000)}k` : v.toLocaleString())

  return (
    <div className="animate-rise">
      <PageHeader
        title="Progress"
        subtitle="Everything here is calculated from the workouts you have logged."
        actions={
          <Segmented
            label="Time range"
            value={range}
            onChange={setRange}
            options={[
              { value: '4', label: '4W' },
              { value: '12', label: '12W' },
              { value: '26', label: '6M' },
              { value: 'all', label: 'All' },
            ]}
          />
        }
      />

      <Card className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4 sm:p-5">
        <Stat label="Workouts" value={inRange.length} sub={`${(inRange.length / weeks).toFixed(1)} per week`} />
        <Stat label="Volume" value={formatVolume(totalVol, units, false)} unit={units} />
        <Stat label="Sets" value={inRange.reduce((s, w) => s + completedSetCount(w), 0)} />
        <Stat label="Avg session" value={formatDuration(avgDur)} />
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <SectionTitle>Volume per week ({units})</SectionTitle>
          <ColumnTrend
            data={volData}
            series={[{ key: 'volume', name: 'Volume' }]}
            format={(v) => `${v.toLocaleString()} ${units}`}
            tickFormat={kFmt}
            highlightLast
            ariaLabel={`Weekly volume over the last ${weeks} weeks`}
          />
        </Card>
        <Card className="p-4 sm:p-5">
          <SectionTitle>Workouts per week</SectionTitle>
          <ColumnTrend
            data={countData}
            series={[{ key: 'workouts', name: 'Workouts' }]}
            format={(v) => `${v} workout${v === 1 ? '' : 's'}`}
            yWidth={28}
            highlightLast
            ariaLabel={`Workouts per week over the last ${weeks} weeks`}
          />
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionTitle
            action={
              <Segmented
                label="Muscle split metric"
                size="sm"
                value={splitMetric}
                onChange={setSplitMetric}
                options={[
                  { value: 'sets', label: 'Sets' },
                  { value: 'volume', label: 'Volume' },
                ]}
              />
            }
          >
            By muscle group
          </SectionTitle>
          {split.length ? (
            <RankBars rows={split.map((r) => ({ label: r.muscle, value: r.value }))} format={(v) => (splitMetric === 'sets' ? `${v} sets` : formatVolume(v, units))} />
          ) : (
            <p className="py-8 text-center text-sm text-muted">No working sets in this range.</p>
          )}
          <p className="mt-3 text-xs text-muted">Counted by each exercise’s primary muscle. Warm-ups excluded.</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold tracking-[0.08em] text-muted uppercase">Strength progression</h2>
            <Select value={selected} onChange={(e) => setExerciseId(e.target.value)} aria-label="Exercise" className="h-9 w-auto max-w-[220px] text-sm">
              {exerciseOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.n})
                </option>
              ))}
            </Select>
          </div>
          {exData.length < 2 ? (
            <p className="py-12 text-center text-sm text-muted">Needs at least two sessions in this range.</p>
          ) : weighted ? (
            <LineTrend
              data={exData}
              series={[
                { key: 'e1rm', name: 'Estimated 1RM' },
                { key: 'top', name: 'Top set weight' },
              ]}
              format={(v) => `${v} ${units}`}
              ariaLabel={`Estimated one-rep max and top set weight for ${map.get(selected)?.name}`}
            />
          ) : (
            <LineTrend data={exData} series={[{ key: 'reps', name: 'Most reps' }]} format={(v) => `${v} reps`} ariaLabel={`Most reps per session for ${map.get(selected)?.name}`} />
          )}
          {selected && (
            <Link to={`/library/${selected}`} className="mt-2 inline-block text-sm font-semibold text-accent-ink hover:underline">
              Full exercise history
            </Link>
          )}
        </Card>
      </div>

      <section id="records" className="mt-8 scroll-mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">Personal records</h2>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <Input value={recordQuery} onChange={(e) => setRecordQuery(e.target.value)} placeholder="Filter exercises" className="h-10 pl-9 text-sm" aria-label="Filter records" />
          </div>
        </div>
        <Card className="overflow-hidden">
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-surface-2 text-left text-[11px] tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Exercise</th>
                  <th className="px-4 py-3 font-semibold">Best weight</th>
                  <th className="px-4 py-3 font-semibold">Best est. 1RM</th>
                  <th className="px-4 py-3 font-semibold">Best volume</th>
                  <th className="px-4 py-3 text-right font-semibold">Sessions</th>
                </tr>
              </thead>
              <tbody className="tnum divide-y divide-line whitespace-nowrap">
                {filteredRecords.map((r) => (
                  <tr key={r.exerciseId} className="hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <Link to={`/library/${r.exerciseId}`} className="font-medium hover:underline">
                        {map.get(r.exerciseId)!.name}
                      </Link>
                      <div className="text-xs text-muted">Last {friendlyDay(r.lastDate)}</div>
                    </td>
                    <td className="px-4 py-3">
                      {r.bestWeight ? (
                        <>
                          <span className="font-semibold">{formatWeight(r.bestWeight.value, units)}</span> <span className="text-muted">× {r.bestWeight.reps}</span>
                        </>
                      ) : (
                        <span>
                          <span className="font-semibold">{r.bestReps?.value ?? 0}</span> <span className="text-muted">reps</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">{r.bestE1rm ? formatEstimate(r.bestE1rm.value, units) : '—'}</td>
                    <td className="px-4 py-3">{r.bestVolume ? formatVolume(r.bestVolume.value, units) : '—'}</td>
                    <td className="px-4 py-3 text-right text-muted">{r.sessions}</td>
                  </tr>
                ))}
                {!filteredRecords.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">
                      No exercises match “{recordQuery}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  )
}
