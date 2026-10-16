import { db } from './schema'
import type { Exercise, Workout, WorkoutExercise, WorkoutSet } from './types'
import { totalVolume } from '../domain/volume'
import { muscleSetCounts, musclesHit } from '../domain/muscleSets'
import type { Muscle } from '../domain/muscles'
import { computeRecords, type ExerciseRecords, type RecordSet } from '../domain/records'

export interface WorkoutSummary {
  workout: Workout
  volume: number
  setCount: number
  exerciseCount: number
  musclesHit: Muscle[]
  muscleSets: Partial<Record<Muscle, number>>
  /** False for workouts saved with no completed sets (older versions allowed this). */
  counts: boolean
}

export interface LoadedWorkout {
  workout: Workout
  exercises: WorkoutExercise[]
  sets: WorkoutSet[]
}

export function summarize(loaded: LoadedWorkout, exercises: Map<string, Exercise>): WorkoutSummary {
  const weById = new Map(loaded.exercises.map((we) => [we.id, we]))
  const items = loaded.sets.flatMap((set) => {
    const we = weById.get(set.workoutExerciseId)
    const exercise = we && exercises.get(we.exerciseId)
    return exercise ? [{ set, exercise }] : []
  })
  return {
    workout: loaded.workout,
    volume: totalVolume(loaded.sets),
    setCount: loaded.sets.filter((s) => s.done && s.type !== 'warmup').length,
    exerciseCount: loaded.exercises.length,
    musclesHit: musclesHit(items),
    muscleSets: muscleSetCounts(items),
    counts: loaded.sets.some((s) => s.done),
  }
}

/** Start times of finished workouts that have at least one completed set. */
export async function sessionTimes(): Promise<number[]> {
  const [workouts, sets] = await Promise.all([db.workouts.where('status').equals('done').toArray(), db.sets.toArray()])
  const withSets = new Set(sets.filter((s) => s.done).map((s) => s.workoutId))
  return workouts.filter((w) => withSets.has(w.id)).map((w) => w.startedAt)
}

/** Finished workouts that started in [start, end), newest first, with their exercises and sets. */
export async function loadWorkoutsBetween(start: number, end: number): Promise<LoadedWorkout[]> {
  const workouts = await db.workouts
    .where('startedAt')
    .between(start, end, true, false)
    .filter((w) => w.status === 'done')
    .reverse()
    .sortBy('startedAt')
  return loadDetails(workouts)
}

export async function loadDetails(workouts: Workout[]): Promise<LoadedWorkout[]> {
  const ids = workouts.map((w) => w.id)
  const [wes, sets] = await Promise.all([
    db.workoutExercises.where('workoutId').anyOf(ids).toArray(),
    db.sets.where('workoutId').anyOf(ids).toArray(),
  ])
  return workouts.map((workout) => ({
    workout,
    exercises: wes.filter((we) => we.workoutId === workout.id).sort((a, b) => a.order - b.order),
    sets: sets.filter((s) => s.workoutId === workout.id).sort((a, b) => a.order - b.order),
  }))
}

export function combineMuscleSets(summaries: WorkoutSummary[]): Partial<Record<Muscle, number>> {
  const total: Partial<Record<Muscle, number>> = {}
  for (const s of summaries) {
    for (const [m, n] of Object.entries(s.muscleSets) as [Muscle, number][]) {
      total[m] = (total[m] ?? 0) + n
    }
  }
  return total
}

export interface ExerciseRecordRow {
  exercise: Exercise
  records: ExerciseRecords
  sessions: number
  lastAt: number
}

/** Personal records for every exercise you've logged, strongest first. */
export async function loadAllRecords(exercises: Map<string, Exercise>): Promise<ExerciseRecordRow[]> {
  const workouts = await db.workouts.where('status').equals('done').toArray()
  const startedAt = new Map(workouts.map((w) => [w.id, w.startedAt]))
  const [wes, sets] = await Promise.all([db.workoutExercises.toArray(), db.sets.toArray()])
  const weById = new Map(wes.map((we) => [we.id, we]))

  const byExercise = new Map<string, { sets: RecordSet[]; workouts: Set<string> }>()
  for (const set of sets) {
    const at = startedAt.get(set.workoutId)
    const we = weById.get(set.workoutExerciseId)
    if (at == null || !we) continue
    const entry = byExercise.get(we.exerciseId) ?? { sets: [], workouts: new Set() }
    entry.sets.push({ ...set, at })
    entry.workouts.add(set.workoutId)
    byExercise.set(we.exerciseId, entry)
  }

  const rows: ExerciseRecordRow[] = []
  for (const [exerciseId, { sets: exSets, workouts: ws }] of byExercise) {
    const exercise = exercises.get(exerciseId)
    if (!exercise) continue
    const records = computeRecords(exSets)
    if (!records.heaviest && !records.bestSetVolume) continue
    rows.push({ exercise, records, sessions: ws.size, lastAt: Math.max(...exSets.map((s) => s.at)) })
  }
  return rows.sort(
    (a, b) =>
      (b.records.bestE1rm?.value ?? b.records.heaviest?.weightKg ?? 0) -
      (a.records.bestE1rm?.value ?? a.records.heaviest?.weightKg ?? 0),
  )
}
