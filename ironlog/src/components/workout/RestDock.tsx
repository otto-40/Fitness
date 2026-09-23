import clsx from 'clsx'
import { Maximize2, Minimize2, SkipForward } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Ring } from '../ui'
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
  const [expanded, setExpanded] = useState(false)

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
  const label = `Rest timer, ${clock(remaining)} remaining`

  const controls = (big: boolean) => (
    <div className={clsx('flex items-center gap-2', big && 'w-full max-w-sm')}>
      <button onClick={() => adjustRest(-15)} className={clsx('stamp rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95', big ? 'h-16 flex-1 text-2xl' : 'h-12 w-12 text-lg sm:w-auto sm:px-3')} aria-label="Subtract 15 seconds">
        −15
      </button>
      <button onClick={() => adjustRest(15)} className={clsx('stamp rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95', big ? 'h-16 flex-1 text-2xl' : 'h-12 w-12 text-lg sm:w-auto sm:px-3')} aria-label="Add 15 seconds">
        +15
      </button>
      <button
        onClick={() => {
          skipRest()
          setExpanded(false)
        }}
        className={clsx('flex items-center justify-center gap-1.5 rounded-2xl bg-accent font-bold text-on-accent hover:bg-accent-hover active:scale-95', big ? 'h-16 flex-[1.4] text-lg' : 'h-12 px-3.5 text-sm max-[379px]:w-12 max-[379px]:px-0')}
        aria-label="Skip rest"
      >
        <SkipForward size={big ? 20 : 16} /> <span className={big ? undefined : 'max-[379px]:hidden'}>Skip</span>
      </button>
    </div>
  )

  return (
    <>
      <div className="animate-sheet mx-auto mb-2 flex w-full max-w-3xl items-center gap-3 rounded-3xl bg-hero p-2.5 pl-2.5 text-on-hero shadow-float" role="timer" aria-live="off" aria-label={label}>
        <button onClick={() => setExpanded(true)} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left" aria-label="Expand rest timer">
          <Ring value={pct} size={52} stroke={5} trackClass="text-white/15">
            <Maximize2 size={14} className="text-on-hero-muted" />
          </Ring>
          <span className="min-w-0">
            <span className="stamp block text-[34px] sm:text-[40px]">{clock(remaining)}</span>
            <span className="mt-0.5 block truncate text-xs text-on-hero-muted">Rest · after {rest.label}</span>
          </span>
        </button>
        {controls(false)}
      </div>

      {expanded && (
        <div className="animate-fade fixed inset-0 z-50 flex flex-col items-center justify-between bg-hero px-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-[calc(env(safe-area-inset-bottom)+24px)] text-on-hero" role="dialog" aria-modal="true" aria-label="Rest timer" onKeyDown={(e) => e.key === 'Escape' && setExpanded(false)}>
          <div className="flex w-full max-w-sm items-center justify-between">
            <span className="eyebrow text-on-hero-muted">Resting</span>
            <button onClick={() => setExpanded(false)} className="flex size-11 items-center justify-center rounded-xl hover:bg-white/10" aria-label="Minimise rest timer" autoFocus>
              <Minimize2 size={20} />
            </button>
          </div>
          <div className="flex flex-col items-center" role="timer" aria-label={label}>
            <Ring value={pct} size={280} stroke={14} trackClass="text-white/10">
              <span className="stamp text-[88px]">{clock(remaining)}</span>
              <span className="mt-2 max-w-48 truncate text-sm text-on-hero-muted">after {rest.label}</span>
            </Ring>
            <p className="mt-6 text-sm text-on-hero-muted">of {clock(rest.duration * 1000)} rest</p>
          </div>
          {controls(true)}
        </div>
      )}
    </>
  )
}
