import { useLiveQuery } from 'dexie-react-hooks'
import type { Exercise } from '../../db/types'
import { combineMuscleSets, loadWorkoutsBetween, summarize, type WorkoutSummary } from '../../db/stats'
import { weekRange } from '../../domain/week'
import type { Muscle } from '../../domain/muscles'

export interface WeekStats {
  summaries: WorkoutSummary[]
  volume: number
  muscleSets: Partial<Record<Muscle, number>>
}

export function useWeekStats(
  exerciseMap: Map<string, Exercise> | undefined,
  countSecondary: boolean,
  date: number = Date.now(),
): WeekStats | undefined {
  const { start, end } = weekRange(date)
  return useLiveQuery(async () => {
    if (!exerciseMap) return undefined
    const loaded = await loadWorkoutsBetween(start, end)
    // Empty workouts (no completed sets) never count as sessions.
    const summaries = loaded.map((l) => summarize(l, exerciseMap, countSecondary)).filter((s) => s.counts)
    return {
      summaries,
      volume: summaries.reduce((sum, s) => sum + s.volume, 0),
      muscleSets: combineMuscleSets(summaries),
    }
  }, [exerciseMap, countSecondary, start, end])
}
