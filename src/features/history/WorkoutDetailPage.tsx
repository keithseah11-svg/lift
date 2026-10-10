import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db } from '../../db/schema'
import { useExerciseMap } from '../../db/exercises'
import { loadDetails, summarize } from '../../db/stats'
import { deleteWorkout, saveWorkoutAsRoutine } from '../../db/workouts'
import { MUSCLE_LABELS } from '../../domain/muscles'
import { setVolume } from '../../domain/volume'
import { formatDuration, formatNumber, formatVolume } from '../../lib/format'
import { PageHeader } from '../../components/PageHeader'
import { Stat } from '../../components/Stat'
import { MuscleSetList } from '../../components/MuscleSetList'

const TYPE_TAG = { warmup: 'W', working: '', drop: 'D', failure: 'F' } as const

export function WorkoutDetailPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const exerciseMap = useExerciseMap()

  const loaded = useLiveQuery(async () => {
    const w = await db.workouts.get(id)
    return w ? (await loadDetails([w]))[0] : null
  }, [id])

  if (loaded === null) {
    return (
      <div>
        <PageHeader title="Workout" back />
        <p className="p-4 text-muted">This workout no longer exists.</p>
      </div>
    )
  }
  if (!loaded || !exerciseMap) return null

  const summary = summarize(loaded, exerciseMap)
  const { workout } = loaded
  const justFinished = params.get('finished') === '1'

  const saveAsRoutine = async () => {
    const name = prompt('Routine name', workout.name)
    if (!name?.trim()) return
    const routineId = await saveWorkoutAsRoutine(workout.id, name.trim())
    navigate(`/plan/routine/${routineId}`)
  }

  const remove = async () => {
    if (!confirm('Delete this workout permanently?')) return
    await deleteWorkout(workout.id)
    navigate('/history', { replace: true })
  }

  return (
    <div className="pb-6">
      <PageHeader title={workout.name} back={!justFinished} right={justFinished && <Link to="/" className="btn-primary">Done</Link>} />
      <div className="space-y-3 px-4">
        {justFinished && (
          <div className="card bg-good-soft text-center">
            <div className="text-3xl">🎉</div>
            <div className="font-bold">Workout complete</div>
          </div>
        )}

        <div className="text-sm text-muted">{format(workout.startedAt, 'EEEE d MMMM yyyy, HH:mm')}</div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Duration" value={workout.endedAt ? formatDuration(workout.endedAt - workout.startedAt) : '—'} />
          <Stat label="Volume" value={formatVolume(summary.volume)} />
          <Stat label="Sets" value={String(summary.setCount)} />
        </div>

        <section className="card">
          <h2 className="mb-2 font-bold">Muscles worked</h2>
          <MuscleSetList counts={summary.muscleSets} />
        </section>

        {loaded.exercises.map((we) => {
          const ex = exerciseMap.get(we.exerciseId)
          const sets = loaded.sets.filter((s) => s.workoutExerciseId === we.id)
          const exVolume = sets.reduce((a, s) => a + setVolume(s), 0)
          let n = 0
          return (
            <section key={we.id} className="card">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold text-accent">{ex?.name ?? 'Unknown exercise'}</h3>
                <span className="text-xs text-muted">{formatVolume(exVolume)}</span>
              </div>
              <p className="mb-2 text-xs text-muted">{ex && MUSCLE_LABELS[ex.primaryMuscle]}</p>
              <ul className="space-y-1 text-sm">
                {sets.map((s) => (
                  <li key={s.id} className="flex gap-3">
                    <span className="w-5 text-center font-bold text-muted">{s.type === 'working' ? ++n : TYPE_TAG[s.type]}</span>
                    <span className="tabular-nums">
                      {formatNumber(s.weightKg ?? 0)} kg × {s.reps ?? 0}
                    </span>
                    {s.rir != null && <span className="text-muted">RIR {s.rir}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        {workout.notes && (
          <section className="card">
            <h2 className="mb-1 font-bold">Notes</h2>
            <p className="text-sm whitespace-pre-wrap text-muted">{workout.notes}</p>
          </section>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link to={`/workout/${workout.id}`} className="btn-secondary">
            Edit
          </Link>
          <button className="btn-secondary" onClick={saveAsRoutine}>
            Save as routine
          </button>
        </div>
        <button className="btn-danger w-full" onClick={remove}>
          Delete workout
        </button>
      </div>
    </div>
  )
}
