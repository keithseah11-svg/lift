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
