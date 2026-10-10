import { Link, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { createRoutine, setScheduleDay } from '../../db/routines'
import { WEEKDAY_LABELS, weekdayIndex } from '../../domain/week'
import { PageHeader } from '../../components/PageHeader'

export function PlanPage() {
  const navigate = useNavigate()
  const routines = useLiveQuery(() => db.routines.orderBy('createdAt').toArray(), [])
  const schedule = useLiveQuery(async () => new Map((await db.schedule.toArray()).map((s) => [s.weekday, s.routineId])), [])
  const exerciseCounts = useLiveQuery(async () => {
    const map = new Map<string, number>()
    for (const re of await db.routineExercises.toArray()) map.set(re.routineId, (map.get(re.routineId) ?? 0) + 1)
    return map
  }, [])
  const today = weekdayIndex(new Date())

  const newRoutine = async () => {
    const name = prompt('Routine name', `Routine ${(routines?.length ?? 0) + 1}`)
    if (!name?.trim()) return
    const id = await createRoutine(name.trim())
    navigate(`/plan/routine/${id}`)
  }

  return (
    <div>
      <PageHeader title="Plan" />
      <div className="space-y-5 px-4">
        <section>
          <h2 className="mb-2 font-bold">Weekly schedule</h2>
          <div className="card divide-y divide-line p-0">
            {WEEKDAY_LABELS.map((label, weekday) => (
              <label key={weekday} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`w-24 text-sm ${weekday === today ? 'font-bold text-accent' : 'text-muted'}`}>{label}</span>
                <select
                  className="field py-2"
                  value={schedule?.get(weekday) ?? ''}
                  onChange={(e) => setScheduleDay(weekday, e.target.value || null)}
                >
                  <option value="">Rest</option>
                  {routines?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-bold">Routines</h2>
            <button className="btn-ghost" onClick={newRoutine}>
              + New
            </button>
          </div>
          {routines?.length === 0 && (
            <div className="card text-sm text-muted">
              A routine is a workout template, e.g. “Push A”: exercises with target sets, rep range and RIR. Create one,
              then assign it to days above.
            </div>
          )}
          <ul className="space-y-2">
            {routines?.map((r) => (
              <li key={r.id}>
                <Link to={`/plan/routine/${r.id}`} className="card flex items-center justify-between">
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-sm text-muted">{exerciseCounts?.get(r.id) ?? 0} exercises ›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
