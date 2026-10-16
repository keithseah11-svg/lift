import type { CustomMuscleId, Muscle } from './muscles'
import { normalize } from './search'

export interface LinkableExercise {
  id: string
  primaryMuscle: Muscle
  secondaryMuscles: Muscle[]
  countedSecondary?: Muscle[] | null
}

export type MuscleRole = 'main' | 'secondary'

/** Every exercise that works `muscle`, and whether it's the main or a secondary muscle. */
export function exercisesForMuscle<T extends LinkableExercise>(exercises: T[], muscle: Muscle): { exercise: T; role: MuscleRole }[] {
  return exercises.flatMap((exercise): { exercise: T; role: MuscleRole }[] =>
    exercise.primaryMuscle === muscle
      ? [{ exercise, role: 'main' }]
      : exercise.secondaryMuscles.includes(muscle)
        ? [{ exercise, role: 'secondary' }]
        : [],
  )
}

export type ExercisePatch = Pick<LinkableExercise, 'primaryMuscle' | 'secondaryMuscles' | 'countedSecondary'>

/**
 * Link a muscle to an exercise.
 * - secondary: counts ½ set (and is switched on if the exercise has its own secondary choices)
 * - main: counts 1 set; the exercise's previous main muscle becomes a secondary one
 */
export function linkPatch(exercise: LinkableExercise, muscle: Muscle, role: MuscleRole): ExercisePatch {
  if (role === 'main') {
    if (exercise.primaryMuscle === muscle) return pick(exercise)
    const secondary = [exercise.primaryMuscle, ...exercise.secondaryMuscles.filter((m) => m !== muscle)]
    const counted = exercise.countedSecondary
    return {
      primaryMuscle: muscle,
      secondaryMuscles: secondary,
      // Keep explicit choices explicit: the demoted main muscle keeps counting.
      countedSecondary: counted == null ? counted : [exercise.primaryMuscle, ...counted.filter((m) => m !== muscle)],
    }
  }
  if (exercise.primaryMuscle === muscle || exercise.secondaryMuscles.includes(muscle)) {
    const counted = exercise.countedSecondary
    return {
      ...pick(exercise),
      countedSecondary: counted == null || counted.includes(muscle) || exercise.primaryMuscle === muscle ? counted : [...counted, muscle],
    }
  }
  const counted = exercise.countedSecondary
  return {
    primaryMuscle: exercise.primaryMuscle,
    secondaryMuscles: [...exercise.secondaryMuscles, muscle],
    countedSecondary: counted == null ? counted : [...counted, muscle],
  }
}

/** Remove a secondary muscle from an exercise. Null if it's the main muscle (an exercise always needs one). */
export function unlinkPatch(exercise: LinkableExercise, muscle: Muscle): ExercisePatch | null {
  if (exercise.primaryMuscle === muscle) return null
  return {
    primaryMuscle: exercise.primaryMuscle,
    secondaryMuscles: exercise.secondaryMuscles.filter((m) => m !== muscle),
    countedSecondary: exercise.countedSecondary?.filter((m) => m !== muscle) ?? exercise.countedSecondary,
  }
}

function pick(e: LinkableExercise): ExercisePatch {
  return { primaryMuscle: e.primaryMuscle, secondaryMuscles: e.secondaryMuscles, countedSecondary: e.countedSecondary }
}

/** Exact (case/punctuation-insensitive) match against existing muscle names. */
export function findMuscleByName(name: string, muscles: Muscle[], label: (m: Muscle) => string): Muscle | null {
  const n = normalize(name)
  if (!n) return null
  return muscles.find((m) => normalize(label(m)) === n) ?? null
}

/** e.g. "Hip Adductors" → "custom-hip-adductors-x7k2". */
export function newCustomMuscleId(name: string, random: () => number = Math.random): CustomMuscleId {
  const slug = normalize(name).replace(/ /g, '-').slice(0, 30) || 'muscle'
  const suffix = Math.floor(random() * 36 ** 4)
    .toString(36)
    .padStart(4, '0')
  return `custom-${slug}-${suffix}`
}
