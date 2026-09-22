export type Units = 'kg' | 'lb'
export type ThemePref = 'light' | 'dark' | 'system'
export type Experience = 'beginner' | 'intermediate' | 'advanced'
export type Goal = 'strength' | 'muscle' | 'general'

export const MUSCLES = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Traps',
  'Core',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
] as const
export type Muscle = (typeof MUSCLES)[number]

export const EQUIPMENT = [
  'Barbell',
  'Dumbbell',
  'Machine',
  'Cable',
  'Bodyweight',
  'Kettlebell',
  'Band',
  'EZ Bar',
  'Smith Machine',
] as const
export type Equipment = (typeof EQUIPMENT)[number]

export interface Exercise {
  id: string
  name: string
  primary: Muscle
  secondary: Muscle[]
  equipment: Equipment
  cue: string
  custom?: boolean
  /** Deleted custom exercise kept so history still has a name for it. */
  archived?: boolean
}

export interface RoutineExercise {
  id: string
  exerciseId: string
  sets: number
  repMin: number
  repMax: number
  restSec: number
  /** Consecutive exercises sharing a superset id are performed back to back. */
  supersetId?: string | null
}

export interface Routine {
  id: string
  name: string
  notes?: string
  exercises: RoutineExercise[]
  /** Included in the rotation that drives "next workout". */
  inPlan: boolean
  /** Created by onboarding; replaced when onboarding is repeated. */
  generated?: boolean
  createdAt: string
  updatedAt: string
}

export type SetType = 'normal' | 'warmup' | 'failure' | 'drop'

export interface WorkoutSet {
  id: string
  type: SetType
  /** Always stored in kilograms. */
  weight: number | null
  reps: number | null
  completed: boolean
}

export interface WorkoutExercise {
  id: string
  exerciseId: string
  restSec: number
  repMin?: number
  repMax?: number
  supersetId?: string | null
  sets: WorkoutSet[]
}

export interface Workout {
  id: string
  name: string
  routineId?: string | null
  startedAt: string
  endedAt: string
  notes?: string
  exercises: WorkoutExercise[]
}

export interface ActiveWorkout extends Omit<Workout, 'endedAt'> {
  rest: RestTimer | null
}

export interface RestTimer {
  /** Epoch ms when rest ends. Timestamp based so it survives refreshes. */
  endsAt: number
  duration: number
  label: string
}

export interface Measurement {
  id: string
  date: string // yyyy-MM-dd
  /** kg */
  weight?: number | null
  bodyFat?: number | null
  /** all lengths in cm */
  waist?: number | null
  chest?: number | null
  arms?: number | null
  thighs?: number | null
  hips?: number | null
  note?: string
}

export interface Profile {
  name: string
  experience: Experience
  goal: Goal
  daysPerWeek: number
  equipment: Equipment[]
  /** Weekday numbers (0 = Sunday) the user plans to train. */
  trainingDays: number[]
}

export interface Settings {
  theme: ThemePref
  units: Units
  defaultRestSec: number
  timerSound: boolean
  /** Onboarding has been completed or skipped at least once. */
  setupSeen?: boolean
}
