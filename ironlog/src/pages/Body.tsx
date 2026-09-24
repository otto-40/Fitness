import clsx from 'clsx'
import { format, parseISO, subDays } from 'date-fns'
import { MoveRight, Pencil, Plus, Scale, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { LineTrend } from '../components/charts/Charts'
import { Button, Card, ConfirmDialog, EmptyState, Field, HeroCard, IconButton, Input, Modal, PageHeader, SectionTitle, Segmented, Textarea } from '../components/ui'
import { NumberField } from '../components/workout/NumberField'
import { uid } from '../lib/id'
import { formatWeight, fromDisplayLength, fromDisplayWeight, lengthUnit, round, toDisplayLength, toDisplayWeight } from '../lib/units'
import { useStore } from '../store/useStore'
import { toast } from '../store/useToast'
import type { Measurement, Units } from '../types'

const LENGTHS = ['waist', 'chest', 'arms', 'thighs', 'hips'] as const
type LengthKey = (typeof LENGTHS)[number]
const LENGTH_LABEL: Record<LengthKey, string> = { waist: 'Waist', chest: 'Chest', arms: 'Arms', thighs: 'Thighs', hips: 'Hips' }

/** Latest value compared with the reading nearest to `days` ago (on or before, else the earliest after). */
function changeOver(entries: Measurement[], key: 'weight' | LengthKey | 'bodyFat', days: number) {
  const withKey = entries.filter((m) => m[key] != null).sort((a, b) => a.date.localeCompare(b.date))
  const latest = withKey.at(-1)
  if (!latest) return null
  const cutoff = format(subDays(new Date(), days), 'yyyy-MM-dd')
  const before = withKey.filter((m) => m.date <= cutoff).at(-1)
  const base = before ?? withKey.find((m) => m.date > cutoff)
  if (!base || base === latest) return null
  return { delta: (latest[key] as number) - (base[key] as number), since: base.date }
}

function Delta({ value, units, kind }: { value: number | null | undefined; units: Units; kind: 'weight' | 'length' }) {
  if (value == null) return <span className="text-muted">—</span>
  const v = kind === 'weight' ? toDisplayWeight(Math.abs(value), units) : toDisplayLength(Math.abs(value), units)
  const unit = kind === 'weight' ? units : lengthUnit(units)
  return (
    <span className="tnum">
      {value > 0.05 ? '+' : value < -0.05 ? '−' : '±'}
      {round(v, 1)} {unit}
    </span>
  )
}

type Draft = { date: string; weight: number | null; bodyFat: number | null; note: string } & Record<LengthKey, number | null>

type EntryFormProps = { open: boolean; onClose: () => void; existing: Measurement | null }

/** Mounted only while open, so each opening starts from the entry (or the last weigh-in). */
function EntryForm(props: EntryFormProps) {
  return props.open ? <OpenEntryForm {...props} /> : null
}

function OpenEntryForm({ open, onClose, existing }: EntryFormProps) {
  const units = useStore((s) => s.settings.units)
  const measurements = useStore((s) => s.measurements)
  const save = useStore((s) => s.saveMeasurement)
  const [d, setD] = useState<Draft>(() => {
    const empty: Draft = { date: format(new Date(), 'yyyy-MM-dd'), weight: null, bodyFat: null, note: '', waist: null, chest: null, arms: null, thighs: null, hips: null }
    if (!existing) {
      const last = [...measurements].filter((m) => m.weight).sort((a, b) => a.date.localeCompare(b.date)).at(-1)
      return { ...empty, weight: last?.weight ? toDisplayWeight(last.weight, units) : null }
    }
    return {
      date: existing.date,
      weight: existing.weight != null ? toDisplayWeight(existing.weight, units) : null,
      bodyFat: existing.bodyFat ?? null,
      note: existing.note ?? '',
      ...(Object.fromEntries(LENGTHS.map((k) => [k, existing[k] != null ? toDisplayLength(existing[k]!, units) : null])) as Record<LengthKey, number | null>),
    }
  })
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return setError('Pick a date.')
    if (d.date > format(new Date(), 'yyyy-MM-dd')) return setError('Entries can’t be in the future.')
    const kg = d.weight != null ? fromDisplayWeight(d.weight, units) : null
    if (kg != null && (kg < 20 || kg > 400)) return setError(`Bodyweight should be between ${units === 'kg' ? '20 and 400 kg' : '44 and 880 lb'}.`)
    if (d.bodyFat != null && (d.bodyFat < 1 || d.bodyFat > 70)) return setError('Body fat should be between 1 and 70%.')
    const lengths = Object.fromEntries(LENGTHS.map((k) => [k, d[k] != null && d[k]! > 0 ? fromDisplayLength(d[k]!, units) : null])) as Record<LengthKey, number | null>
    if (LENGTHS.some((k) => lengths[k] != null && (lengths[k]! < 10 || lengths[k]! > 300))) return setError('One of the measurements looks out of range.')
    if (kg == null && d.bodyFat == null && LENGTHS.every((k) => lengths[k] == null)) return setError('Enter at least one value.')

    const sameDay = !existing ? measurements.find((m) => m.date === d.date) : null
    const base = existing ?? sameDay ?? { id: uid('m'), date: d.date }
    save({ ...base, date: d.date, weight: kg, bodyFat: d.bodyFat, ...lengths, note: d.note.trim() || undefined })
    toast(sameDay ? 'Updated the entry for that day' : existing ? 'Entry updated' : 'Entry logged', { tone: 'success' })
    onClose()
  }

  const lu = lengthUnit(units)
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit entry' : 'Log measurements'}
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>
            Cancel
          </Button>
          <Button block type="submit" form="measure-form">
            Save
          </Button>
        </>
      }
    >
      <form id="measure-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && (
          <p className="rounded-xl bg-danger-soft p-3 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">{(id) => <Input id={id} type="date" value={d.date} max={format(new Date(), 'yyyy-MM-dd')} onChange={(e) => setD({ ...d, date: e.target.value })} />}</Field>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-2">
            Bodyweight ({units})
            <NumberField label={`Bodyweight in ${units}`} value={d.weight} onChange={(v) => setD({ ...d, weight: v })} className="h-11 bg-surface-2" />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-2">
            Body fat %
            <NumberField label="Body fat percent" value={d.bodyFat} max={70} onChange={(v) => setD({ ...d, bodyFat: v })} />
          </label>
          {LENGTHS.map((k) => (
            <label key={k} className="flex flex-col gap-1.5 text-sm font-medium text-ink-2">
              {LENGTH_LABEL[k]} ({lu})
              <NumberField label={`${LENGTH_LABEL[k]} in ${lu}`} value={d[k]} max={400} onChange={(v) => setD({ ...d, [k]: v })} />
            </label>
          ))}
        </div>
        <Field label="Note">{(id) => <Textarea id={id} value={d.note} maxLength={500} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder="Morning, after breakfast, etc." />}</Field>
      </form>
    </Modal>
  )
}

