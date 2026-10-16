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

/** Longest run of consecutive weeks (ever) in which the session target was met. */
export function longestWeekStreak(workoutTimes: number[], target: number): number {
  const perWeek = new Map<number, number>()
  for (const t of workoutTimes) {
    const key = weekStart(t).getTime()
    perWeek.set(key, (perWeek.get(key) ?? 0) + 1)
  }
  const hits = [...perWeek.entries()].filter(([, n]) => n >= target).map(([k]) => k).sort((a, b) => a - b)
  let best = 0
  let run = 0
  let prev: number | null = null
  for (const k of hits) {
    run = prev != null && addWeeks(prev, 1).getTime() === k ? run + 1 : 1
    best = Math.max(best, run)
    prev = k
  }
  return best
}
