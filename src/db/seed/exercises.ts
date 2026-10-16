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
  // ---- Library expansion: 100 more commonly logged exercises ----

  // Chest
  ex('decline-bench-press', 'Decline Bench Press (Barbell)', 'barbell', 'chest', ['triceps', 'front_delts'], 180),
  ex('db-decline-press', 'Decline Press (Dumbbell)', 'dumbbell', 'chest', ['triceps', 'front_delts'], 150),
  ex('smith-bench-press', 'Bench Press (Smith Machine)', 'machine', 'chest', ['triceps', 'front_delts'], 150),
  ex('smith-incline-press', 'Incline Bench Press (Smith Machine)', 'machine', 'chest', ['front_delts', 'triceps'], 150),
  ex('incline-machine-press', 'Incline Chest Press (Machine)', 'machine', 'chest', ['front_delts', 'triceps']),
  ex('db-incline-fly', 'Incline Fly (Dumbbell)', 'dumbbell', 'chest', ['front_delts'], 90),
  ex('low-to-high-cable-fly', 'Low to High Cable Fly', 'cable', 'chest', ['front_delts'], 90),
  ex('high-to-low-cable-fly', 'High to Low Cable Fly', 'cable', 'chest', [], 90),
  ex('db-pullover', 'Pullover (Dumbbell)', 'dumbbell', 'chest', ['lats', 'triceps'], 90),
  ex('assisted-dip', 'Assisted Dip (Machine)', 'machine', 'chest', ['triceps', 'front_delts']),
  ex('incline-push-up', 'Incline Push Up', 'bodyweight', 'chest', ['triceps', 'front_delts'], 60),
  ex('db-floor-press', 'Floor Press (Dumbbell)', 'dumbbell', 'chest', ['triceps']),

  // Back
  ex('pendlay-row', 'Pendlay Row (Barbell)', 'barbell', 'upper_back', ['lats', 'rear_delts', 'biceps', 'lower_back'], 150),
  ex('seal-row', 'Seal Row (Barbell)', 'barbell', 'upper_back', ['lats', 'rear_delts', 'biceps']),
  ex('machine-row', 'Seated Row (Machine)', 'machine', 'upper_back', ['lats', 'rear_delts', 'biceps']),
  ex('single-arm-cable-row', 'Single Arm Cable Row', 'cable', 'lats', ['upper_back', 'biceps'], 90),
  ex('close-grip-pulldown', 'Close Grip Lat Pulldown', 'cable', 'lats', ['biceps', 'upper_back']),
  ex('reverse-grip-pulldown', 'Reverse Grip Lat Pulldown', 'cable', 'lats', ['biceps', 'upper_back']),
  ex('single-arm-pulldown', 'Single Arm Lat Pulldown (Cable)', 'cable', 'lats', ['biceps'], 90),
  ex('machine-pulldown', 'Lat Pulldown (Machine)', 'machine', 'lats', ['biceps', 'upper_back']),
  ex('assisted-pull-up', 'Assisted Pull Up (Machine)', 'machine', 'lats', ['biceps', 'upper_back']),
  ex('inverted-row', 'Inverted Row', 'bodyweight', 'upper_back', ['lats', 'biceps', 'rear_delts'], 90),
  ex('rack-pull', 'Rack Pull (Barbell)', 'barbell', 'lower_back', ['traps', 'glutes', 'hamstrings', 'upper_back'], 180),
  ex('sumo-deadlift', 'Sumo Deadlift (Barbell)', 'barbell', 'glutes', ['quads', 'hamstrings', 'lower_back', 'traps'], 240),
  ex('trap-bar-deadlift', 'Trap Bar Deadlift', 'other', 'quads', ['glutes', 'hamstrings', 'lower_back', 'traps'], 240),
  ex('good-morning', 'Good Morning (Barbell)', 'barbell', 'hamstrings', ['lower_back', 'glutes'], 150),
  ex('machine-shrug', 'Shrug (Machine)', 'machine', 'traps', [], 90),
  // Kelso shrug: chest on an incline bench, squeeze the shoulder blades together (mid traps/rhomboids).
  ex('kelso-shrug', 'Kelso Shrug (Dumbbell)', 'dumbbell', 'upper_back', ['traps', 'rear_delts'], 90),
  ex('kelso-shrug-barbell', 'Kelso Shrug (Barbell)', 'barbell', 'upper_back', ['traps', 'rear_delts'], 90),

  // Shoulders
  ex('arnold-press', 'Arnold Press (Dumbbell)', 'dumbbell', 'front_delts', ['side_delts', 'triceps']),
  ex('seated-ohp', 'Seated Overhead Press (Barbell)', 'barbell', 'front_delts', ['side_delts', 'triceps'], 150),
  ex('push-press', 'Push Press (Barbell)', 'barbell', 'front_delts', ['side_delts', 'triceps', 'quads'], 180),
  ex('smith-shoulder-press', 'Shoulder Press (Smith Machine)', 'machine', 'front_delts', ['side_delts', 'triceps']),
  ex('landmine-press', 'Landmine Press', 'barbell', 'front_delts', ['chest', 'triceps']),
  ex('pike-push-up', 'Pike Push Up', 'bodyweight', 'front_delts', ['triceps', 'side_delts'], 90),
  ex('machine-lateral-raise', 'Lateral Raise (Machine)', 'machine', 'side_delts', [], 90),
  ex('seated-db-lateral-raise', 'Seated Lateral Raise (Dumbbell)', 'dumbbell', 'side_delts', [], 90),
  ex('cable-upright-row', 'Upright Row (Cable)', 'cable', 'side_delts', ['traps'], 90),
  ex('cable-front-raise', 'Front Raise (Cable)', 'cable', 'front_delts', [], 60),
  ex('cable-rear-delt-fly', 'Rear Delt Fly (Cable)', 'cable', 'rear_delts', ['upper_back'], 90),
  ex('db-rear-delt-row', 'Rear Delt Row (Dumbbell)', 'dumbbell', 'rear_delts', ['upper_back', 'biceps'], 90),

  // Biceps
  ex('concentration-curl', 'Concentration Curl (Dumbbell)', 'dumbbell', 'biceps', [], 60),
  ex('spider-curl', 'Spider Curl (Dumbbell)', 'dumbbell', 'biceps', [], 60),
  ex('db-preacher-curl', 'Preacher Curl (Dumbbell)', 'dumbbell', 'biceps', [], 60),
  ex('ez-preacher-curl', 'Preacher Curl (EZ Bar)', 'barbell', 'biceps', [], 90),
  ex('machine-curl', 'Bicep Curl (Machine)', 'machine', 'biceps', [], 60),
  ex('bayesian-curl', 'Bayesian Curl (Cable)', 'cable', 'biceps', [], 60),
  ex('cable-hammer-curl', 'Hammer Curl (Cable)', 'cable', 'biceps', ['forearms'], 60),
  ex('drag-curl', 'Drag Curl (Barbell)', 'barbell', 'biceps', [], 60),
  ex('zottman-curl', 'Zottman Curl (Dumbbell)', 'dumbbell', 'biceps', ['forearms'], 60),
  ex('reverse-curl', 'Reverse Curl (EZ Bar)', 'barbell', 'forearms', ['biceps'], 60),

  // Triceps
  ex('rope-pushdown', 'Triceps Rope Pushdown', 'cable', 'triceps', [], 60),
  ex('db-kickback', 'Triceps Kickback (Dumbbell)', 'dumbbell', 'triceps', [], 60),
  ex('cable-kickback', 'Triceps Kickback (Cable)', 'cable', 'triceps', [], 60),
  ex('db-skull-crusher', 'Skull Crusher (Dumbbell)', 'dumbbell', 'triceps', [], 90),
  ex('machine-triceps-dip', 'Triceps Dip (Machine)', 'machine', 'triceps', ['chest'], 90),
  ex('machine-triceps-extension', 'Triceps Extension (Machine)', 'machine', 'triceps', [], 60),
  ex('bench-dip', 'Bench Dip', 'bodyweight', 'triceps', ['front_delts'], 60),
  ex('diamond-push-up', 'Diamond Push Up', 'bodyweight', 'triceps', ['chest'], 60),

  // Forearms & grip
  ex('reverse-wrist-curl', 'Reverse Wrist Curl (Dumbbell)', 'dumbbell', 'forearms', [], 60),
  ex('farmers-walk', "Farmer's Walk (Dumbbell)", 'dumbbell', 'forearms', ['traps', 'abs'], 90),
  ex('dead-hang', 'Dead Hang', 'bodyweight', 'forearms', ['lats'], 60),

  // Quads
  ex('smith-squat', 'Squat (Smith Machine)', 'machine', 'quads', ['glutes'], 150),
  ex('pendulum-squat', 'Pendulum Squat (Machine)', 'machine', 'quads', ['glutes'], 150),
  ex('belt-squat', 'Belt Squat (Machine)', 'machine', 'quads', ['glutes'], 150),
  ex('box-squat', 'Box Squat (Barbell)', 'barbell', 'quads', ['glutes', 'hamstrings'], 180),
  ex('pause-squat', 'Pause Squat (Barbell)', 'barbell', 'quads', ['glutes', 'lower_back'], 180),
  ex('db-split-squat', 'Split Squat (Dumbbell)', 'dumbbell', 'quads', ['glutes']),
  ex('db-reverse-lunge', 'Reverse Lunge (Dumbbell)', 'dumbbell', 'quads', ['glutes']),
  ex('barbell-lunge', 'Lunge (Barbell)', 'barbell', 'quads', ['glutes']),
  ex('db-step-up', 'Step Up (Dumbbell)', 'dumbbell', 'quads', ['glutes'], 90),
  ex('sissy-squat', 'Sissy Squat', 'bodyweight', 'quads', [], 90),
  ex('bodyweight-squat', 'Bodyweight Squat', 'bodyweight', 'quads', ['glutes'], 60),

  // Hamstrings & hinges
  ex('stiff-leg-deadlift', 'Stiff Leg Deadlift (Barbell)', 'barbell', 'hamstrings', ['glutes', 'lower_back'], 150),
  ex('db-stiff-leg-deadlift', 'Stiff Leg Deadlift (Dumbbell)', 'dumbbell', 'hamstrings', ['glutes', 'lower_back']),
  ex('single-leg-rdl', 'Single Leg Romanian Deadlift (Dumbbell)', 'dumbbell', 'hamstrings', ['glutes'], 90),
  ex('smith-rdl', 'Romanian Deadlift (Smith Machine)', 'machine', 'hamstrings', ['glutes', 'lower_back']),
  ex('standing-leg-curl', 'Standing Leg Curl (Machine)', 'machine', 'hamstrings', [], 90),
  ex('nordic-curl', 'Nordic Hamstring Curl', 'bodyweight', 'hamstrings', []),
  ex('glute-ham-raise', 'Glute Ham Raise', 'bodyweight', 'hamstrings', ['glutes']),
  ex('kettlebell-swing', 'Kettlebell Swing', 'other', 'glutes', ['hamstrings', 'lower_back'], 90),

  // Glutes
  ex('machine-hip-thrust', 'Hip Thrust (Machine)', 'machine', 'glutes', ['hamstrings']),
  ex('smith-hip-thrust', 'Hip Thrust (Smith Machine)', 'machine', 'glutes', ['hamstrings']),
  ex('single-leg-hip-thrust', 'Single Leg Hip Thrust', 'bodyweight', 'glutes', ['hamstrings'], 60),
  ex('cable-glute-kickback', 'Glute Kickback (Cable)', 'cable', 'glutes', [], 60),
  ex('machine-glute-kickback', 'Glute Kickback (Machine)', 'machine', 'glutes', [], 60),
  ex('cable-pull-through', 'Cable Pull Through', 'cable', 'glutes', ['hamstrings'], 90),
  ex('curtsy-lunge', 'Curtsy Lunge (Dumbbell)', 'dumbbell', 'glutes', ['quads'], 90),

  // Calves
  ex('leg-press-calf-raise', 'Calf Press (Leg Press)', 'machine', 'calves', [], 60),
  ex('smith-calf-raise', 'Standing Calf Raise (Smith Machine)', 'machine', 'calves', [], 60),
  ex('single-leg-calf-raise', 'Single Leg Calf Raise (Dumbbell)', 'dumbbell', 'calves', [], 60),
  ex('donkey-calf-raise', 'Donkey Calf Raise (Machine)', 'machine', 'calves', [], 60),

  // Core
  ex('russian-twist', 'Russian Twist', 'bodyweight', 'abs', [], 60),
  ex('bicycle-crunch', 'Bicycle Crunch', 'bodyweight', 'abs', [], 60),
  ex('lying-leg-raise', 'Lying Leg Raise', 'bodyweight', 'abs', [], 60),
  ex('captains-chair-knee-raise', "Knee Raise (Captain's Chair)", 'bodyweight', 'abs', [], 60),
  ex('side-plank', 'Side Plank', 'bodyweight', 'abs', [], 60),
  ex('pallof-press', 'Pallof Press (Cable)', 'cable', 'abs', [], 60),
  ex('cable-woodchopper', 'Woodchopper (Cable)', 'cable', 'abs', [], 60),
  ex('machine-crunch', 'Crunch (Machine)', 'machine', 'abs', [], 60),
  ex('sit-up', 'Sit Up', 'bodyweight', 'abs', [], 60),
  ex('dead-bug', 'Dead Bug', 'bodyweight', 'abs', [], 60),
  ex('toes-to-bar', 'Toes to Bar', 'bodyweight', 'abs', ['lats', 'forearms'], 90),
]
