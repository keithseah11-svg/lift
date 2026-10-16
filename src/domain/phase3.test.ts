import { describe, expect, it } from 'vitest'
import { linkWithNext, restsAfter, supersetLayout, unlink } from './supersets'
import { summarizeMeasurements } from './measurements'
import { fitWithin, parsePhotoFileName, photoFileName } from './photos'

const item = (id: string, order: number, supersetGroup: string | null = null) => ({ id, order, supersetGroup })

describe('supersets', () => {
  it('labels consecutive groups and positions', () => {
    const layout = supersetLayout([item('a', 0, 'g1'), item('b', 1, 'g1'), item('c', 2), item('d', 3, 'g2'), item('e', 4, 'g2'), item('f', 5, 'g2')])
    expect(layout.get('a')).toEqual({ groupId: 'g1', label: 'A', position: 'first' })
    expect(layout.get('b')?.position).toBe('last')
    expect(layout.get('c')?.position).toBe('single')
    expect(layout.get('e')).toMatchObject({ label: 'B', position: 'middle' })
    expect(layout.get('f')?.position).toBe('last')
  })

  it('ignores a group id that is not consecutive', () => {
    const layout = supersetLayout([item('a', 0, 'g'), item('b', 1), item('c', 2, 'g')])
    expect([...layout.values()].every((i) => i.position === 'single')).toBe(true)
  })

  it('links with the next exercise, extending or merging groups', () => {
    expect(linkWithNext([item('a', 0), item('b', 1)], 'a', 'new')).toEqual(new Map([['a', 'new'], ['b', 'new']]))
    expect(linkWithNext([item('a', 0, 'g'), item('b', 1, 'g'), item('c', 2)], 'b', 'new')).toEqual(new Map([['c', 'g']]))
    expect(linkWithNext([item('a', 0, 'g'), item('b', 1, 'h'), item('c', 2, 'h')], 'a', 'new')).toEqual(new Map([['b', 'g'], ['c', 'g']]))
    expect(linkWithNext([item('a', 0)], 'a', 'new').size).toBe(0)
  })

  it('unlinks, dissolving a superset left with one exercise', () => {
    expect(unlink([item('a', 0, 'g'), item('b', 1, 'g')], 'a')).toEqual(['a', 'b'])
    expect(unlink([item('a', 0, 'g'), item('b', 1, 'g'), item('c', 2, 'g')], 'b')).toEqual(['b'])
  })

  it('rests only after the last exercise of a superset', () => {
    expect(restsAfter({ groupId: 'g', label: 'A', position: 'first' })).toBe(false)
    expect(restsAfter({ groupId: 'g', label: 'A', position: 'last' })).toBe(true)
    expect(restsAfter(undefined)).toBe(true)
  })
})

describe('measurements', () => {
  it('reports latest value and changes per site', () => {
    const s = summarizeMeasurements([
      { date: '2026-09-01', site: 'waist', value: 86 },
      { date: '2026-10-01', site: 'waist', value: 84.5 },
      { date: '2026-09-15', site: 'waist', value: 85.2 },
      { date: '2026-10-01', site: 'arm_left', value: 38 },
    ])
    expect(s.map((x) => x.site)).toEqual(['waist', 'arm_left'])
    expect(s[0]).toMatchObject({ latest: { value: 84.5 }, sincePrevious: -0.7, sinceFirst: -1.5, count: 3 })
    expect(s[1]).toMatchObject({ sincePrevious: null, sinceFirst: null })
  })
})

describe('photo files', () => {
  it('round-trips file names', () => {
    const name = photoFileName('2026-10-10', 'side', 2)
    expect(name).toBe('2026-10-10_side_2.jpg')
    expect(parsePhotoFileName('lift-photos/' + name)).toEqual({ date: '2026-10-10', pose: 'side' })
    expect(parsePhotoFileName('IMG_1234.jpg')).toBeNull()
    expect(parsePhotoFileName('2026-10-10_selfie_1.jpg')).toBeNull()
  })

  it('scales down to fit, never up', () => {
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 })
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })
})

import { countedSecondaryMuscles, muscleSetCounts } from './muscleSets'
import { resolveMuscleTargets, targetStatus } from './muscleTargets'

describe('secondary muscle credit', () => {
  const bench = { primaryMuscle: 'chest' as const, secondaryMuscles: ['triceps' as const, 'front_delts' as const] }
  const set = { weightKg: 100, reps: 5, type: 'working' as const, done: true }

  it('follows the global setting unless the exercise overrides it', () => {
    expect(countedSecondaryMuscles(bench, true)).toEqual(['triceps', 'front_delts'])
    expect(countedSecondaryMuscles(bench, false)).toEqual([])
    expect(countedSecondaryMuscles({ ...bench, countedSecondary: ['triceps'] }, false)).toEqual(['triceps'])
    expect(countedSecondaryMuscles({ ...bench, countedSecondary: [] }, true)).toEqual([])
  })

  it('ignores override muscles the exercise no longer lists', () => {
    expect(countedSecondaryMuscles({ ...bench, countedSecondary: ['triceps', 'biceps'] }, true)).toEqual(['triceps'])
  })

  it('applies to weekly set counts', () => {
    const deadlift = { primaryMuscle: 'lower_back' as const, secondaryMuscles: ['glutes' as const, 'hamstrings' as const], countedSecondary: [] }
    const items = [
      { set, exercise: { ...bench, countedSecondary: ['triceps' as const] } },
      { set, exercise: deadlift },
    ]
    expect(muscleSetCounts(items, true)).toEqual({ chest: 1, triceps: 0.5, lower_back: 1 })
  })
})

describe('muscle targets', () => {
  it('uses per-muscle overrides, the default range otherwise, and can switch muscles off', () => {
    const t = resolveMuscleTargets({ min: 10, max: 20 }, { chest: { min: 12, max: 18 }, forearms: 'off' })
    expect(t.chest).toEqual({ min: 12, max: 18 })
    expect(t.quads).toEqual({ min: 10, max: 20 })
    expect(t.forearms).toBeNull()
  })

  it('classifies progress against a target', () => {
    expect(targetStatus(5, { min: 10, max: 20 })).toBe('under')
    expect(targetStatus(12, { min: 10, max: 20 })).toBe('in')
    expect(targetStatus(22, { min: 10, max: 20 })).toBe('over')
    expect(targetStatus(0, { min: 10, max: 20 })).toBe('none')
    expect(targetStatus(3, null)).toBe('off')
  })
})
