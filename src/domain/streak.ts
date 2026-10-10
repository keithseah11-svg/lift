import { addWeeks } from 'date-fns'
import { weekStart } from './week'

/**
 * Consecutive weeks (Monday–Sunday) in which the session target was met.
 * The current week counts once the target is reached; until then the
 * streak is carried from last week, so it doesn't "break" mid-week.
 */
export function weekStreak(workoutTimes: number[], target: number, now: number = Date.now()): number {
  const perWeek = new Map<number, number>()
  for (const t of workoutTimes) {
    const key = weekStart(t).getTime()
    perWeek.set(key, (perWeek.get(key) ?? 0) + 1)
  }
  let week = weekStart(now)
  let streak = 0
  if ((perWeek.get(week.getTime()) ?? 0) >= target) streak++
  week = addWeeks(week, -1)
  while ((perWeek.get(week.getTime()) ?? 0) >= target) {
    streak++
    week = addWeeks(week, -1)
  }
  return streak
}
