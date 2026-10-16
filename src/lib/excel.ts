/**
 * Excel backup: every table becomes a sheet. Columns with a `field` round-trip
 * on import; columns with only `display` are extra, human-friendly info
 * (exercise names, volume, durations) that import ignores.
 */
import type ExcelJSType from 'exceljs'
import type { Table } from 'dexie'
import { z } from 'zod'
import { db } from '../db/schema'
import {
  DEFAULT_SETTINGS,
  type Exercise,
  type MacroEntry,
  type Settings,
  type Workout,
  type WorkoutSet,
} from '../db/types'
import { EQUIPMENT, allMuscles, isMuscleId, muscleLabel, setCustomMuscles, type Muscle } from '../domain/muscles'
import { setVolume, totalVolume } from '../domain/volume'
import { sumMacros } from '../domain/macros'
import { WEEKDAY_LABELS } from '../domain/week'
import { MEASUREMENT_SITES, MEASUREMENT_SITE_IDS } from '../domain/measurements'
import { BODY_TYPES, DEFAULT_LOOK, HAIR_STYLES, ITEMS_BY_ID, type BodyType, type HairStyle } from '../domain/game/catalog'

type Kind = 'string' | 'number' | 'nullableNumber' | 'nullableString' | 'bool' | 'date' | 'nullableDate' | 'list' | 'optionalList'

interface Column<T> {
  header: string
  width?: number
  field?: keyof T & string
  kind?: Kind
  display?: (row: T, ctx: ExportContext) => unknown
  /** Added in a later version: older backups without this column still import. */
  optional?: boolean
}

interface ExportContext {
  exercises: Map<string, Exercise>
  routineNames: Map<string, string>
  workoutNames: Map<string, { name: string; startedAt: number }>
  workoutExercises: Map<string, { exerciseId: string; order: number }>
}

interface SheetSpec<T> {
  name: string
  table: keyof typeof TABLES
  columns: Column<T>[]
  schema: z.ZodType<T>
  /** Sheets added after v1 backups: missing on import means "empty", not an error. */
  optional?: boolean
}

const TABLES = {
  workouts: () => db.workouts,
  workoutExercises: () => db.workoutExercises,
  sets: () => db.sets,
  exercises: () => db.exercises,
  routines: () => db.routines,
  routineExercises: () => db.routineExercises,
  schedule: () => db.schedule,
  macroEntries: () => db.macroEntries,
  mealPresets: () => db.mealPresets,
  muscles: () => db.muscles,
  purchases: () => db.purchases,
  bodyweight: () => db.bodyweight,
  measurements: () => db.measurements,
}

/** Built-in muscle names or your own (custom-…) ids. */
const muscle = z.string().refine(isMuscleId, 'not a known muscle') as unknown as z.ZodType<Muscle>
const nullableNum = z.number().nullable()
const setType = z.enum(['warmup', 'working', 'drop', 'failure'])

