import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db } from '../../db/schema'
import { useExerciseMap } from '../../db/exercises'
import { loadDetails, summarize } from '../../db/stats'
import { MUSCLE_LABELS } from '../../domain/muscles'
import { weekStart } from '../../domain/week'
import { formatDuration, formatVolume } from '../../lib/format'
import { PageHeader } from '../../components/PageHeader'

export function HistoryPage() {
  const exerciseMap = useExerciseMap()
  const summaries = useLiveQuery(async () => {
    if (!exerciseMap) return undefined
    const workouts = await db.workouts.where('status').equals('done').reverse().sortBy('startedAt')
    return (await loadDetails(workouts)).map((l) => summarize(l, exerciseMap))
  }, [exerciseMap])

  const groups = new Map<number, NonNullable<typeof summaries>>()
  for (const s of summaries ?? []) {
    const key = weekStart(s.workout.startedAt).getTime()
    groups.set(key, [...(groups.get(key) ?? []), s])
  }

  return (
    <div>
      <PageHeader title="History" />
      <div className="space-y-5 px-4">
        {summaries?.length === 0 && <div className="card text-center text-muted">Finished workouts will show up here.</div>}
        {[...groups.entries()].map(([week, items]) => (
          <section key={week}>
            <h2 className="mb-2 flex justify-between text-sm text-muted">
              <span>Week of {format(week, 'd MMM yyyy')}</span>
              <span>
                {items.length} session{items.length > 1 ? 's' : ''} · {formatVolume(items.reduce((a, s) => a + s.volume, 0))}
              </span>
            </h2>
            <ul className="space-y-2">
              {items.map((s) => (
                <li key={s.workout.id}>
                  <Link to={`/history/${s.workout.id}`} className="card block">
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold">{s.workout.name}</span>
                      <span className="text-xs text-muted">{format(s.workout.startedAt, 'EEE d MMM, HH:mm')}</span>
                    </div>
                    <div className="mt-1 text-sm text-muted">
                      {s.workout.endedAt && `${formatDuration(s.workout.endedAt - s.workout.startedAt)} · `}
                      {formatVolume(s.volume)} · {s.setCount} sets
                    </div>
                    <div className="mt-1 text-sm">{s.musclesHit.map((m) => MUSCLE_LABELS[m]).join(', ')}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
