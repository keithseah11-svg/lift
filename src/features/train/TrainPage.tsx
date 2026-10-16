import { Link, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { getActiveWorkout, startWorkout } from '../../db/workouts'
import { weekdayIndex } from '../../domain/week'
import { PageHeader } from '../../components/PageHeader'

export function TrainPage() {
  const navigate = useNavigate()
  const active = useLiveQuery(getActiveWorkout, [])
  const routines = useLiveQuery(() => db.routines.orderBy('createdAt').toArray(), [])
  const counts = useLiveQuery(async () => {
    const items = await db.routineExercises.toArray()
    const map = new Map<string, number>()
    for (const it of items) map.set(it.routineId, (map.get(it.routineId) ?? 0) + 1)
    return map
  }, [])
  const todayRoutineId = useLiveQuery(async () => (await db.schedule.get(weekdayIndex(new Date())))?.routineId ?? null, [])

  const start = async (routineId: string | null) => {
    const id = await startWorkout(routineId)
    navigate(`/workout/${id}`)
  }

  return (
    <div>
      <PageHeader title="Train" />
      <div className="space-y-3 px-4">
        {active ? (
          <Link to={`/workout/${active.id}`} className="card flex items-center justify-between bg-accent-soft">
            <div>
              <div className="text-xs text-muted">In progress</div>
              <div className="font-semibold">{active.name}</div>
            </div>
            <span className="btn-primary">Resume</span>
          </Link>
        ) : (
          <button className="btn-primary w-full py-3.5 text-lg" onClick={() => start(null)}>
            Start new workout
          </button>
        )}

        <div className="flex items-baseline justify-between pt-2">
          <h2 className="font-bold">Routines</h2>
          <Link to="/plan" className="text-sm text-accent">
            Manage
          </Link>
        </div>

        {routines?.length === 0 && (
          <div className="card text-sm text-muted">
            No routines yet. Create one in <Link to="/plan" className="text-accent">Plan</Link> to start workouts with your
            exercises, sets and targets pre-filled.
          </div>
        )}

        {routines?.map((r) => (
          <div key={r.id} className={`card flex items-center gap-3 ${r.id === todayRoutineId ? 'ring-1 ring-accent' : ''}`}>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{r.name}</div>
              <div className="text-sm text-muted">
                {counts?.get(r.id) ?? 0} exercises{r.id === todayRoutineId && ' · planned today'}
              </div>
            </div>
            <button className="btn-secondary" disabled={!!active} onClick={() => start(r.id)}>
              Start
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
