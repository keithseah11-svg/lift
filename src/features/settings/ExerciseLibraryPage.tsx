import { useState } from 'react'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { useMuscles } from '../../app/MusclesProvider'
import { EQUIPMENT_LABELS } from '../../domain/muscles'
import { searchByName } from '../../domain/search'
import { PageHeader } from '../../components/PageHeader'
import { exerciseSearchNames } from '../../domain/exerciseAliases'

/** Every exercise in Lift: create your own, or edit any exercise's muscles. */
export function ExerciseLibraryPage() {
  const { label } = useMuscles()
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])
  const [query, setQuery] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)

  const mine = (exercises ?? []).filter((e) => e.custom)
  const shown = searchByName(onlyMine ? mine : (exercises ?? []), query, exerciseSearchNames)

  return (
    <div className="pb-6">
      <PageHeader title="Exercise library" back />
      <div className="space-y-3 px-4">
        <Link to="/settings/exercises/new" className="btn-primary w-full">
          + New exercise
        </Link>
        <input
          className="field"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Search exercises"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex gap-2">
          <button className={!onlyMine ? 'chip-active' : 'chip'} onClick={() => setOnlyMine(false)}>
            All ({exercises?.length ?? 0})
          </button>
          <button className={onlyMine ? 'chip-active' : 'chip'} onClick={() => setOnlyMine(true)}>
            Yours ({mine.length})
          </button>
        </div>

        {onlyMine && mine.length === 0 && (
          <div className="card text-center text-sm text-muted">You haven’t created any exercises yet.</div>
        )}

        <ul className="card divide-y divide-line p-0">
          {shown.map((e) => (
            <li key={e.id}>
              <Link to={`/settings/exercises/${e.id}`} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {e.name}
                    {e.custom && <span className="ml-1.5 text-[10px] text-muted uppercase">yours</span>}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {label(e.primaryMuscle)}
                    {e.secondaryMuscles.length > 0 && ` · ${e.secondaryMuscles.map(label).join(', ')}`} · {EQUIPMENT_LABELS[e.equipment]}
                  </div>
                </div>
                <span className="text-muted">›</span>
              </Link>
            </li>
          ))}
        </ul>
        {query && shown.length === 0 && (
          <Link to={`/settings/exercises/new?name=${encodeURIComponent(query.trim())}`} className="btn-secondary w-full">
            + Create “{query.trim()}”
          </Link>
        )}
      </div>
    </div>
  )
}
