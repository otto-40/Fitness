import { format } from 'date-fns'
import clsx from 'clsx'
import { ChevronRight, Download, Eraser, Monitor, Moon, RotateCcw, Ruler, Sparkles, Sun, Timer, Trash2, Upload } from 'lucide-react'
import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Chip, ConfirmDialog, Field, Input, ListGroup, ListRow, PageHeader, Segmented, Select, Switch } from '../components/ui'
import { buildBackup, downloadJson, parseBackup } from '../lib/backup'
import type { ImportResult } from '../lib/backup'
import { WEEKDAY_SHORT } from '../lib/dates'
import { DEMO_PREFIX, STORAGE_KEY, useStore } from '../store/useStore'
import type { DataState } from '../store/useStore'
import { toast } from '../store/useToast'
import type { Equipment, Experience, Goal, ThemePref, Units } from '../types'
import { EQUIPMENT } from '../types'

const REST = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300]
const GOAL_LABEL: Record<Goal, string> = { strength: 'Strength', muscle: 'Muscle', general: 'General fitness' }

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
    <div className="animate-rise mx-auto max-w-2xl">
      <PageHeader title="Settings" />

      <Card className="mb-8 flex items-center gap-4 p-4 sm:p-5">
        <span className="stamp flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-2xl text-on-accent">{(profile.name || 'A').slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-semibold">{profile.name || 'Athlete'}</div>
          <div className="text-sm text-muted">
            {GOAL_LABEL[profile.goal]} · {profile.experience[0].toUpperCase() + profile.experience.slice(1)} · {profile.trainingDays.length} days a week
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-8">
        <ListGroup title="Appearance" footer="System follows your device’s light or dark mode.">
          <ListRow
            stack
            icon={<Moon size={18} />}
            title="Theme"
            control={
              <Segmented<ThemePref>
                label="Theme"
                value={settings.theme}
                onChange={(theme) => store.updateSettings({ theme })}
                className="w-full"
                options={[
                  { value: 'light', label: <span className="inline-flex items-center gap-1.5"><Sun size={15} /> Light</span> },
                  { value: 'dark', label: <span className="inline-flex items-center gap-1.5"><Moon size={15} /> Dark</span> },
                  { value: 'system', label: <span className="inline-flex items-center gap-1.5"><Monitor size={15} /> System</span> },
                ]}
              />
            }
          />
          <ListRow
            stack
            icon={<Ruler size={18} />}
            title="Units"
            description="Applies everywhere instantly, without losing precision."
            control={
              <Segmented<Units>
                label="Units"
                value={settings.units}
                onChange={(units) => {
                  store.updateSettings({ units })
                  toast(units === 'kg' ? 'Now using kilograms and centimetres' : 'Now using pounds and inches')
                }}
                className="w-full"
                options={[
                  { value: 'kg', label: 'Kilograms (kg)' },
                  { value: 'lb', label: 'Pounds (lb)' },
                ]}
              />
            }
          />
        </ListGroup>

        <ListGroup title="Workouts" footer="The default rest is used for exercises you add mid-workout or to a routine.">
          <ListRow
            icon={<Timer size={18} />}
            title={<label htmlFor="default-rest">Default rest time</label>}
            control={
              <Select id="default-rest" value={settings.defaultRestSec} onChange={(e) => store.updateSettings({ defaultRestSec: Number(e.target.value) })} className="w-36">
                {REST.map((r) => (
                  <option key={r} value={r}>
                    {r < 60 ? `${r} seconds` : `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')} min`}
                  </option>
                ))}
              </Select>
            }
          />
          <div className="px-4 py-3.5">
            <Switch checked={settings.timerSound} onChange={(timerSound) => store.updateSettings({ timerSound })} label="Rest timer sound" description="A short beep and vibration when rest is over." />
          </div>
        </ListGroup>

        <ListGroup title="Profile" footer="Used for your greeting, weekly target and the next-workout schedule.">
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-3">
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
          <fieldset className="px-4 py-4">
            <legend className="float-left mb-2 w-full text-sm font-medium text-ink-2">Training days</legend>
            <div className="clear-both grid grid-cols-7 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const on = profile.trainingDays.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      const next = on ? profile.trainingDays.filter((x) => x !== d) : [...profile.trainingDays, d].sort()
                      if (!next.length) return toast('Keep at least one training day', { tone: 'error' })
                      store.updateProfile({ trainingDays: next, daysPerWeek: next.length })
                    }}
                    className={clsx('flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-colors', on ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-2 hover:text-ink')}
                  >
                    {WEEKDAY_SHORT[d]}
                  </button>
                )
              })}
            </div>
          </fieldset>
          <fieldset className="px-4 py-4">
            <legend className="float-left mb-2 w-full text-sm font-medium text-ink-2">Available equipment</legend>
            <div className="clear-both flex flex-wrap gap-2">
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
          <button onClick={() => setPending({ kind: 'onboarding' })} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
              <Sparkles size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">Restart onboarding</span>
              <span className="block text-sm text-muted">Answer the setup questions again to generate a new plan.</span>
            </span>
            <ChevronRight size={18} className="text-muted" />
          </button>
        </ListGroup>

        <ListGroup title="Your data" footer={`Everything lives in this browser’s local storage (about ${storageKb} KB). Imports are checked before anything changes; invalid entries are skipped.`}>
          <button onClick={exportData} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
              <Download size={18} />
            </span>
            <span className="flex-1 text-[15px] font-medium">Export JSON</span>
            <ChevronRight size={18} className="text-muted" />
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
              <Upload size={18} />
            </span>
            <span className="flex-1 text-[15px] font-medium">Import JSON</span>
            <ChevronRight size={18} className="text-muted" />
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Choose backup file" />
          {hasSample && (
            <button onClick={() => setPending({ kind: 'sample' })} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
                <Eraser size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">Remove sample data</span>
                <span className="block text-sm text-muted">Keeps everything you logged yourself</span>
              </span>
              <ChevronRight size={18} className="text-muted" />
            </button>
          )}
        </ListGroup>

        <ListGroup title="Danger zone">
          <button onClick={() => setPending({ kind: 'reset' })} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
              <RotateCcw size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">Reset demo data</span>
              <span className="block text-sm text-muted">Replace your data with the sample set</span>
            </span>
          </button>
          <button onClick={() => setPending({ kind: 'erase' })} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-danger hover:bg-danger-soft">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
              <Trash2 size={18} />
            </span>
            <span className="text-[15px] font-semibold">Erase all data</span>
          </button>
        </ListGroup>
      </div>

      <p className="pt-8 text-center text-xs text-muted">IronLog 1.0 · local-first · no account, no tracking</p>

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
