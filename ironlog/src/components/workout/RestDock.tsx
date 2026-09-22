import { SkipForward } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useNow } from '../../hooks/useNow'
import { clock } from '../../lib/dates'
import { useStore } from '../../store/useStore'
import { toast } from '../../store/useToast'

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const tones = [0, 0.18, 0.36]
    tones.forEach((t, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = i === 2 ? 1320 : 880
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.15)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + t)
      o.stop(ctx.currentTime + t + 0.16)
    })
    setTimeout(() => ctx.close(), 800)
  } catch {
    /* audio unavailable */
  }
}

/** Countdown shown above the workout action bar while resting. */
export function RestDock() {
  const rest = useStore((s) => s.active?.rest ?? null)
  const sound = useStore((s) => s.settings.timerSound)
  const adjustRest = useStore((s) => s.adjustRest)
  const skipRest = useStore((s) => s.skipRest)
  const now = useNow(200, !!rest)
  const fired = useRef<number | null>(null)

  const remaining = rest ? rest.endsAt - now : 0

  useEffect(() => {
    if (!rest || remaining > 0 || fired.current === rest.endsAt) return
    fired.current = rest.endsAt
    // Only alert if we are close to the moment it ended (not when reopening the app much later).
    if (now - rest.endsAt < 3000) {
      if (sound) beep()
      navigator.vibrate?.([200, 100, 200])
      toast('Rest over — next set', { tone: 'success' })
    }
    skipRest()
  }, [rest, remaining, now, sound, skipRest])

  if (!rest || remaining <= 0) return null
  const pct = Math.max(0, Math.min(1, remaining / (rest.duration * 1000)))
  const R = 26
  const C = 2 * Math.PI * R

  return (
    <div className="animate-sheet mx-auto mb-2 flex w-full max-w-3xl items-center gap-3 rounded-2xl bg-ink p-2.5 pl-3 text-bg shadow-card" role="timer" aria-live="off" aria-label={`Rest timer, ${clock(remaining)} remaining`}>
      <div className="relative size-16 shrink-0">
        <svg viewBox="0 0 64 64" className="size-16 -rotate-90" aria-hidden>
          <circle cx="32" cy="32" r={R} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="5" />
          <circle
            cx="32"
            cy="32"
            r={R}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 0.2s linear' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tracking-wider uppercase opacity-70">Rest</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="tnum font-display text-4xl leading-none font-semibold">{clock(remaining)}</div>
        <div className="mt-1 truncate text-xs opacity-70">after {rest.label}</div>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => adjustRest(-15)} className="tnum h-12 rounded-xl bg-white/10 px-3 text-sm font-bold hover:bg-white/15 dark:bg-black/10" aria-label="Subtract 15 seconds">
          −15
        </button>
        <button onClick={() => adjustRest(15)} className="tnum h-12 rounded-xl bg-white/10 px-3 text-sm font-bold hover:bg-white/15 dark:bg-black/10" aria-label="Add 15 seconds">
          +15
        </button>
        <button onClick={skipRest} className="flex h-12 items-center gap-1 rounded-xl bg-accent px-3 text-sm font-bold text-on-accent hover:bg-accent-hover" aria-label="Skip rest">
          <SkipForward size={16} /> Skip
        </button>
      </div>
    </div>
  )
}
