/**
 * Progress photos don't fit in the Excel backup, so they get their own .zip:
 * plain JPEGs named 2026-10-10_front_1.jpg that open anywhere, and that
 * import can read back (date and pose come from the file name).
 */
import { unzipSync, zipSync } from 'fflate'
import { parsePhotoFileName, photoFileName, type Pose } from '../domain/photos'

export interface ZipPhoto {
  date: string
  pose: Pose
  data: Uint8Array
}

export function buildPhotoZip(photos: ZipPhoto[]): Uint8Array {
  const files: Record<string, Uint8Array> = {}
  const counts = new Map<string, number>()
  for (const p of [...photos].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = `${p.date}_${p.pose}`
    const n = (counts.get(key) ?? 0) + 1
    counts.set(key, n)
    // JPEGs are already compressed; level 0 just stores them (fast, same size).
    files[`lift-photos/${photoFileName(p.date, p.pose, n)}`] = p.data
  }
  return zipSync(files, { level: 0 })
}

export interface ParsedPhotoZip {
  photos: ZipPhoto[]
  skipped: string[]
}

export function parsePhotoZip(data: Uint8Array): ParsedPhotoZip {
  const entries = unzipSync(data)
  const photos: ZipPhoto[] = []
  const skipped: string[] = []
  for (const [name, bytes] of Object.entries(entries)) {
    if (name.endsWith('/') || name.split('/').pop()?.startsWith('.')) continue
    const meta = parsePhotoFileName(name)
    if (meta && bytes.length > 0) photos.push({ ...meta, data: bytes })
    else skipped.push(name)
  }
  return { photos, skipped }
}

export function photoZipFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `lift-photos-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.zip`
}
