import { db } from './schema'
import { newId } from '../lib/id'
import type { MealPreset } from './types'
import type { Macros } from '../domain/macros'

export async function addMacroEntry(date: string, label: string, macros: Macros): Promise<void> {
  await db.macroEntries.add({ id: newId(), date, label, ...macros, createdAt: Date.now() })
}

export async function deleteMacroEntry(id: string): Promise<void> {
  await db.macroEntries.delete(id)
}

export async function addMealPreset(label: string, macros: Macros): Promise<void> {
  await db.mealPresets.add({ id: newId(), label, ...macros })
}

export async function deleteMealPreset(id: string): Promise<void> {
  await db.mealPresets.delete(id)
}

export async function logPreset(date: string, preset: MealPreset): Promise<void> {
  const { label, proteinG, carbsG, fatG, kcal } = preset
  await addMacroEntry(date, label, { proteinG, carbsG, fatG, kcal })
}
