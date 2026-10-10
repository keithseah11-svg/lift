import type { WorkoutSet } from '../db/types'

/**
 * Pairs each set with last session's set of the same kind: the n-th warm-up
 * with the n-th warm-up, the n-th working set with the n-th non-warm-up set.
 */
export function matchPrevious<T extends Pick<WorkoutSet, 'id' | 'type'>, P extends Pick<WorkoutSet, 'type'>>(
  sets: T[],
  previous: P[],
): Map<string, P> {
  const prevWarmups = previous.filter((s) => s.type === 'warmup')
  const prevWorking = previous.filter((s) => s.type !== 'warmup')
  const result = new Map<string, P>()
  let w = 0
  let k = 0
  for (const set of sets) {
    const prev = set.type === 'warmup' ? prevWarmups[w++] : prevWorking[k++]
    if (prev) result.set(set.id, prev)
  }
  return result
}
