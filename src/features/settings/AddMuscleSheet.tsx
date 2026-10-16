import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Sheet } from '../../components/Sheet'
import { useMuscles } from '../../app/MusclesProvider'
import { createMuscle } from '../../db/muscles'
import { isBuiltinMuscle } from '../../domain/muscles'
import { findMuscleByName } from '../../domain/muscleLinks'
import { searchByName } from '../../domain/search'

/**
 * Type a muscle name: existing muscles are suggested (they already sync with
 * every exercise that works them); a new name creates your own muscle group.
 */
export function AddMuscleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { all, label } = useMuscles()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const trimmed = name.trim()
  const exact = findMuscleByName(trimmed, all, label)
  const suggestions = trimmed ? searchByName(all, trimmed, label).slice(0, 8) : []

  const go = (id: string, isNew = false) => {
    setName('')
    onClose()
    navigate(`/settings/muscles/${id}${isNew ? '?new=1' : ''}`)
  }

  const create = async () => {
    if (!trimmed || busy) return
    setBusy(true)
    try {
      const { id, created } = await createMuscle(trimmed)
      go(id, created)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add muscle group" fullScreen>
      <div className="space-y-3">
        <input
          className="field"
          autoComplete="off"
          enterKeyHint="done"
          placeholder="e.g. Adductors, Obliques, Neck"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (exact ? go(exact) : void create())}
        />

        {suggestions.length > 0 && (
          <div>
            <h3 className="mb-1 text-xs font-medium text-muted uppercase">Already in Lift</h3>
            <ul className="divide-y divide-line">
              {suggestions.map((m) => (
                <li key={m}>
                  <button className="flex w-full items-center justify-between py-3 text-left" onClick={() => go(m)}>
                    <span>
                      {label(m)}
                      {!isBuiltinMuscle(m) && <span className="ml-1.5 text-[10px] text-muted uppercase">yours</span>}
                    </span>
                    <span className="text-sm text-muted">Linked exercises ›</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {trimmed && !exact && (
          <button className="btn-primary w-full" disabled={busy} onClick={create}>
            + Create “{trimmed}”
          </button>
        )}

        <p className="text-xs text-muted">
          A muscle that’s already in Lift is automatically linked to every exercise that works it. A new muscle starts
          empty: next you’ll choose which exercises work it.
        </p>
      </div>
    </Sheet>
  )
}
