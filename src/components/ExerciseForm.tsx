import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { createExercise, updateExercise } from '../db/exercises'
import { createMuscle } from '../db/muscles'
import type { Exercise } from '../db/types'
import { EQUIPMENT, EQUIPMENT_LABELS, isBuiltinMuscle, type Equipment, type Muscle } from '../domain/muscles'
import { normalize } from '../domain/search'
import { formatClock } from '../lib/format'
import { useMuscles } from '../app/MusclesProvider'
import { NumberField } from './NumberField'

const DEFAULT_STEP: Record<Equipment, number> = { barbell: 2.5, dumbbell: 2, machine: 5, cable: 2.5, bodyweight: 2.5, other: 2.5 }
const REST_OPTIONS = [60, 90, 120, 150, 180, 240, 300]

interface Props {
  /** Exercise to edit; omit to create a new one. */
  exercise?: Exercise
  initialName?: string
  onSaved: (exercise: Exercise) => void
  onCancel?: () => void
}

/** Create or edit an exercise: name, equipment, main muscle and secondary muscles. */
export function ExerciseForm({ exercise, initialName = '', onSaved, onCancel }: Props) {
  const { all, label } = useMuscles()
  const others = useLiveQuery(() => db.exercises.toArray(), [])
  const [name, setName] = useState(exercise?.name ?? initialName)
  const [equipment, setEquipment] = useState<Equipment>(exercise?.equipment ?? 'dumbbell')
  const [primary, setPrimary] = useState<Muscle | null>(exercise?.primaryMuscle ?? null)
  const [secondary, setSecondary] = useState<Muscle[]>(exercise?.secondaryMuscles ?? [])
  const [step, setStep] = useState<number | null>(exercise?.incrementKg ?? null)
  const [rest, setRest] = useState(exercise?.defaultRestSec ?? 120)
  const [newMuscle, setNewMuscle] = useState('')
  const [saving, setSaving] = useState(false)

  const trimmed = name.trim()
  const duplicate = others?.find((e) => e.id !== exercise?.id && normalize(e.name) === normalize(trimmed))
  const canSave = !!trimmed && !!primary && !duplicate && !saving

  const toggleSecondary = (m: Muscle) => setSecondary((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]))

  const choosePrimary = (m: Muscle) => {
    setPrimary(m)
    setSecondary((s) => s.filter((x) => x !== m))
  }

  const addMuscle = async () => {
    if (!newMuscle.trim()) return
    const { id } = await createMuscle(newMuscle)
    setNewMuscle('')
    // New muscles go to "main" if none is chosen yet, otherwise to secondary.
    if (!primary) setPrimary(id)
    else if (id !== primary && !secondary.includes(id)) setSecondary((s) => [...s, id])
  }

  const save = async () => {
    if (!canSave || !primary) return
    setSaving(true)
    try {
      const data = {
        name: trimmed,
        equipment,
        primaryMuscle: primary,
        secondaryMuscles: secondary.filter((m) => m !== primary),
        incrementKg: step && step > 0 ? step : DEFAULT_STEP[equipment],
        defaultRestSec: rest,
      }
      onSaved(exercise ? await updateExercise(exercise.id, data) : await createExercise(data))
    } finally {
      setSaving(false)
    }
  }

  const chip = (on: boolean) => `${on ? 'chip-active' : 'chip'} text-sm`

  return (
    <div className="space-y-5">
      <div>
        <label className="label" htmlFor="exercise-name">
          Name
        </label>
        <input
          id="exercise-name"
          className="field"
          value={name}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Cable Row (Single Arm)"
        />
        {duplicate && <p className="mt-1 text-xs text-bad">“{duplicate.name}” already exists. Pick a different name.</p>}
      </div>

      <div>
        <span className="label">Equipment</span>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((eq) => (
            <button key={eq} type="button" className={chip(equipment === eq)} onClick={() => setEquipment(eq)}>
              {EQUIPMENT_LABELS[eq]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Main muscle · 1 set</span>
        {!primary && <p className="mb-1.5 text-xs text-warn">Choose the muscle this exercise mainly works.</p>}
        <div className="flex flex-wrap gap-2">
          {all.map((m) => (
            <button key={m} type="button" className={chip(primary === m)} onClick={() => choosePrimary(m)} aria-pressed={primary === m}>
              {label(m)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Secondary muscles · ½ set each (optional)</span>
        <div className="flex flex-wrap gap-2">
          {all
            .filter((m) => m !== primary)
            .map((m) => (
              <button key={m} type="button" className={chip(secondary.includes(m))} onClick={() => toggleSecondary(m)} aria-pressed={secondary.includes(m)}>
                {label(m)}
              </button>
            ))}
        </div>
      </div>

      <div className="rounded-xl bg-surface-2 p-3">
        <span className="label">Muscle not listed?</span>
        <div className="flex gap-2">
          <input
            className="field bg-surface"
            placeholder="e.g. Adductors"
            autoComplete="off"
            value={newMuscle}
            onChange={(e) => setNewMuscle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void addMuscle()}
            aria-label="New muscle group name"
          />
          <button type="button" className="btn-secondary shrink-0 bg-surface" disabled={!newMuscle.trim()} onClick={addMuscle}>
            + Add
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">Creates a new muscle group and selects it for this exercise.</p>
      </div>

      <details className="rounded-xl bg-surface-2 p-3 text-sm">
        <summary className="cursor-pointer font-medium">More options</summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label>
            <span className="label">Weight step (kg)</span>
            <NumberField decimal className="field bg-surface py-2 text-center" value={step} placeholder={String(DEFAULT_STEP[equipment])} onChange={setStep} />
          </label>
          <label>
            <span className="label">Default rest</span>
            <select className="field bg-surface py-2" value={rest} onChange={(e) => setRest(Number(e.target.value))}>
              {[...new Set([...REST_OPTIONS, rest])]
                .sort((a, b) => a - b)
                .map((s) => (
                  <option key={s} value={s}>
                    {formatClock(s)}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-muted">The weight step is how much progression suggestions add at a time.</p>
      </details>

      {exercise && !exercise.custom && (
        <p className="text-xs text-muted">This is a built-in exercise. Changing its muscles also updates your past workouts’ muscle counts.</p>
      )}
      {primary && !isBuiltinMuscle(primary) && <p className="text-xs text-muted">Main muscle is one of your own muscle groups.</p>}

      <div className="flex gap-2">
        {onCancel && (
          <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="button" className="btn-primary flex-1" disabled={!canSave} onClick={save}>
          {exercise ? 'Save changes' : 'Create exercise'}
        </button>
      </div>
    </div>
  )
}
