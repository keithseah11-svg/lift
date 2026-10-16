import { describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { LiftDB } from './schema'

describe('database upgrade', () => {
  it('keeps Phase 1 data when upgrading to the bodyweight schema', async () => {
    const name = 'lift-upgrade-test'
    const v1 = new Dexie(name)
    v1.version(1).stores({
      exercises: 'id, name, primaryMuscle',
      routines: 'id, createdAt',
      routineExercises: 'id, routineId, exerciseId',
      schedule: 'weekday',
      workouts: 'id, status, startedAt, routineId',
      workoutExercises: 'id, workoutId, exerciseId',
      sets: 'id, workoutId, workoutExerciseId',
      macroEntries: 'id, date',
      mealPresets: 'id, label',
      kv: 'key',
    })
    await v1.table('exercises').add({ id: 'bench-press', name: 'Bench Press (Barbell)', primaryMuscle: 'chest', secondaryMuscles: [], equipment: 'barbell', incrementKg: 2.5, defaultRestSec: 180, custom: false })
    await v1.table('exercises').add({ id: 'my-own', name: 'My Custom Move', primaryMuscle: 'abs', secondaryMuscles: [], equipment: 'other', incrementKg: 2.5, defaultRestSec: 60, custom: true })
    await v1.table('workouts').add({ id: 'w1', name: 'Old', status: 'done', startedAt: 1, endedAt: 2, routineId: null, notes: '' })
    v1.close()

    const db = new LiftDB(name)
    expect((await db.workouts.get('w1'))?.name).toBe('Old')
    // Library exercises added in later updates appear; custom ones are kept.
    expect(await db.exercises.get('jm-press')).toBeTruthy()
    expect(await db.exercises.get('iso-lateral-pulldown')).toBeTruthy()
    expect((await db.exercises.get('my-own'))?.name).toBe('My Custom Move')
    await db.bodyweight.put({ date: '2026-10-10', kg: 80 })
    expect(await db.bodyweight.count()).toBe(1)
    db.close()
  })
})
