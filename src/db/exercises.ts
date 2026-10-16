import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './schema'
import { newId } from '../lib/id'
import type { Exercise } from './types'
import type { Muscle } from '../domain/muscles'

export async function createExercise(data: Omit<Exercise, 'id' | 'custom'>): Promise<Exercise> {
  const exercise: Exercise = { ...data, id: newId(), custom: true }
  await db.exercises.add(exercise)
  return exercise
}

/** All exercises keyed by id, for joining onto sets and routine items. */
export function useExerciseMap(): Map<string, Exercise> | undefined {
  return useLiveQuery(async () => {
    const all = await db.exercises.toArray()
    return new Map(all.map((e) => [e.id, e]))
  }, [])
}

/** Which secondary muscles earn credit for this exercise; null = follow the global setting. */
export async function setCountedSecondary(exerciseId: string, muscles: Muscle[] | null): Promise<void> {
  await db.exercises.update(exerciseId, { countedSecondary: muscles })
}

type ExerciseFields = Omit<Exercise, 'id' | 'custom' | 'countedSecondary'>

/**
 * Updates an exercise's details. If it has its own secondary-muscle choices,
 * newly added secondary muscles are switched on and removed ones dropped.
 */
export async function updateExercise(id: string, data: ExerciseFields): Promise<Exercise> {
  return db.transaction('rw', db.exercises, async () => {
    const current = await db.exercises.get(id)
    if (!current) throw new Error('Exercise not found')
    let counted = current.countedSecondary
    if (counted != null) {
      const added = data.secondaryMuscles.filter((m) => !current.secondaryMuscles.includes(m))
      counted = [...counted.filter((m) => data.secondaryMuscles.includes(m)), ...added]
    }
    const next: Exercise = { ...current, ...data, countedSecondary: counted }
    await db.exercises.put(next)
    return next
  })
}

/** How many routines and logged workouts use this exercise. */
export async function exerciseUsage(id: string): Promise<{ workouts: number; routines: number }> {
  const [wes, res] = await Promise.all([
    db.workoutExercises.where('exerciseId').equals(id).toArray(),
    db.routineExercises.where('exerciseId').equals(id).toArray(),
  ])
  return { workouts: new Set(wes.map((w) => w.workoutId)).size, routines: new Set(res.map((r) => r.routineId)).size }
}

/** Deletes one of your own exercises, but only if no workout or routine uses it. */
export async function deleteExercise(id: string): Promise<{ ok: true } | { ok: false; workouts: number; routines: number }> {
  return db.transaction('rw', db.exercises, db.workoutExercises, db.routineExercises, async () => {
    const e = await db.exercises.get(id)
    if (!e?.custom) return { ok: false as const, workouts: 0, routines: 0 }
    const usage = await exerciseUsage(id)
    if (usage.workouts || usage.routines) return { ok: false as const, ...usage }
    await db.exercises.delete(id)
    return { ok: true as const }
  })
}
