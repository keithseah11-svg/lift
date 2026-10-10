import { differenceInCalendarDays, parseISO } from 'date-fns'

export interface WeighIn {
  /** yyyy-MM-dd */
  date: string
  kg: number
}

export interface TrendPoint extends WeighIn {
  /** Average of weigh-ins in the 7 days ending on this date. */
  average: number
}

/** Adds a trailing 7-day average; daily weight swings with water and food, the average shows the real trend. */
export function withSevenDayAverage(entries: WeighIn[]): TrendPoint[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  return sorted.map((entry, i) => {
    const end = parseISO(entry.date)
    const window = sorted
      .slice(0, i + 1)
      .filter((e) => differenceInCalendarDays(end, parseISO(e.date)) < 7)
    const average = window.reduce((sum, e) => sum + e.kg, 0) / window.length
    return { ...entry, average }
  })
}

/**
 * kg per week: today's 7-day average vs the 7-day average from about a week
 * earlier. Null until there is at least a week of weigh-ins.
 */
export function weeklyRate(points: TrendPoint[]): number | null {
  if (points.length < 2) return null
  const last = points[points.length - 1]
  const lastDate = parseISO(last.date)
  const earlier = [...points].reverse().find((p) => differenceInCalendarDays(lastDate, parseISO(p.date)) >= 7)
  if (!earlier) return null
  const days = differenceInCalendarDays(lastDate, parseISO(earlier.date))
  return ((last.average - earlier.average) / days) * 7
}
