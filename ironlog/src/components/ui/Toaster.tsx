import clsx from 'clsx'
import { Check, Info, TriangleAlert } from 'lucide-react'
import { useToast } from '../../store/useToast'

export function Toaster() {
  const { toasts, dismiss } = useToast()
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-sheet pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink py-2.5 pr-2.5 pl-4 text-sm font-medium text-bg shadow-card"
        >
          <span className={clsx(t.tone === 'success' && 'text-good', t.tone === 'error' && 'text-danger')}>
            {t.tone === 'success' ? <Check size={18} /> : t.tone === 'error' ? <TriangleAlert size={18} /> : <Info size={18} />}
          </span>
          <span className="flex-1">{t.message}</span>
          {t.action ? (
            <button
              className="rounded-lg px-2 py-1 font-semibold text-accent hover:bg-white/10"
              onClick={() => {
                t.action!.run()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          ) : (
            <span className="w-1" />
          )}
        </div>
      ))}
    </div>
  )
}
