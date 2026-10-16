import type { Muscle } from './muscles'
import { isCountedSet, type CountableSet } from './volume'

export const SECONDARY_SET_CREDIT = 0.5

export interface MuscleTargets {
  primaryMuscle: Muscle
  secondaryMuscles: Muscle[]
  /**
   * Per-exercise choice of which secondary muscles earn ½-set credit.
   * Undefined/null = follow the global "count secondary muscles" setting.
   */
  countedSecondary?: Muscle[] | null
}

/** Secondary muscles of this exercise that count toward weekly sets. */
export function countedSecondaryMuscles(exercise: MuscleTargets, countSecondaryByDefault: boolean): Muscle[] {
  const chosen = exercise.countedSecondary ?? (countSecondaryByDefault ? exercise.secondaryMuscles : [])
  // Ignore stale choices for muscles the exercise no longer lists.
  return chosen.filter((m) => m !== exercise.primaryMuscle && exercise.secondaryMuscles.includes(m))
}

/**
 * Hard sets per muscle. A set counts fully for the exercise's primary muscle
 * and half for each counted secondary muscle.
 */
export function muscleSetCounts(
  items: { set: CountableSet; exercise: MuscleTargets }[],
  countSecondaryByDefault = true,
): Partial<Record<Muscle, number>> {
  const counts: Partial<Record<Muscle, number>> = {}
  for (const { set, exercise } of items) {
    if (!isCountedSet(set)) continue
    counts[exercise.primaryMuscle] = (counts[exercise.primaryMuscle] ?? 0) + 1
    for (const m of countedSecondaryMuscles(exercise, countSecondaryByDefault)) {
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