const SPECS = [
  {
    name: 'Workouts',
    table: 'workouts',
    schema: z.object({
      id: z.string().min(1),
      name: z.string(),
      routineId: z.string().nullable(),
      status: z.enum(['active', 'done']),
      startedAt: z.number(),
      endedAt: nullableNum,
      notes: z.string(),
    }),
    columns: [
      { header: 'ID', field: 'id', kind: 'string', width: 12 },
      { header: 'Name', field: 'name', kind: 'string', width: 20 },
      { header: 'Started', field: 'startedAt', kind: 'date', width: 18 },
      { header: 'Ended', field: 'endedAt', kind: 'nullableDate', width: 18 },
      { header: 'Status', field: 'status', kind: 'string' },
      { header: 'Routine ID', field: 'routineId', kind: 'nullableString', width: 12 },
      { header: 'Notes', field: 'notes', kind: 'string', width: 30 },
    ],
  },
  {
    name: 'Workout Exercises',
    table: 'workoutExercises',
    schema: z.object({
      id: z.string().min(1),
      workoutId: z.string().min(1),
      exerciseId: z.string().min(1),
      order: z.number(),
      restSec: z.number(),
      repMin: nullableNum,
      repMax: nullableNum,
      targetRir: nullableNum,
      supersetGroup: z.string().nullable(),
      notes: z.string(),
    }),
    columns: [
      { header: 'ID', field: 'id', kind: 'string', width: 12 },
      { header: 'Workout ID', field: 'workoutId', kind: 'string', width: 12 },
      { header: 'Exercise ID', field: 'exerciseId', kind: 'string', width: 12 },
      { header: 'Exercise', width: 30, display: (r, c) => c.exercises.get(r.exerciseId)?.name },
      { header: 'Order', field: 'order', kind: 'number' },
      { header: 'Rest (s)', field: 'restSec', kind: 'number' },
      { header: 'Rep min', field: 'repMin', kind: 'nullableNumber' },
      { header: 'Rep max', field: 'repMax', kind: 'nullableNumber' },
      { header: 'Target RIR', field: 'targetRir', kind: 'nullableNumber' },
      { header: 'Superset', field: 'supersetGroup', kind: 'nullableString' },
      { header: 'Notes', field: 'notes', kind: 'string', width: 30 },
    ],
  },
  {
    name: 'Sets',
    table: 'sets',
    schema: z.object({
      id: z.string().min(1),
      workoutId: z.string().min(1),
      workoutExerciseId: z.string().min(1),
      order: z.number(),
      type: setType,
      weightKg: nullableNum,
      reps: nullableNum,
      rir: nullableNum,
      done: z.boolean(),
    }),
    columns: [
      { header: 'Date', width: 18, display: (r, c) => toExcelDate(c.workoutNames.get(r.workoutId)?.startedAt) },
      { header: 'Workout', width: 20, display: (r, c) => c.workoutNames.get(r.workoutId)?.name },
      {
        header: 'Exercise',
        width: 30,
        display: (r, c) => c.exercises.get(c.workoutExercises.get(r.workoutExerciseId)?.exerciseId ?? '')?.name,
      },
      {
        header: 'Muscle',
        width: 14,
        display: (r, c) => {
          const ex = c.exercises.get(c.workoutExercises.get(r.workoutExerciseId)?.exerciseId ?? '')
          return ex && muscleLabel(ex.primaryMuscle)
        },
      },
      { header: 'Order', field: 'order', kind: 'number' },
      { header: 'Type', field: 'type', kind: 'string' },
      { header: 'Weight (kg)', field: 'weightKg', kind: 'nullableNumber' },
      { header: 'Reps', field: 'reps', kind: 'nullableNumber' },
      { header: 'RIR', field: 'rir', kind: 'nullableNumber' },
      { header: 'Volume (kg)', display: (r) => setVolume(r) },
      { header: 'Done', field: 'done', kind: 'bool' },
      { header: 'ID', field: 'id', kind: 'string', width: 12 },
      { header: 'Workout ID', field: 'workoutId', kind: 'string', width: 12 },
      { header: 'Workout Exercise ID', field: 'workoutExerciseId', kind: 'string', width: 12 },
    ],
  },
  {
    name: 'Exercises',
    table: 'exercises',
    schema: z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      primaryMuscle: muscle,
      secondaryMuscles: z.array(muscle),
      equipment: z.enum(EQUIPMENT),
      incrementKg: z.number(),
      defaultRestSec: z.number(),
      custom: z.boolean(),
      countedSecondary: z.array(muscle).nullish(),
    }),
    columns: [
      { header: 'ID', field: 'id', kind: 'string', width: 22 },
      { header: 'Name', field: 'name', kind: 'string', width: 34 },
      { header: 'Primary muscle', field: 'primaryMuscle', kind: 'string', width: 14 },
      { header: 'Secondary muscles', field: 'secondaryMuscles', kind: 'list', width: 34 },
      { header: 'Equipment', field: 'equipment', kind: 'string' },
      { header: 'Increment (kg)', field: 'incrementKg', kind: 'number' },
      { header: 'Rest (s)', field: 'defaultRestSec', kind: 'number' },
      { header: 'Custom', field: 'custom', kind: 'bool' },
      // Blank = follow the global setting; "none" = no secondary credit.
      { header: 'Counted secondary', field: 'countedSecondary', kind: 'optionalList', width: 28, optional: true },
    ],
  },
  {
    name: 'Routines',
    table: 'routines',
    schema: z.object({
      id: z.string().min(1),
      name: z.string(),
      notes: z.string(),
      createdAt: z.number(),
    }),
    columns: [
      { header: 'ID', field: 'id', kind: 'string', width: 12 },
      { header: 'Name', field: 'name', kind: 'string', width: 24 },
      { header: 'Notes', field: 'notes', kind: 'string', width: 30 },
      { header: 'Created', field: 'createdAt', kind: 'date', width: 18 },
    ],
  },
  {
    name: 'Routine Exercises',
    table: 'routineExercises',
    schema: z.object({
      id: z.string().min(1),
      routineId: z.string().min(1),
      exerciseId: z.string().min(1),
      order: z.number(),
      sets: z.number(),
      repMin: z.number(),
      repMax: z.number(),
      targetRir: nullableNum,
      restSec: z.number(),
      supersetGroup: z.string().nullable(),
    }),
    columns: [
      { header: 'Routine', width: 20, display: (r, c) => c.routineNames.get(r.routineId) },
      { header: 'Exercise', width: 30, display: (r, c) => c.exercises.get(r.exerciseId)?.name },
      { header: 'Order', field: 'order', kind: 'number' },
      { header: 'Sets', field: 'sets', kind: 'number' },
      { header: 'Rep min', field: 'repMin', kind: 'number' },
      { header: 'Rep max', field: 'repMax', kind: 'number' },
      { header: 'Target RIR', field: 'targetRir', kind: 'nullableNumber' },
      { header: 'Rest (s)', field: 'restSec', kind: 'number' },
      { header: 'Superset', field: 'supersetGroup', kind: 'nullableString' },
      { header: 'ID', field: 'id', kind: 'string', width: 12 },
      { header: 'Routine ID', field: 'routineId', kind: 'string', width: 12 },
      { header: 'Exercise ID', field: 'exerciseId', kind: 'string', width: 12 },
    ],
  },
  {
    name: 'Schedule',
    table: 'schedule',
    schema: z.object({
      weekday: z.number().int().min(0).max(6),
      routineId: z.string().nullable(),
    }),
    columns: [
      { header: 'Weekday', field: 'weekday', kind: 'number' },
      { header: 'Day', width: 12, display: (r) => WEEKDAY_LABELS[r.weekday] },
      { header: 'Routine', width: 20, display: (r, c) => (r.routineId ? c.routineNames.get(r.routineId) : 'Rest') },
      { header: 'Routine ID', field: 'routineId', kind: 'nullableString', width: 12 },
    ],
  },
  {
    name: 'Macros',
    table: 'macroEntries',
    schema: z.object({
      id: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      label: z.string(),
      proteinG: z.number(),
      carbsG: z.number(),
      fatG: z.number(),
      kcal: z.number(),
      createdAt: z.number(),
    }),
    columns: [
      { header: 'Date', field: 'date', kind: 'string', width: 12 },
      { header: 'Label', field: 'label', kind: 'string', width: 24 },
      { header: 'Protein (g)', field: 'proteinG', kind: 'number' },
      { header: 'Carbs (g)', field: 'carbsG', kind: 'number' },
      { header: 'Fat (g)', field: 'fatG', kind: 'number' },
      { header: 'kcal', field: 'kcal', kind: 'number' },
      { header: 'Logged at', field: 'createdAt', kind: 'date', width: 18 },
      { header: 'ID', field: 'id', kind: 'string', width: 12 },
    ],
  },
  {
    name: 'Custom Muscles',
    table: 'muscles',
    optional: true,
    schema: z.object({
      id: z.string().regex(/^custom-[a-z0-9-]+$/),
      name: z.string().min(1),
      createdAt: z.number(),
    }),
    columns: [
      { header: 'Name', field: 'name', kind: 'string', width: 22 },
      { header: 'ID', field: 'id', kind: 'string', width: 28 },
      { header: 'Added', field: 'createdAt', kind: 'date', width: 18 },
    ],
  },
  {
    name: 'Shop Purchases',
    table: 'purchases',
    optional: true,
    schema: z.object({
      itemId: z.string().min(1),
      price: z.number().min(0),
      purchasedAt: z.number(),
    }),
    columns: [
      { header: 'Item', width: 22, display: (r) => ITEMS_BY_ID.get(r.itemId)?.name ?? r.itemId },
      { header: 'Price (potatoes)', field: 'price', kind: 'number' },
      { header: 'Bought', field: 'purchasedAt', kind: 'date', width: 18 },
      { header: 'Item ID', field: 'itemId', kind: 'string', width: 20 },
    ],
  },
  {
    name: 'Meal Presets',
    table: 'mealPresets',
    schema: z.object({
      id: z.string().min(1),
      label: z.string(),
      proteinG: z.number(),
      carbsG: z.number(),
      fatG: z.number(),
      kcal: z.number(),
    }),
    columns: [
      { header: 'Label', field: 'label', kind: 'string', width: 24 },
      { header: 'Protein (g)', field: 'proteinG', kind: 'number' },
      { header: 'Carbs (g)', field: 'carbsG', kind: 'number' },
      { header: 'Fat (g)', field: 'fatG', kind: 'number' },
      { header: 'kcal', field: 'kcal', kind: 'number' },
      { header: 'ID', field: 'id', kind: 'string', width: 12 },
    ],
  },
  {
    name: 'Bodyweight',
    table: 'bodyweight',
    optional: true,
    schema: z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      kg: z.number().positive(),
    }),
    columns: [
      { header: 'Date', field: 'date', kind: 'string', width: 12 },
      { header: 'Weight (kg)', field: 'kg', kind: 'number', width: 12 },
    ],
  },
  {
    name: 'Measurements',
    table: 'measurements',
    optional: true,
    schema: z.object({
      id: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      site: z.enum(MEASUREMENT_SITE_IDS),
      value: z.number().positive(),
    }),
    columns: [
      { header: 'Date', field: 'date', kind: 'string', width: 12 },
      { header: 'Body part', width: 14, display: (r) => MEASUREMENT_SITES.find((s) => s.id === r.site)?.label },
      { header: 'Value', field: 'value', kind: 'number' },
      { header: 'Unit', display: (r) => MEASUREMENT_SITES.find((s) => s.id === r.site)?.unit },
      { header: 'Site', field: 'site', kind: 'string', width: 12 },
      { header: 'ID', field: 'id', kind: 'string', width: 12 },
    ],
  },
] satisfies SheetSpec<any>[]

