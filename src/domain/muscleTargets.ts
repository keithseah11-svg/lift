import { allMuscles, type Muscle } from './muscles'

export interface SetRange {
  min: number
  max: number
}

/** A muscle's own weekly target, or 'off' to stop tracking it. */
export type MuscleTarget = SetRange | 'off'

export type MuscleTargetOverrides = Partial<Record<Muscle, MuscleTarget>>

/** Effective weekly range per muscle; null (or missing) = not tracked. */
export type ResolvedTargets = Partial<Record<Muscle, SetRange | null>>

export function resolveMuscleTargets(
  defaults: SetRange,
  overrides: MuscleTargetOverrides = {},
  muscles: Muscle[] = allMuscles(),
): ResolvedTargets {
  const result: ResolvedTargets = {}
  for (const m of muscles) {
    const o = overrides[m]
    result[m] = o === 'off' ? null : (o ?? defaults)
  }
  return result
}

export type TargetStatus = 'off' | 'none' | 'under' | 'in' | 'over'

export function targetStatus(sets: number, target: SetRange | null | undefined): TargetStatus {
  if (!target) return 'off'
  if (sets <= 0) return target.min > 0 ? 'none' : 'in'
  if (sets < target.min) return 'under'
  return sets > target.max ? 'over' : 'in'
}
