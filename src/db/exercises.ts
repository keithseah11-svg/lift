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