const SETTINGS_SHEET = 'Settings'

const settingsSchema = z.object({
  weeklySessionTarget: z.number(),
  weeklySetMin: z.number(),
  weeklySetMax: z.number(),
  macroTarget: z.object({ proteinG: z.number(), carbsG: z.number(), fatG: z.number(), kcal: z.number() }),
  lastBackupAt: nullableNum,
  muscleTargets: z
    .record(z.string().refine((k): boolean => isMuscleId(k), 'not a known muscle'), z.union([z.literal('off'), z.object({ min: z.number(), max: z.number() })]))
    .default({}),
  countSecondary: z.boolean().default(true),
  coinsSince: nullableNum.default(null),
  avatar: z
    .object({
      bodyType: z.enum(BODY_TYPES.map((b) => b.id) as [BodyType, ...BodyType[]]),
      skinTone: z.string(),
      hairStyle: z.enum(HAIR_STYLES.map((h) => h.id) as [HairStyle, ...HairStyle[]]),
      hairColor: z.string(),
      equipped: z.record(z.string(), z.string().nullable()),
    })
    .default(DEFAULT_LOOK),
})

/** Excel has no time zones; shift so the sheet shows local wall-clock time. */
function toExcelDate(ms: number | null | undefined): Date | null {
  if (ms == null) return null
  return new Date(ms - new Date(ms).getTimezoneOffset() * 60000)
}

