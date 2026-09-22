import clsx from 'clsx'
import { ArrowLeft, ArrowRight, Check, Dumbbell, Flame, HeartPulse, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Button, Chip, Input, Logo, Switch } from '../components/ui'
import { useExerciseMap } from '../hooks/useExercises'
import { WEEKDAY_SHORT } from '../lib/dates'
import { DEFAULT_TRAINING_DAYS, generateProgram, planLabel } from '../lib/programGen'
import { routineMinutes } from '../lib/stats'
import { DEMO_PREFIX, useStore } from '../store/useStore'
import type { Equipment, Experience, Goal, Profile, Units } from '../types'
import { EQUIPMENT } from '../types'

const STEPS = ['name', 'units', 'experience', 'days', 'goal', 'equipment', 'review'] as const

const PRESETS: { label: string; items: Equipment[] }[] = [
  { label: 'Full gym', items: [...EQUIPMENT] },
  { label: 'Home dumbbells', items: ['Dumbbell', 'Bodyweight', 'Band'] },
  { label: 'Bodyweight only', items: ['Bodyweight'] },
]

function OptionCard({ selected, onClick, title, body, icon }: { selected: boolean; onClick: () => void; title: string; body: string; icon?: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all',
        selected ? 'border-accent bg-accent-soft/60 ring-1 ring-accent' : 'border-line bg-surface hover:border-line-strong',
      )}
    >
      {icon && <span className={clsx('flex size-11 shrink-0 items-center justify-center rounded-xl', selected ? 'bg-accent text-on-accent' : 'bg-surface-2 text-ink-2')}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted">{body}</span>
      </span>
      <span className={clsx('flex size-6 shrink-0 items-center justify-center rounded-full border-2', selected ? 'border-accent bg-accent text-on-accent' : 'border-line-strong')}>
        {selected && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  )
}

