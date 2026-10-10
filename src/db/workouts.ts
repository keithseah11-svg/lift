import { db } from './schema'
import { newId } from '../lib/id'
import type { Exercise, SetType, Workout, WorkoutExercise, WorkoutSet } from './types'

export interface PreviousPerformance {
  workout: Workout
  sets: WorkoutSet[]
}

/** The most recent finished session that included this exercise, before `before`. */
export async function previousPerformance(
  exerciseId: string,
  before: number = Date.now(),
): Promise<PreviousPerformance | null> {
  const wes = await db.workoutExercises.where('exerciseId').equals(exerciseId).toArray()
  if (wes.length === 0) return null
  const workouts = await db.workouts.bulkGet([...new Set(wes.map((we) => we.workoutId))])
  const candidates = workouts
    .filter((w): w is Workout => !!w && w.status === 'done' && w.startedAt < before)
    .sort((a, b) => b.startedAt - a.startedAt)
  for (const workout of candidates) {
    const weIds = wes.filter((we) => we.workoutId === workout.id).map((we) => we.id)
    const sets = (await db.sets.where('workoutExerciseId').anyOf(weIds).toArray())
      .filter((s) => s.done)
      .sort((a, b) => a.order - b.order)
    if (sets.length > 0) return { workout, sets }
  }
  return null
}

export async function getActiveWorkout(): Promise<Workout | undefined> {
  return db.workouts.where('status').equals('active').first()
}

async function buildSets(
  workoutId: string,
  workoutExerciseId: string,
  count: number,
  exerciseId: string,
): Promise<WorkoutSet[]> {
  const prev = await previousPerformance(exerciseId)
  const prevWorking = prev?.sets.filter((s) => s.type !== 'warmup') ?? []
  return Array.from({ length: count }, (_, i) => {
    const ref = prevWorking[i] ?? prevWorking[prevWorking.length - 1]
    return {
      id: newId(),
      workoutId,
      workoutExerciseId,
      order: i,
      type: 'working' as SetType,
      weightKg: ref?.weightKg ?? null,
      reps: null,
      rir: null,
      done: false,
    }
  })
}

export async function startWorkout(routineId: string | null = null): Promise<string> {
  const existing = await getActiveWorkout()
  if (existing) return existing.id

  const routine = routineId ? await db.routines.get(routineId) : undefined
  const workoutId = newId()
  const workout: Workout = {
    id: workoutId,
    name: routine?.name ?? 'Workout',
    routineId: routine?.id ?? null,
    status: 'active',
    startedAt: Date.now(),
    endedAt: null,
    notes: '',
  }

  const workoutExercises: WorkoutExercise[] = []
  const sets: WorkoutSet[] = []
  if (routine) {
    const items = (await db.routineExercises.where('routineId').equals(routine.id).toArray()).sort(
      (a, b) => a.order - b.order,
    )
    for (const item of items) {
      const weId = newId()
      workoutExercises.push({
        id: weId,
        workoutId,
        exerciseId: item.exerciseId,
        order: item.order,
        restSec: item.restSec,
        repMin: item.repMin,
        repMax: item.repMax,
        targetRir: item.targetRir,
        supersetGroup: item.supersetGroup,
        notes: '',
      })
      sets.push(...(await buildSets(workoutId, weId, item.sets, item.exerciseId)))
    }
  }

  await db.transaction('rw', db.workouts, db.workoutExercises, db.sets, async () => {
    await db.workouts.add(workout)
    await db.workoutExercises.bulkAdd(workoutExercises)
    await db.sets.bulkAdd(sets)
  })
  return workoutId
}

export async function addExerciseToWorkout(workoutId: string, exercise: Exercise): Promise<void> {
  const existing = await db.workoutExercises.where('workoutId').equals(workoutId).toArray()
  const order = existing.reduce((max, we) => Math.max(max, we.order + 1), 0)
  const weId = newId()
  const sets = await buildSets(workoutId, weId, 3, exercise.id)
  await db.transaction('rw', db.workoutExercises, db.sets, async () => {
    await db.workoutExercises.add({
      id: weId,
      workoutId,
      exerciseId: exercise.id,
      order,
      restSec: exercise.defaultRestSec,
      repMin: null,
      repMax: null,
      targetRir: null,
      supersetGroup: null,
      notes: '',
    })
    await db.sets.bulkAdd(sets)
  })
}