function fromExcelDate(d: Date): number {
  const ms = d.getTime() + d.getTimezoneOffset() * 60000
  return Math.round(ms / 1000) * 1000
}

async function loadExcel(): Promise<typeof ExcelJSType> {
  const mod = await import('exceljs')
  return (mod.default ?? mod) as typeof ExcelJSType
}

function toCell(kind: Kind | undefined, value: unknown): unknown {
  if (value == null) return null
  switch (kind) {
    case 'date':
    case 'nullableDate':
      return toExcelDate(value as number)
    case 'list':
      return (value as string[]).join(', ')
    case 'optionalList':
      return (value as string[]).length ? (value as string[]).join(', ') : 'none'
    case 'bool':
      return value ? 'yes' : 'no'
    default:
      return value
  }
}

function plainCellValue(value: ExcelJSType.CellValue): unknown {
  if (value == null) return null
  if (typeof value === 'object' && !(value instanceof Date)) {
    if ('result' in value) return value.result ?? null
    if ('richText' in value) return value.richText.map((t) => t.text).join('')
    if ('text' in value) return value.text
    if ('error' in value) return null
  }
  return value
}

function fromCell(kind: Kind, raw: unknown): unknown {
  const blank = raw == null || raw === ''
  switch (kind) {
    case 'string':
      return blank ? '' : String(raw)
    case 'nullableString':
      return blank ? null : String(raw)
    case 'number':
      return blank ? NaN : Number(raw)
    case 'nullableNumber':
      return blank ? null : Number(raw)
    case 'bool':
      return raw === true || (typeof raw === 'string' && ['yes', 'true', '1'].includes(raw.trim().toLowerCase()))
    case 'date':
    case 'nullableDate':
      if (blank) return kind === 'date' ? NaN : null
      if (raw instanceof Date) return fromExcelDate(raw)
      return typeof raw === 'number' ? raw : Date.parse(String(raw))
    case 'optionalList':
      if (blank) return undefined
      if (String(raw).trim().toLowerCase() === 'none') return []
      return String(raw)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    case 'list':
      return blank
        ? []
        : String(raw)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
  }
}

