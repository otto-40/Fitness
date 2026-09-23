import clsx from 'clsx'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  HeartPulse,
  LineChart,
  Lock,
  Mountain,
  Ruler,
  Sprout,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  User,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Button, Chip, Input, Logo, SegmentBar, Switch } from '../components/ui'
import { useExerciseMap } from '../hooks/useExercises'
import { WEEKDAY_SHORT } from '../lib/dates'
import { DEFAULT_TRAINING_DAYS, generateProgram, planLabel } from '../lib/programGen'
import { routineMinutes } from '../lib/stats'
import { DEMO_PREFIX, useStore } from '../store/useStore'
import type { Equipment, Experience, Goal, Profile, Units } from '../types'
import { EQUIPMENT } from '../types'

const STEPS = ['name', 'units', 'experience', 'days', 'goal', 'equipment', 'review'] as const
type Step = (typeof STEPS)[number]

const PRESETS: { label: string; items: Equipment[] }[] = [
  { label: 'Full gym', items: [...EQUIPMENT] },
  { label: 'Home dumbbells', items: ['Dumbbell', 'Bodyweight', 'Band'] },
  { label: 'Bodyweight only', items: ['Bodyweight'] },
]

const EXPERIENCE_LABEL: Record<Experience, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
const GOAL_LABEL: Record<Goal, string> = { strength: 'Get stronger', muscle: 'Build muscle', general: 'General fitness' }

