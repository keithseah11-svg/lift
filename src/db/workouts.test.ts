import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { addExerciseToWorkout, finishWorkout, getActiveWorkout, moveWorkoutExercise, previousPerformance, startWorkout, updateSet } from './workouts'
import { routineGroups } from './supersets'
import { setMeasurement } from './measurements'
import { supersetLayout } from '../domain/supersets'
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

describe('progression in routines', () => {
  it('pre-fills the heavier weight once the top of the rep range was hit', async () => {
    const routineId = await createRoutine('Pull')
    await addRoutineExercise(routineId, await exercise('barbell-row'))
    const [item] = await db.routineExercises.where('routineId').equals(routineId).toArray()
    await updateRoutineExercise(item.id, { sets: 3, repMin: 8, repMax: 12, targetRir: 2 })

    const first = await startWorkout(routineId)
    const sets = await db.sets.where('workoutId').equals(first).sortBy('order')
    for (const set of sets) await updateSet(set.id, { weightKg: 60, reps: 12, rir: 2, done: true })
    await finishWorkout(first)

    const second = await startWorkout(routineId)
    const next = await db.sets.where('workoutId').equals(second).sortBy('order')
    expect(next.map((s) => s.weightKg)).toEqual([62.5, 62.5, 62.5])
  })
})

describe('supersets', () => {
  it('carries routine supersets into the workout and cleans up after moves and removals', async () => {
    const routineId = await createRoutine('Arms')
    for (const id of ['barbell-curl', 'triceps-pushdown', 'db-lateral-raise']) await addRoutineExercise(routineId, await exercise(id))
    const items = await db.routineExercises.where('routineId').equals(routineId).sortBy('order')
    await routineGroups.link(items[0].id)
    const linked = await db.routineExercises.where('routineId').equals(routineId).sortBy('order')
    expect(linked[0].supersetGroup).not.toBeNull()
    expect(linked[1].supersetGroup).toBe(linked[0].supersetGroup)
    expect(linked[2].supersetGroup).toBeNull()

    const workoutId = await startWorkout(routineId)
    const wes = await db.workoutExercises.where('workoutId').equals(workoutId).sortBy('order')
    expect(supersetLayout(wes).get(wes[0].id)).toMatchObject({ label: 'A', position: 'first' })
    expect(supersetLayout(wes).get(wes[1].id)?.position).toBe('last')

    // Moving the curl below the lateral raise splits the pair: both lose the group.
    await moveWorkoutExercise(wes[0].id, 1)
    await moveWorkoutExercise(wes[0].id, 1)
    const moved = await db.workoutExercises.where('workoutId').equals(workoutId).toArray()
    expect(moved.every((we) => we.supersetGroup === null)).toBe(true)

    // Removing one exercise of a pair dissolves the superset.
    await routineGroups.unlink(linked[0].id)
    expect((await db.routineExercises.where('routineId').equals(routineId).toArray()).every((r) => r.supersetGroup === null)).toBe(true)
  })
})

describe('measurements', () => {
  it('keeps one reading per body part per day', async () => {
    await setMeasurement('2026-10-01', 'waist', 85)
    await setMeasurement('2026-10-01', 'waist', 84.5)
    await setMeasurement('2026-10-01', 'chest', 102)
    const rows = await db.measurements.toArray()
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.site === 'waist')?.value).toBe(84.5)
  })
})
