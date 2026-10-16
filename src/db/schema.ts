import Dexie, { type EntityTable } from 'dexie'
import type {
  BodyweightEntry,
  Purchase,
  Measurement,
  ProgressPhoto,
  Exercise,
  MacroEntry,
  MealPreset,
  Routine,
  RoutineExercise,
  ScheduleEntry,
  Settings,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from './types'
import { SEED_EXERCISES } from './seed/exercises'
import type { CustomMuscle } from '../domain/muscles'

export interface KeyValue {
  key: string
  value: unknown
}

export class LiftDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  routines!: EntityTable<Routine, 'id'>
  routineExercises!: EntityTable<RoutineExercise, 'id'>
  schedule!: EntityTable<ScheduleEntry, 'weekday'>
  workouts!: EntityTable<Workout, 'id'>
  workoutExercises!: EntityTable<WorkoutExercise, 'id'>
  sets!: EntityTable<WorkoutSet, 'id'>
  macroEntries!: EntityTable<MacroEntry, 'id'>
  mealPresets!: EntityTable<MealPreset, 'id'>
  kv!: EntityTable<KeyValue, 'key'>
  bodyweight!: EntityTable<BodyweightEntry, 'date'>
  measurements!: EntityTable<Measurement, 'id'>
  photos!: EntityTable<ProgressPhoto, 'id'>
  muscles!: EntityTable<CustomMuscle, 'id'>
  purchases!: EntityTable<Purchase, 'itemId'>

  constructor(name = 'lift') {
    super(name)
    this.version(1).stores({
      exercises: 'id, name, primaryMuscle',
      routines: 'id, createdAt',
      routineExercises: 'id, routineId, exerciseId',
      schedule: 'weekday',
      workouts: 'id, status, startedAt, routineId',
      workoutExercises: 'id, workoutId, exerciseId',
      sets: 'id, workoutId, workoutExerciseId',
      macroEntries: 'id, date',
      mealPresets: 'id, label',
      kv: 'key',
    })
    // v2: bodyweight log. Dexie upgrades existing databases in place.
    this.version(2).stores({ bodyweight: 'date' })
    // v3: body measurements and progress photos.
    this.version(3).stores({ measurements: 'id, date, site', photos: 'id, date, pose' })
    // v4: muscle groups you add yourself.
    this.version(4).stores({ muscles: 'id' })
    // v5: item shop purchases.
    this.version(5).stores({ purchases: 'itemId' })
    this.on('populate', (tx) => {
      tx.table('exercises').bulkAdd(SEED_EXERCISES)
    })
    // Exercises added to the built-in library in later updates reach existing
    // installs here. Only missing ids are added; nothing existing is changed.
    // Sticky: runs on every open, not just the first (e.g. after a restore or reopen).
    this.on(
      'ready',
      async () => {
        await addMissingSeedExercises(this)
        await startCoinsIfNeeded(this)
      },
      true,
    )
  }
}

export async function addMissingSeedExercises(db: LiftDB): Promise<number> {
  const existing = new Set(await db.exercises.toCollection().primaryKeys())
  const missing = SEED_EXERCISES.filter((e) => !existing.has(e.id))
  if (missing.length) await db.exercises.bulkAdd(missing)
  return missing.length
}

/** Coins count from the first time this version runs ("start from 0 today"). */
export async function startCoinsIfNeeded(db: LiftDB): Promise<void> {
  const row = await db.kv.get('settings')
  const value = (row?.value ?? {}) as { coinsSince?: number | null }
  if (value.coinsSince == null) await db.kv.put({ key: 'settings', value: { ...value, coinsSince: Date.now() } })
}

export const db = new LiftDB()

export type { Settings }
