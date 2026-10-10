import type { SetType } from '../db/types'

export interface CountableSet {
  type: SetType
  weightKg: number | null
  reps: number | null
  done: boolean
}

/** Warm-ups and unfinished sets don't count toward volume or weekly set totals. */
export function isCountedSet(set: CountableSet): boolean {
  return set.done && set.type !== 'warmup'
}

export function setVolume(set: CountableSet): number {
  if (!isCountedSet(set)) return 0
  return (set.weightKg ?? 0) * (set.reps ?? 0)
}

export function totalVolume(sets: CountableSet[]): number {
  return sets.reduce((sum, s) => sum + setVolume(s), 0)
}
