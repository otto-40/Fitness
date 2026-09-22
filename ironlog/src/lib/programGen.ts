import type { Equipment, Experience, Goal, Profile, Routine, RoutineExercise } from '../types'
import { BUILT_IN_EXERCISES } from '../data/exercises'
import { uid } from './id'

/** Movement slots, each with alternatives ordered by preference. */
const SLOTS: Record<string, string[]> = {
  squat: ['back-squat', 'hack-squat', 'leg-press', 'smith-squat', 'goblet-squat', 'kb-goblet-squat', 'bodyweight-squat'],
  squat2: ['front-squat', 'leg-press', 'bulgarian-split-squat', 'walking-lunge', 'kb-goblet-squat', 'bodyweight-squat'],
  hinge: ['deadlift', 'trap-bar-deadlift', 'db-romanian-deadlift', 'kb-swing', 'glute-bridge'],
  hinge2: ['romanian-deadlift', 'db-romanian-deadlift', 'hip-thrust', 'kb-swing', 'glute-bridge'],
  hamCurl: ['lying-leg-curl', 'seated-leg-curl', 'nordic-curl', 'glute-bridge'],
  quadIso: ['leg-extension', 'bulgarian-split-squat', 'step-up', 'bodyweight-squat'],
  lunge: ['bulgarian-split-squat', 'walking-lunge', 'step-up', 'bodyweight-squat'],
  calf: ['standing-calf-raise', 'seated-calf-raise', 'db-calf-raise'],
  hPress: ['bench-press', 'db-bench-press', 'machine-chest-press', 'smith-incline-press', 'push-up'],
  hPress2: ['incline-db-press', 'incline-bench-press', 'machine-chest-press', 'push-up'],
  chestIso: ['cable-fly', 'pec-deck', 'db-fly', 'push-up'],
  vPress: ['overhead-press', 'seated-db-press', 'machine-shoulder-press', 'kb-press', 'landmine-press', 'push-up'],
  lateral: ['lateral-raise', 'cable-lateral-raise', 'band-pull-apart'],
  vPull: ['pull-up', 'lat-pulldown', 'chin-up', 'inverted-row'],
  vPull2: ['lat-pulldown', 'close-grip-pulldown', 'chin-up', 'inverted-row'],
  hPull: ['barbell-row', 'chest-supported-row', 'seated-cable-row', 'one-arm-db-row', 'kb-row', 'inverted-row'],
  hPull2: ['seated-cable-row', 'one-arm-db-row', 'machine-row', 'kb-row', 'inverted-row'],
  rearDelt: ['face-pull', 'reverse-pec-deck', 'rear-delt-fly', 'band-pull-apart'],
  biceps: ['ez-bar-curl', 'db-curl', 'cable-curl', 'band-curl', 'chin-up'],
  biceps2: ['hammer-curl', 'incline-db-curl', 'band-curl'],
  triceps: ['triceps-pushdown', 'skull-crusher', 'db-overhead-extension', 'bench-dip', 'dip'],
  triceps2: ['overhead-triceps-extension', 'db-overhead-extension', 'bench-dip'],
  core: ['hanging-leg-raise', 'cable-crunch', 'ab-wheel-rollout', 'plank', 'dead-bug'],
}

type Kind = 'main' | 'secondary' | 'accessory'

const TEMPLATES: Record<string, [slot: string, kind: Kind][]> = {
  'Full Body A': [['squat', 'main'], ['hPress', 'main'], ['hPull', 'secondary'], ['hinge2', 'secondary'], ['lateral', 'accessory'], ['core', 'accessory']],
  'Full Body B': [['hinge', 'main'], ['vPress', 'main'], ['vPull', 'secondary'], ['lunge', 'secondary'], ['biceps', 'accessory'], ['triceps', 'accessory']],
  'Full Body C': [['squat2', 'main'], ['hPress2', 'secondary'], ['hPull2', 'secondary'], ['hamCurl', 'accessory'], ['rearDelt', 'accessory'], ['calf', 'accessory']],
  'Upper A': [['hPress', 'main'], ['hPull', 'main'], ['vPress', 'secondary'], ['vPull2', 'secondary'], ['lateral', 'accessory'], ['triceps', 'accessory'], ['biceps', 'accessory']],
  'Lower A': [['squat', 'main'], ['hinge2', 'secondary'], ['lunge', 'accessory'], ['hamCurl', 'accessory'], ['calf', 'accessory'], ['core', 'accessory']],
  'Upper B': [['vPress', 'main'], ['vPull', 'main'], ['hPress2', 'secondary'], ['hPull2', 'secondary'], ['rearDelt', 'accessory'], ['biceps2', 'accessory'], ['triceps2', 'accessory']],
  'Lower B': [['hinge', 'main'], ['squat2', 'secondary'], ['quadIso', 'accessory'], ['hamCurl', 'accessory'], ['calf', 'accessory'], ['core', 'accessory']],
  Push: [['hPress', 'main'], ['vPress', 'secondary'], ['hPress2', 'secondary'], ['lateral', 'accessory'], ['chestIso', 'accessory'], ['triceps', 'accessory']],
  Pull: [['hinge', 'main'], ['vPull', 'secondary'], ['hPull', 'secondary'], ['rearDelt', 'accessory'], ['biceps', 'accessory'], ['biceps2', 'accessory']],
  Legs: [['squat', 'main'], ['hinge2', 'secondary'], ['quadIso', 'accessory'], ['hamCurl', 'accessory'], ['calf', 'accessory'], ['core', 'accessory']],
}

