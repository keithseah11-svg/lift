import { isCountedSet, type CountableSet } from './volume'

/**
 * Estimated one-rep max (Epley). A single rep is the weight itself; above
 * 12 reps the estimate gets unreliable, so those sets don't produce one.
 */
export function estimateOneRepMax(weightKg: number, reps: number): number | null {
  if (weightKg <= 0 || reps <= 0 || reps > 12) return null
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30)
}

export interface RecordSet extends CountableSet {
  /** When the set was performed (workout start time). */
  at: number
}

export interface ExerciseRecords {
  heaviest: { weightKg: number; reps: number; at: number } | null
  bestE1rm: { value: number; weightKg: number; reps: number; at: number } | null
  bestSetVolume: { value: number; weightKg: number; reps: number; at: number } | null
}

/** Personal records across every counted (non-warm-up, completed) set. */
export function computeRecords(sets: RecordSet[]): ExerciseRecords {
  const records: ExerciseRecords = { heaviest: null, bestE1rm: null, bestSetVolume: null }
  for (const s of sets) {
    if (!isCountedSet(s)) continue
    const weightKg = s.weightKg ?? 0
    const reps = s.reps ?? 0
    if (reps <= 0) continue

    const h = records.heaviest
    if (weightKg > 0 && (!h || weightKg > h.weightKg || (weightKg === h.weightKg && reps > h.reps))) {
      records.heaviest = { weightKg, reps, at: s.at }
    }
    const e1rm = estimateOneRepMax(weightKg, reps)
    if (e1rm != null && (!records.bestE1rm || e1rm > records.bestE1rm.value)) {
      records.bestE1rm = { value: e1rm, weightKg, reps, at: s.at }
    }
    const volume = weightKg * reps
    if (volume > 0 && (!records.bestSetVolume || volume > records.bestSetVolume.value)) {
      records.bestSetVolume = { value: volume, weightKg, reps, at: s.at }
    }
  }
  return records
}

/** Best estimated 1RM among a session's counted sets. */
export function sessionBestE1rm(sets: CountableSet[]): number | null {
  let best: number | null = null
  for (const s of sets) {
    if (!isCountedSet(s)) continue
    const e = estimateOneRepMax(s.weightKg ?? 0, s.reps ?? 0)
    if (e != null && (best == null || e > best)) best = e
  }
  return best
}
