import { db } from './schema'
import { newId } from '../lib/id'
import type { Pose } from '../domain/photos'

export async function addPhoto(date: string, pose: Pose, image: { blob: Blob; width: number; height: number }): Promise<string> {
  const id = newId()
  await db.photos.add({ id, date, pose, ...image, createdAt: Date.now() })
  return id
}

export async function deletePhoto(id: string): Promise<void> {
  await db.photos.delete(id)
}

export async function updatePhoto(id: string, patch: { date?: string; pose?: Pose }): Promise<void> {
  await db.photos.update(id, patch)
}
