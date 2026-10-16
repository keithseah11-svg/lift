import type { Exercise } from '../types'
import type { Equipment, Muscle } from '../../domain/muscles'

const INCREMENT: Record<Equipment, number> = {
  barbell: 2.5,
  dumbbell: 2,
  machine: 5,
  cable: 2.5,
  bodyweight: 2.5,
  other: 2.5,
}

function ex(
  id: string,
  name: string,
  equipment: Equipment,
  primaryMuscle: Muscle,
  secondaryMuscles: Muscle[] = [],
  defaultRestSec = 120,
): Exercise {
  return {
    id,
    name,
    equipment,
    primaryMuscle,
    secondaryMuscles,
    incrementKg: INCREMENT[equipment],
    defaultRestSec,
    custom: false,
  }
}

export const SEED_EXERCISES: Exercise[] = [
  // Chest
  ex('bench-press', 'Bench Press (Barbell)', 'barbell', 'chest', ['triceps', 'front_delts'], 180),
  ex('incline-bench-press', 'Incline Bench Press (Barbell)', 'barbell', 'chest', ['front_delts', 'triceps'], 180),
  ex('db-bench-press', 'Bench Press (Dumbbell)', 'dumbbell', 'chest', ['triceps', 'front_delts'], 150),
  ex('db-incline-press', 'Incline Press (Dumbbell)', 'dumbbell', 'chest', ['front_delts', 'triceps'], 150),
  ex('machine-chest-press', 'Chest Press (Machine)', 'machine', 'chest', ['triceps', 'front_delts']),
  ex('iso-lateral-chest-press', 'Iso-Lateral Chest Press (Machine)', 'machine', 'chest', ['triceps', 'front_delts']),
  ex('cable-fly', 'Cable Fly', 'cable', 'chest', [], 90),
  ex('pec-deck', 'Pec Deck', 'machine', 'chest', [], 90),
  ex('db-fly', 'Fly (Dumbbell)', 'dumbbell', 'chest', [], 90),
  ex('dips', 'Dips', 'bodyweight', 'chest', ['triceps', 'front_delts'], 150),
  ex('push-up', 'Push Up', 'bodyweight', 'chest', ['triceps', 'front_delts'], 90),

  // Back
  ex('deadlift', 'Deadlift (Barbell)', 'barbell', 'lower_back', ['glutes', 'hamstrings', 'upper_back', 'traps', 'forearms'], 240),
  ex('barbell-row', 'Bent Over Row (Barbell)', 'barbell', 'upper_back', ['lats', 'rear_delts', 'biceps'], 150),
  ex('db-row', 'Row (Dumbbell)', 'dumbbell', 'lats', ['upper_back', 'rear_delts', 'biceps']),
  ex('seated-cable-row', 'Seated Cable Row', 'cable', 'upper_back', ['lats', 'rear_delts', 'biceps']),
  ex('chest-supported-row', 'Chest Supported Row (Machine)', 'machine', 'upper_back', ['lats', 'rear_delts', 'biceps']),
  ex('db-chest-supported-row', 'Chest Supported Row (Dumbbell)', 'dumbbell', 'upper_back', ['lats', 'rear_delts', 'biceps']),
  ex('iso-lateral-row', 'Iso-Lateral Row (Machine)', 'machine', 'upper_back', ['lats', 'rear_delts', 'biceps']),
  ex('iso-lateral-pulldown', 'Iso-Lateral Pulldown (Machine)', 'machine', 'lats', ['biceps', 'upper_back']),
  ex('t-bar-row', 'T-Bar Row', 'barbell', 'upper_back', ['lats', 'rear_delts', 'biceps'], 150),
  ex('pull-up', 'Pull Up', 'bodyweight', 'lats', ['biceps', 'upper_back'], 150),
  ex('chin-up', 'Chin Up', 'bodyweight', 'lats', ['biceps', 'upper_back'], 150),
  ex('lat-pulldown', 'Lat Pulldown (Cable)', 'cable', 'lats', ['biceps', 'upper_back']),
  ex('straight-arm-pulldown', 'Straight Arm Pulldown', 'cable', 'lats', [], 90),
  ex('barbell-shrug', 'Shrug (Barbell)', 'barbell', 'traps', [], 90),
  ex('db-shrug', 'Shrug (Dumbbell)', 'dumbbell', 'traps', [], 90),
  ex('back-extension', 'Back Extension', 'bodyweight', 'lower_back', ['glutes', 'hamstrings'], 90),

  // Shoulders
  ex('ohp', 'Overhead Press (Barbell)', 'barbell', 'front_delts', ['side_delts', 'triceps'], 180),
  ex('db-shoulder-press', 'Shoulder Press (Dumbbell)', 'dumbbell', 'front_delts', ['side_delts', 'triceps'], 150),
  ex('machine-shoulder-press', 'Shoulder Press (Machine)', 'machine', 'front_delts', ['side_delts', 'triceps']),
  ex('db-lateral-raise', 'Lateral Raise (Dumbbell)', 'dumbbell', 'side_delts', [], 90),
  ex('cable-lateral-raise', 'Lateral Raise (Cable)', 'cable', 'side_delts', [], 90),
  ex('db-front-raise', 'Front Raise (Dumbbell)', 'dumbbell', 'front_delts', [], 90),
  ex('reverse-fly', 'Reverse Fly (Dumbbell)', 'dumbbell', 'rear_delts', ['upper_back'], 90),
  ex('reverse-pec-deck', 'Reverse Pec Deck', 'machine', 'rear_delts', ['upper_back'], 90),
  ex('face-pull', 'Face Pull', 'cable', 'rear_delts', ['upper_back', 'traps'], 90),
  ex('upright-row', 'Upright Row (Barbell)', 'barbell', 'side_delts', ['traps'], 90),

  // Arms
  ex('barbell-curl', 'Bicep Curl (Barbell)', 'barbell', 'biceps', ['forearms'], 90),
  ex('ez-bar-curl', 'EZ Bar Curl', 'barbell', 'biceps', ['forearms'], 90),
  ex('db-curl', 'Bicep Curl (Dumbbell)', 'dumbbell', 'biceps', ['forearms'], 90),
  ex('hammer-curl', 'Hammer Curl (Dumbbell)', 'dumbbell', 'biceps', ['forearms'], 90),
  ex('incline-db-curl', 'Incline Curl (Dumbbell)', 'dumbbell', 'biceps', [], 90),
  ex('preacher-curl', 'Preacher Curl', 'machine', 'biceps', [], 90),
  ex('cable-curl', 'Bicep Curl (Cable)', 'cable', 'biceps', ['forearms'], 90),
  ex('triceps-pushdown', 'Triceps Pushdown (Cable)', 'cable', 'triceps', [], 90),
  ex('single-arm-triceps-pushdown', 'Single Arm Triceps Pushdown (Cable)', 'cable', 'triceps', [], 90),
  ex('jm-press', 'JM Press (Barbell)', 'barbell', 'triceps', ['chest', 'front_delts'], 120),
  ex('overhead-triceps-ext', 'Overhead Triceps Extension (Cable)', 'cable', 'triceps', [], 90),
  ex('skull-crusher', 'Skull Crusher (EZ Bar)', 'barbell', 'triceps', [], 90),
  ex('close-grip-bench', 'Close Grip Bench Press', 'barbell', 'triceps', ['chest', 'front_delts'], 150),
  ex('db-triceps-ext', 'Overhead Triceps Extension (Dumbbell)', 'dumbbell', 'triceps', [], 90),
  ex('wrist-curl', 'Wrist Curl (Barbell)', 'barbell', 'forearms', [], 60),

  // Legs
  ex('squat', 'Squat (Barbell)', 'barbell', 'quads', ['glutes', 'lower_back'], 240),
  ex('front-squat', 'Front Squat (Barbell)', 'barbell', 'quads', ['glutes'], 180),
  ex('hack-squat', 'Hack Squat (Machine)', 'machine', 'quads', ['glutes'], 180),
  ex('leg-press', 'Leg Press', 'machine', 'quads', ['glutes'], 180),
  ex('bulgarian-split-squat', 'Bulgarian Split Squat (Dumbbell)', 'dumbbell', 'quads', ['glutes'], 120),
  ex('walking-lunge', 'Walking Lunge (Dumbbell)', 'dumbbell', 'quads', ['glutes'], 120),
  ex('goblet-squat', 'Goblet Squat', 'dumbbell', 'quads', ['glutes'], 120),
  ex('leg-extension', 'Leg Extension', 'machine', 'quads', [], 90),
  ex('rdl', 'Romanian Deadlift (Barbell)', 'barbell', 'hamstrings', ['glutes', 'lower_back'], 180),
  ex('db-rdl', 'Romanian Deadlift (Dumbbell)', 'dumbbell', 'hamstrings', ['glutes', 'lower_back'], 150),
  ex('lying-leg-curl', 'Lying Leg Curl', 'machine', 'hamstrings', [], 90),
  ex('seated-leg-curl', 'Seated Leg Curl', 'machine', 'hamstrings', [], 90),
  ex('hip-thrust', 'Hip Thrust (Barbell)', 'barbell', 'glutes', ['hamstrings'], 150),
  ex('glute-bridge', 'Glute Bridge', 'bodyweight', 'glutes', ['hamstrings'], 90),
  ex('hip-abduction', 'Hip Abduction (Machine)', 'machine', 'glutes', [], 90),
  ex('standing-calf-raise', 'Standing Calf Raise', 'machine', 'calves', [], 90),
  ex('seated-calf-raise', 'Seated Calf Raise', 'machine', 'calves', [], 90),

  // Core
  ex('crunch', 'Crunch', 'bodyweight', 'abs', [], 60),
  ex('cable-crunch', 'Cable Crunch', 'cable', 'abs', [], 60),
  ex('hanging-leg-raise', 'Hanging Leg Raise', 'bodyweight', 'abs', [], 60),
  ex('plank', 'Plank', 'bodyweight', 'abs', [], 60),
  ex('ab-wheel', 'Ab Wheel Rollout', 'bodyweight', 'abs', [], 60),
]
