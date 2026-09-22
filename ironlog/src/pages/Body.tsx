import { format, parseISO, subDays } from 'date-fns'
import { Pencil, Plus, Scale, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { LineTrend } from '../components/charts/Charts'
import { Button, Card, ConfirmDialog, EmptyState, Field, IconButton, Input, Modal, PageHeader, SectionTitle, Segmented, Textarea } from '../components/ui'
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

function EntryForm({ open, onClose, existing }: { open: boolean; onClose: () => void; existing: Measurement | null }) {
  const units = useStore((s) => s.settings.units)
  const measurements = useStore((s) => s.measurements)
  const save = useStore((s) => s.saveMeasurement)
  const empty: Draft = { date: format(new Date(), 'yyyy-MM-dd'), weight: null, bodyFat: null, note: '', waist: null, chest: null, arms: null, thighs: null, hips: null }
  const [d, setD] = useState<Draft>(empty)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (!existing) {
      const last = [...measurements].filter((m) => m.weight).sort((a, b) => a.date.localeCompare(b.date)).at(-1)
      setD({ ...empty, weight: last?.weight ? toDisplayWeight(last.weight, units) : null })
      return
    }
    setD({
      date: existing.date,
      weight: existing.weight != null ? toDisplayWeight(existing.weight, units) : null,
      bodyFat: existing.bodyFat ?? null,
      note: existing.note ?? '',
      ...(Object.fromEntries(LENGTHS.map((k) => [k, existing[k] != null ? toDisplayLength(existing[k]!, units) : null])) as Record<LengthKey, number | null>),
    })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

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

export default function Body() {
  const measurements = useStore((s) => s.measurements)
  const units = useStore((s) => s.settings.units)
  const deleteMeasurement = useStore((s) => s.deleteMeasurement)
  const [range, setRange] = useState<'30' | '90' | 'all'>('90')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Measurement | null>(null)
  const [confirm, setConfirm] = useState<Measurement | null>(null)

  const sorted = useMemo(() => [...measurements].sort((a, b) => b.date.localeCompare(a.date)), [measurements])
  const latestWeight = sorted.find((m) => m.weight != null)
  const latestFat = sorted.find((m) => m.bodyFat != null)
  const latestWaist = sorted.find((m) => m.waist != null)
  const c30 = changeOver(measurements, 'weight', 30)
  const c90 = changeOver(measurements, 'weight', 90)

  const chart = useMemo(() => {
    const cutoff = range === 'all' ? '' : format(subDays(new Date(), Number(range)), 'yyyy-MM-dd')
    return [...measurements]
      .filter((m) => m.weight != null && m.date >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => ({ label: format(parseISO(m.date), 'd MMM'), weight: round(toDisplayWeight(m.weight!, units), 1) }))
  }, [measurements, range, units])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <div className="animate-rise">
      <PageHeader
        title="Body"
        subtitle="Bodyweight and measurements over time."
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
          body="Weigh in a couple of times a week, same time of day, and IronLog will chart the trend and show your 30- and 90-day change."
          action={
            <Button icon={<Plus size={18} />} onClick={openNew}>
              Log your first weigh-in
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs font-medium tracking-wide text-muted uppercase">Bodyweight</div>
              <div className="tnum mt-1 font-display text-3xl font-semibold">{latestWeight ? formatWeight(latestWeight.weight, units) : '—'}</div>
              <div className="mt-1 text-xs text-muted">{latestWeight ? format(parseISO(latestWeight.date), 'd MMM yyyy') : 'No weigh-ins'}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs font-medium tracking-wide text-muted uppercase">Last 30 days</div>
              <div className="mt-1 font-display text-3xl font-semibold">
                <Delta value={c30?.delta} units={units} kind="weight" />
              </div>
              <div className="mt-1 text-xs text-muted">{c30 ? `since ${format(parseISO(c30.since), 'd MMM')}` : 'Needs two weigh-ins'}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs font-medium tracking-wide text-muted uppercase">Last 90 days</div>
              <div className="mt-1 font-display text-3xl font-semibold">
                <Delta value={c90?.delta} units={units} kind="weight" />
              </div>
              <div className="mt-1 text-xs text-muted">{c90 ? `since ${format(parseISO(c90.since), 'd MMM')}` : 'Needs two weigh-ins'}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs font-medium tracking-wide text-muted uppercase">Body fat · Waist</div>
              <div className="tnum mt-1 font-display text-3xl font-semibold">
                {latestFat ? `${latestFat.bodyFat}%` : '—'}
                <span className="text-muted"> · </span>
                {latestWaist ? `${toDisplayLength(latestWaist.waist!, units)}` : '—'}
                <span className="ml-1 font-sans text-sm font-medium text-muted">{latestWaist ? lengthUnit(units) : ''}</span>
              </div>
              <div className="mt-1 text-xs text-muted">Latest readings</div>
            </Card>
          </div>

          <Card className="mt-4 p-4 sm:p-5">
            <SectionTitle
              action={
                <Segmented
                  label="Chart range"
                  size="sm"
                  value={range}
                  onChange={setRange}
                  options={[
                    { value: '30', label: '30D' },
                    { value: '90', label: '90D' },
                    { value: 'all', label: 'All' },
                  ]}
                />
              }
            >
              Bodyweight ({units})
            </SectionTitle>
            {chart.length < 2 ? (
              <p className="py-12 text-center text-sm text-muted">Log at least two weigh-ins in this range to see the trend.</p>
            ) : (
              <LineTrend data={chart} series={[{ key: 'weight', name: 'Bodyweight' }]} format={(v) => `${v} ${units}`} ariaLabel={`Bodyweight trend, ${chart.length} entries`} />
            )}
          </Card>

          <section className="mt-6">
            <SectionTitle>Entries</SectionTitle>
            <Card className="overflow-hidden">
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="bg-surface-2 text-left text-[11px] tracking-wide text-muted uppercase">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-3 py-3 font-semibold">Weight</th>
                      <th className="px-3 py-3 font-semibold">Fat %</th>
                      {LENGTHS.map((k) => (
                        <th key={k} className="px-3 py-3 font-semibold">
                          {LENGTH_LABEL[k]}
                        </th>
                      ))}
                      <th className="px-3 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tnum divide-y divide-line">
                    {sorted.map((m) => (
                      <tr key={m.id}>
                        <td className="px-4 py-2 font-medium whitespace-nowrap">
                          {format(parseISO(m.date), 'd MMM yyyy')}
                          {m.note && <div className="max-w-40 truncate text-xs font-normal text-muted">{m.note}</div>}
                        </td>
                        <td className="px-3 py-2 font-semibold whitespace-nowrap">{m.weight != null ? formatWeight(m.weight, units) : '—'}</td>
                        <td className="px-3 py-2">{m.bodyFat ?? '—'}</td>
                        {LENGTHS.map((k) => (
                          <td key={k} className="px-3 py-2 text-ink-2">
                            {m[k] != null ? toDisplayLength(m[k]!, units) : '—'}
                          </td>
                        ))}
                        <td className="px-2 py-1 text-right whitespace-nowrap">
                          <IconButton
                            size="sm"
                            label={`Edit entry for ${m.date}`}
                            onClick={() => {
                              setEditing(m)
                              setFormOpen(true)
                            }}
                          >
                            <Pencil size={15} />
                          </IconButton>
                          <IconButton size="sm" tone="danger" label={`Delete entry for ${m.date}`} onClick={() => setConfirm(m)}>
                            <Trash2 size={15} />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
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
        message={confirm ? `Remove the entry for ${format(parseISO(confirm.date), 'd MMMM yyyy')}?` : ''}
        confirmLabel="Delete"
      />
    </div>
  )
}
