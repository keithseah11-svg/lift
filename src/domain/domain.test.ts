import { describe, expect, it } from 'vitest'
import { totalVolume, setVolume } from './volume'
import { muscleSetCounts, musclesHit } from './muscleSets'
import { kcalFromMacros, remainingMacros, sumMacros } from './macros'
import { weekRange, weekdayIndex } from './week'
import { matchPrevious } from './previous'
import type { SetType } from '../db/types'

const set = (weightKg: number | null, reps: number | null, type: SetType = 'working', done = true) => ({ weightKg, reps, type, done })

describe('volume', () => {
  it('sums weight × reps of completed working, drop and failure sets', () => {
    expect(totalVolume([set(100, 5), set(80, 8, 'drop'), set(60, 10, 'failure')])).toBe(500 + 640 + 600)
  })

  it('ignores warm-ups and unticked sets', () => {
    expect(totalVolume([set(60, 10, 'warmup'), set(100, 5, 'working', false), set(100, 5)])).toBe(500)
  })

  it('treats missing values as zero', () => {
    expect(setVolume(set(null, 10))).toBe(0)
  })
})

describe('muscle sets', () => {
  const bench = { primaryMuscle: 'chest' as const, secondaryMuscles: ['triceps' as const, 'front_delts' as const] }
  const curl = { primaryMuscle: 'biceps' as const, secondaryMuscles: [] }

  it('counts 1 for primary and 0.5 for each secondary muscle', () => {
    const counts = muscleSetCounts([
      { set: set(100, 5), exercise: bench },
      { set: set(100, 5), exercise: bench },
      { set: set(20, 10), exercise: curl },
    ])
    expect(counts).toEqual({ chest: 2, triceps: 1, front_delts: 1, biceps: 1 })
  })

  it('skips warm-ups', () => {
    expect(muscleSetCounts([{ set: set(40, 10, 'warmup'), exercise: bench }])).toEqual({})
  })

  it('lists muscles hit directly', () => {
    expect(musclesHit([{ set: set(100, 5), exercise: bench }])).toEqual(['chest'])
  })
})

describe('macros', () => {
  it('derives kcal at 4/4/9', () => {
    expect(kcalFromMacros(100, 200, 50)).toBe(400 + 800 + 450)
  })

  it('reports remaining (negative when over)', () => {
    const eaten = sumMacros([
      { proteinG: 50, carbsG: 100, fatG: 20, kcal: 780 },
      { proteinG: 40, carbsG: 0, fatG: 10, kcal: 250 },
    ])
    expect(remainingMacros({ proteinG: 160, carbsG: 80, fatG: 70, kcal: 2000 }, eaten)).toEqual({
      proteinG: 70,
      carbsG: -20,
      fatG: 40,
      kcal: 970,
    })
  })
})

describe('week', () => {
  it('starts on Monday', () => {
    const sunday = new Date(2026, 9, 11, 18)
    const { start, end } = weekRange(sunday)
    expect(new Date(start)).toEqual(new Date(2026, 9, 5))
    expect(new Date(end)).toEqual(new Date(2026, 9, 12))
    expect(weekdayIndex(sunday)).toBe(6)
    expect(weekdayIndex(new Date(2026, 9, 5))).toBe(0)
  })
})

describe('matchPrevious', () => {
  it('pairs warm-ups with warm-ups and working sets with working sets', () => {
    const prev = [
      { type: 'warmup' as const, label: 'w60' },
      { type: 'working' as const, label: '100x5' },
      { type: 'failure' as const, label: '100x8' },
    ]
    const now = [
      { id: 'a', type: 'working' as const },
      { id: 'b', type: 'working' as const },
      { id: 'c', type: 'working' as const },
    ]
    const m = matchPrevious(now, prev)
    expect([m.get('a')?.label, m.get('b')?.label, m.get('c')]).toEqual(['100x5', '100x8', undefined])
    const withWarmup = matchPrevious([{ id: 'w', type: 'warmup' as const }, ...now], prev)
    expect([withWarmup.get('w')?.label, withWarmup.get('a')?.label]).toEqual(['w60', '100x5'])
  })
})
