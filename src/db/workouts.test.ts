import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { addExerciseToWorkout, addSet, deleteWorkout, finishWorkout, getActiveWorkout, moveWorkoutExercise, previousPerformance, startWorkout, updateSet } from './workouts'
import { routineGroups } from './supersets'
import { setMeasurement } from './measurements'
import { supersetLayout } from '../domain/supersets'
import { addRoutineExercise, createRoutine, updateRoutineExercise } from './routines'
import { loadDetails, sessionTimes, summarize } from './stats'

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

describe('empty workouts', () => {
  it('discards a workout finished with no completed sets', async () => {
    const id = await startWorkout()
    await addExerciseToWorkout(id, await exercise('bench-press'))
    expect(await finishWorkout(id)).toBe(false)
    expect(await db.workouts.get(id)).toBeUndefined()
    expect(await db.workoutExercises.where('workoutId').equals(id).count()).toBe(0)
  })

  it('does not count old empty workouts as sessions', async () => {
    await db.workouts.add({ id: 'empty', name: 'Oops', routineId: null, status: 'done', startedAt: Date.now(), endedAt: Date.now(), notes: '' })
    const real = await startWorkout()
    await addExerciseToWorkout(real, await exercise('bench-press'))
    const [set] = await db.sets.where('workoutId').equals(real).sortBy('order')
    await updateSet(set.id, { weightKg: 60, reps: 5, done: true })
    await finishWorkout(real)
    const times = await sessionTimes()
    expect(times).toHaveLength(1)
  })

  it('a deleted workout disappears from sessions', async () => {
    const id = await startWorkout()
    await addExerciseToWorkout(id, await exercise('bench-press'))
    const [set] = await db.sets.where('workoutId').equals(id).sortBy('order')
    await updateSet(set.id, { weightKg: 60, reps: 5, done: true })
    await finishWorkout(id)
    expect(await sessionTimes()).toHaveLength(1)
    await deleteWorkout(id)
    expect(await sessionTimes()).toHaveLength(0)
  })
})

describe('custom muscle groups', () => {
  it('creates a muscle once, links exercises, counts its sets, and deletes cleanly', async () => {
    const { createMuscle, linkExerciseToMuscle, unlinkExerciseFromMuscle, deleteMuscle } = await import('./muscles')
    const first = await createMuscle('Adductors')
    expect(first.created).toBe(true)
    expect((await createMuscle(' adductors ')).id).toBe(first.id) // same name → same muscle
    expect((await createMuscle('Front Delts')).id).toBe('front_delts') // built-in → existing
    const adductors = first.id

    await linkExerciseToMuscle('squat', adductors, 'secondary')
    await linkExerciseToMuscle('hip-abduction', adductors, 'main')
    expect((await db.exercises.get('squat'))?.secondaryMuscles).toContain(adductors)
    expect((await db.exercises.get('hip-abduction'))?.primaryMuscle).toBe(adductors)

    // A squat workout now credits ½ set to the new muscle.
    const id = await startWorkout()
    await addExerciseToWorkout(id, await exercise('squat'))
    const [set] = await db.sets.where('workoutId').equals(id).sortBy('order')
    await updateSet(set.id, { weightKg: 100, reps: 5, done: true })
    await finishWorkout(id)
    const [loaded] = await loadDetails([(await db.workouts.get(id))!])
    const map = new Map((await db.exercises.toArray()).map((e) => [e.id, e]))
    expect(summarize(loaded, map).muscleSets[adductors]).toBe(0.5)

    // Can't delete while it's an exercise's main muscle; can after reassigning.
    expect(await deleteMuscle(adductors as `custom-${string}`)).toEqual({ ok: false, mainFor: ['Hip Abduction (Machine)'] })
    await linkExerciseToMuscle('hip-abduction', 'glutes', 'main')
    expect(await unlinkExerciseFromMuscle('hip-abduction', adductors)).toBe(true)
    expect(await deleteMuscle(adductors as `custom-${string}`)).toEqual({ ok: true })
    expect((await db.exercises.get('squat'))?.secondaryMuscles).not.toContain(adductors)
    expect(await db.muscles.count()).toBe(0)
  })
})

