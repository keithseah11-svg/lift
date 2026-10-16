import { describe, expect, it } from 'vitest'
import { coinLedger } from './economy'
import { ACHIEVEMENTS, unlockedAchievements, type AchievementStats } from './achievements'
import { ITEMS, ITEMS_BY_ID, STARTER_ITEM_IDS, DEFAULT_LOOK } from './catalog'
import { longestWeekStreak } from '../streak'

describe('coins', () => {
  const w = (id: string, at: number, volume: number) => ({ id, at, volume })

  it('pays 1 coin per 10,000 kg, only for workouts since the start date', () => {
    const l = coinLedger([w('old', 1, 50_000), w('a', 10, 6_000), w('b', 20, 7_000), w('c', 30, 18_000)], 5, 0)
    expect(l.totalVolume).toBe(31_000)
    expect(l.earned).toBe(3)
    expect(l.kgToNextCoin).toBe(9_000)
    // a: 6k → 0 coins, b: 13k → 1, c: 31k → 2
    expect([...l.perWorkout.entries()]).toEqual([['a', 0], ['b', 1], ['c', 2]])
  })

  it('subtracts purchases and can go negative after deleting workouts', () => {
    expect(coinLedger([w('a', 10, 25_000)], 0, 1).balance).toBe(1)
    expect(coinLedger([], 0, 1).balance).toBe(-1)
  })

  it('earns nothing before the game has started', () => {
    expect(coinLedger([w('a', 10, 25_000)], null, 0).earned).toBe(0)
  })
})

describe('achievements', () => {
  const base: AchievementStats = { workoutCount: 0, workoutTimes: [], weeklyTarget: 2, lifetimeVolume: 0, biggestSession: 0, heaviest: new Map() }

  it('unlocks on counts, lifts and volume', () => {
    expect(unlockedAchievements(base).size).toBe(0)
    const s = { ...base, workoutCount: 12, heaviest: new Map([['bench-press', 100], ['squat', 135]]), biggestSession: 21_000 }
    expect([...unlockedAchievements(s)].sort()).toEqual(['bench-100', 'first-workout', 'session-20000', 'workouts-10'])
  })

  it('every achievement unlocks exactly one item, and every achievement item has an achievement', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id))
    const milestoneItems = ITEMS.filter((i) => i.rarity === 'milestone')
    expect(new Set(milestoneItems.map((i) => i.milestone))).toEqual(ids)
    expect(milestoneItems.every((i) => i.price == null)).toBe(true)
  })
})

describe('catalog', () => {
  it('has unique ids, priced shop items and a valid default look', () => {
    expect(ITEMS_BY_ID.size).toBe(ITEMS.length)
    for (const i of ITEMS) {
      if (i.rarity === 'starter' || i.rarity === 'milestone') expect(i.price, i.id).toBeUndefined()
      else expect(i.price, i.id).toBeGreaterThan(0)
    }
    for (const id of Object.values(DEFAULT_LOOK.equipped)) expect(STARTER_ITEM_IDS).toContain(id)
  })
})

describe('longestWeekStreak', () => {
  const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 18).getTime()
  it('finds the longest run of target weeks, even if it ended', () => {
    const times = [day(2026, 8, 3), day(2026, 8, 10), day(2026, 8, 17), /* gap */ day(2026, 9, 7), day(2026, 9, 14)]
    expect(longestWeekStreak(times, 1)).toBe(3)
    expect(longestWeekStreak(times, 2)).toBe(0)
  })
})
