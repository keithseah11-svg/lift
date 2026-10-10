export const POSES = ['front', 'side', 'back', 'other'] as const
export type Pose = (typeof POSES)[number]

export const POSE_LABELS: Record<Pose, string> = { front: 'Front', side: 'Side', back: 'Back', other: 'Other' }

/** e.g. 2026-10-10_front_1.jpg — sortable by date and readable in Files. */
export function photoFileName(date: string, pose: Pose, n: number): string {
  return `${date}_${pose}_${n}.jpg`
}

/** Reverses photoFileName; null for files that don't follow the pattern. */
export function parsePhotoFileName(name: string): { date: string; pose: Pose } | null {
  const base = name.split('/').pop() ?? name
  const m = /^(\d{4}-\d{2}-\d{2})_([a-z]+)_\d+\.jpe?g$/i.exec(base)
  if (!m) return null
  const pose = m[2].toLowerCase() as Pose
  return POSES.includes(pose) ? { date: m[1], pose } : null
}

/** Scales (w, h) down so the longer side is at most `max`. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}
