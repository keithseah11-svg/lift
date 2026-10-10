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

export function useWeekStats(exerciseMap: Map<string, Exercise> | undefined, date: number = Date.now()): WeekStats | undefined {
  const { start, end } = weekRange(date)
  return useLiveQuery(async () => {
    if (!exerciseMap) return undefined
    const loaded = await loadWorkoutsBetween(start, end)
    const summaries = loaded.map((l) => summarize(l, exerciseMap))
    return {
      summaries,
      volume: summaries.reduce((sum, s) => sum + s.volume, 0),
      muscleSets: combineMuscleSets(summaries),
    }
  }, [exerciseMap, start, end])
}