const SPLITS: Record<number, string[]> = {
  2: ['Full Body A', 'Full Body B'],
  3: ['Full Body A', 'Full Body B', 'Full Body C'],
  4: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
  5: ['Push', 'Pull', 'Legs', 'Upper A', 'Lower A'],
  6: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'],
}

export const DEFAULT_TRAINING_DAYS: Record<number, number[]> = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
}

function prescription(goal: Goal, experience: Experience, kind: Kind) {
  const sets = experience === 'beginner' ? 3 : experience === 'advanced' && kind !== 'accessory' ? 4 : 3
  const table: Record<Goal, Record<Kind, [number, number, number]>> = {
    strength: { main: [3, 5, 180], secondary: [5, 8, 150], accessory: [8, 12, 90] },
    muscle: { main: [6, 10, 120], secondary: [8, 12, 90], accessory: [10, 15, 60] },
    general: { main: [8, 12, 90], secondary: [10, 12, 75], accessory: [12, 15, 60] },
  }
  const [repMin, repMax, restSec] = table[goal][kind]
  return { sets, repMin, repMax, restSec }
}

function pick(slot: string, available: Set<Equipment>, used: Set<string>): string | null {
  const byId = new Map(BUILT_IN_EXERCISES.map((e) => [e.id, e]))
  const options = SLOTS[slot] ?? []
  const ok = options.filter((id) => {
    const ex = byId.get(id)
    return ex && (ex.equipment === 'Bodyweight' || available.has(ex.equipment))
  })
  return ok.find((id) => !used.has(id)) ?? ok[0] ?? null
}

export function planLabel(daysPerWeek: number): string {
  const d = Math.min(6, Math.max(2, daysPerWeek))
  return d <= 3 ? 'Full-body' : d === 4 ? 'Upper / Lower' : d === 5 ? 'Push · Pull · Legs + Upper / Lower' : 'Push · Pull · Legs ×2'
}

/** Builds a personalised rotation from onboarding answers. */
export function generateProgram(profile: Pick<Profile, 'goal' | 'experience' | 'daysPerWeek' | 'equipment'>): Routine[] {
  const days = Math.min(6, Math.max(2, profile.daysPerWeek))
  const available = new Set<Equipment>(profile.equipment)
  // EZ bar work falls back gracefully to a barbell.
  if (available.has('Barbell')) available.add('EZ Bar')
  const names = SPLITS[days]
  const now = new Date().toISOString()
  const seen = new Map<string, number>()
  return names.map((name) => {
    const count = (seen.get(name) ?? 0) + 1
    seen.set(name, count)
    const used = new Set<string>()
    const exercises: RoutineExercise[] = []
    for (const [slot, kind] of TEMPLATES[name]) {
      const id = pick(slot, available, used)
      if (!id || used.has(id)) continue
      used.add(id)
      exercises.push({ id: uid('re'), exerciseId: id, ...prescription(profile.goal, profile.experience, kind), supersetId: null })
    }
    // Pair the final two accessories as a superset to keep sessions tight.
    const n = exercises.length
    if (n >= 5) {
      const ss = uid('ss')
      exercises[n - 1].supersetId = ss
      exercises[n - 2].supersetId = ss
    }
    const suffix = days === 6 ? (count === 1 ? ' A' : ' B') : ''
    return {
      id: uid('rt'),
      name: `${name}${suffix}`,
      notes: 'Generated from your onboarding answers.',
      exercises,
      inPlan: true,
      generated: true,
      createdAt: now,
      updatedAt: now,
    }
  })
}
