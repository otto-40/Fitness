import clsx from 'clsx'
import { BookOpen, CalendarDays, ChartNoAxesColumn, ChevronRight, House, ListChecks, MoreHorizontal, Play, Ruler, Settings as Cog } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useExerciseMap } from '../hooks/useExercises'
import { useNow } from '../hooks/useNow'
import { clock } from '../lib/dates'
import { useStore } from '../store/useStore'
import { useUi } from '../store/useUi'
import { useStartWorkout } from './StartWorkout'
import { Button, Logo, Modal, Ring } from './ui'

const NAV = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/routines', label: 'Routines', icon: ListChecks },
  { to: '/history', label: 'History', icon: CalendarDays },
  { to: '/progress', label: 'Progress', icon: ChartNoAxesColumn },
  { to: '/library', label: 'Exercises', icon: BookOpen },
  { to: '/body', label: 'Body', icon: Ruler },
  { to: '/settings', label: 'Settings', icon: Cog },
]

const MOBILE_PRIMARY = NAV.slice(0, 4)
const MOBILE_MORE = NAV.slice(4)

/** Now-playing style bar for the running workout: exercise, clock or rest ring, resume. */
function MiniPlayer({ compact }: { compact?: boolean }) {
  const active = useStore((s) => s.active)
  const map = useExerciseMap()
  const now = useNow(500, !!active)
  if (!active) return null
  const rest = active.rest && active.rest.endsAt > now ? active.rest : null
  const current = active.exercises.find((e) => e.sets.some((s) => !s.completed)) ?? active.exercises.at(-1)
  const done = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0)
  const total = active.exercises.reduce((n, e) => n + e.sets.length, 0)
  return (
    <Link
      to="/workout"
      aria-label={`Resume ${active.name}${rest ? `, resting ${clock(rest.endsAt - now)}` : ''}`}
      className={clsx(
        'animate-rise flex items-center gap-3 rounded-full bg-hero text-on-hero shadow-float transition-transform active:scale-[0.98]',
        compact ? 'py-2 pr-2 pl-2' : 'py-2 pr-2 pl-2',
      )}
    >
      <Ring value={rest ? (rest.endsAt - now) / (rest.duration * 1000) : total ? done / total : 0} size={40} stroke={4} trackClass="text-white/15">
        {rest ? <span className="stamp text-[11px]">{Math.ceil((rest.endsAt - now) / 1000)}</span> : <span className="size-2 rounded-full bg-accent" />}
      </Ring>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{current ? map.get(current.exerciseId)?.name ?? active.name : active.name}</span>
        <span className="tnum block truncate text-xs text-on-hero-muted">
          {rest ? `Resting · ${clock(rest.endsAt - now)}` : `${active.name} · ${clock(now - new Date(active.startedAt).getTime())} · ${done}/${total} sets`}
        </span>
      </span>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
        <Play size={16} fill="currentColor" />
      </span>
    </Link>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const inWorkout = pathname === '/workout'
  const focus = useUi((s) => s.focus > 0)
  const moreActive = MOBILE_MORE.some((n) => pathname.startsWith(n.to))
  const { start, dialog, active } = useStartWorkout()
  const hideNav = inWorkout || focus

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      <a href="#main" className="sr-only z-50 rounded-lg bg-accent px-3 py-2 text-on-accent focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <Link to="/" className="mb-8 px-2" aria-label="IronLog home">
          <Logo />
        </Link>
        {!active && (
          <Button className="mb-6" icon={<Play size={16} fill="currentColor" />} onClick={() => start(null)}>
            Start workout
          </Button>
        )}
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'relative flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors',
                  isActive ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-r-full bg-accent" aria-hidden />}
                  <Icon size={20} className={isActive ? 'text-accent' : undefined} strokeWidth={isActive ? 2.4 : 2} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">{!inWorkout && <MiniPlayer compact />}</div>
      </aside>

      <div className="min-w-0">
        {/* Mobile top bar */}
        {!inWorkout && (
          <div className="flex items-center justify-between px-4 pt-4 lg:hidden">
            <Link to="/" aria-label="IronLog home">
              <Logo />
            </Link>
            <Link to="/settings" aria-label="Settings" className="flex size-11 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2">
              <Cog size={21} />
            </Link>
          </div>
        )}
        <main
          id="main"
          className={clsx(
            'mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-10',
            inWorkout ? 'pt-0 pb-44' : clsx('pt-5 lg:pt-10 lg:pb-16', hideNav ? 'pb-28' : active ? 'pb-44' : 'pb-nav'),
          )}
        >
          {children}
        </main>
      </div>

      {/* Mobile: mini player + floating tab bar */}
      {!hideNav && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] lg:hidden">
          <div className="pointer-events-auto mx-auto flex max-w-md flex-col gap-2">
            <MiniPlayer />
            <nav aria-label="Main" className="grid grid-cols-5 rounded-3xl border border-line bg-surface/95 p-1.5 shadow-float backdrop-blur">
              {MOBILE_PRIMARY.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    clsx(
                      'flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-colors',
                      isActive ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={22} className={isActive ? 'text-accent' : undefined} strokeWidth={isActive ? 2.4 : 2} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
              <button
                onClick={() => setMoreOpen(true)}
                aria-haspopup="dialog"
                className={clsx(
                  'flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-colors',
                  moreActive ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink',
                )}
              >
                <MoreHorizontal size={22} className={moreActive ? 'text-accent' : undefined} />
                More
              </button>
            </nav>
          </div>
        </div>
      )}

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More" size="sm">
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {MOBILE_MORE.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setMoreOpen(false)} className="flex h-14 items-center gap-3 bg-surface px-4 font-medium hover:bg-surface-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-surface-2 text-accent-ink">
                <Icon size={18} />
              </span>
              <span className="flex-1">{label}</span>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          ))}
        </div>
      </Modal>
      {dialog}
    </div>
  )
}
