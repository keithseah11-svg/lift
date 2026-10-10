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
    await v1.table('workouts').add({ id: 'w1', name: 'Old', status: 'done', startedAt: 1, endedAt: 2, routineId: null, notes: '' })
    v1.close()

    const db = new LiftDB(name)
    expect((await db.workouts.get('w1'))?.name).toBe('Old')
    await db.bodyweight.put({ date: '2026-10-10', kg: 80 })
    expect(await db.bodyweight.count()).toBe(1)
    db.close()
  })
})
