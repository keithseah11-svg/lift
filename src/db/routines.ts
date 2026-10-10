import { db } from './schema'
import { newId } from '../lib/id'
import type { Exercise, RoutineExercise } from './types'
import { routineGroups } from './supersets'

export async function createRoutine(name: string): Promise<string> {
  const id = newId()
  await db.routines.add({ id, name, notes: '', createdAt: Date.now() })
  return id
}

export async function renameRoutine(id: string, name: string): Promise<void> {
  await db.routines.update(id, { name })
}

export async function deleteRoutine(id: string): Promise<void> {
  await db.transaction('rw', db.routines, db.routineExercises, db.schedule, async () => {
    await db.routineExercises.where('routineId').equals(id).delete()
    await db.schedule.filter((s) => s.routineId === id).modify({ routineId: null })
    await db.routines.delete(id)
  })
}

export async function addRoutineExercise(routineId: string, exercise: Exercise): Promise<void> {
  const existing = await db.routineExercises.where('routineId').equals(routineId).toArray()
  const order = existing.reduce((max, re) => Math.max(max, re.order + 1), 0)
  await db.routineExercises.add({
    id: newId(),
    routineId,
    exerciseId: exercise.id,
    order,
    sets: 3,
    repMin: 8,
    repMax: 12,
    targetRir: 2,
    restSec: exercise.defaultRestSec,
    supersetGroup: null,
  })
}

export async function updateRoutineExercise(id: string, patch: Partial<RoutineExercise>): Promise<void> {
  await db.routineExercises.update(id, patch)
}

export async function removeRoutineExercise(id: string): Promise<void> {
  const re = await db.routineExercises.get(id)
  await db.routineExercises.delete(id)
  if (re) await routineGroups.tidy(re.routineId)
}

export async function moveRoutineExercise(id: string, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.routineExercises, async () => {
    const re = await db.routineExercises.get(id)
    if (!re) return
    const siblings = (await db.routineExercises.where('routineId').equals(re.routineId).toArray()).sort(
      (a, b) => a.order - b.order,
    )
    const idx = siblings.findIndex((s) => s.id === id)
    const other = siblings[idx + direction]
    if (!other) return
    await db.routineExercises.update(re.id, { order: other.order })
    await db.routineExercises.update(other.id, { order: re.order })
  })
  const re = await db.routineExercises.get(id)
  if (re) await routineGroups.tidy(re.routineId)
}

export async function setScheduleDay(weekday: number, routineId: string | null): Promise<void> {
  await db.schedule.put({ weekday, routineId })
}
