import { db } from './schema'

export async function setWeighIn(date: string, kg: number): Promise<void> {
  await db.bodyweight.put({ date, kg })
}

export async function deleteWeighIn(date: string): Promise<void> {
  await db.bodyweight.delete(date)
}
