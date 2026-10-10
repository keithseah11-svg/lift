import Dexie, { type EntityTable } from 'dexie'
import type {
  BodyweightEntry,
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
    this.on('populate', (tx) => {
      tx.table('exercises').bulkAdd(SEED_EXERCISES)
    })
  }
}

export const db = new LiftDB()

export type { Settings }
