export const MEASUREMENT_SITES = [
  { id: 'waist', label: 'Waist', unit: 'cm' },
  { id: 'chest', label: 'Chest', unit: 'cm' },
  { id: 'hips', label: 'Hips', unit: 'cm' },
  { id: 'shoulders', label: 'Shoulders', unit: 'cm' },
  { id: 'neck', label: 'Neck', unit: 'cm' },
  { id: 'arm_left', label: 'Arm (left)', unit: 'cm' },
  { id: 'arm_right', label: 'Arm (right)', unit: 'cm' },
  { id: 'thigh_left', label: 'Thigh (left)', unit: 'cm' },
  { id: 'thigh_right', label: 'Thigh (right)', unit: 'cm' },
  { id: 'calf', label: 'Calf', unit: 'cm' },
  { id: 'body_fat', label: 'Body fat', unit: '%' },
] as const

export type MeasurementSite = (typeof MEASUREMENT_SITES)[number]['id']
export const MEASUREMENT_SITE_IDS = MEASUREMENT_SITES.map((s) => s.id) as [MeasurementSite, ...MeasurementSite[]]

export function siteInfo(id: MeasurementSite) {
  return MEASUREMENT_SITES.find((s) => s.id === id)!
}

export interface MeasurementLike {
  date: string
  site: MeasurementSite
  value: number
}

export interface SiteSummary {
  site: MeasurementSite
  latest: MeasurementLike
  /** Change since the previous reading (null with one reading). */
  sincePrevious: number | null
  /** Change since the first reading (null with one reading). */
  sinceFirst: number | null
  count: number
}

/** Latest reading and changes per site, in the order of MEASUREMENT_SITES. */
export function summarizeMeasurements(entries: MeasurementLike[]): SiteSummary[] {
  const result: SiteSummary[] = []
  for (const { id } of MEASUREMENT_SITES) {
    const own = entries.filter((e) => e.site === id).sort((a, b) => a.date.localeCompare(b.date))
    if (own.length === 0) continue
    const latest = own[own.length - 1]
    const round = (n: number) => Math.round(n * 10) / 10
    result.push({
      site: id,
      latest,
      sincePrevious: own.length > 1 ? round(latest.value - own[own.length - 2].value) : null,
      sinceFirst: own.length > 1 ? round(latest.value - own[0].value) : null,
      count: own.length,
    })
  }
  return result
}