export default function Onboarding() {
  const store = useStore()
  const exMap = useExerciseMap()
  const hasDemo = store.workouts.some((w) => w.id.startsWith(DEMO_PREFIX)) || store.measurements.some((m) => m.id.startsWith(DEMO_PREFIX))
  const repeat = !!store.settings.setupSeen

  const [step, setStep] = useState(-1)
  const [name, setName] = useState(repeat ? store.profile.name : '')
  const [units, setUnits] = useState<Units>(store.settings.units)
  const [experience, setExperience] = useState<Experience>(repeat ? store.profile.experience : 'beginner')
  const [days, setDays] = useState<number[]>(repeat ? store.profile.trainingDays : DEFAULT_TRAINING_DAYS[3])
  const [goal, setGoal] = useState<Goal>(repeat ? store.profile.goal : 'muscle')
  const [equipment, setEquipment] = useState<Equipment[]>(repeat ? store.profile.equipment : [...EQUIPMENT])
  const [keepDemo, setKeepDemo] = useState(true)
  const [nameError, setNameError] = useState<string | null>(null)

  const daysPerWeek = days.length
  const profile: Profile = { name: name.trim(), experience, goal, daysPerWeek, equipment, trainingDays: [...days].sort() }
  const preview = useMemo(
    () => (step === STEPS.length - 1 ? generateProgram({ experience, goal, daysPerWeek, equipment }) : []),
    [step, experience, goal, daysPerWeek, equipment],
  )

  const current = STEPS[step]
  const canNext =
    current === 'days' ? daysPerWeek >= 2 && daysPerWeek <= 6 : current === 'equipment' ? equipment.length > 0 : true

  const next = () => {
    if (current === 'name') {
      const n = name.trim()
      if (n.length > 30) return setNameError('Keep it under 30 characters.')
    }
    if (!canNext) return
    if (step === STEPS.length - 1) {
      store.completeOnboarding({ ...profile, name: profile.name || 'Athlete' }, { units }, keepDemo)
      return
    }
    setStep((s) => s + 1)
  }

  const setDayCount = (n: number) => setDays(DEFAULT_TRAINING_DAYS[n])
  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))

  if (step === -1) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pt-10 pb-8">
          <Logo />
          <div className="animate-rise my-auto py-12">
            <p className="mb-4 text-sm font-semibold tracking-[0.14em] text-accent-ink uppercase">Strength training log</p>
            <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-wide uppercase sm:text-6xl">
              Every rep.
              <br />
              Every plate.
              <br />
              <span className="text-accent">On record.</span>
            </h1>
            <p className="mt-6 max-w-md text-[17px] text-ink-2">
              Answer six quick questions and IronLog builds a starting plan around your schedule, goal and equipment. Everything stays on this device.
            </p>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-3 text-sm">
              {[
                ['Live sessions', 'Rest timer and last-time numbers'],
                ['Real PRs', 'Weight, 1RM and volume'],
                ['Private', 'No account, no cloud'],
              ].map(([t, b]) => (
                <div key={t} className="rounded-2xl border border-line bg-surface p-3">
                  <div className="font-semibold">{t}</div>
                  <div className="mt-0.5 text-xs text-muted">{b}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" block onClick={() => setStep(0)} icon={<ArrowRight size={20} />} className="sm:flex-1">
              {repeat ? 'Rebuild my plan' : 'Get started'}
            </Button>
            <Button size="lg" variant="ghost" onClick={store.skipOnboarding}>
              {repeat ? 'Cancel' : 'Skip and explore the demo'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pt-6 pb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep((s) => s - 1)}
            className="flex size-10 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={step + 1}
            aria-label="Setup progress"
          >
            <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
          <button onClick={store.skipOnboarding} className="rounded-lg px-2 py-1 text-sm font-medium text-muted hover:text-ink">
            Skip
          </button>
        </div>

        <form
          key={current}
          className="animate-rise mt-10 flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            next()
          }}
        >
          <p className="text-sm font-semibold text-muted">
            Step {step + 1} of {STEPS.length}
          </p>

          {current === 'name' && (
            <>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-wide uppercase">What should we call you?</h1>
              <p className="mt-2 text-ink-2">Used for your greeting. Optional.</p>
              <Input
                autoFocus
                className="mt-8 h-14 text-lg"
                value={name}
                maxLength={40}
                aria-label="Your name"
                aria-invalid={!!nameError}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameError(null)
                }}
                placeholder="Your first name"
                autoComplete="given-name"
              />
              {nameError && <p className="mt-2 text-sm text-danger">{nameError}</p>}
            </>
          )}

          {current === 'units' && (
            <>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-wide uppercase">Pick your units</h1>
              <p className="mt-2 text-ink-2">You can switch at any time. Everything converts instantly.</p>
              <div role="radiogroup" aria-label="Units" className="mt-8 grid grid-cols-2 gap-3">
                {(['kg', 'lb'] as Units[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    role="radio"
                    aria-checked={units === u}
                    onClick={() => setUnits(u)}
                    className={clsx(
                      'flex h-32 flex-col items-center justify-center rounded-2xl border transition-all',
                      units === u ? 'border-accent bg-accent-soft/60 ring-1 ring-accent' : 'border-line bg-surface hover:border-line-strong',
                    )}
                  >
                    <span className="font-display text-5xl font-bold uppercase">{u}</span>
                    <span className="mt-1 text-sm text-muted">{u === 'kg' ? 'Kilograms · cm' : 'Pounds · inches'}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {current === 'experience' && (
            <>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-wide uppercase">How long have you been lifting?</h1>
              <p className="mt-2 text-ink-2">Sets the number of working sets per exercise.</p>
              <div role="radiogroup" aria-label="Experience" className="mt-8 flex flex-col gap-3">
                <OptionCard selected={experience === 'beginner'} onClick={() => setExperience('beginner')} title="Beginner" body="Less than a year of consistent training" />
                <OptionCard selected={experience === 'intermediate'} onClick={() => setExperience('intermediate')} title="Intermediate" body="One to three years, comfortable with the main lifts" />
                <OptionCard selected={experience === 'advanced'} onClick={() => setExperience('advanced')} title="Advanced" body="Three years or more, progress comes slowly" />
              </div>
            </>
          )}

          {current === 'days' && (
            <>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-wide uppercase">How many days a week?</h1>
              <p className="mt-2 text-ink-2">Choose a number, then adjust which days suit you.</p>
              <div role="radiogroup" aria-label="Days per week" className="mt-8 grid grid-cols-5 gap-2">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={daysPerWeek === n}
                    onClick={() => setDayCount(n)}
                    className={clsx(
                      'h-16 rounded-2xl border font-display text-3xl font-bold transition-all',
                      daysPerWeek === n ? 'border-accent bg-accent text-on-accent' : 'border-line bg-surface hover:border-line-strong',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-8 mb-3 text-sm font-medium text-ink-2">Training days</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <Chip key={d} active={days.includes(d)} onClick={() => toggleDay(d)}>
                    {WEEKDAY_SHORT[d]}
                  </Chip>
                ))}
              </div>
              <p className={clsx('mt-3 text-sm', canNext ? 'text-muted' : 'text-danger')}>
                {canNext ? `${daysPerWeek} days · ${planLabel(daysPerWeek)} plan` : 'Pick between 2 and 6 training days.'}
              </p>
            </>
          )}

          {current === 'goal' && (
            <>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-wide uppercase">What's the main goal?</h1>
              <p className="mt-2 text-ink-2">Shapes rep ranges and rest times.</p>
              <div role="radiogroup" aria-label="Goal" className="mt-8 flex flex-col gap-3">
                <OptionCard selected={goal === 'strength'} onClick={() => setGoal('strength')} icon={<Trophy size={20} />} title="Get stronger" body="Heavier weights, 3–8 reps, longer rest" />
                <OptionCard selected={goal === 'muscle'} onClick={() => setGoal('muscle')} icon={<Flame size={20} />} title="Build muscle" body="Moderate weights, 6–15 reps" />
                <OptionCard selected={goal === 'general'} onClick={() => setGoal('general')} icon={<HeartPulse size={20} />} title="General fitness" body="Balanced full-body work, shorter sessions" />
              </div>
            </>
          )}

          {current === 'equipment' && (
            <>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-wide uppercase">What can you train with?</h1>
              <p className="mt-2 text-ink-2">We'll only pick exercises you can actually do.</p>
              <div className="mt-8 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <Button key={p.label} variant="outline" size="sm" onClick={() => setEquipment(p.items)}>
                    {p.label}
                  </Button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {EQUIPMENT.map((e) => (
                  <Chip key={e} active={equipment.includes(e)} onClick={() => setEquipment((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]))}>
                    {equipment.includes(e) && <Check size={14} />}
                    {e}
                  </Chip>
                ))}
              </div>
              {!canNext && <p className="mt-3 text-sm text-danger">Choose at least one option.</p>}
            </>
          )}

          {current === 'review' && (
            <>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-wide uppercase">
                {name.trim() ? `${name.trim()}, here's your plan` : "Here's your plan"}
              </h1>
              <p className="mt-2 text-ink-2">
                {planLabel(daysPerWeek)} · {daysPerWeek} days a week · {days.map((d) => WEEKDAY_SHORT[d]).join(', ')}
              </p>
              <ul className="mt-6 flex flex-col gap-2">
                {preview.map((r, i) => (
                  <li key={r.id} className="rounded-2xl border border-line bg-surface p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-surface-2 font-display text-lg font-semibold">{i + 1}</span>
                        <span className="font-semibold">{r.name}</span>
                      </div>
                      <span className="text-sm text-muted">~{routineMinutes(r)} min</span>
                    </div>
                    <p className="mt-2 text-sm text-muted">{r.exercises.map((e) => exMap.get(e.exerciseId)?.name).join(' · ')}</p>
                  </li>
                ))}
              </ul>
              {hasDemo && (
                <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
                  <Switch
                    checked={keepDemo}
                    onChange={setKeepDemo}
                    label="Keep sample history"
                    description="Ten weeks of example workouts and body measurements, so every screen has something to show. Remove it any time in Settings."
                  />
                </div>
              )}
            </>
          )}

          <div className="mt-auto pt-10">
            <Button type="submit" size="lg" block disabled={!canNext} icon={step === STEPS.length - 1 ? <Dumbbell size={20} /> : undefined}>
              {step === STEPS.length - 1 ? 'Build my plan' : 'Continue'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