describe('custom exercises', () => {
  it('creates, edits and only deletes unused custom exercises', async () => {
    const { createExercise, updateExercise, deleteExercise } = await import('./exercises')
    const e = await createExercise({
      name: 'Landmine Row',
      primaryMuscle: 'upper_back',
      secondaryMuscles: ['lats'],
      equipment: 'barbell',
      incrementKg: 2.5,
      defaultRestSec: 120,
    })
    expect(e.custom).toBe(true)

    // Edit muscles; explicit secondary choices keep up with the change.
    await db.exercises.update(e.id, { countedSecondary: [] })
    const edited = await updateExercise(e.id, { ...e, name: 'Landmine Row (1 arm)', secondaryMuscles: ['lats', 'biceps'] })
    expect(edited.name).toBe('Landmine Row (1 arm)')
    expect(edited.countedSecondary).toEqual(['biceps'])

    // Used in a workout → can't delete.
    const w = await startWorkout()
    await addExerciseToWorkout(w, edited)
    expect(await deleteExercise(e.id)).toEqual({ ok: false, workouts: 1, routines: 0 })
    await deleteWorkout(w)
    expect(await deleteExercise(e.id)).toEqual({ ok: true })
    // Built-in exercises can never be deleted.
    expect((await deleteExercise('bench-press')).ok).toBe(false)
  })
})

describe('avatar game', () => {
  async function logVolume(exerciseId: string, sets: [number, number][]) {
    const id = await startWorkout()
    await addExerciseToWorkout(id, await exercise(exerciseId))
    const ws = await db.workoutExercises.where('workoutId').equals(id).first()
    for (let i = 3; i < sets.length; i++) await addSet(ws!.id)
    const rows = await db.sets.where('workoutId').equals(id).sortBy('order')
    for (const [i, [weightKg, reps]] of sets.entries()) await updateSet(rows[i].id, { weightKg, reps, done: true })
    await finishWorkout(id)
    return id
  }

  it('starts at 0 coins, ignores workouts from before the start, and earns 1 coin per 10,000 kg', async () => {
    const { loadGameState } = await import('./game')
    // A workout finished before the game started doesn't earn coins.
    const old = await logVolume('squat', [[100, 10], [100, 10], [100, 10]])
    await db.workouts.update(old, { endedAt: 1, startedAt: 1 })
    let state = await loadGameState()
    expect(state.ledger.earned).toBe(0)
    expect(state.unlocked.has('first-workout')).toBe(true) // achievements use all history
    expect(state.owned.has('headband-rookie')).toBe(true)

    await logVolume('squat', [[100, 10], [100, 10], [100, 10], [100, 10], [100, 10], [100, 10], [100, 10], [100, 10], [100, 10], [100, 10], [100, 10], [100, 10]]) // 12,000 kg
    state = await loadGameState()
    expect(state.ledger.earned).toBe(1)
    expect(state.ledger.kgToNextCoin).toBe(8_000)
  })

  it('buys and equips items only with enough coins', async () => {
    const { loadGameState, buyItem } = await import('./game')
    expect(await buyItem('tee-black')).toEqual({ ok: false, reason: 'You need 3 more potatoes.' })
    expect((await buyItem('headband-rookie')).ok).toBe(false) // achievement items aren't for sale
    await logVolume('leg-press', Array.from({ length: 10 }, () => [300, 10] as [number, number])) // 30,000 kg → 3 coins
    expect(await buyItem('tee-black')).toEqual({ ok: true })
    const state = await loadGameState()
    expect(state.ledger.balance).toBe(0)
    expect(state.owned.has('tee-black')).toBe(true)
    expect(state.look.equipped.top).toBe('tee-black')
    expect((await buyItem('tee-black')).ok).toBe(false) // already owned
  })
})
