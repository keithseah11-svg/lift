import { beforeEach, describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { db } from '../db/schema'
import { addExerciseToWorkout, finishWorkout, startWorkout, updateSet } from '../db/workouts'
import { addRoutineExercise, createRoutine, setScheduleDay } from '../db/routines'
import { addMacroEntry, addMealPreset } from '../db/macros'
import { setWeighIn } from '../db/bodyweight'
import { setMeasurement } from '../db/measurements'
import { updateSettings, getSettings } from '../db/settings'
import { BackupImportError, buildBackupWorkbook, parseBackupWorkbook, restoreBackup } from './excel'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

async function snapshot() {
  const sortById = <T extends { id: string }>(rows: T[]) => rows.sort((a, b) => a.id.localeCompare(b.id))
  return {
    workouts: sortById(await db.workouts.toArray()),
    workoutExercises: sortById(await db.workoutExercises.toArray()),
    sets: sortById(await db.sets.toArray()),
    exercises: sortById(await db.exercises.toArray()),
    routines: sortById(await db.routines.toArray()),
    routineExercises: sortById(await db.routineExercises.toArray()),
    schedule: await db.schedule.toArray(),
    macroEntries: sortById(await db.macroEntries.toArray()),
    mealPresets: sortById(await db.mealPresets.toArray()),
    bodyweight: await db.bodyweight.orderBy('date').toArray(),
    measurements: sortById(await db.measurements.toArray()),
    muscles: await db.muscles.toArray(),
    settings: await getSettings(),
  }
}

describe('excel backup', () => {
  it('round-trips every table', async () => {
    const id = await startWorkout()
    await addExerciseToWorkout(id, (await db.exercises.get('bench-press'))!)
    const [s1, s2] = await db.sets.where('workoutId').equals(id).sortBy('order')
    await updateSet(s1.id, { weightKg: 62.5, reps: 8, rir: 2, done: true, type: 'warmup' })
    await updateSet(s2.id, { weightKg: 82.5, reps: 6, done: true })
    await finishWorkout(id)
    await db.workouts.update(id, { notes: 'Felt strong, "quotes" & commas, ok' })

    const routineId = await createRoutine('Push A')
    await addRoutineExercise(routineId, (await db.exercises.get('ohp'))!)
    await setScheduleDay(0, routineId)
    await setScheduleDay(2, null)
    await addMacroEntry('2026-10-09', 'Chicken rice', { proteinG: 45, carbsG: 60.5, fatG: 12, kcal: 530 })
    await setWeighIn('2026-10-08', 80.4)
    await setMeasurement('2026-10-01', 'waist', 84.5)
    await setMeasurement('2026-10-01', 'body_fat', 15.2)
    await setWeighIn('2026-10-09', 80.15)
    await addMealPreset('Shake', { proteinG: 30, carbsG: 5, fatG: 2, kcal: 158 })
    await updateSettings({
      weeklySessionTarget: 5,
      lastBackupAt: 1_760_000_000_000,
      muscleTargets: { chest: { min: 12, max: 18 }, forearms: 'off' },
      countSecondary: false,
    })
    await db.exercises.update('bench-press', { countedSecondary: ['triceps'] })
    await db.exercises.update('deadlift', { countedSecondary: [] })
    await db.muscles.add({ id: 'custom-adductors-ab12', name: 'Adductors', createdAt: 1_760_000_000_000 })
    await db.exercises.update('squat', { secondaryMuscles: ['glutes', 'lower_back', 'custom-adductors-ab12'] })
    await updateSettings({ muscleTargets: { chest: { min: 12, max: 18 }, forearms: 'off', 'custom-adductors-ab12': { min: 4, max: 8 } } })
    await db.exercises.add({
      id: 'custom-1',
      name: 'Landmine Press',
      primaryMuscle: 'front_delts',
      secondaryMuscles: ['chest', 'triceps'],
      equipment: 'barbell',
      incrementKg: 2.5,
      defaultRestSec: 120,
      custom: true,
    })

    const before = await snapshot()
    const buffer = await buildBackupWorkbook()

    await db.delete()
    await db.open()
    await restoreBackup(await parseBackupWorkbook(buffer))

    const after = await snapshot()
    // Timestamps survive to the second.
    const roundSec = (n: number | null) => (n == null ? n : Math.round(n / 1000) * 1000)
    before.workouts = before.workouts.map((w) => ({ ...w, startedAt: roundSec(w.startedAt)!, endedAt: roundSec(w.endedAt) }))
    before.routines = before.routines.map((r) => ({ ...r, createdAt: roundSec(r.createdAt)! }))
    before.macroEntries = before.macroEntries.map((m) => ({ ...m, createdAt: roundSec(m.createdAt)! }))
    expect(after).toEqual(before)
  })

  it('imports backups made before the Bodyweight sheet existed', async () => {
    await setWeighIn('2026-10-09', 80)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await buildBackupWorkbook())
    wb.removeWorksheet(wb.getWorksheet('Bodyweight')!.id)
    wb.removeWorksheet(wb.getWorksheet('Measurements')!.id)
    const older = (await wb.xlsx.writeBuffer()) as ArrayBuffer
    const parsed = await parseBackupWorkbook(older)
    expect(parsed.tables.bodyweight).toEqual([])
    expect(parsed.tables.measurements).toEqual([])
  })

  it('imports backups made before per-exercise secondary choices existed', async () => {
    await db.exercises.update('bench-press', { countedSecondary: ['triceps'] })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await buildBackupWorkbook())
    const ws = wb.getWorksheet('Exercises')!
    const col = ws.getRow(1).values as unknown[]
    ws.spliceColumns(col.indexOf('Counted secondary'), 1)
    const parsed = await parseBackupWorkbook((await wb.xlsx.writeBuffer()) as ArrayBuffer)
    const bench = (parsed.tables.exercises as { id: string; countedSecondary?: unknown }[]).find((e) => e.id === 'bench-press')
    expect(bench?.countedSecondary).toBeUndefined()
  })

  it('rejects files that are not Lift backups', async () => {
    const wb = new ExcelJS.Workbook()
    wb.addWorksheet('Sheet1').addRow(['hello'])
    const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer
    await expect(parseBackupWorkbook(buffer)).rejects.toBeInstanceOf(BackupImportError)
  })

  it('reports the sheet, row and column of invalid data', async () => {
    const buffer = await buildBackupWorkbook()
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)
    const ws = wb.getWorksheet('Exercises')!
    ws.getRow(2).getCell(3).value = 'elbows'
    const edited = (await wb.xlsx.writeBuffer()) as ArrayBuffer
    await expect(parseBackupWorkbook(edited)).rejects.toThrow(/Exercises", row 2, column "Primary muscle"/)
  })
})
