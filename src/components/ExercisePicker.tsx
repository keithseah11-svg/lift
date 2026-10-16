import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import type { Exercise } from '../db/types'
import { muscleLabel, type Muscle } from '../domain/muscles'
import { useMuscles } from '../app/MusclesProvider'
import { Sheet } from './Sheet'
import { ExerciseForm } from './ExerciseForm'
import { searchByName } from '../domain/search'
import { exerciseSearchNames } from '../domain/exerciseAliases'

interface Props {
  open: boolean
  onClose: () => void
  onPick: (exercise: Exercise) => void
}

export function ExercisePicker({ open, onClose, onPick }: Props) {
  const muscles = useMuscles().all
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | null>(null)
  const [creating, setCreating] = useState(false)
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])

  const filtered = useMemo(() => {
    const byMuscle = (exercises ?? []).filter(
      (e) => !muscle || e.primaryMuscle === muscle || e.secondaryMuscles.includes(muscle),
    )
    return searchByName(byMuscle, query, exerciseSearchNames)
  }, [exercises, query, muscle])

  const pick = (e: Exercise) => {
    onPick(e)
    setQuery('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={creating ? 'New exercise' : 'Add exercise'} fullScreen>
      {creating ? (
        <ExerciseForm
          initialName={query}
          onCancel={() => setCreating(false)}
          onSaved={(e) => {
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
            <button className="btn-secondary w-full justify-start py-2 text-sm" onClick={() => setCreating(true)}>
              + Create {query.trim() && filtered.length === 0 ? `“${query.trim()}”` : 'new exercise'}
              <span className="ml-auto font-normal text-muted">name + muscles</span>
            </button>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              <button className={muscle === null ? 'chip-active' : 'chip'} onClick={() => setMuscle(null)}>
                All
              </button>
              {muscles.map((m) => (
                <button key={m} className={muscle === m ? 'chip-active' : 'chip'} onClick={() => setMuscle(m)}>
                  {muscleLabel(m)}
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
                    {muscleLabel(e.primaryMuscle)}
                    {e.secondaryMuscles.length > 0 && ` · ${e.secondaryMuscles.map((m) => muscleLabel(m)).join(', ')}`}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {exercises && filtered.length === 0 && (
            <div className="py-6 text-center text-muted">
              <p>No exercises match.</p>
              <button className="btn-primary mt-3" onClick={() => setCreating(true)}>
                + Create “{query.trim()}”
              </button>
            </div>
          )}
        </>
      )}
    </Sheet>
  )
}
