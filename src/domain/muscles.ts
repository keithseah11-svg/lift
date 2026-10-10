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

export type Muscle = (typeof MUSCLES)[number]

export const MUSCLE_LABELS: Record<Muscle, string> = {
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
