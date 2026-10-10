import { db } from './schema'
import type { Exercise, Workout, WorkoutExercise, WorkoutSet } from './types'
import { totalVolume } from '../domain/volume'
import { muscleSetCounts, musclesHit } from '../domain/muscleSets'
import type { Muscle } from '../domain/muscles'

export interface WorkoutSummary {
  workout: Workout
  volume: number
  setCount: number
  exerciseCount: number
  musclesHit: Muscle[]
  muscleSets: Partial<Record<Muscle, number>>
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
  }
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
