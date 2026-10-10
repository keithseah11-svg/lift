import { describe, expect, it } from 'vitest'
import { computeRecords, estimateOneRepMax } from './records'
import { roundToIncrement, suggestNext, type ProgressionSet } from './progression'
import { weeklyRate, withSevenDayAverage } from './bodyweight'
import { weekStreak } from './streak'

const target = { repMin: 8, repMax: 12, targetRir: 2, incrementKg: 2.5 }
const s = (weightKg: number, reps: number, rir: number | null = null): ProgressionSet => ({ weightKg, reps, rir })

describe('estimateOneRepMax', () => {
  it('uses Epley, treats a single as the max, and skips high-rep sets', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100)
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.67, 2)
    expect(estimateOneRepMax(20, 15)).toBeNull()
    expect(estimateOneRepMax(0, 10)).toBeNull()
  })
})

describe('computeRecords', () => {
  it('finds heaviest, best e1RM and best set volume, ignoring warm-ups', () => {
    const at = 1
    const r = computeRecords([
      { weightKg: 140, reps: 10, type: 'warmup', done: true, at },
      { weightKg: 120, reps: 3, type: 'working', done: true, at: 2 },
      { weightKg: 100, reps: 10, type: 'working', done: true, at: 3 },
      { weightKg: 130, reps: 1, type: 'working', done: false, at: 4 },
    ])
    expect(r.heaviest).toEqual({ weightKg: 120, reps: 3, at: 2 })
    expect(r.bestE1rm?.weightKg).toBe(100) // 133.3 beats 132
    expect(r.bestSetVolume).toEqual({ value: 1000, weightKg: 100, reps: 10, at: 3 })
  })
})

describe('suggestNext (double progression)', () => {
  it('adds the weight step once every set hits the top of the range at target RIR', () => {
    const next = suggestNext([[s(60, 12, 2), s(60, 12, 2), s(60, 12, 3)]], target)
    expect(next).toMatchObject({ kind: 'increase', weightKg: 62.5, reps: 8 })
  })

  it('holds the weight when reps were hit but closer to failure than planned', () => {
    const next = suggestNext([[s(60, 12, 0), s(60, 12, 1)]], target)
    expect(next).toMatchObject({ kind: 'hold', weightKg: 60 })
  })

  it('asks for one more rep when inside the range', () => {
    const next = suggestNext([[s(60, 10), s(60, 9), s(60, 8)], [s(60, 9), s(60, 8), s(60, 8)]], target)
    expect(next).toMatchObject({ kind: 'reps', weightKg: 60, reps: 9 })
  })

  it('flags a stall after one session without progress', () => {
    const next = suggestNext([[s(60, 9)], [s(60, 9)]], target)
    expect(next).toMatchObject({ kind: 'hold', weightKg: 60 })
  })

  it('deloads ~10% after three sessions without progress', () => {
    const flat = [s(80, 8)]
    const next = suggestNext([flat, flat, flat, flat], target)
    expect(next).toMatchObject({ kind: 'deload', weightKg: 72.5, reps: 8 })
  })

  it('does not deload high-rep or bodyweight work that is still improving', () => {
    expect(suggestNext([[s(10, 16)], [s(10, 15)], [s(10, 14)], [s(10, 13)]], { ...target, repMax: 20 })?.kind).toBe('reps')
    expect(suggestNext([[s(0, 12)], [s(0, 11)]], target)).toMatchObject({ kind: 'reps', weightKg: 0, reps: 13 })
  })

  it('counts extra reps on later sets as progress', () => {
    const next = suggestNext([[s(45, 8), s(45, 8), s(45, 7)], [s(45, 8), s(45, 7), s(45, 7)], [s(45, 8), s(45, 7), s(45, 6)], [s(45, 8), s(45, 6), s(45, 6)]], target)
    expect(next?.kind).toBe('reps')
  })

  it('returns nothing without history', () => {
    expect(suggestNext([], target)).toBeNull()
  })

  it('rounds to the equipment step', () => {
    expect(roundToIncrement(72, 2.5)).toBe(72.5)
    expect(roundToIncrement(23.1, 2)).toBe(24)
  })
})

describe('bodyweight trend', () => {
  it('averages the trailing 7 days and reports kg per week', () => {
    const entries = Array.from({ length: 15 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      kg: 80 - i * 0.1,
    }))
    const points = withSevenDayAverage(entries)
    expect(points[0].average).toBe(80)
    expect(points[6].average).toBeCloseTo(79.7, 5)
    expect(weeklyRate(points)).toBeCloseTo(-0.7, 5)
  })
})

describe('weekStreak', () => {
  const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 18).getTime()
  const now = day(2026, 10, 8) // Thursday

  it('counts consecutive weeks meeting the target, carrying the current week until met', () => {
    const times = [
      day(2026, 9, 21), day(2026, 9, 23), // week of 21 Sep: 2
      day(2026, 9, 28), day(2026, 9, 30), // week of 28 Sep: 2
      day(2026, 10, 5), // this week: 1 so far
    ]
    expect(weekStreak(times, 2, now)).toBe(2)
    expect(weekStreak([...times, day(2026, 10, 7)], 2, now)).toBe(3)
    expect(weekStreak(times, 3, now)).toBe(0)
  })
})
