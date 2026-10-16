import { useState } from 'react'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { useExerciseMap } from '../../db/exercises'
import { loadAllRecords } from '../../db/stats'
import { MUSCLE_LABELS } from '../../domain/muscles'
import { formatKg } from '../../lib/format'
import { PageHeader } from '../../components/PageHeader'
import { searchByName } from '../../domain/search'
import { ProgressTabs } from './ProgressTabs'

type Sort = 'strength' | 'recent' | 'name'

/** Every exercise you've logged, with its records; tap one for its history chart. */
export function ExercisesPage() {
  const exerciseMap = useExerciseMap()
  const [sort, setSort] = useState<Sort>('recent')
  const [query, setQuery] = useState('')
  const rows = useLiveQuery(async () => (exerciseMap ? loadAllRecords(exerciseMap) : undefined), [exerciseMap])

  const shown = [...(rows ?? [])]
    .sort((a, b) =>
      sort === 'recent' ? b.lastAt - a.lastAt : sort === 'name' ? a.exercise.name.localeCompare(b.exercise.name) : 0,
    )
  const matching = searchByName(shown, query, (r) => r.exercise.name)

  return (
    <div>
      <PageHeader title="Progress" />
      <ProgressTabs />
      <div className="space-y-3 px-4">
        <input className="field" placeholder="Search your exercises" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex gap-2">
          {(
            [
              ['recent', 'Recent'],
              ['strength', 'Strongest'],
              ['name', 'A–Z'],
            ] as const
          ).map(([key, label]) => (
            <button key={key} className={sort === key ? 'chip-active' : 'chip'} onClick={() => setSort(key)}>
              {label}
            </button>
          ))}
        </div>

        {rows?.length === 0 && <div className="card text-center text-muted">Exercises you log will show up here.</div>}

        <ul className="card divide-y divide-line p-0">
          {matching.map(({ exercise, records, sessions, lastAt }) => (
            <li key={exercise.id}>
              <Link to={`/exercise/${exercise.id}`} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{exercise.name}</div>
                  <div className="text-xs text-muted">
                    {MUSCLE_LABELS[exercise.primaryMuscle]} · {sessions} session{sessions === 1 ? '' : 's'} · {format(lastAt, 'd MMM')}
                  </div>
                </div>
                <div className="text-right">
                  {records.bestE1rm ? (
                    <>
                      <div className="font-semibold tabular-nums">{formatKg(Math.round(records.bestE1rm.value * 10) / 10)}</div>
                      <div className="text-xs text-muted">est. 1RM</div>
                    </>
                  ) : records.heaviest ? (
                    <>
                      <div className="font-semibold tabular-nums">{formatKg(records.heaviest.weightKg)}</div>
                      <div className="text-xs text-muted">heaviest</div>
                    </>
                  ) : null}
                </div>
                <span className="text-muted">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
