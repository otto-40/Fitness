import { format } from 'date-fns'
import { Download, Eraser, Monitor, Moon, RotateCcw, Sparkles, Sun, Upload } from 'lucide-react'
import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Chip, ConfirmDialog, Field, Input, PageHeader, Segmented, Select, Switch } from '../components/ui'
import { buildBackup, downloadJson, parseBackup } from '../lib/backup'
import type { ImportResult } from '../lib/backup'
import { WEEKDAY_SHORT } from '../lib/dates'
import { DEMO_PREFIX, STORAGE_KEY, useStore } from '../store/useStore'
import type { DataState } from '../store/useStore'
import { toast } from '../store/useToast'
import type { Equipment, Experience, Goal, ThemePref, Units } from '../types'
import { EQUIPMENT } from '../types'

const REST = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300]

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-line py-8 first:pt-0 last:border-0 md:grid-cols-[240px_1fr]">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  )
}

type Pending = { kind: 'reset' | 'erase' | 'sample' | 'onboarding' } | { kind: 'import'; result: ImportResult }

export default function Settings() {
  const navigate = useNavigate()
  const store = useStore()
  const { settings, profile } = store
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const hasSample = store.workouts.some((w) => w.id.startsWith(DEMO_PREFIX)) || store.measurements.some((m) => m.id.startsWith(DEMO_PREFIX))
  const storageKb = Math.round((localStorage.getItem(STORAGE_KEY)?.length ?? 0) / 1024)

  const exportData = () => {
    const s = useStore.getState()
    const data: DataState = {
      onboarded: s.onboarded,
      profile: s.profile,
      settings: s.settings,
      customExercises: s.customExercises,
      favorites: s.favorites,
      routines: s.routines,
      workouts: s.workouts,
      measurements: s.measurements,
      active: s.active,
    }
    downloadJson(`ironlog-backup-${format(new Date(), 'yyyy-MM-dd')}.json`, buildBackup(data))
    toast('Backup downloaded', { tone: 'success' })
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 20 * 1024 * 1024) return toast('That file is too large to be an IronLog backup.', { tone: 'error' })
    try {
      const result = parseBackup(await file.text())
      setPending({ kind: 'import', result })
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not read that file.', { tone: 'error' })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const confirmCopy: Record<Pending['kind'], { title: string; message: ReactNode; label: string }> = {
    reset: {
      title: 'Reset demo data?',
      message: 'Your workouts, routines, measurements, favourites and custom exercises will be replaced with the sample data. Settings are kept. Export a backup first if you want to keep anything.',
      label: 'Reset',
    },
    erase: {
      title: 'Erase all data?',
      message: 'Deletes every workout, measurement, custom exercise and favourite, and resets routines to the starter set. Settings and profile are kept. This can’t be undone.',
      label: 'Erase everything',
    },
    sample: {
      title: 'Remove sample data?',
      message: 'Removes the example workouts and measurements that came with the app. Anything you logged yourself stays.',
      label: 'Remove',
    },
    onboarding: {
      title: 'Restart onboarding?',
      message: 'You’ll answer the setup questions again and get a freshly generated plan. Your history is kept.',
      label: 'Restart',
    },
    import: {
      title: 'Import backup?',
      message:
        pending?.kind === 'import' ? (
          <>
            This replaces everything on this device with the backup: <strong className="text-ink">{pending.result.counts.workouts}</strong> workouts,{' '}
            <strong className="text-ink">{pending.result.counts.routines}</strong> routines, <strong className="text-ink">{pending.result.counts.measurements}</strong> measurements and{' '}
            <strong className="text-ink">{pending.result.counts.exercises}</strong> custom exercises.
            {pending.result.skipped > 0 && <> {pending.result.skipped} invalid entries will be skipped.</>}
          </>
        ) : null,
      label: 'Replace and import',
    },
  }

  const run = () => {
    if (!pending) return
    const s = useStore.getState()
    switch (pending.kind) {
      case 'reset':
        s.resetDemoData()
        toast('Demo data restored', { tone: 'success' })
        break
      case 'erase':
        s.clearAllData()
        toast('All data erased')
        break
      case 'sample':
        s.removeSampleData()
        toast('Sample data removed', { tone: 'success' })
        break
      case 'onboarding':
        s.restartOnboarding()
        navigate('/')
        break
      case 'import':
        s.importData(pending.result.data)
        toast('Backup imported', { tone: 'success' })
        break
    }
  }

  return (
    <div className="animate-rise max-w-4xl">
      <PageHeader title="Settings" />

      <Section title="Appearance" description="System follows your device's light or dark mode.">
        <Segmented<ThemePref>
          label="Theme"
          value={settings.theme}
          onChange={(theme) => store.updateSettings({ theme })}
          className="w-full sm:w-auto"
          options={[
            { value: 'light', label: <span className="inline-flex items-center gap-1.5"><Sun size={15} /> Light</span> },
            { value: 'dark', label: <span className="inline-flex items-center gap-1.5"><Moon size={15} /> Dark</span> },
            { value: 'system', label: <span className="inline-flex items-center gap-1.5"><Monitor size={15} /> System</span> },
          ]}
        />
      </Section>

      <Section title="Units" description="Applies everywhere instantly. Your data is stored precisely, so switching back and forth never loses anything.">
        <Segmented<Units>
          label="Units"
          value={settings.units}
          onChange={(units) => {
            store.updateSettings({ units })
            toast(units === 'kg' ? 'Now using kilograms and centimetres' : 'Now using pounds and inches')
          }}
          className="w-full sm:w-64"
          options={[
            { value: 'kg', label: 'Kilograms (kg)' },
            { value: 'lb', label: 'Pounds (lb)' },
          ]}
        />
      </Section>

      <Section title="Workouts" description="Used for exercises you add mid-workout or to a routine.">
        <Field label="Default rest time" className="sm:w-64">
          {(id) => (
            <Select id={id} value={settings.defaultRestSec} onChange={(e) => store.updateSettings({ defaultRestSec: Number(e.target.value) })}>
              {REST.map((r) => (
                <option key={r} value={r}>
                  {r < 60 ? `${r} seconds` : `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')} min`}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Switch checked={settings.timerSound} onChange={(timerSound) => store.updateSettings({ timerSound })} label="Rest timer sound" description="A short beep and vibration when rest is over." />
      </Section>

      <Section title="Profile" description="Used for your greeting, your weekly target and the next-workout schedule.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name">
            {(id) => <Input id={id} value={profile.name} maxLength={30} onChange={(e) => store.updateProfile({ name: e.target.value })} placeholder="Your name" />}
          </Field>
          <Field label="Experience">
            {(id) => (
              <Select id={id} value={profile.experience} onChange={(e) => store.updateProfile({ experience: e.target.value as Experience })}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            )}
          </Field>
          <Field label="Goal">
            {(id) => (
              <Select id={id} value={profile.goal} onChange={(e) => store.updateProfile({ goal: e.target.value as Goal })}>
                <option value="strength">Strength</option>
                <option value="muscle">Muscle</option>
                <option value="general">General fitness</option>
              </Select>
            )}
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink-2">Training days</legend>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const on = profile.trainingDays.includes(d)
              return (
                <Chip
                  key={d}
                  active={on}
                  onClick={() => {
                    const next = on ? profile.trainingDays.filter((x) => x !== d) : [...profile.trainingDays, d].sort()
                    if (!next.length) return toast('Keep at least one training day', { tone: 'error' })
                    store.updateProfile({ trainingDays: next, daysPerWeek: next.length })
                  }}
                >
                  {WEEKDAY_SHORT[d]}
                </Chip>
              )
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink-2">Available equipment</legend>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((e: Equipment) => {
              const on = profile.equipment.includes(e)
              return (
                <Chip key={e} active={on} onClick={() => store.updateProfile({ equipment: on ? profile.equipment.filter((x) => x !== e) : [...profile.equipment, e] })}>
                  {e}
                </Chip>
              )
            })}
          </div>
        </fieldset>
        <div>
          <Button variant="outline" icon={<Sparkles size={16} />} onClick={() => setPending({ kind: 'onboarding' })}>
            Restart onboarding
          </Button>
          <p className="mt-2 text-sm text-muted">Answer the setup questions again to generate a new plan.</p>
        </div>
      </Section>

      <Section title="Your data" description={`Everything lives in this browser's local storage (about ${storageKb} KB). Export regularly if you care about it.`}>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Download size={16} />} onClick={exportData}>
            Export JSON
          </Button>
          <Button variant="secondary" icon={<Upload size={16} />} onClick={() => fileRef.current?.click()}>
            Import JSON
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Choose backup file" />
        </div>
        <p className="-mt-2 text-sm text-muted">Imports are checked before anything changes. Invalid entries are skipped and nothing is replaced until you confirm.</p>
        <div className="flex flex-wrap gap-2 border-t border-line pt-5">
          {hasSample && (
            <Button variant="outline" icon={<Eraser size={16} />} onClick={() => setPending({ kind: 'sample' })}>
              Remove sample data
            </Button>
          )}
          <Button variant="outline" icon={<RotateCcw size={16} />} onClick={() => setPending({ kind: 'reset' })}>
            Reset demo data
          </Button>
          <Button variant="danger" onClick={() => setPending({ kind: 'erase' })}>
            Erase all data
          </Button>
        </div>
      </Section>

      <p className="pt-4 text-center text-xs text-muted">IronLog 1.0 · local-first · no account, no tracking</p>

      {pending && (
        <ConfirmDialog
          open
          onClose={() => setPending(null)}
          onConfirm={run}
          title={confirmCopy[pending.kind].title}
          message={confirmCopy[pending.kind].message}
          confirmLabel={confirmCopy[pending.kind].label}
          tone={pending.kind === 'onboarding' || pending.kind === 'sample' ? 'primary' : 'danger'}
        />
      )}
    </div>
  )
}
