import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './schema'
import { getSettings, updateSettings } from './settings'
import { loadDetails } from './stats'
import { totalVolume } from '../domain/volume'
import { coinLedger, type CoinLedger } from '../domain/game/economy'
import { ACHIEVEMENTS, unlockedAchievements, type AchievementStats } from '../domain/game/achievements'
import { ITEMS, ITEMS_BY_ID, STARTER_ITEM_IDS, type AvatarLook, type Slot } from '../domain/game/catalog'

export interface GameState {
  ledger: CoinLedger
  stats: AchievementStats
  /** Achievement ids you've earned. */
  unlocked: Set<string>
  /** Item ids you can wear: starter + bought + achievement items. */
  owned: Set<string>
  look: AvatarLook
}

/** Everything the game needs, worked out from your logged workouts. */
export async function loadGameState(excludeWorkoutId?: string): Promise<GameState> {
  const settings = await getSettings()
  const [allDone, purchases] = await Promise.all([db.workouts.where('status').equals('done').toArray(), db.purchases.toArray()])
  const workouts = allDone.filter((w) => w.id !== excludeWorkoutId)
  const loaded = await loadDetails(workouts)
  const wes = new Map(loaded.flatMap((l) => l.exercises).map((we) => [we.id, we]))

  const counted = loaded.filter((l) => l.sets.some((s) => s.done))
  const volumes = counted.map((l) => ({ id: l.workout.id, at: l.workout.endedAt ?? l.workout.startedAt, volume: totalVolume(l.sets) }))

  const heaviest = new Map<string, number>()
  for (const l of counted) {
    for (const s of l.sets) {
      if (!s.done || s.type === 'warmup' || !s.reps) continue
      const exerciseId = wes.get(s.workoutExerciseId)?.exerciseId
      if (exerciseId) heaviest.set(exerciseId, Math.max(heaviest.get(exerciseId) ?? 0, s.weightKg ?? 0))
    }
  }

  const stats: AchievementStats = {
    workoutCount: counted.length,
    workoutTimes: counted.map((l) => l.workout.startedAt),
    weeklyTarget: settings.weeklySessionTarget,
    lifetimeVolume: volumes.reduce((a, w) => a + w.volume, 0),
    biggestSession: Math.max(0, ...volumes.map((w) => w.volume)),
    heaviest,
  }
  const unlocked = unlockedAchievements(stats)
  const owned = new Set([
    ...STARTER_ITEM_IDS,
    ...purchases.map((p) => p.itemId),
    ...ITEMS.filter((i) => i.milestone && unlocked.has(i.milestone)).map((i) => i.id),
  ])
  const ledger = coinLedger(volumes, settings.coinsSince, purchases.reduce((a, p) => a + p.price, 0))

  // Only show items you still own (e.g. an achievement item after deleting workouts).
  const equipped = Object.fromEntries(
    Object.entries(settings.avatar.equipped).map(([slot, id]) => [slot, id && owned.has(id) ? id : null]),
  ) as AvatarLook['equipped']
  return { ledger, stats, unlocked, owned, look: { ...settings.avatar, equipped } }
}

export function useGame(): GameState | undefined {
  return useLiveQuery(() => loadGameState(), [])
}

export interface WorkoutRewards {
  coins: number
  /** Achievements this workout unlocked. */
  newAwards: typeof ACHIEVEMENTS
}

/** Coins and awards a single workout earned, for the finish screen. */
export async function workoutRewards(workoutId: string): Promise<WorkoutRewards> {
  const [now, before] = await Promise.all([loadGameState(), loadGameState(workoutId)])
  return {
    coins: now.ledger.perWorkout.get(workoutId) ?? 0,
    newAwards: ACHIEVEMENTS.filter((a) => now.unlocked.has(a.id) && !before.unlocked.has(a.id)),
  }
}

export type BuyResult = { ok: true } | { ok: false; reason: string }

/** Buys an item with coins and puts it on. */
export async function buyItem(itemId: string): Promise<BuyResult> {
  const item = ITEMS_BY_ID.get(itemId)
  if (!item || item.price == null) return { ok: false, reason: 'This item isn’t for sale.' }
  const state = await loadGameState()
  if (state.owned.has(itemId)) return { ok: false, reason: 'You already own this.' }
  if (state.ledger.balance < item.price) {
    return { ok: false, reason: `You need ${item.price - Math.max(0, state.ledger.balance)} more coins.` }
  }
  await db.purchases.add({ itemId, price: item.price, purchasedAt: Date.now() })
  await equipItem(item.slot, itemId)
  return { ok: true }
}

export async function equipItem(slot: Slot, itemId: string | null): Promise<void> {
  const { avatar } = await getSettings()
  await updateSettings({ avatar: { ...avatar, equipped: { ...avatar.equipped, [slot]: itemId } } })
}

export async function updateLook(patch: Partial<Omit<AvatarLook, 'equipped'>>): Promise<void> {
  const { avatar } = await getSettings()
  await updateSettings({ avatar: { ...avatar, ...patch } })
}

export { ACHIEVEMENTS }
