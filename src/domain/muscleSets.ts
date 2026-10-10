import type { Muscle } from './muscles'
import { isCountedSet, type CountableSet } from './volume'

export const SECONDARY_SET_CREDIT = 0.5

export interface MuscleTargets {
  primaryMuscle: Muscle
  secondaryMuscles: Muscle[]
}

/**
 * Hard sets per muscle. A set counts fully for the exercise's primary muscle
 * and half for each secondary muscle.
 */
export function muscleSetCounts(
  items: { set: CountableSet; exercise: MuscleTargets }[],
): Partial<Record<Muscle, number>> {
  const counts: Partial<Record<Muscle, number>> = {}
  for (const { set, exercise } of items) {
    if (!isCountedSet(set)) continue
    counts[exercise.primaryMuscle] = (counts[exercise.primaryMuscle] ?? 0) + 1
    for (const m of exercise.secondaryMuscles) {
      if (m === exercise.primaryMuscle) continue
      counts[m] = (counts[m] ?? 0) + SECONDARY_SET_CREDIT
    }
  }
  return counts
}

/** Muscles that received at least one direct (primary) working set. */
export function musclesHit(
  items: { set: CountableSet; exercise: MuscleTargets }[],
): Muscle[] {
  const hit = new Set<Muscle>()
  for (const { set, exercise } of items) {
    if (isCountedSet(set)) hit.add(exercise.primaryMuscle)
  }
  return [...hit]
}
