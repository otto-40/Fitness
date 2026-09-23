import clsx from 'clsx'
import { Plus, Search, SearchX, Star, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ExerciseForm } from '../components/ExerciseForm'
import { Badge, Button, Chip, DropdownChip, EmptyState, Input, Monogram, PageHeader, Segmented } from '../components/ui'
import { useExerciseList } from '../hooks/useExercises'
import { useStore } from '../store/useStore'
import type { Equipment, Exercise, Muscle } from '../types'
import { EQUIPMENT, MUSCLES } from '../types'
import { plural } from '../lib/format'

type Sort = 'az' | 'used'

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
  const sort: Sort = params.get('sort') === 'used' ? 'used' : 'az'

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
    const filtered = all.filter(
      (e) =>
        (!needle || e.name.toLowerCase().includes(needle) || e.primary.toLowerCase().includes(needle) || e.equipment.toLowerCase().includes(needle)) &&
        (!muscle || e.primary === muscle || e.secondary.includes(muscle)) &&
        (!equipment || e.equipment === equipment) &&
        (!favOnly || favorites.includes(e.id)) &&
        (!customOnly || e.custom),
    )
    return sort === 'used' ? [...filtered].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name)) : filtered
  }, [all, q, muscle, equipment, favOnly, customOnly, favorites, sort, counts])

  const sections = useMemo(() => {
    if (sort === 'used') return [{ key: 'all', items: list }]
    const m = new Map<string, Exercise[]>()
    for (const e of list) {
      const k = /[a-z]/i.test(e.name[0]) ? e.name[0].toUpperCase() : '#'
      m.set(k, [...(m.get(k) ?? []), e])
    }
    return [...m.entries()].map(([key, items]) => ({ key, items }))
  }, [list, sort])

  const filtered = !!(q || muscle || equipment || favOnly || customOnly)
  const clearAll = () => {
    setQ('')
    const next = new URLSearchParams()
    if (sort === 'used') next.set('sort', 'used')
    setParams(next, { replace: true })
  }

  return (
    <div className="animate-rise">
      <PageHeader
        title="Exercises"
        subtitle={`${plural(all.length, 'exercise')} · ${plural(favorites.length, 'favourite')}`}
        actions={
          <Button icon={<Plus size={18} />} onClick={() => setCreating(true)}>
            New exercise
          </Button>
        }
      />

      <div className="sticky top-0 z-20 -mx-4 bg-bg/95 px-4 pt-1 pb-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises, muscles or equipment" className="h-12 rounded-2xl pl-11 text-base" aria-label="Search exercises" type="search" />
        </div>
        <div className="scrollbar-none -mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <DropdownChip label="Filter by muscle" placeholder="All muscles" value={muscle ?? ''} onChange={(v) => setParam('muscle', v || null)} options={MUSCLES} />
          <DropdownChip label="Filter by equipment" placeholder="All equipment" value={equipment ?? ''} onChange={(v) => setParam('equipment', v || null)} options={EQUIPMENT} />
          <Chip active={favOnly} onClick={() => setParam('fav', favOnly ? null : '1')}>
            <Star size={14} className={favOnly ? 'fill-current' : undefined} /> Favourites
          </Chip>
          <Chip active={customOnly} onClick={() => setParam('custom', customOnly ? null : '1')}>
            Custom
          </Chip>
          {filtered && (
            <button onClick={clearAll} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold text-accent-ink hover:bg-surface-2">
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted" aria-live="polite">
          {filtered ? `${list.length} match${list.length === 1 ? '' : 'es'}` : plural(list.length, 'exercise')}
        </p>
        <Segmented<Sort>
          label="Sort"
          size="sm"
          value={sort}
          onChange={(v) => setParam('sort', v === 'used' ? 'used' : null)}
          options={[
            { value: 'az', label: 'A–Z' },
            { value: 'used', label: 'Most used' },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<SearchX size={22} />}
          title="No exercises match"
          body={favOnly && !favorites.length ? 'Star exercises to collect your favourites here.' : 'Try a different search or filter, or add it as a custom exercise.'}
          action={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={clearAll}>
                Clear filters
              </Button>
              <Button icon={<Plus size={18} />} onClick={() => setCreating(true)}>
                New exercise
              </Button>
            </div>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {sections.map((sec) => (
            <section key={sec.key} aria-label={sort === 'az' ? `Exercises starting with ${sec.key}` : 'Exercises by use'}>
              {sort === 'az' && <h2 className="stamp mb-2 px-1 text-xl text-accent-ink">{sec.key}</h2>}
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface sm:grid sm:grid-cols-2 sm:gap-2 sm:divide-y-0 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent xl:grid-cols-3">
                {sec.items.map((e) => {
                  const fav = favorites.includes(e.id)
                  const n = counts.get(e.id) ?? 0
                  return (
                    <li key={e.id} className="relative sm:overflow-hidden sm:rounded-2xl sm:border sm:border-line sm:bg-surface">
                      <Link to={`/library/${e.id}`} className="flex min-h-16 items-center gap-3 px-3 py-2.5 pr-14 transition-colors hover:bg-surface-2">
                        <Monogram name={e.name} />
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
                          'absolute top-1/2 right-2 flex size-11 -translate-y-1/2 items-center justify-center rounded-xl transition-colors hover:bg-surface-3',
                          fav ? 'text-accent' : 'text-muted',
                        )}
                      >
                        <Star size={20} className={clsx('transition-transform', fav && 'animate-pop fill-current')} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <ExerciseForm open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
