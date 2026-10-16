import { Link, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db } from '../../db/schema'
import { useExerciseMap } from '../../db/exercises'
import { loadDetails, summarize } from '../../db/stats'
import { muscleLabel } from '../../domain/muscles'
import { dayKey, weekStart } from '../../domain/week'
import { weekStreak } from '../../domain/streak'
import { useSettings } from '../../db/settings'
import { formatDuration, formatVolume } from '../../lib/format'
import { PageHeader } from '../../components/PageHeader'
import { MonthCalendar } from '../../components/MonthCalendar'
import { ProgressTabs } from './ProgressTabs'

export function WorkoutsPage() {
  const navigate = useNavigate()
  const settings = useSettings()
  const exerciseMap = useExerciseMap()
  const summaries = useLiveQuery(async () => {
    if (!exerciseMap) return undefined
    const workouts = await db.workouts.where('status').equals('done').reverse().sortBy('startedAt')
    return (await loadDetails(workouts)).map((l) => summarize(l, exerciseMap))
  }, [exerciseMap])

  const planned = useLiveQuery(async () => {
    const [schedule, routines] = await Promise.all([db.schedule.toArray(), db.routines.toArray()])
    const names = new Map(routines.map((r) => [r.id, r.name]))
    return new Map(schedule.flatMap((s) => (s.routineId && names.has(s.routineId) ? [[s.weekday, names.get(s.routineId)!] as const] : [])))
  }, [])

  const trained = new Map<string, string[]>()
  for (const s of summaries ?? []) {
    if (!s.counts) continue
    const key = dayKey(s.workout.startedAt)
    trained.set(key, [...(trained.get(key) ?? []), s.workout.id])
  }
  const streak = weekStreak((summaries ?? []).filter((s) => s.counts).map((s) => s.workout.startedAt), settings.weeklySessionTarget)

  const groups = new Map<number, NonNullable<typeof summaries>>()
  for (const s of summaries ?? []) {
    const key = weekStart(s.workout.startedAt).getTime()
    groups.set(key, [...(groups.get(key) ?? []), s])
  }

  return (
    <div>
      <PageHeader title="Progress" />
      <ProgressTabs />
      <div className="space-y-5 px-4">
        <section className="card">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-3xl">{streak > 0 ? '🔥' : '🧊'}</span>
            <div>
              <div className="font-bold">
                {streak} week streak
              </div>
              <div className="text-xs text-muted">
                Weeks in a row with {settings.weeklySessionTarget}+ sessions
              </div>
            </div>
          </div>
          <MonthCalendar
            trained={trained}
            planned={planned ?? new Map()}
            onDayPress={(ids) => ids[0] && navigate(`/history/${ids[0]}`)}
          />
        </section>

        {summaries?.length === 0 && <div className="card text-center text-muted">Finished workouts will show up here.</div>}
        {[...groups.entries()].map(([week, items]) => (
          <section key={week}>
            <h2 className="mb-2 flex justify-between text-sm text-muted">
              <span>Week of {format(week, 'd MMM yyyy')}</span>
              <span>
                {items.filter((s) => s.counts).length} session{items.filter((s) => s.counts).length === 1 ? '' : 's'} ·{' '}
                {formatVolume(items.reduce((a, s) => a + s.volume, 0))}
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
                    <div className="mt-1 text-sm">
                      {s.counts ? (
                        s.musclesHit.map((m) => muscleLabel(m)).join(', ')
                      ) : (
                        <span className="text-warn">Empty, not counted. Open it to delete.</span>
                      )}
                    </div>
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
