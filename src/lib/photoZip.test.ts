import { describe, expect, it } from 'vitest'
import { zipSync } from 'fflate'
import { buildPhotoZip, parsePhotoZip } from './photoZip'

describe('photo zip', () => {
  it('round-trips photos with date and pose in the file names', () => {
    const jpeg = (n: number) => new Uint8Array([0xff, 0xd8, n, 0xff, 0xd9])
    const zip = buildPhotoZip([
      { date: '2026-10-10', pose: 'front', data: jpeg(1) },
      { date: '2026-09-01', pose: 'side', data: jpeg(2) },
      { date: '2026-10-10', pose: 'front', data: jpeg(3) },
    ])
    const { photos, skipped } = parsePhotoZip(zip)
    expect(skipped).toEqual([])
    expect(photos.map((p) => [p.date, p.pose, p.data[2]])).toEqual([
      ['2026-09-01', 'side', 2],
      ['2026-10-10', 'front', 1],
      ['2026-10-10', 'front', 3],
    ])
  })

  it('skips files that are not named like Lift photos', () => {
    const zip = zipSync({ 'IMG_0001.jpg': new Uint8Array([1]), '__MACOSX/': new Uint8Array(), 'lift-photos/.DS_Store': new Uint8Array([1]) })
    expect(parsePhotoZip(zip)).toEqual({ photos: [], skipped: ['IMG_0001.jpg'] })
  })
})
