import clsx from 'clsx'
import { Plus, Search, SearchX, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ExerciseForm } from '../components/ExerciseForm'
import { Badge, Button, Chip, EmptyState, Input, PageHeader, Select } from '../components/ui'
import { useExerciseList } from '../hooks/useExercises'
import { useStore } from '../store/useStore'
import type { Equipment, Muscle } from '../types'
import { EQUIPMENT, MUSCLES } from '../types'

export default function Library() {
  const all = useExerciseList()
  const favorites = useStore((s) => s.favorites)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const workouts = useStore((s) => s.workouts)
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const muscle = (params.get('muscle') as Muscle | null) ?? null
  const equipment = (params.get('equipment') as Equipment | null) ?? null
  const favOnly = params.get('fav') === '1'
  const customOnly = params.get('custom') === '1'

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const w of workouts) for (const e of w.exercises) m.set(e.exerciseId, (m.get(e.exerciseId) ?? 0) + 1)
    return m
  }, [workouts])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return all.filter(
      (e) =>
        (!needle || e.name.toLowerCase().includes(needle) || e.primary.toLowerCase().includes(needle)) &&
        (!muscle || e.primary === muscle || e.secondary.includes(muscle)) &&
        (!equipment || e.equipment === equipment) &&
        (!favOnly || favorites.includes(e.id)) &&
        (!customOnly || e.custom),
    )
  }, [all, q, muscle, equipment, favOnly, customOnly, favorites])

  const filtered = !!(q || muscle || equipment || favOnly || customOnly)

  return (
    <div className="animate-rise">
      <PageHeader
        title="Exercises"
        subtitle={`${all.length} exercises · ${favorites.length} favourites`}
        actions={
          <Button icon={<Plus size={18} />} onClick={() => setCreating(true)}>
            New exercise
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or muscle" className="pl-10" aria-label="Search exercises" type="search" />
        </div>
        <Select value={equipment ?? ''} onChange={(e) => setParam('equipment', e.target.value || null)} aria-label="Filter by equipment" className="sm:w-52">
          <option value="">All equipment</option>
          {EQUIPMENT.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </Select>
      </div>

      <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip active={favOnly} onClick={() => setParam('fav', favOnly ? null : '1')}>
          <Star size={14} className={favOnly ? 'fill-current' : undefined} /> Favourites
        </Chip>
        <Chip active={customOnly} onClick={() => setParam('custom', customOnly ? null : '1')}>
          Custom
        </Chip>
        <span className="mx-1 w-px shrink-0 bg-line" aria-hidden />
        <Chip active={!muscle} onClick={() => setParam('muscle', null)}>
          All muscles
        </Chip>
        {MUSCLES.map((m) => (
          <Chip key={m} active={muscle === m} onClick={() => setParam('muscle', muscle === m ? null : m)}>
            {m}
          </Chip>
        ))}
      </div>

      <p className="mt-4 mb-3 text-sm text-muted" aria-live="polite">
        {filtered ? `${list.length} match${list.length === 1 ? '' : 'es'}` : 'All exercises'}
      </p>

      {list.length === 0 ? (
        <EmptyState
          icon={<SearchX size={22} />}
          title="No exercises match"
          body={favOnly && !favorites.length ? 'Star exercises to collect your favourites here.' : 'Try a different search or filter, or add it as a custom exercise.'}
          action={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setQ('')
                  setParams({}, { replace: true })
                }}
              >
                Clear filters
              </Button>
              <Button icon={<Plus size={18} />} onClick={() => setCreating(true)}>
                New exercise
              </Button>
            </div>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => {
            const fav = favorites.includes(e.id)
            const n = counts.get(e.id) ?? 0
            return (
              <li key={e.id} className="relative">
                <Link
                  to={`/library/${e.id}`}
                  className="flex h-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 pr-14 transition-colors hover:border-line-strong"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 font-display text-xl font-semibold text-ink-2">{e.name[0]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{e.name}</span>
                      {e.custom && <Badge tone="accent">Custom</Badge>}
                    </span>
                    <span className="block truncate text-sm text-muted">
                      {e.primary} · {e.equipment}
                      {n > 0 && ` · ${n} session${n === 1 ? '' : 's'}`}
                    </span>
                  </span>
                </Link>
                <button
                  onClick={() => toggleFavorite(e.id)}
                  aria-pressed={fav}
                  aria-label={fav ? `Remove ${e.name} from favourites` : `Add ${e.name} to favourites`}
                  className={clsx(
                    'absolute top-1/2 right-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-xl transition-colors hover:bg-surface-2',
                    fav ? 'text-accent' : 'text-muted',
                  )}
                >
                  <Star size={20} className={clsx(fav && 'fill-current')} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <ExerciseForm open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
