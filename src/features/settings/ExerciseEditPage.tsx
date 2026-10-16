import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { deleteExercise, exerciseUsage } from '../../db/exercises'
import { PageHeader } from '../../components/PageHeader'
import { ExerciseForm } from '../../components/ExerciseForm'

/** /settings/exercises/new or /settings/exercises/:id */
export function ExerciseEditPage() {
  const { id = 'new' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  // undefined = loading, null = not found (or creating a new one)
  const exercise = useLiveQuery(async () => (isNew ? null : ((await db.exercises.get(id)) ?? null)), [id])
  const usage = useLiveQuery(() => (isNew ? null : exerciseUsage(id)), [id])
  const [message, setMessage] = useState<string | null>(null)

  if (!isNew && exercise === null) {
    return (
      <div>
        <PageHeader title="Exercise" back />
        <p className="p-4 text-muted">This exercise no longer exists.</p>
      </div>
    )
  }
  if (!isNew && !exercise) return null

  const remove = async () => {
    if (!exercise || !confirm(`Delete “${exercise.name}”?`)) return
    const result = await deleteExercise(exercise.id)
    if (result.ok) return navigate('/settings/exercises', { replace: true })
    setMessage(
      `It’s used in ${result.workouts} workout${result.workouts === 1 ? '' : 's'} and ${result.routines} routine${result.routines === 1 ? '' : 's'}, so it can’t be deleted (your history needs it). Remove it from those first.`,
    )
  }

  return (
    <div className="pb-6">
      <PageHeader title={isNew ? 'New exercise' : 'Edit exercise'} back />
      <div className="space-y-4 px-4">
        <ExerciseForm
          key={exercise?.id ?? 'new'}
          exercise={exercise ?? undefined}
          initialName={params.get('name') ?? ''}
          onCancel={() => navigate(-1)}
          onSaved={(e) => (isNew ? navigate(`/settings/exercises/${e.id}?created=1`, { replace: true }) : setMessage('Saved.'))}
        />
        {params.get('created') === '1' && !message && (
          <p className="text-sm text-good">Created. It now appears when you add exercises to a workout or routine.</p>
        )}
        {message && <p className="text-sm text-muted">{message}</p>}

        {exercise && (
          <div className="space-y-2 border-t border-line pt-4">
            <Link to={`/exercise/${exercise.id}`} className="btn-secondary w-full">
              View history{usage ? ` (${usage.workouts} workout${usage.workouts === 1 ? '' : 's'})` : ''}
            </Link>
            {exercise.custom && (
              <button className="btn-danger w-full" onClick={remove}>
                Delete exercise
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
