import { longestWeekStreak } from '../streak'

export interface Achievement {
  id: string
  name: string
  description: string
  /** Progress toward the goal (0 → target). */
  progress: (s: AchievementStats) => number
  target: number
  unit: string
}

export interface AchievementStats {
  workoutCount: number
  /** Start times of counted workouts, for streaks. */
  workoutTimes: number[]
  weeklyTarget: number
  lifetimeVolume: number
  biggestSession: number
  /** Heaviest completed working set per exercise id. */
  heaviest: Map<string, number>
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-workout', name: 'First Rep', description: 'Finish your first workout', progress: (s) => s.workoutCount, target: 1, unit: 'workout' },
  { id: 'workouts-10', name: 'Gym Regular', description: 'Finish 10 workouts', progress: (s) => s.workoutCount, target: 10, unit: 'workouts' },
  { id: 'workouts-50', name: 'Dedicated', description: 'Finish 50 workouts', progress: (s) => s.workoutCount, target: 50, unit: 'workouts' },
  { id: 'workouts-100', name: 'Centurion', description: 'Finish 100 workouts', progress: (s) => s.workoutCount, target: 100, unit: 'workouts' },
  {
    id: 'streak-4',
    name: 'Consistent',
    description: 'Hit your weekly session target 4 weeks in a row',
    progress: (s) => longestWeekStreak(s.workoutTimes, s.weeklyTarget),
    target: 4,
    unit: 'weeks',
  },
  {
    id: 'streak-10',
    name: 'Iron Will',
    description: 'Hit your weekly session target 10 weeks in a row',
    progress: (s) => longestWeekStreak(s.workoutTimes, s.weeklyTarget),
    target: 10,
    unit: 'weeks',
  },
  { id: 'bench-100', name: 'Bench Club', description: 'Bench press 100 kg (barbell)', progress: (s) => s.heaviest.get('bench-press') ?? 0, target: 100, unit: 'kg' },
  { id: 'squat-140', name: 'Squat Club', description: 'Squat 140 kg (barbell)', progress: (s) => s.heaviest.get('squat') ?? 0, target: 140, unit: 'kg' },
  { id: 'deadlift-180', name: 'Deadlift Club', description: 'Deadlift 180 kg (barbell)', progress: (s) => s.heaviest.get('deadlift') ?? 0, target: 180, unit: 'kg' },
  { id: 'session-20000', name: 'Volume Beast', description: 'Lift 20,000 kg in one workout', progress: (s) => s.biggestSession, target: 20000, unit: 'kg' },
  { id: 'volume-1000000', name: 'Million Kilo Club', description: 'Lift 1,000,000 kg in total', progress: (s) => s.lifetimeVolume, target: 1_000_000, unit: 'kg' },
]

export function unlockedAchievements(stats: AchievementStats): Set<string> {
  return new Set(ACHIEVEMENTS.filter((a) => a.progress(stats) >= a.target).map((a) => a.id))
}
