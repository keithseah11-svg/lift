import type { Table } from 'dexie'
import { db } from './schema'
import { newId } from '../lib/id'
import { linkWithNext, strayGroupIds, unlink, type Groupable } from '../domain/supersets'

/** Routine items and workout exercises both carry order + supersetGroup. */
type GroupTable = Table<Groupable & { [key: string]: unknown }, string>

async function siblings(table: GroupTable, parentKey: string, parentId: string) {
  return table.where(parentKey).equals(parentId).toArray()
}

async function clearStrays(table: GroupTable, parentKey: string, parentId: string) {
  const ids = strayGroupIds(await siblings(table, parentKey, parentId))
  for (const id of ids) await table.update(id, { supersetGroup: null })
}

export async function supersetWithNext(table: GroupTable, parentKey: string, id: string): Promise<void> {
  await db.transaction('rw', table, async () => {
    const item = await table.get(id)
    if (!item) return
    const parentId = item[parentKey] as string
    const changes = linkWithNext(await siblings(table, parentKey, parentId), id, newId())
    for (const [itemId, group] of changes) await table.update(itemId, { supersetGroup: group })
  })
}

export async function removeFromSuperset(table: GroupTable, parentKey: string, id: string): Promise<void> {
  await db.transaction('rw', table, async () => {
    const item = await table.get(id)
    if (!item) return
    for (const itemId of unlink(await siblings(table, parentKey, item[parentKey] as string), id)) {
      await table.update(itemId, { supersetGroup: null })
    }
  })
}

/** Call after reordering or removing items so broken supersets don't linger. */
export async function tidySupersets(table: GroupTable, parentKey: string, parentId: string): Promise<void> {
  await db.transaction('rw', table, () => clearStrays(table, parentKey, parentId))
}

export const workoutGroups = {
  link: (id: string) => supersetWithNext(db.workoutExercises as unknown as GroupTable, 'workoutId', id),
  unlink: (id: string) => removeFromSuperset(db.workoutExercises as unknown as GroupTable, 'workoutId', id),
  tidy: (workoutId: string) => tidySupersets(db.workoutExercises as unknown as GroupTable, 'workoutId', workoutId),
}

export const routineGroups = {
  link: (id: string) => supersetWithNext(db.routineExercises as unknown as GroupTable, 'routineId', id),
  unlink: (id: string) => removeFromSuperset(db.routineExercises as unknown as GroupTable, 'routineId', id),
  tidy: (routineId: string) => tidySupersets(db.routineExercises as unknown as GroupTable, 'routineId', routineId),
}
