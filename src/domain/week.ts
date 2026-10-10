import { addDays, format, startOfWeek } from 'date-fns'

export const WEEK_STARTS_ON = 1 // Monday

export function weekStart(date: Date | number): Date {
  return startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON })
}

export function weekRange(date: Date | number): { start: number; end: number } {
  const start = weekStart(date)
  return { start: start.getTime(), end: addDays(start, 7).getTime() }
}

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(date: Date | number): number {
  return (new Date(date).getDay() + 6) % 7
}

export const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function dayKey(date: Date | number): string {
  return format(date, 'yyyy-MM-dd')
}
