import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { addExerciseToWorkout, finishWorkout, getActiveWorkout, previousPerformance, startWorkout, updateSet } from './workouts'
import { addRoutineExercise, createRoutine, updateRoutineExercise } from './routines'
import { loadDetails, summarize } from './stats'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

async function exercise(id: string) {
  return (await db.exercises.get(id))!
}

async function logSets(workoutId: string, values: [number, number][]) {
  const sets = (await db.sets.where('workoutId').equals(workoutId).sortBy('order'))
  for (const [i, [weightKg, reps]] of values.entries()) {
    await updateSet(sets[i].id, { weightKg, reps, done: true })
  }
}

describe('workout flow', () => {
  it('seeds the exercise library on first open', async () => {
    expect(await db.exercises.count()).toBeGreaterThan(50)
  })

  it('logs a session, drops unticked sets on finish, and summarises volume and muscles', async () => {
    const id = await startWorkout()
    expect((await getActiveWorkout())?.id).toBe(id)
    await addExerciseToWorkout(id, await exercise('bench-press'))
    await logSets(id, [
      [100, 5],
      [100, 5],
    ]) // third set left unticked

    await finishWorkout(id)
    const w = await db.workouts.get(id)
    expect(w?.status).toBe('done')
    expect(await db.sets.where('workoutId').equals(id).count()).toBe(2)

    const [loaded] = await loadDetails([w!])
    const map = new Map((await db.exercises.toArray()).map((e) => [e.id, e]))
    const summary = summarize(loaded, map)
    expect(summary.volume).toBe(1000)
    expect(summary.musclesHit).toEqual(['chest'])
    expect(summary.muscleSets).toEqual({ chest: 2, triceps: 1, front_delts: 1 })
  })

  it('only allows one active workout at a time', async () => {
    const a = await startWorkout()
    const b = await startWorkout()
    expect(b).toBe(a)
  })

  it('prefills weights from the previous session when starting a routine', async () => {
    const first = await startWorkout()
    await addExerciseToWorkout(first, await exercise('squat'))
    await logSets(first, [
      [120, 5],
      [120, 5],
      [115, 6],
    ])
    await finishWorkout(first)

    const prev = await previousPerformance('squat')
    expect(prev?.sets.map((s) => s.weightKg)).toEqual([120, 120, 115])

    const routineId = await createRoutine('Legs')
    await addRoutineExercise(routineId, await exercise('squat'))
    const [item] = await db.routineExercises.where('routineId').equals(routineId).toArray()
    await updateRoutineExercise(item.id, { sets: 4, repMin: 5, repMax: 8 })

    const second = await startWorkout(routineId)
    const sets = await db.sets.where('workoutId').equals(second).sortBy('order')
    expect(sets.map((s) => s.weightKg)).toEqual([120, 120, 115, 115])
    expect(sets.every((s) => s.reps === null && !s.done)).toBe(true)
    const [we] = await db.workoutExercises.where('workoutId').equals(second).toArray()
    expect([we.repMin, we.repMax]).toEqual([5, 8])
  })
})