export async function buildBackupWorkbook(): Promise<ArrayBuffer> {
  const ExcelJS = await loadExcel()
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Lift'
  wb.created = new Date()

  // Make sure custom muscle names are known for the readable columns.
  setCustomMuscles(await db.muscles.toArray())
  const [exercises, routines, workouts, workoutExercises, sets, macroEntries, settings] = await Promise.all([
    db.exercises.toArray(),
    db.routines.toArray(),
    db.workouts.toArray(),
    db.workoutExercises.toArray(),
    db.sets.toArray(),
    db.macroEntries.toArray(),
    db.kv.get('settings'),
  ])
  const ctx: ExportContext = {
    exercises: new Map(exercises.map((e) => [e.id, e])),
    routineNames: new Map(routines.map((r) => [r.id, r.name])),
    workoutNames: new Map(workouts.map((w) => [w.id, { name: w.name, startedAt: w.startedAt }])),
    workoutExercises: new Map(workoutExercises.map((we) => [we.id, { exerciseId: we.exerciseId, order: we.order }])),
  }

  addSummarySheets(wb, workouts, sets, macroEntries)

  for (const spec of SPECS as SheetSpec<any>[]) {
    const rows: any[] = await TABLES[spec.table]().toArray()
    if (spec.table === 'sets') rows.sort((a, b) => compareSets(a, b, ctx))
    if (spec.table === 'bodyweight' || spec.table === 'measurements') rows.sort((a, b) => a.date.localeCompare(b.date))
    const ws = wb.addWorksheet(spec.name)
    ws.columns = spec.columns.map((c) => ({
      header: c.header,
      width: c.width ?? 12,
      style: c.kind === 'date' || c.kind === 'nullableDate' ? { numFmt: 'yyyy-mm-dd hh:mm' } : undefined,
    }))
    for (const row of rows) {
      ws.addRow(spec.columns.map((c) => (c.field ? toCell(c.kind, row[c.field]) : (c.display?.(row, ctx) ?? null))))
    }
    styleHeader(ws)
  }

  const settingsSheet = wb.addWorksheet(SETTINGS_SHEET)
  settingsSheet.columns = [
    { header: 'Key', width: 22 },
    { header: 'Value', width: 60 },
  ]
  settingsSheet.addRow(['settings', JSON.stringify({ ...DEFAULT_SETTINGS, ...(settings?.value as object) })])
  styleHeader(settingsSheet)

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

/** Chronological, then by exercise position, then set order. */
function compareSets(a: WorkoutSet, b: WorkoutSet, ctx: ExportContext): number {
  const time = (s: WorkoutSet) => ctx.workoutNames.get(s.workoutId)?.startedAt ?? 0
  const pos = (s: WorkoutSet) => ctx.workoutExercises.get(s.workoutExerciseId)?.order ?? 0
  return time(a) - time(b) || a.workoutId.localeCompare(b.workoutId) || pos(a) - pos(b) || a.order - b.order
}

/** Read-only overview sheets placed first so the file is pleasant to browse. */
function addSummarySheets(
  wb: ExcelJSType.Workbook,
  workouts: Workout[],
  sets: WorkoutSet[],
  macroEntries: MacroEntry[],
) {
  const sessions = wb.addWorksheet('Session Summary')
  sessions.columns = [
    { header: 'Date', width: 18, style: { numFmt: 'yyyy-mm-dd hh:mm' } },
    { header: 'Workout', width: 22 },
    { header: 'Duration (min)', width: 14 },
    { header: 'Working sets', width: 13 },
    { header: 'Volume (kg)', width: 13 },
  ]
  const done = workouts.filter((w) => w.status === 'done').sort((a, b) => b.startedAt - a.startedAt)
  for (const w of done) {
    const ws = sets.filter((s) => s.workoutId === w.id)
    sessions.addRow([
      toExcelDate(w.startedAt),
      w.name,
      w.endedAt ? Math.round((w.endedAt - w.startedAt) / 60000) : null,
      ws.filter((s) => s.done && s.type !== 'warmup').length,
      totalVolume(ws),
    ])
  }
  styleHeader(sessions)

  const daily = wb.addWorksheet('Daily Macros')
  daily.columns = [
    { header: 'Date', width: 12 },
    { header: 'Protein (g)', width: 12 },
    { header: 'Carbs (g)', width: 12 },
    { header: 'Fat (g)', width: 12 },
    { header: 'kcal', width: 10 },
  ]
  const byDate = new Map<string, MacroEntry[]>()
  for (const e of macroEntries) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e])
  for (const date of [...byDate.keys()].sort().reverse()) {
    const t = sumMacros(byDate.get(date)!)
    daily.addRow([date, t.proteinG, t.carbsG, t.fatG, t.kcal])
  }
  styleHeader(daily)

  const muscles = wb.addWorksheet('Muscle Key')
  muscles.columns = [
    { header: 'Code', width: 14 },
    { header: 'Muscle', width: 14 },
  ]
  for (const m of allMuscles()) muscles.addRow([m, muscleLabel(m)])
  styleHeader(muscles)
}