function OptionCard({ selected, onClick, title, body, icon }: { selected: boolean; onClick: () => void; title: string; body: string; icon?: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={clsx(
        'flex min-h-[76px] w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.99]',
        selected ? 'border-accent bg-accent-soft/50' : 'border-transparent bg-surface hover:border-line-strong',
      )}
    >
      {icon && <span className={clsx('flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors', selected ? 'bg-accent text-on-accent' : 'bg-surface-2 text-ink-2')}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold">{title}</span>
        <span className="block text-sm text-muted">{body}</span>
      </span>
      <span className={clsx('flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors', selected ? 'border-accent bg-accent text-on-accent' : 'border-line-strong')}>
        {selected && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  )
}

function Question({ title, help }: { title: string; help: string }) {
  return (
    <>
      <h1 className="mt-3 font-display text-[40px] leading-[0.98] font-semibold tracking-[0.02em] uppercase">{title}</h1>
      <p className="mt-3 text-[15px] text-ink-2">{help}</p>
    </>
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

  const current: Step | undefined = STEPS[step]
  const canNext = current === 'days' ? daysPerWeek >= 2 && daysPerWeek <= 6 : current === 'equipment' ? equipment.length > 0 : true

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
  const goTo = (s: Step) => setStep(STEPS.indexOf(s))

  if (step === -1) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pt-8 pb-[calc(env(safe-area-inset-bottom)+24px)]">
          <Logo />
          <div className="animate-rise my-auto py-10">
            <p className="eyebrow mb-4 text-accent-ink">Strength training log</p>
            <h1 className="font-display text-[56px] leading-[0.9] font-bold tracking-[0.02em] uppercase sm:text-[64px]">
              Every rep.
              <br />
              Every plate.
              <br />
              <span className="text-accent">On record.</span>
            </h1>
            <p className="mt-6 max-w-md text-[17px] text-ink-2">A few quick questions and Overload builds a starting plan around your schedule, goal and equipment.</p>
            <ul className="mt-8 flex flex-col gap-3">
              {[
                [<Timer size={18} key="t" />, 'Live sessions', 'A rest timer and last time’s numbers on every set'],
                [<LineChart size={18} key="l" />, 'Real records', 'Estimated 1RM, heaviest weight and volume, all from your log'],
                [<Lock size={18} key="k" />, 'Private by design', 'No account and no cloud: everything stays on this device'],
              ].map(([icon, t, b]) => (
                <li key={t as string} className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-accent-ink ring-1 ring-line">{icon}</span>
                  <span>
                    <span className="block font-semibold">{t}</span>
                    <span className="block text-sm text-muted">{b}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <p className="mb-2 flex items-center justify-center gap-1.5 text-sm text-muted">
              <Clock size={14} /> Takes about a minute
            </p>
            <Button size="xl" block onClick={() => setStep(0)} icon={<ArrowRight size={20} />}>
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

  const summary: { step: Step; icon: ReactNode; label: string; value: string }[] = [
    { step: 'goal', icon: <Target size={18} />, label: 'Goal', value: GOAL_LABEL[goal] },
    { step: 'experience', icon: <TrendingUp size={18} />, label: 'Experience', value: EXPERIENCE_LABEL[experience] },
    { step: 'days', icon: <CalendarDays size={18} />, label: 'Schedule', value: `${daysPerWeek} days · ${[...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WEEKDAY_SHORT[d]).join(', ')}` },
    { step: 'equipment', icon: <Dumbbell size={18} />, label: 'Equipment', value: equipment.length === EQUIPMENT.length ? 'Full gym' : equipment.join(', ') },
    { step: 'units', icon: <Ruler size={18} />, label: 'Units', value: units === 'kg' ? 'Kilograms' : 'Pounds' },
    { step: 'name', icon: <User size={18} />, label: 'Name', value: name.trim() || 'Not set' },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep((s) => s - 1)} className="-ml-2 flex size-11 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <p className="eyebrow flex-1">
            Step {step + 1} of {STEPS.length}
          </p>
          <button onClick={store.skipOnboarding} className="h-11 rounded-xl px-3 text-sm font-semibold text-muted hover:text-ink">
            Skip
          </button>
        </div>
        <div role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label="Setup progress">
          <SegmentBar total={STEPS.length} filled={step + 1} className="mt-1" label={`Step ${step + 1} of ${STEPS.length}`} />
        </div>

        <form
          key={current}
          className="animate-rise mt-8 flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            next()
          }}
        >
          {current === 'name' && (
            <>
              <Question title="What should we call you?" help="Used for your greeting. Optional." />
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
              <Question title="Pick your units" help="Switch any time in Settings. Everything converts instantly." />
              <div role="radiogroup" aria-label="Units" className="mt-8 grid grid-cols-2 gap-3">
                {(['kg', 'lb'] as Units[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    role="radio"
                    aria-checked={units === u}
                    onClick={() => setUnits(u)}
                    className={clsx(
                      'flex h-36 flex-col items-center justify-center rounded-3xl border-2 transition-all active:scale-[0.98]',
                      units === u ? 'border-accent bg-accent-soft/50' : 'border-transparent bg-surface hover:border-line-strong',
                    )}
                  >
                    <span className="stamp text-[56px] uppercase">{u}</span>
                    <span className="mt-1 text-sm text-muted">{u === 'kg' ? 'Kilograms · cm' : 'Pounds · inches'}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {current === 'experience' && (
            <>
              <Question title="How long have you been lifting?" help="Sets how many working sets each exercise gets." />
              <div role="radiogroup" aria-label="Experience" className="mt-8 flex flex-col gap-3">
                <OptionCard selected={experience === 'beginner'} onClick={() => setExperience('beginner')} icon={<Sprout size={20} />} title="Beginner" body="Less than a year of consistent training" />
                <OptionCard selected={experience === 'intermediate'} onClick={() => setExperience('intermediate')} icon={<TrendingUp size={20} />} title="Intermediate" body="One to three years, comfortable with the main lifts" />
                <OptionCard selected={experience === 'advanced'} onClick={() => setExperience('advanced')} icon={<Mountain size={20} />} title="Advanced" body="Three years or more, progress comes slowly" />
              </div>
            </>
          )}

          {current === 'days' && (
            <>
              <Question title="How many days a week?" help="Choose a number, then adjust which days suit you." />
              <div role="radiogroup" aria-label="Days per week" className="mt-8 grid grid-cols-5 gap-2">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={daysPerWeek === n}
                    onClick={() => setDayCount(n)}
                    className={clsx(
                      'stamp h-20 rounded-2xl border-2 text-[40px] transition-all active:scale-[0.97]',
                      daysPerWeek === n ? 'border-accent bg-accent text-on-accent' : 'border-transparent bg-surface hover:border-line-strong',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="eyebrow mt-8 mb-3">Training days</p>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                  const on = days.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleDay(d)}
                      className={clsx('flex h-12 items-center justify-center rounded-xl text-sm font-semibold transition-colors', on ? 'bg-ink text-bg' : 'bg-surface text-ink-2 ring-1 ring-line hover:text-ink')}
                    >
                      {WEEKDAY_SHORT[d]}
                    </button>
                  )
                })}
              </div>
              <p className={clsx('mt-4 text-sm', canNext ? 'text-muted' : 'text-danger')} aria-live="polite">
                {canNext ? `${daysPerWeek} days · ${planLabel(daysPerWeek)} plan` : 'Pick between 2 and 6 training days.'}
              </p>
            </>
          )}

          {current === 'goal' && (
            <>
              <Question title="What's the main goal?" help="Shapes rep ranges and rest times." />
              <div role="radiogroup" aria-label="Goal" className="mt-8 flex flex-col gap-3">
                <OptionCard selected={goal === 'strength'} onClick={() => setGoal('strength')} icon={<Trophy size={20} />} title="Get stronger" body="Heavier weights, 3–8 reps, longer rest" />
                <OptionCard selected={goal === 'muscle'} onClick={() => setGoal('muscle')} icon={<Flame size={20} />} title="Build muscle" body="Moderate weights, 6–15 reps" />
                <OptionCard selected={goal === 'general'} onClick={() => setGoal('general')} icon={<HeartPulse size={20} />} title="General fitness" body="Balanced full-body work, shorter sessions" />
              </div>
            </>
          )}

          {current === 'equipment' && (
            <>
              <Question title="What can you train with?" help="We only pick exercises you can actually do." />
              <div className="mt-8 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <Chip key={p.label} active={p.items.length === equipment.length && p.items.every((i) => equipment.includes(i))} onClick={() => setEquipment(p.items)}>
                    {p.label}
                  </Chip>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {EQUIPMENT.map((e) => {
                  const on = equipment.includes(e)
                  return (
                    <button
                      key={e}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setEquipment((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]))}
                      className={clsx(
                        'flex h-14 items-center justify-between gap-2 rounded-2xl border-2 px-4 text-left text-[15px] font-semibold transition-all active:scale-[0.98]',
                        on ? 'border-accent bg-accent-soft/50' : 'border-transparent bg-surface text-ink-2 hover:border-line-strong',
                      )}
                    >
                      {e}
                      <span className={clsx('flex size-5 shrink-0 items-center justify-center rounded-md border-2', on ? 'border-accent bg-accent text-on-accent' : 'border-line-strong')}>
                        {on && <Check size={12} strokeWidth={3.5} />}
                      </span>
                    </button>
                  )
                })}
              </div>
              {!canNext && <p className="mt-3 text-sm text-danger">Choose at least one option.</p>}
            </>
          )}

          {current === 'review' && (
            <>
              <p className="eyebrow text-accent-ink">Your plan is set</p>
              <h1 className="mt-3 font-display text-[40px] leading-[0.98] font-semibold tracking-[0.02em] uppercase">
                {name.trim() ? `${name.trim()}, here's your plan` : "Here's your plan"}
              </h1>
              <div className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {summary.map((s) => (
                  <button key={s.step} type="button" onClick={() => goTo(s.step)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2" aria-label={`${s.label}: ${s.value}. Change`}>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2">{s.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="eyebrow block">{s.label}</span>
                      <span className="block truncate font-semibold">{s.value}</span>
                    </span>
                    <Check size={18} strokeWidth={3} className="text-good" />
                    <ChevronRight size={16} className="text-muted" />
                  </button>
                ))}
              </div>

              <p className="eyebrow mt-8 mb-3">{planLabel(daysPerWeek)} · {preview.length} routines</p>
              <ol className="flex flex-col gap-2">
                {preview.map((r, i) => (
                  <li key={r.id} className="rounded-2xl border border-line bg-surface p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="stamp flex size-8 items-center justify-center rounded-lg bg-accent text-lg text-on-accent">{i + 1}</span>
                        <span className="font-semibold">{r.name}</span>
                      </div>
                      <span className="text-sm text-muted">~{routineMinutes(r)} min</span>
                    </div>
                    <p className="mt-2 text-sm text-muted">{r.exercises.map((e) => exMap.get(e.exerciseId)?.name).join(' · ')}</p>
                  </li>
                ))}
              </ol>
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

          <div className="sticky bottom-0 mt-auto bg-bg pt-8 pb-1">
            <Button type="submit" size="xl" block disabled={!canNext} icon={step === STEPS.length - 1 ? <Dumbbell size={20} /> : undefined}>
              {step === STEPS.length - 1 ? 'Build my plan' : 'Continue'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
