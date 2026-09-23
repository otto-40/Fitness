import { differenceInCalendarWeeks, format, parseISO, subWeeks } from 'date-fns'
import clsx from 'clsx'
import { ArrowDownRight, ArrowUpRight, ChartNoAxesColumn, Minus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ColumnTrend, LineTrend, RankBars } from '../components/charts/Charts'
import { Card, EmptyState, HeroCard, Input, LinkButton, PageHeader, Ring, SectionTitle, Segmented, Select, Sparkline } from '../components/ui'
import { EffortLegend } from '../components/workout/Effort'
import { useExerciseMap } from '../hooks/useExercises'
import { byDateAsc, completedSetCount, durationMs, exerciseHistory, exerciseRecords, workoutVolume } from '../lib/calc'
import { formatDuration, friendlyDay, WEEK_OPTS } from '../lib/dates'
import { muscleSplit, weeklyBuckets } from '../lib/stats'
import { formatEstimate, formatVolume, formatWeight, round, toDisplayWeight } from '../lib/units'
import { useStore } from '../store/useStore'
import { plural } from '../lib/format'

type Range = '4' | '12' | '26' | 'all'

/** Change versus the previous period of the same length, as an arrow and a percentage. */
function Delta({ cur, prev, className, label, onHero }: { cur: number; prev: number; className?: string; label?: string; onHero?: boolean }) {
  if (!prev) return onHero ? <div className={clsx('text-xs text-on-hero-muted', className)}>First period on record</div> : null
  const pct = ((cur - prev) / prev) * 100
  const up = pct >= 0.5
  const down = pct <= -0.5
  return (
    <div className={clsx('flex items-center gap-1 text-xs font-semibold', up ? (onHero ? 'text-hero-ok' : 'text-good') : onHero ? 'text-on-hero-muted' : 'text-ink-2', className)}>
      {up ? <ArrowUpRight size={14} /> : down ? <ArrowDownRight size={14} /> : <Minus size={14} />}
      {Math.abs(pct).toFixed(0)}%{label && <span className={clsx('font-normal', onHero ? 'text-on-hero-muted' : 'text-muted')}> {label}</span>}
    </div>
  )
}

