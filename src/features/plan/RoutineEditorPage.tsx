import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { useExerciseMap } from '../../db/exercises'
import {
  addRoutineExercise,
  deleteRoutine,
  moveRoutineExercise,
  removeRoutineExercise,
  renameRoutine,
  updateRoutineExercise,
} from '../../db/routines'
import { getActiveWorkout, startWorkout } from '../../db/workouts'
import type { RoutineExercise } from '../../db/types'
import { MUSCLE_LABELS } from '../../domain/muscles'
import { formatClock } from '../../lib/format'
import { PageHeader } from '../../components/PageHeader'
import { ExercisePicker } from '../../components/ExercisePicker'
import { NumberField } from '../../components/NumberField'

const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300]

export function RoutineEditorPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [pickerOpen, setPickerOpen] = useState(false)
  const exerciseMap = useExerciseMap()
  const routine = useLiveQuery(async () => (await db.routines.get(id)) ?? null, [id])
  const items = useLiveQuery(
    async () => (await db.routineExercises.where('routineId').equals(id).toArray()).sort((a, b) => a.order - b.order),
    [id],
  )
  const active = useLiveQuery(getActiveWorkout, [])

  if (routine === null) {
    return (
      <div>
        <PageHeader title="Routine" back />
        <p className="p-4 text-muted">This routine no longer exists.</p>
      </div>
    )
  }
  if (!routine || !items || !exerciseMap) return null

  const remove = async () => {
    if (!confirm(`Delete routine “${routine.name}”? Past workouts are kept.`)) return
    await deleteRoutine(routine.id)
    navigate('/plan', { replace: true })
  }

  const start = async () => {
    const workoutId = await startWorkout(routine.id)
    navigate(`/workout/${workoutId}`)
  }

  return (
    <div className="pb-6">
      <PageHeader
        title={
          <input
            className="w-full bg-transparent font-bold outline-none"
            value={routine.name}
            onChange={(e) => renameRoutine(routine.id, e.target.value)}
            aria-label="Routine name"
          />
        }
        back
      />
      <div className="space-y-3 px-4">
        {items.map((item, i) => {
          const ex = exerciseMap.get(item.exerciseId)
          return (
            <RoutineItem
              key={item.id}
              item={item}
              name={ex?.name ?? 'Unknown exercise'}
              muscle={ex ? MUSCLE_LABELS[ex.primaryMuscle] : ''}
              isFirst={i === 0}
              isLast={i === items.length - 1}
            />
          )
        })}

        {items.length === 0 && <div className="card text-center text-muted">No exercises yet.</div>}

        <button className="btn-secondary w-full" onClick={() => setPickerOpen(true)}>
          + Add exercise
        </button>
        <button className="btn-primary w-full" disabled={items.length === 0 || !!active} onClick={start}>
          {active ? 'Finish your current workout first' : 'Start this routine'}
        </button>
        <button className="btn-danger w-full" onClick={remove}>
          Delete routine
        </button>
      </div>

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={(e) => addRoutineExercise(routine.id, e)} />
    </div>
  )
}

function RoutineItem({ item, name, muscle, isFirst, isLast }: { item: RoutineExercise; name: string; muscle: string; isFirst: boolean; isLast: boolean }) {
  const update = (patch: Partial<RoutineExercise>) => updateRoutineExercise(item.id, patch)
  const fieldClass = 'h-10 w-full rounded-lg bg-surface-2 text-center font-semibold outline-none focus:ring-1 focus:ring-accent'

  return (
    <section className="card space-y-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-accent">{name}</h3>
          <p className="text-xs text-muted">{muscle}</p>
        </div>
        <button className="btn-ghost" disabled={isFirst} onClick={() => moveRoutineExercise(item.id, -1)} aria-label="Move up">
          ↑
        </button>
        <button className="btn-ghost" disabled={isLast} onClick={() => moveRoutineExercise(item.id, 1)} aria-label="Move down">
          ↓
        </button>
        <button className="btn-ghost text-bad" onClick={() => removeRoutineExercise(item.id)} aria-label="Remove">
          ✕
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <label>
          <span className="label">Sets</span>
          <NumberField className={fieldClass} value={item.sets} min={1} onChange={(v) => v != null && v >= 1 && update({ sets: Math.min(v, 20) })} />
        </label>
        <label>
          <span className="label">Rep min</span>
          <NumberField
            className={fieldClass}
            value={item.repMin}
            min={1}
            onChange={(v) => v != null && v >= 1 && update({ repMin: v, repMax: Math.max(v, item.repMax) })}
          />
        </label>
        <label>
          <span className="label">Rep max</span>
          <NumberField className={fieldClass} value={item.repMax} min={1} onChange={(v) => v != null && v >= 1 && update({ repMax: v })} />
        </label>
        <label>
          <span className="label">RIR</span>
          <NumberField className={fieldClass} value={item.targetRir} placeholder="–" onChange={(v) => update({ targetRir: v == null ? null : Math.min(v, 5) })} />
        </label>
      </div>
      <label className="flex items-center gap-3">
        <span className="label mb-0">Rest</span>
        <select className="field py-2" value={item.restSec} onChange={(e) => update({ restSec: Number(e.target.value) })}>
          {[...new Set([...REST_OPTIONS, item.restSec])]
            .sort((a, b) => a - b)
            .map((sec) => (
              <option key={sec} value={sec}>
                {sec === 0 ? 'Off' : formatClock(sec)}
              </option>
            ))}
        </select>
      </label>
      {item.repMax < item.repMin && <p className="text-xs text-warn">Rep max is below rep min.</p>}
    </section>
  )
}
