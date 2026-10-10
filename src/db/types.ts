import type { Equipment, Muscle } from '../domain/muscles'
import type { MeasurementSite } from '../domain/measurements'
import type { Pose } from '../domain/photos'

export type SetType = 'warmup' | 'working' | 'drop' | 'failure'

export interface Exercise {
  id: string
  name: string
  primaryMuscle: Muscle
  secondaryMuscles: Muscle[]
  equipment: Equipment
  /** Smallest weight jump used for progression suggestions. */
  incrementKg: number
  defaultRestSec: number
  custom: boolean
}

export interface Routine {
  id: string
  name: string
  notes: string
  createdAt: number
}

export interface RoutineExercise {
  id: string
  routineId: string
  exerciseId: string
  order: number
  sets: number
  repMin: number
  repMax: number
  targetRir: number | null
  restSec: number
  /** Exercises sharing a group id are performed as a superset. */
  supersetGroup: string | null
}

/** weekday: 0 = Monday … 6 = Sunday */
export interface ScheduleEntry {
  weekday: number
  routineId: string | null
}

export type WorkoutStatus = 'active' | 'done'

export interface Workout {
  id: string
  name: string
  routineId: string | null
  status: WorkoutStatus
  startedAt: number
  endedAt: number | null
  notes: string
}

export interface WorkoutExercise {
  id: string
  workoutId: string
  exerciseId: string
  order: number
  restSec: number
  repMin: number | null
  repMax: number | null
  targetRir: number | null
  supersetGroup: string | null
  notes: string
}

export interface WorkoutSet {
  id: string
  workoutId: string
  workoutExerciseId: string
  order: number
  type: SetType
  weightKg: number | null
  reps: number | null
  rir: number | null
  done: boolean
}

export interface MacroEntry {
  id: string
  /** yyyy-MM-dd local date */
  date: string
  label: string
  proteinG: number
  carbsG: number
  fatG: number
  kcal: number
  createdAt: number
}

export interface MealPreset {
  id: string
  label: string
  proteinG: number
  carbsG: number
  fatG: number
  kcal: number
}

export interface BodyweightEntry {
  /** yyyy-MM-dd local date; one weigh-in per day */
  date: string
  kg: number
}

export interface Measurement {
  id: string
  /** yyyy-MM-dd */
  date: string
  site: MeasurementSite
  /** cm, or % for body fat */
  value: number
}

export interface ProgressPhoto {
  id: string
  /** yyyy-MM-dd */
  date: string
  pose: Pose
  /** Compressed JPEG */
  blob: Blob
  width: number
  height: number
  createdAt: number
}

export interface MacroTarget {
  proteinG: number
  carbsG: number
  fatG: number
  kcal: number
}

export interface Settings {
  weeklySessionTarget: number
  weeklySetMin: number
  weeklySetMax: number
  macroTarget: MacroTarget
  lastBackupAt: number | null
}

export const DEFAULT_SETTINGS: Settings = {
  weeklySessionTarget: 4,
  weeklySetMin: 10,
  weeklySetMax: 20,
  macroTarget: { proteinG: 160, carbsG: 250, fatG: 70, kcal: 2270 },
  lastBackupAt: null,
}
