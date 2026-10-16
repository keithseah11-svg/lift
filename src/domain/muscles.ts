export const MUSCLES = [
  'chest',
  'upper_back',
  'lats',
  'traps',
  'lower_back',
  'front_delts',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
] as const

/** The 16 muscles that ship with the app (and are drawn on the body map). */
export type BuiltinMuscle = (typeof MUSCLES)[number]

/** Muscles you add yourself get ids like "custom-adductors-k3x9". */
export type CustomMuscleId = `custom-${string}`

export type Muscle = BuiltinMuscle | CustomMuscleId

export interface CustomMuscle {
  id: CustomMuscleId
  name: string
  createdAt: number
}

export const MUSCLE_LABELS: Record<BuiltinMuscle, string> = {
  chest: 'Chest',
  upper_back: 'Upper back',
  lats: 'Lats',
  traps: 'Traps',
  lower_back: 'Lower back',
  front_delts: 'Front delts',
  side_delts: 'Side delts',
  rear_delts: 'Rear delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
}

export const EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other'] as const
export type Equipment = (typeof EQUIPMENT)[number]

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  other: 'Other',
}

export function isBuiltinMuscle(m: string): m is BuiltinMuscle {
  return (MUSCLES as readonly string[]).includes(m)
}

export function isMuscleId(m: string): m is Muscle {
  return isBuiltinMuscle(m) || /^custom-[a-z0-9-]+$/.test(m)
}

// Custom muscles live in the database; this registry mirrors them so labels
// can be looked up anywhere (it is kept in sync by MusclesProvider).
let customRegistry: CustomMuscle[] = []

export function setCustomMuscles(list: CustomMuscle[]): void {
  customRegistry = [...list].sort((a, b) => a.createdAt - b.createdAt)
}

export function customMuscles(): CustomMuscle[] {
  return customRegistry
}

/** Built-in muscles first, then your own in the order you added them. */
export function allMuscles(): Muscle[] {
  return [...MUSCLES, ...customRegistry.map((c) => c.id)]
}

export function muscleLabel(m: Muscle): string {
  if (isBuiltinMuscle(m)) return MUSCLE_LABELS[m]
  return customRegistry.find((c) => c.id === m)?.name ?? 'Removed muscle'
}
