/**
 * Double progression with an RIR target.
 *
 * Work inside a rep range (e.g. 8–12). When every working set at your top
 * weight reaches the top of the range without going closer to failure than
 * planned, add the smallest weight step and restart at the bottom of the
 * range. Otherwise keep the weight and add reps. If the best estimated 1RM
 * hasn't improved for three sessions in a row, take ~10% off and build back.
 */
export interface ProgressionSet {
  weightKg: number | null
  reps: number | null
  rir: number | null
}

export interface ProgressionTarget {
  repMin: number
  repMax: number
  targetRir: number | null
  incrementKg: number
}

export type SuggestionKind = 'increase' | 'reps' | 'hold' | 'deload'

export interface Suggestion {
  kind: SuggestionKind
  weightKg: number
  reps: number
  reason: string
}

/** Consecutive sessions without a new best e1RM that trigger a deload. */
export const STALL_SESSIONS = 3

export function roundToIncrement(weightKg: number, incrementKg: number): number {
  if (incrementKg <= 0) return weightKg
  return Number((Math.round(weightKg / incrementKg) * incrementKg).toFixed(2))
}

/**
 * One number per session for "did I get stronger?": the average Epley score of
 * the best (up to 3) sets, so extra reps on later sets count as progress too.
 * Epley is applied at any rep count here since only the trend matters, and
 * bodyweight sets logged at 0 kg score by reps.
 */
export function performanceScore(sets: ProgressionSet[]): number {
  const scores = sets
    .map((s) => {
      const w = s.weightKg ?? 0
      const r = s.reps ?? 0
      return w > 0 ? w * (1 + r / 30) : r
    })
    .sort((a, b) => b - a)
    .slice(0, 3)
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
}

/**
 * @param sessions working sets (warm-ups already removed) for this exercise,
 *                 most recent session first.
 */
export function suggestNext(sessions: ProgressionSet[][], target: ProgressionTarget): Suggestion | null {
  const last = sessions[0]?.filter((s) => (s.reps ?? 0) > 0)
  if (!last || last.length === 0) return null

  const topWeight = Math.max(...last.map((s) => s.weightKg ?? 0))
  const topSets = last.filter((s) => (s.weightKg ?? 0) === topWeight)
  const minReps = Math.min(...topSets.map((s) => s.reps ?? 0))

  // Count consecutive recent sessions without a new best e1RM.
  const scores = sessions.slice(0, STALL_SESSIONS + 1).map(performanceScore)
  let stalled = 0
  for (let i = 0; i < scores.length - 1 && scores[i] <= scores[i + 1]; i++) stalled++

  const rirOk =
    target.targetRir == null || topSets.every((s) => s.rir == null || s.rir >= target.targetRir!)

  if (minReps >= target.repMax && rirOk && topWeight > 0) {
    return {
      kind: 'increase',
      weightKg: roundToIncrement(topWeight + target.incrementKg, target.incrementKg),
      reps: target.repMin,
      reason: `Hit ${target.repMax}+ reps on every set last time. Add ${target.incrementKg} kg.`,
    }
  }

  if (minReps >= target.repMax && topWeight === 0) {
    return {
      kind: 'reps',
      weightKg: 0,
      reps: minReps + 1,
      reason: `Top of the range on bodyweight. Add reps, or add weight with a belt or vest.`,
    }
  }

  if (minReps >= target.repMax) {
    return {
      kind: 'hold',
      weightKg: topWeight,
      reps: target.repMax,
      reason: `Reps were there but closer to failure than RIR ${target.targetRir}. Repeat the weight.`,
    }
  }

  if (stalled >= STALL_SESSIONS && topWeight > 0) {
    return {
      kind: 'deload',
      weightKg: roundToIncrement(topWeight * 0.9, target.incrementKg),
      reps: target.repMin,
      reason: `No progress for ${STALL_SESSIONS} sessions. Drop ~10% and build back up.`,
    }
  }

  if (stalled >= 1) {
    return {
      kind: 'hold',
      weightKg: topWeight,
      reps: Math.min(Math.max(minReps + 1, target.repMin), target.repMax),
      reason: 'No progress last time. Same weight; check sleep, food and recovery.',
    }
  }

  return {
    kind: 'reps',
    weightKg: topWeight,
    reps: Math.min(Math.max(minReps + 1, target.repMin), target.repMax),
    reason: `Same weight, aim for +1 rep (up to ${target.repMax}) before adding load.`,
  }
}