function styleHeader(ws: ExcelJSType.Worksheet) {
  ws.getRow(1).font = { bold: true }
  ws.views = [{ state: 'frozen', ySplit: 1 }]
}

export class BackupImportError extends Error {}

export interface ParsedBackup {
  tables: Record<keyof typeof TABLES, unknown[]>
  settings: Settings
}

export async function parseBackupWorkbook(data: ArrayBuffer): Promise<ParsedBackup> {
  const ExcelJS = await loadExcel()
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(data)
  } catch {
    throw new BackupImportError('This file could not be read as an Excel workbook.')
  }

  const tables = {} as ParsedBackup['tables']
  for (const spec of SPECS as SheetSpec<any>[]) {
    const ws = wb.getWorksheet(spec.name)
    if (!ws && spec.optional) {
      tables[spec.table] = []
      continue
    }
    if (!ws) throw new BackupImportError(`Sheet "${spec.name}" is missing — is this a Lift backup?`)
    const headerIndex = new Map<string, number>()
    ws.getRow(1).eachCell((cell, col) => headerIndex.set(String(plainCellValue(cell.value) ?? '').trim(), col))

    const fields = spec.columns.filter((c) => c.field)
    for (const c of fields) {
      if (!headerIndex.has(c.header) && !c.optional) {
        throw new BackupImportError(`Sheet "${spec.name}" is missing the "${c.header}" column.`)
      }
    }

    const rows: unknown[] = []
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r)
      if (!row.hasValues) continue
      const obj: Record<string, unknown> = {}
      for (const c of fields) {
        const col = headerIndex.get(c.header)
        obj[c.field!] = col == null ? undefined : fromCell(c.kind!, plainCellValue(row.getCell(col).value))
      }
      const parsed = spec.schema.safeParse(obj)
      if (!parsed.success) {
        const issue = parsed.error.issues[0]
        const col = spec.columns.find((c) => c.field === issue?.path[0])?.header ?? String(issue?.path[0])
        throw new BackupImportError(`Sheet "${spec.name}", row ${r}, column "${col}": ${issue?.message}`)
      }
      rows.push(parsed.data)
    }
    tables[spec.table] = rows
  }

  let settings = DEFAULT_SETTINGS
  const settingsSheet = wb.getWorksheet(SETTINGS_SHEET)
  const raw = settingsSheet ? plainCellValue(settingsSheet.getRow(2).getCell(2).value) : null
  if (typeof raw === 'string') {
    try {
      settings = settingsSchema.parse({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) })
    } catch {
      throw new BackupImportError('The Settings sheet is not valid.')
    }
  }

  return { tables, settings }
}

/** Replaces everything in the database with the backup's contents. */
export async function restoreBackup(backup: ParsedBackup): Promise<void> {
  const tableList = [...Object.values(TABLES).map((t) => t()), db.kv]
  await db.transaction('rw', tableList, async () => {
    for (const [name, rows] of Object.entries(backup.tables) as [keyof typeof TABLES, unknown[]][]) {
      const table = TABLES[name]() as unknown as Table<unknown>
      await table.clear()
      await table.bulkAdd(rows)
    }
    await db.kv.put({ key: 'settings', value: backup.settings })
  })
}

export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `lift-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.xlsx`
}