export default function Progress() {
  const workouts = useStore((s) => s.workouts)
  const units = useStore((s) => s.settings.units)
  const aerobicTarget = useStore((s) => s.settings.aerobicTargetMin ?? 150)
  const map = useExerciseMap()
  const { hash } = useLocation()
  const [range, setRange] = useState<Range>('12')
  const [splitMetric, setSplitMetric] = useState<'volume' | 'sets'>('sets')
  const [recordQuery, setRecordQuery] = useState('')

  useEffect(() => {
    if (hash === '#records' || hash === '#aerobic') setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 50)
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
  const prevRange = useMemo(() => {
    const prevFrom = subWeeks(from, weeks)
    return workouts.filter((w) => {
      const d = parseISO(w.startedAt)
      return d >= prevFrom && d < from
    })
  }, [workouts, from, weeks])
  const split = useMemo(() => muscleSplit(inRange, map, splitMetric), [inRange, map, splitMetric])

  const exerciseOptions = useMemo(() => {
    const count = new Map<string, number>()
    for (const w of workouts) for (const e of w.exercises) count.set(e.exerciseId, (count.get(e.exerciseId) ?? 0) + 1)
    return [...count.entries()]
      .filter(([id]) => map.has(id) && !map.get(id)!.aerobic)
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => ({ id, n, name: map.get(id)!.name }))
  }, [workouts, map])
  const [exerciseId, setExerciseId] = useState<string>('')
  const selected = exerciseId && exerciseOptions.some((o) => o.id === exerciseId) ? exerciseId : (exerciseOptions[0]?.id ?? '')
  const exHistory = useMemo(() => (selected ? exerciseHistory(workouts, selected).filter((h) => parseISO(h.date) >= from) : []), [workouts, selected, from])
  const weighted = exHistory.some((h) => h.topWeight > 0)
  const strengthList = useMemo(
    () =>
      exerciseOptions.slice(0, 6).map((o) => {
        const h = exerciseHistory(workouts, o.id).filter((x) => parseISO(x.date) >= from)
        const w = h.some((x) => x.topWeight > 0)
        const vals = h.map((x) => (w ? x.e1rm : x.maxReps))
        return { ...o, weighted: w, vals, last: vals.at(-1) ?? 0, delta: vals.length > 1 ? vals.at(-1)! - vals[0] : 0 }
      }),
    [exerciseOptions, workouts, from],
  )

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
  const prevVol = prevRange.reduce((s, w) => s + workoutVolume(w), 0)
  const avgDur = inRange.length ? inRange.reduce((s, w) => s + durationMs(w), 0) / inRange.length : 0
  const prevAvg = prevRange.length ? prevRange.reduce((s, w) => s + durationMs(w), 0) / prevRange.length : 0
  const curSets = inRange.reduce((s, w) => s + completedSetCount(w), 0)
  const prevSets = prevRange.reduce((s, w) => s + completedSetCount(w), 0)
  const volData = buckets.map((b) => ({ label: b.label, volume: Math.round(toDisplayWeight(b.volume, units)) }))
  const countData = buckets.map((b) => ({ label: b.label, workouts: b.workouts }))
  const aerobicData = buckets.map((b) => ({ label: b.label, minutes: b.aerobic }))
  const aerobicThisWeek = buckets.at(-1)?.aerobic ?? 0
  const pastWeeks = buckets.slice(0, -1)
  const weeksMet = pastWeeks.filter((b) => b.aerobic >= aerobicTarget).length
  const avgAerobic = pastWeeks.length ? Math.round(pastWeeks.reduce((n, b) => n + b.aerobic, 0) / pastWeeks.length) : 0
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

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
        <HeroCard className="p-5 sm:p-6">
          <div className="eyebrow text-on-hero-muted">Total volume · {range === 'all' ? 'all time' : `last ${range === '26' ? '6 months' : `${range} weeks`}`}</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="stamp text-[56px]">{formatVolume(totalVol, units, false)}</span>
            <span className="text-base text-on-hero-muted">{units}</span>
          </div>
          {range !== 'all' && <Delta cur={totalVol} prev={prevVol} className="mt-2" label="vs previous period" onHero />}
        </HeroCard>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ['Workouts', String(inRange.length), `${(inRange.length / weeks).toFixed(1)}/wk`, inRange.length, prevRange.length],
              ['Sets', String(curSets), 'completed', curSets, prevSets],
              ['Avg session', formatDuration(avgDur), 'duration', avgDur, prevAvg],
            ] as const
          ).map(([label, value, sub, cur, prev]) => (
            <Card key={label} className="flex flex-col p-4">
              <div className="eyebrow">{label}</div>
              <div className="stamp mt-2 text-[28px]">{value}</div>
              <div className="mt-auto pt-2 text-xs text-muted">{sub}</div>
              {range !== 'all' && <Delta cur={cur} prev={prev} className="mt-1" />}
            </Card>
          ))}
        </div>
      </div>

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

        <Card id="aerobic" className="scroll-mt-6 p-4 sm:p-5 lg:col-span-2">
          <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
            <div>
              <SectionTitle>Aerobic minutes</SectionTitle>
              <div className="flex items-center gap-4">
                <Ring value={aerobicThisWeek / aerobicTarget} size={84} stroke={8} color="var(--good)" label={`${aerobicThisWeek} of ${aerobicTarget} minutes this week`}>
                  <span className="stamp text-2xl">{aerobicThisWeek}</span>
                  <span className="text-[10px] font-semibold text-muted">of {aerobicTarget}</span>
                </Ring>
                <dl className="grid gap-2 text-sm">
                  <div>
                    <dt className="eyebrow">Weeks at target</dt>
                    <dd className="stamp text-xl">
                      {weeksMet}
                      <span className="font-sans text-sm font-normal text-muted"> of {pastWeeks.length}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Weekly average</dt>
                    <dd className="stamp text-xl">
                      {avgAerobic}
                      <span className="font-sans text-sm font-normal text-muted"> min</span>
                    </dd>
                  </div>
                </dl>
              </div>
              <p className="mt-3 text-xs text-muted">
                {aerobicTarget} min a week of moderate activity is the WHO and AHA adult guideline. Vigorous work such as basketball counts double toward it; this total doesn’t double it for you.
              </p>
            </div>
            <ColumnTrend
              data={aerobicData}
              series={[{ key: 'minutes', name: 'Aerobic minutes', color: 'var(--good)' }]}
              format={(v) => `${v} min`}
              yWidth={32}
              highlightLast
              ariaLabel={`Aerobic minutes per week over the last ${weeks} weeks, against a ${aerobicTarget}-minute target`}
            />
          </div>
        </Card>

        <Card className="p-4 sm:p-5 lg:col-span-2">
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
            <RankBars rows={split.map((r) => ({ label: r.muscle, value: r.value }))} format={(v) => (splitMetric === 'sets' ? plural(v, 'set') : formatVolume(v, units))} />
          ) : (
            <p className="py-8 text-center text-sm text-muted">No working sets in this range.</p>
          )}
          <p className="mt-3 text-xs text-muted">Counted by each exercise’s primary muscle. Warm-ups excluded.</p>
        </Card>

      </div>

      <Card className="mt-4 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="eyebrow">Strength progression</h2>
          <Select value={selected} onChange={(e) => setExerciseId(e.target.value)} aria-label="Exercise" className="w-auto max-w-[220px] text-sm">
            {exerciseOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.n})
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <ul className="-mx-2 flex flex-col" aria-label="Most trained exercises">
            {strengthList.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => setExerciseId(o.id)}
                  aria-pressed={o.id === selected}
                  className={clsx('flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors', o.id === selected ? 'bg-accent-soft/50' : 'hover:bg-surface-2')}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{o.name}</span>
                    <span className="block text-xs text-muted">
                      {o.weighted ? `e1RM ${formatEstimate(o.last, units)}` : `${o.last} reps`}
                      {o.delta !== 0 && (
                        <span className={clsx('ml-1.5 font-semibold', o.delta > 0 ? 'text-good' : 'text-ink-2')}>
                          {o.delta > 0 ? '▲' : '▼'} {o.weighted ? formatEstimate(Math.abs(o.delta), units) : Math.abs(o.delta)}
                        </span>
                      )}
                    </span>
                  </span>
                  <Sparkline values={o.vals} />
                </button>
              </li>
            ))}
          </ul>
          <div>
            <div className="mb-2 font-semibold">{map.get(selected)?.name}</div>
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
                effort={exHistory.map((h) => h.effort)}
              />
            ) : (
              <LineTrend data={exData} series={[{ key: 'reps', name: 'Most reps' }]} format={(v) => `${v} reps`} ariaLabel={`Most reps per session for ${map.get(selected)?.name}`} effort={exHistory.map((h) => h.effort)} />
            )}
            {exData.length >= 2 && <EffortLegend className="mt-2" />}
            {selected && (
              <Link to={`/library/${selected}`} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent-ink hover:underline">
                Full exercise history
              </Link>
            )}
          </div>
        </div>
      </Card>

      <section id="records" className="mt-8 scroll-mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[26px] font-semibold tracking-[0.04em] uppercase">Personal records</h2>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <Input value={recordQuery} onChange={(e) => setRecordQuery(e.target.value)} placeholder="Filter exercises" className="pl-9 text-sm" aria-label="Filter records" />
          </div>
        </div>
        <ul className="flex flex-col gap-2 sm:hidden">
          {filteredRecords.map((r) => (
            <li key={r.exerciseId}>
              <Link to={`/library/${r.exerciseId}`} className="block rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-semibold">{map.get(r.exerciseId)!.name}</span>
                  <span className="shrink-0 text-xs text-muted">{plural(r.sessions, 'session')}</span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2">
                  <div>
                    <dt className="eyebrow">Best set</dt>
                    <dd className="stamp mt-1 text-lg">{r.bestWeight ? `${formatWeight(r.bestWeight.value, units, false)}×${r.bestWeight.reps}` : `${r.bestReps?.value ?? 0} reps`}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow">e1RM</dt>
                    <dd className="stamp mt-1 text-lg">{r.bestE1rm ? formatEstimate(r.bestE1rm.value, units) : '—'}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Volume</dt>
                    <dd className="stamp mt-1 text-lg">{r.bestVolume ? formatVolume(r.bestVolume.value, units) : '—'}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
          {!filteredRecords.length && <li className="py-8 text-center text-sm text-muted">No exercises match “{recordQuery}”.</li>}
        </ul>
        <Card className="hidden overflow-hidden sm:block">
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