type MetricKey = 'weight' | 'bodyFat' | LengthKey
const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'weight', label: 'Bodyweight' },
  { key: 'bodyFat', label: 'Body fat' },
  ...LENGTHS.map((k) => ({ key: k as MetricKey, label: LENGTH_LABEL[k] })),
]
const RANGES = [
  { value: '30', label: '30D' },
  { value: '90', label: '90D' },
  { value: '365', label: '1Y' },
  { value: 'all', label: 'All' },
] as const
type RangeKey = (typeof RANGES)[number]['value']

export default function Body() {
  const measurements = useStore((s) => s.measurements)
  const units = useStore((s) => s.settings.units)
  const deleteMeasurement = useStore((s) => s.deleteMeasurement)
  const [range, setRange] = useState<RangeKey>('90')
  const [metric, setMetric] = useState<MetricKey>('weight')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Measurement | null>(null)
  const [confirm, setConfirm] = useState<Measurement | null>(null)
  const [showAll, setShowAll] = useState(false)

  const sorted = useMemo(() => [...measurements].sort((a, b) => b.date.localeCompare(a.date)), [measurements])
  const latestWeight = sorted.find((m) => m.weight != null)
  const c30 = changeOver(measurements, 'weight', 30)
  const c90 = changeOver(measurements, 'weight', 90)

  const conv = (key: MetricKey, v: number) => (key === 'weight' ? toDisplayWeight(v, units) : key === 'bodyFat' ? v : toDisplayLength(v, units))
  const unitFor = (key: MetricKey) => (key === 'weight' ? units : key === 'bodyFat' ? '%' : lengthUnit(units))
  const metricLabel = METRICS.find((m) => m.key === metric)!.label

  const series = useMemo(() => {
    const cutoff = range === 'all' ? '' : format(subDays(new Date(), Number(range)), 'yyyy-MM-dd')
    return [...measurements].filter((m) => m[metric] != null && m.date >= cutoff).sort((a, b) => a.date.localeCompare(b.date))
  }, [measurements, range, metric])
  const chart = series.map((m) => ({ label: format(parseISO(m.date), 'd MMM'), value: round(conv(metric, m[metric] as number), 1) }))
  const startV = chart[0]?.value
  const curV = chart.at(-1)?.value
  const counts = useMemo(() => Object.fromEntries(METRICS.map((m) => [m.key, measurements.filter((x) => x[m.key] != null).length])) as Record<MetricKey, number>, [measurements])

  const months = useMemo(() => {
    const g = new Map<string, Measurement[]>()
    for (const m of sorted) g.set(m.date.slice(0, 7), [...(g.get(m.date.slice(0, 7)) ?? []), m])
    return [...g.entries()]
  }, [sorted])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (m: Measurement) => {
    setEditing(m)
    setFormOpen(true)
  }

  const fmtVal = (key: MetricKey, v: number | null | undefined) => (v == null ? '—' : key === 'weight' ? formatWeight(v, units) : `${round(conv(key, v), 1)} ${unitFor(key)}`)

  return (
    <div className="animate-rise">
      <PageHeader
        title="Body"
        actions={
          <Button icon={<Plus size={18} />} onClick={openNew}>
            Log entry
          </Button>
        }
      />

      {measurements.length === 0 ? (
        <EmptyState
          icon={<Scale size={22} />}
          title="No measurements yet"
          body="Weigh in a couple of times a week, same time of day, and Overload will chart the trend and show your 30- and 90-day change."
          action={
            <Button icon={<Plus size={18} />} onClick={openNew}>
              Log your first weigh-in
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <HeroCard className="col-span-2 p-5 lg:col-span-2">
              <div className="text-[13px] font-semibold text-on-hero-muted">Bodyweight</div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="stamp text-[60px]">{latestWeight ? formatWeight(latestWeight.weight, units, false) : '—'}</span>
                <span className="text-base text-on-hero-muted">{units}</span>
              </div>
              {c30 && (
                <p className="mt-2 flex items-center gap-1.5 text-[15px] font-semibold">
                  {Math.abs(c30.delta) < 0.1 ? <MoveRight size={17} /> : c30.delta < 0 ? <TrendingDown size={17} /> : <TrendingUp size={17} />}
                  {Math.abs(c30.delta) < 0.1
                    ? 'Holding steady over the last 30 days'
                    : `${c30.delta < 0 ? 'Down' : 'Up'} ${formatWeight(Math.abs(c30.delta), units)} in the last 30 days`}
                </p>
              )}
              <div className="mt-1 text-xs text-on-hero-muted">{latestWeight ? `Last weigh-in ${format(parseISO(latestWeight.date), 'd MMM yyyy')}` : 'No weigh-ins yet'}</div>
            </HeroCard>
            <Card className="p-4">
              <div className="eyebrow">Last 30 days</div>
              <div className="stamp mt-2 text-[30px]">
                <Delta value={c30?.delta} units={units} kind="weight" />
              </div>
              <div className="mt-1 text-xs text-muted">{c30 ? `since ${format(parseISO(c30.since), 'd MMM')}` : 'Needs two weigh-ins'}</div>
            </Card>
            <Card className="p-4">
              <div className="eyebrow">Last 90 days</div>
              <div className="stamp mt-2 text-[30px]">
                <Delta value={c90?.delta} units={units} kind="weight" />
              </div>
              <div className="mt-1 text-xs text-muted">{c90 ? `since ${format(parseISO(c90.since), 'd MMM')}` : 'Needs two weigh-ins'}</div>
            </Card>
          </div>

          <Card className="mt-4 p-4 sm:p-5">
            <div role="radiogroup" aria-label="Measurement" className="scrollbar-none -mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  role="radio"
                  aria-checked={metric === m.key}
                  onClick={() => setMetric(m.key)}
                  className={clsx(
                    'hit inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors',
                    metric === m.key ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-2 hover:text-ink',
                  )}
                >
                  {m.label}
                  <span className={clsx('tnum text-xs', metric === m.key ? 'opacity-70' : 'text-muted')}>{counts[m.key]}</span>
                </button>
              ))}
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-3 border-b border-line pb-4">
              <div>
                <dt className="eyebrow">Start</dt>
                <dd className="stamp mt-1 text-2xl">{startV ?? '—'}</dd>
              </div>
              <div>
                <dt className="eyebrow">Current</dt>
                <dd className="stamp mt-1 text-2xl">{curV ?? '—'}</dd>
              </div>
              <div>
                <dt className="eyebrow">Change</dt>
                <dd className="stamp mt-1 text-2xl">
                  {startV != null && curV != null && chart.length > 1 ? `${curV - startV > 0 ? '+' : curV - startV < 0 ? '−' : '±'}${Math.abs(round(curV - startV, 1))}` : '—'}
                  <span className="ml-1 font-sans text-sm font-medium text-muted">{unitFor(metric)}</span>
                </dd>
              </div>
            </dl>

            <div className="mt-4">
              {chart.length < 2 ? (
                <p className="py-12 text-center text-sm text-muted">Log at least two {metricLabel.toLowerCase()} entries in this range to see the trend.</p>
              ) : (
                <LineTrend data={chart} series={[{ key: 'value', name: metricLabel }]} format={(v) => `${v} ${unitFor(metric)}`} ariaLabel={`${metricLabel} trend, ${chart.length} entries, from ${startV} to ${curV} ${unitFor(metric)}`} />
              )}
            </div>
            <Segmented label="Chart range" size="sm" value={range} onChange={setRange} options={RANGES.map((r) => ({ value: r.value, label: r.label }))} className="mt-3 flex w-full sm:w-auto" />
          </Card>

          <section className="mt-6">
            <SectionTitle>Entries</SectionTitle>
            <div className="flex flex-col gap-5">
              {months.slice(0, showAll ? undefined : 2).map(([key, list]) => (
                <div key={key}>
                  <h3 className="mb-2 px-1 text-[15px] font-semibold text-muted">{format(parseISO(`${key}-01`), 'MMMM yyyy')}</h3>
                  <ul className="divide-y divide-line overflow-hidden card">
                    {list.map((m) => {
                      const extras = [
                        m.bodyFat != null && `Fat ${m.bodyFat}%`,
                        ...LENGTHS.map((k) => m[k] != null && `${LENGTH_LABEL[k]} ${toDisplayLength(m[k]!, units)}`),
                      ].filter(Boolean) as string[]
                      return (
                        <li key={m.id} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
                          <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2 leading-none">
                            <span className="text-[10px] font-semibold text-muted uppercase">{format(parseISO(m.date), 'EEE')}</span>
                            <span className="stamp text-lg">{format(parseISO(m.date), 'd')}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="stamp block text-xl">{m.weight != null ? formatWeight(m.weight, units) : '—'}</span>
                            <span className="block truncate text-xs text-muted">
                              {extras.length ? `${extras.join(' · ')}${extras.some((e) => !e.startsWith('Fat')) ? ` ${lengthUnit(units)}` : ''}` : m.note ?? 'Bodyweight only'}
                            </span>
                          </span>
                          <IconButton label={`Edit entry for ${m.date}`} onClick={() => openEdit(m)} className="size-11">
                            <Pencil size={16} />
                          </IconButton>
                          <IconButton tone="danger" label={`Delete entry for ${m.date}`} onClick={() => setConfirm(m)} className="size-11">
                            <Trash2 size={16} />
                          </IconButton>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
            {months.length > 2 && (
              <Button variant="secondary" block className="mt-4" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Show recent months only' : `Show all ${sorted.length} entries`}
              </Button>
            )}
          </section>
        </>
      )}

      <EntryForm open={formOpen} onClose={() => setFormOpen(false)} existing={editing} />
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return
          const snapshot = confirm
          deleteMeasurement(snapshot.id)
          toast('Entry deleted', { action: { label: 'Undo', run: () => useStore.getState().saveMeasurement(snapshot) } })
        }}
        title="Delete entry?"
        message={confirm ? `Remove the entry for ${format(parseISO(confirm.date), 'd MMMM yyyy')}? (${fmtVal('weight', confirm.weight)})` : ''}
        confirmLabel="Delete"
      />
    </div>
  )
}
