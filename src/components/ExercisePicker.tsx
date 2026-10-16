import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { createExercise } from '../db/exercises'
import type { Exercise } from '../db/types'
import { EQUIPMENT, EQUIPMENT_LABELS, MUSCLES, MUSCLE_LABELS, type Equipment, type Muscle } from '../domain/muscles'
import { Sheet } from './Sheet'
import { searchByName } from '../domain/search'

interface Props {
  open: boolean
  onClose: () => void
  onPick: (exercise: Exercise) => void
}

export function ExercisePicker({ open, onClose, onPick }: Props) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | null>(null)
  const [creating, setCreating] = useState(false)
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])

  const filtered = useMemo(() => {
    const byMuscle = (exercises ?? []).filter(
      (e) => !muscle || e.primaryMuscle === muscle || e.secondaryMuscles.includes(muscle),
    )
    return searchByName(byMuscle, query, (e) => e.name)
  }, [exercises, query, muscle])

  const pick = (e: Exercise) => {
    onPick(e)
    setQuery('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={creating ? 'New exercise' : 'Add exercise'} fullScreen>
      {creating ? (
        <CreateExerciseForm
          initialName={query}
          onCancel={() => setCreating(false)}
          onCreated={(e) => {
            setCreating(false)
            pick(e)
          }}
        />
      ) : (
        <>
          <div className="sticky top-0 z-10 -mx-4 space-y-2 bg-surface px-4 pb-2">
            <input
              className="field"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              placeholder="Search exercises"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              <button className={muscle === null ? 'chip-active' : 'chip'} onClick={() => setMuscle(null)}>
                All
              </button>
              {MUSCLES.map((m) => (
                <button key={m} className={muscle === m ? 'chip-active' : 'chip'} onClick={() => setMuscle(m)}>
                  {MUSCLE_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
          <ul className="divide-y divide-line">
            {filtered.map((e) => (
              <li key={e.id}>
                <button className="w-full py-3 text-left" onClick={() => pick(e)}>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-sm text-muted">
                    {MUSCLE_LABELS[e.primaryMuscle]}
                    {e.secondaryMuscles.length > 0 && ` · ${e.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', ')}`}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {exercises && filtered.length === 0 && <p className="py-6 text-center text-muted">No exercises match.</p>}
          <button className="btn-secondary mt-3 w-full" onClick={() => setCreating(true)}>
            + Create custom exercise
          </button>
        </>
      )}
    </Sheet>
  )
}

function CreateExerciseForm({
  initialName,
  onCancel,
  onCreated,
}: {
  initialName: string
  onCancel: () => void
  onCreated: (e: Exercise) => void
}) {
  const [name, setName] = useState(initialName)
  const [primary, setPrimary] = useState<Muscle>('chest')
  const [secondary, setSecondary] = useState<Muscle[]>([])
  const [equipment, setEquipment] = useState<Equipment>('dumbbell')

  const toggleSecondary = (m: Muscle) =>
    setSecondary((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]))

  const submit = async () => {
    const exercise = await createExercise({
      name: name.trim(),
      primaryMuscle: primary,
      secondaryMuscles: secondary.filter((m) => m !== primary),
      equipment,
      incrementKg: equipment === 'dumbbell' ? 2 : equipment === 'machine' ? 5 : 2.5,
      defaultRestSec: 120,
    })
    onCreated(exercise)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Name</label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cable Row (Single Arm)" />
      </div>
      <div>
        <label className="label">Equipment</label>
        <select className="field" value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
          {EQUIPMENT.map((eq) => (
            <option key={eq} value={eq}>
              {EQUIPMENT_LABELS[eq]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Primary muscle</label>
        <select className="field" value={primary} onChange={(e) => setPrimary(e.target.value as Muscle)}>
          {MUSCLES.map((m) => (
            <option key={m} value={m}>
              {MUSCLE_LABELS[m]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Secondary muscles (count as ½ set)</label>
        <div className="flex flex-wrap gap-2">
          {MUSCLES.filter((m) => m !== primary).map((m) => (
            <button key={m} className={secondary.includes(m) ? 'chip-active' : 'chip'} onClick={() => toggleSecondary(m)}>
              {MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary flex-1" disabled={!name.trim()} onClick={submit}>
          Create
        </button>
      </div>
    </div>
  )
}
