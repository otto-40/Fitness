import clsx from 'clsx'
import { BookOpen, CalendarDays, ChartNoAxesColumn, House, ListChecks, MoreHorizontal, Ruler, Settings as Cog, Timer } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useNow } from '../hooks/useNow'
import { clock } from '../lib/dates'
import { useStore } from '../store/useStore'
import { useUi } from '../store/useUi'
import { Logo, Modal } from './ui'

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

function ActiveWorkoutPill({ compact }: { compact?: boolean }) {
  const active = useStore((s) => s.active)
  const now = useNow(1000, !!active)
  if (!active) return null
  const resting = active.rest && active.rest.endsAt > now
  return (
    <Link
      to="/workout"
      className={clsx(
        'animate-rise flex items-center gap-3 rounded-2xl bg-ink text-bg shadow-card transition-transform active:scale-[0.98]',
        compact ? 'px-3 py-2.5' : 'px-4 py-3',
      )}
    >
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{active.name}</span>
        <span className="tnum block text-xs opacity-70">
          {resting ? `Resting · ${clock(active.rest!.endsAt - now)}` : `In progress · ${clock(now - new Date(active.startedAt).getTime())}`}
        </span>
      </span>
      <span className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-bold text-on-accent">
        <Timer size={14} /> Resume
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

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <a href="#main" className="sr-only z-50 rounded-lg bg-accent px-3 py-2 text-on-accent focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <Link to="/" className="mb-8 px-2" aria-label="IronLog home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors',
                  isActive ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} className={isActive ? 'text-accent' : undefined} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">{!inWorkout && <ActiveWorkoutPill compact />}</div>
      </aside>

      <div className="min-w-0">
        {/* Mobile top bar */}
        {!inWorkout && (
          <div className="flex items-center justify-between px-4 pt-4 lg:hidden">
            <Link to="/" aria-label="IronLog home">
              <Logo />
            </Link>
            <Link to="/settings" aria-label="Settings" className="flex size-10 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2">
              <Cog size={20} />
            </Link>
          </div>
        )}
        <main id="main" className={clsx('mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-10', inWorkout ? 'pt-0 pb-40' : 'pt-5 pb-36 lg:pt-10 lg:pb-16')}>
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      {!inWorkout && !focus && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-40 lg:hidden">
          <div className="px-3 pb-2">
            <ActiveWorkoutPill />
          </div>
          <nav aria-label="Main" className="grid grid-cols-5 border-t border-line bg-surface/95 backdrop-blur">
            {MOBILE_PRIMARY.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold', isActive ? 'text-ink' : 'text-muted')
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
              className={clsx('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold', moreActive ? 'text-ink' : 'text-muted')}
            >
              <MoreHorizontal size={22} className={moreActive ? 'text-accent' : undefined} />
              More
            </button>
          </nav>
        </div>
      )}

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More" size="sm">
        <div className="grid gap-2">
          {MOBILE_MORE.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMoreOpen(false)}
              className="flex h-14 items-center gap-3 rounded-2xl bg-surface-2 px-4 font-medium hover:bg-surface-3"
            >
              <Icon size={20} className="text-accent-ink" />
              {label}
            </Link>
          ))}
        </div>
      </Modal>
    </div>
  )
}
