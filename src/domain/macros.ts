import type { MacroTarget } from '../db/types'

export interface Macros {
  proteinG: number
  carbsG: number
  fatG: number
  kcal: number
}

export function kcalFromMacros(proteinG: number, carbsG: number, fatG: number): number {
  return Math.round(proteinG * 4 + carbsG * 4 + fatG * 9)
}

export function sumMacros(entries: Macros[]): Macros {
  return entries.reduce(
    (acc, e) => ({
      proteinG: acc.proteinG + e.proteinG,
      carbsG: acc.carbsG + e.carbsG,
      fatG: acc.fatG + e.fatG,
      kcal: acc.kcal + e.kcal,
    }),
    { proteinG: 0, carbsG: 0, fatG: 0, kcal: 0 },
  )
}

/** Positive = still to eat, negative = over target. */
export function remainingMacros(target: MacroTarget, eaten: Macros): Macros {
  return {
    proteinG: target.proteinG - eaten.proteinG,
    carbsG: target.carbsG - eaten.carbsG,
    fatG: target.fatG - eaten.fatG,
    kcal: target.kcal - eaten.kcal,
  }
}
