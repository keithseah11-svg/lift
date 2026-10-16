import { KG_PER_COIN } from './catalog'

export interface LedgerWorkout {
  id: string
  /** When the workout was finished (falls back to its start time). */
  at: number
  volume: number
}

export interface CoinLedger {
  /** Volume lifted since coins started, in finish order. */
  totalVolume: number
  earned: number
  spent: number
  balance: number
  /** kg still needed for the next coin. */
  kgToNextCoin: number
  /** Coins each workout earned, by workout id. */
  perWorkout: Map<string, number>
}

/**
 * Coins come from total volume (1 per 10,000 kg), counting only workouts
 * finished on or after `since`. Each workout's share is the number of
 * 10,000 kg boundaries it crossed, so the per-workout numbers always add
 * up to the total.
 */
export function coinLedger(workouts: LedgerWorkout[], since: number | null, spent: number): CoinLedger {
  const counted = since == null ? [] : workouts.filter((w) => w.at >= since && w.volume > 0).sort((a, b) => a.at - b.at)
  const perWorkout = new Map<string, number>()
  let total = 0
  for (const w of counted) {
    const before = Math.floor(total / KG_PER_COIN)
    total += w.volume
    perWorkout.set(w.id, Math.floor(total / KG_PER_COIN) - before)
  }
  const earned = Math.floor(total / KG_PER_COIN)
  return {
    totalVolume: total,
    earned,
    spent,
    balance: earned - spent,
    kgToNextCoin: KG_PER_COIN - (total % KG_PER_COIN),
    perWorkout,
  }
}