export async function addSet(workoutExerciseId: string): Promise<void> {
  const we = await db.workoutExercises.get(workoutExerciseId)
  if (!we) return
  const sets = (await db.sets.where('workoutExerciseId').equals(workoutExerciseId).toArray()).sort(
    (a, b) => a.order - b.order,
  )
  const last = sets[sets.length - 1]
  await db.sets.add({
    id: newId(),
    workoutId: we.workoutId,
    workoutExerciseId,
    order: last ? last.order + 1 : 0,
    type: last?.type === 'warmup' ? 'working' : (last?.type ?? 'working'),
    weightKg: last?.weightKg ?? null,
    reps: null,
    rir: null,
    done: false,
  })
}

export async function updateSet(id: string, patch: Partial<WorkoutSet>): Promise<void> {
  await db.sets.update(id, patch)
}

export async function deleteSet(id: string): Promise<void> {
  await db.sets.delete(id)
}

export async function updateWorkoutExercise(id: string, patch: Partial<WorkoutExercise>): Promise<void> {
  await db.workoutExercises.update(id, patch)
}

export async function removeWorkoutExercise(id: string): Promise<void> {
  await db.transaction('rw', db.workoutExercises, db.sets, async () => {
    await db.sets.where('workoutExerciseId').equals(id).delete()
    await db.workoutExercises.delete(id)
  })
}

/** Swap an exercise with its neighbour (direction -1 = up, 1 = down). */
export async function moveWorkoutExercise(id: string, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.workoutExercises, async () => {
    const we = await db.workoutExercises.get(id)
    if (!we) return
    const siblings = (await db.workoutExercises.where('workoutId').equals(we.workoutId).toArray()).sort(
      (a, b) => a.order - b.order,
    )
    const idx = siblings.findIndex((s) => s.id === id)
    const other = siblings[idx + direction]
    if (!other) return
    await db.workoutExercises.update(we.id, { order: other.order })
    await db.workoutExercises.update(other.id, { order: we.order })
  })
}

export async function updateWorkout(id: string, patch: Partial<Workout>): Promise<void> {
  await db.workouts.update(id, patch)
}

/** Drops unticked sets and empty exercises, then marks the workout finished. */
export async function finishWorkout(id: string): Promise<void> {
  await db.transaction('rw', db.workouts, db.workoutExercises, db.sets, async () => {
    await db.sets
      .where('workoutId')
      .equals(id)
      .filter((s) => !s.done)
      .delete()
    const remaining = await db.sets.where('workoutId').equals(id).toArray()
    const withSets = new Set(remaining.map((s) => s.workoutExerciseId))
    await db.workoutExercises
      .where('workoutId')
      .equals(id)
      .filter((we) => !withSets.has(we.id))
      .delete()
    const workout = await db.workouts.get(id)
    await db.workouts.update(id, {
      status: 'done',
      endedAt: workout?.endedAt ?? Date.now(),
    })
  })
}

export async function deleteWorkout(id: string): Promise<void> {
  await db.transaction('rw', db.workouts, db.workoutExercises, db.sets, async () => {
    await db.sets.where('workoutId').equals(id).delete()
    await db.workoutExercises.where('workoutId').equals(id).delete()
    await db.workouts.delete(id)
  })
}

/** Creates a routine from a logged workout's exercises and set counts. */
export async function saveWorkoutAsRoutine(workoutId: string, name: string): Promise<string> {
  const wes = (await db.workoutExercises.where('workoutId').equals(workoutId).toArray()).sort(
    (a, b) => a.order - b.order,
  )
  const sets = await db.sets.where('workoutId').equals(workoutId).toArray()
  const routineId = newId()
  await db.transaction('rw', db.routines, db.routineExercises, async () => {
    await db.routines.add({ id: routineId, name, notes: '', createdAt: Date.now() })
    await db.routineExercises.bulkAdd(
      wes.map((we, i) => {
        const weSets = sets.filter((s) => s.workoutExerciseId === we.id && s.type !== 'warmup')
        return {
          id: newId(),
          routineId,
          exerciseId: we.exerciseId,
          order: i,
          sets: Math.max(1, weSets.length),
          repMin: we.repMin ?? 8,
          repMax: we.repMax ?? 12,
          targetRir: we.targetRir ?? 2,
          restSec: we.restSec,
          supersetGroup: we.supersetGroup,
        }
      }),
    )
  })
  return routineId
}
