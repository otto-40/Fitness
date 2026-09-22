import clsx from 'clsx'
import { Check, Plus, Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useExerciseList } from '../hooks/useExercises'
import { useStore } from '../store/useStore'
import type { Muscle } from '../types'
import { MUSCLES } from '../types'
import { ExerciseForm } from './ExerciseForm'
import { Button, Chip, Input, Modal } from './ui'

export function ExercisePicker({
  open,
  onClose,
  onPick,
  title = 'Add exercises',
}: {
  open: boolean
  onClose: () => void
  onPick: (ids: string[]) => void
  title?: string
}) {
  const all = useExerciseList()
  const favorites = useStore((s) => s.favorites)
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<Muscle | 'Favourites' | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return all.filter(
      (e) =>
        (!needle || e.name.toLowerCase().includes(needle) || e.equipment.toLowerCase().includes(needle)) &&
        (!muscle || (muscle === 'Favourites' ? favorites.includes(e.id) : e.primary === muscle)),
    )
  }, [all, q, muscle, favorites])

  const close = () => {
    setSelected([])
    setQ('')
    onClose()
  }

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <>
      <Modal
        open={open && !creating}
        onClose={close}
        title={title}
        tall
        size="lg"
        footer={
          <>
            <Button variant="secondary" icon={<Plus size={18} />} onClick={() => setCreating(true)}>
              Custom
            </Button>
            <Button
              block
              disabled={!selected.length}
              onClick={() => {
                onPick(selected)
                close()
              }}
            >
              {selected.length ? `Add ${selected.length} exercise${selected.length > 1 ? 's' : ''}` : 'Select exercises'}
            </Button>
          </>
        }
      >
        <div className="sticky top-0 z-10 -mx-5 bg-surface px-5 pb-3">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <Input data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises" className="pl-10" aria-label="Search exercises" />
          </div>
          <div className="scrollbar-none -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
            <Chip active={!muscle} onClick={() => setMuscle(null)}>
              All
            </Chip>
            <Chip active={muscle === 'Favourites'} onClick={() => setMuscle('Favourites')}>
              <Star size={14} /> Favourites
            </Chip>
            {MUSCLES.map((m) => (
              <Chip key={m} active={muscle === m} onClick={() => setMuscle(m)}>
                {m}
              </Chip>
            ))}
          </div>
        </div>
        {list.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No exercises match. Try another search or create a custom exercise.</p>
        ) : (
          <ul className="flex flex-col">
            {list.map((e) => {
              const on = selected.includes(e.id)
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(e.id)}
                    className={clsx('flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors', on ? 'bg-accent-soft' : 'hover:bg-surface-2')}
                  >
                    <span
                      className={clsx(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl font-display text-lg font-semibold',
                        on ? 'bg-accent text-on-accent' : 'bg-surface-2 text-ink-2',
                      )}
                    >
                      {on ? <Check size={20} /> : e.name[0]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{e.name}</span>
                      <span className="block text-sm text-muted">
                        {e.primary} · {e.equipment}
                        {e.custom && ' · Custom'}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Modal>
      <ExerciseForm
        open={open && creating}
        onClose={() => setCreating(false)}
        onSaved={(id) => {
          setCreating(false)
          setSelected((s) => [...s, id])
        }}
      />
    </>
  )
}
