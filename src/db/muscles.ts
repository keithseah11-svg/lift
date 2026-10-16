import { db } from './schema'
import { getSettings, updateSettings } from './settings'
import { allMuscles, muscleLabel, type CustomMuscleId, type Muscle } from '../domain/muscles'
import { findMuscleByName, linkPatch, newCustomMuscleId, unlinkPatch, type MuscleRole } from '../domain/muscleLinks'

/** Creates a custom muscle, or returns the existing one with that name. */
export async function createMuscle(name: string): Promise<{ id: Muscle; created: boolean }> {
  const trimmed = name.trim()
  const custom = await db.muscles.toArray()
  const labels = new Map(custom.map((c) => [c.id as Muscle, c.name]))
  const existing = findMuscleByName(trimmed, [...allMuscles(), ...custom.map((c) => c.id)], (m) => labels.get(m) ?? muscleLabel(m))
  if (existing) return { id: existing, created: false }
  const id = newCustomMuscleId(trimmed)
  await db.muscles.add({ id, name: trimmed, createdAt: Date.now() })
  return { id, created: true }
}

export async function renameMuscle(id: CustomMuscleId, name: string): Promise<void> {
  if (name.trim()) await db.muscles.update(id, { name: name.trim() })
}

export async function linkExerciseToMuscle(exerciseId: string, muscle: Muscle, role: MuscleRole): Promise<void> {
  await db.transaction('rw', db.exercises, async () => {
    const e = await db.exercises.get(exerciseId)
    if (e) await db.exercises.update(exerciseId, linkPatch(e, muscle, role))
  })
}

/** False when the muscle is the exercise's main muscle (make another muscle main first). */
export async function unlinkExerciseFromMuscle(exerciseId: string, muscle: Muscle): Promise<boolean> {
  return db.transaction('rw', db.exercises, async () => {
    const e = await db.exercises.get(exerciseId)
    const patch = e && unlinkPatch(e, muscle)
    if (!patch) return false
    await db.exercises.update(exerciseId, patch)
    return true
  })
}

/**
 * Deletes a custom muscle and unlinks it from every exercise. Refuses (returns
 * the exercise names) while it is any exercise's main muscle.
 */
export async function deleteMuscle(id: CustomMuscleId): Promise<{ ok: true } | { ok: false; mainFor: string[] }> {
  const result = await db.transaction('rw', db.exercises, db.muscles, async () => {
    const exercises = await db.exercises.toArray()
    const mainFor = exercises.filter((e) => e.primaryMuscle === id).map((e) => e.name)
    if (mainFor.length) return { ok: false as const, mainFor }
    for (const e of exercises) {
      const patch = e.secondaryMuscles.includes(id) ? unlinkPatch(e, id) : null
      if (patch) await db.exercises.update(e.id, patch)
    }
    await db.muscles.delete(id)
    return { ok: true as const }
  })
  if (result.ok) {
    const { muscleTargets } = await getSettings()
    if (id in muscleTargets) {
      const next = { ...muscleTargets }
      delete next[id]
      await updateSettings({ muscleTargets: next })
    }
  }
  return result
}
